import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { OnEvent } from '@nestjs/event-emitter';
import { Automation, AutomationHistory } from '@prisma/client';
import { CronExpressionParser } from 'cron-parser';
import { AutomationsRepository } from '../repository/automations.repository';
import { MqttService } from '../../mqtt/service/mqtt.service';
import { DevicesService } from '../../devices/service/devices.service';
import { TenantContext } from '../../../common/tenant/tenant-context';
import { TELEMETRY_CHANGED } from '../../telemetry/service/telemetry.service';
import { orgTopic } from '../../mqtt/topics';
import {
  TriggerType,
  CreateAutomationDto,
  UpdateAutomationDto,
} from '../interfaces/automations.interface';
import {
  AutomationActionSpec,
  AutomationCondition,
  InvalidRuleError,
  occupancyMet,
  parseAction,
  parseCondition,
  sensorMet,
} from '../automation-rules';

@Injectable()
export class AutomationsService {
  private readonly logger = new Logger(AutomationsService.name);
  // Avaliação de condições por organização: uma por vez, com no máximo uma
  // reavaliação enfileirada (eventos de sensor chegam em rajada).
  private readonly evaluating = new Map<string, Promise<void>>();
  private readonly rerun = new Set<string>();

  constructor(
    private readonly automationsRepository: AutomationsRepository,
    private readonly mqttService: MqttService,
    private readonly devicesService: DevicesService,
  ) {}

  // ── Validação ───────────────────────────────────────────────────────────

  private async validateRules(dto: {
    triggerType?: TriggerType;
    cron?: string;
    condition?: string;
    action?: unknown;
  }) {
    try {
      if (dto.triggerType === TriggerType.SCHEDULE) {
        if (!dto.cron) throw new InvalidRuleError('Cron expression is required for SCHEDULE trigger type');
        this.validateCronExpression(dto.cron);
      }
      if (dto.triggerType === TriggerType.CONDITION) {
        if (!dto.condition) throw new InvalidRuleError('condition é obrigatória para CONDITION');
        await this.assertConditionTargets(parseCondition(dto.condition));
      }
      if (dto.action !== undefined) {
        await this.assertActionTarget(parseAction(dto.action));
      }
    } catch (err) {
      if (err instanceof InvalidRuleError) throw new BadRequestException(err.message);
      throw err;
    }
  }

  private async assertConditionTargets(condition: AutomationCondition) {
    if (condition.type === 'occupancy' && !(await this.automationsRepository.findRoom(condition.roomId))) {
      throw new InvalidRuleError(`Sala ${condition.roomId} não encontrada`);
    }
    if (condition.type === 'sensor' && !(await this.automationsRepository.findDevice(condition.deviceId))) {
      throw new InvalidRuleError(`Dispositivo ${condition.deviceId} não encontrado`);
    }
  }

  // Uma automação só comanda devices da própria organização.
  private async assertActionTarget(action: AutomationActionSpec) {
    if (action.kind === 'device') {
      if (!(await this.automationsRepository.findDevice(action.deviceId))) {
        throw new InvalidRuleError(`Dispositivo ${action.deviceId} não encontrado`);
      }
      return;
    }
    const base = action.topic.replace(/\/command$/, '');
    if (!(await this.automationsRepository.findDeviceByTopic(base))) {
      throw new InvalidRuleError(`Nenhum dispositivo da organização usa o tópico ${base}`);
    }
  }

  private validateCronExpression(cronExpression: string): void {
    try {
      CronExpressionParser.parse(cronExpression);
    } catch (err) {
      throw new InvalidRuleError(`Invalid cron expression: ${err.message}`);
    }
  }

  // ── CRUD ────────────────────────────────────────────────────────────────

  async create(createAutomationDto: CreateAutomationDto): Promise<Automation> {
    await this.validateRules(createAutomationDto);
    if (typeof createAutomationDto.action === 'object') {
      createAutomationDto.action = JSON.stringify(createAutomationDto.action);
    }
    return this.automationsRepository.create(createAutomationDto);
  }

  async findAll(): Promise<Automation[]> {
    return this.automationsRepository.findAll();
  }

  async findById(id: string): Promise<Automation> {
    const automation = await this.automationsRepository.findById(id);

    if (!automation) {
      throw new NotFoundException(`Automation with ID ${id} not found`);
    }

    return automation;
  }

  async findByCreatorId(creatorId: string): Promise<Automation[]> {
    return this.automationsRepository.findByCreatorId(creatorId);
  }

  async findEnabled(): Promise<Automation[]> {
    return this.automationsRepository.findEnabled();
  }

  async update(id: string, updateAutomationDto: UpdateAutomationDto): Promise<Automation> {
    const current = await this.findById(id);

    // Valida o estado resultante, não só os campos enviados.
    await this.validateRules({
      triggerType: updateAutomationDto.triggerType ?? (current.triggerType as TriggerType),
      cron: updateAutomationDto.cron ?? current.cron ?? undefined,
      condition: updateAutomationDto.condition ?? current.condition ?? undefined,
      action: updateAutomationDto.action,
    });

    if (updateAutomationDto.action && typeof updateAutomationDto.action === 'object') {
      updateAutomationDto.action = JSON.stringify(updateAutomationDto.action);
    }

    const updated = await this.automationsRepository.update(id, updateAutomationDto);
    if (updateAutomationDto.condition !== undefined || updateAutomationDto.triggerType !== undefined) {
      // Regra nova começa do zero: a próxima avaliação verdadeira dispara.
      await this.automationsRepository.setConditionState(id, false);
    }
    return updated;
  }

  async delete(id: string): Promise<Automation> {
    await this.findById(id);
    return this.automationsRepository.delete(id);
  }

  async toggleEnabled(id: string, enabled: boolean): Promise<Automation> {
    await this.findById(id);
    return this.automationsRepository.toggleEnabled(id, enabled);
  }

  async getHistory(id: string, limit?: number): Promise<AutomationHistory[]> {
    await this.findById(id);
    return this.automationsRepository.findHistory(id, limit);
  }

  async executeManually(id: string): Promise<void> {
    const automation = await this.findById(id);

    if (!automation.enabled) {
      throw new BadRequestException('Automation is disabled');
    }

    await this.executeAutomation(automation);
  }

  // ── SCHEDULE ────────────────────────────────────────────────────────────

  @Interval(30000)
  async evaluateSchedules() {
    try {
      const scheduleAutomations = await TenantContext.runAsSystem(() =>
        this.automationsRepository.findByTriggerType(TriggerType.SCHEDULE),
      );
      const now = new Date();

      for (const automation of scheduleAutomations) {
        if (!automation.cron) continue;
        if (!this.shouldRunAutomation(automation.cron, automation.lastRunAt, now)) continue;

        await TenantContext.runAsTenant(automation.organizationId, async () => {
          try {
            await this.executeAutomation(automation);
          } catch (err) {
            this.logger.error(`Error executing automation ${automation.id}: ${err.message}`);
          }
        });
      }
    } catch (err) {
      this.logger.error('Error in evaluateSchedules', err);
    }
  }

  private shouldRunAutomation(cronExpression: string, lastRunAt: Date | null, now: Date): boolean {
    try {
      const interval = CronExpressionParser.parse(cronExpression, {
        currentDate: lastRunAt || new Date(now.getTime() - 60000),
      });
      return interval.next().toDate() <= now;
    } catch (err) {
      this.logger.error(`Error parsing cron expression: ${cronExpression}`, err);
      return false;
    }
  }

  // ── CONDITION ───────────────────────────────────────────────────────────

  // Varredura periódica: cobre condições com duração ("vazia há 10 min"),
  // que ficam verdadeiras sem nenhum evento novo.
  @Interval(15000)
  async evaluateAllConditions() {
    try {
      const automations = await TenantContext.runAsSystem(() =>
        this.automationsRepository.findByTriggerType(TriggerType.CONDITION),
      );
      for (const organizationId of new Set(automations.map((a) => a.organizationId))) {
        await this.evaluateConditions(organizationId);
      }
    } catch (err) {
      this.logger.error('Error in evaluateAllConditions', err);
    }
  }

  @OnEvent(TELEMETRY_CHANGED, { async: true })
  async onTelemetryChanged(event: { organizationId: string }) {
    await this.evaluateConditions(event.organizationId);
  }

  async evaluateConditions(organizationId: string): Promise<void> {
    const running = this.evaluating.get(organizationId);
    if (running) {
      this.rerun.add(organizationId);
      return running;
    }

    const run = (async () => {
      do {
        this.rerun.delete(organizationId);
        await TenantContext.runAsTenant(organizationId, () => this.evaluateTenantConditions());
      } while (this.rerun.has(organizationId));
    })().finally(() => this.evaluating.delete(organizationId));

    this.evaluating.set(organizationId, run);
    return run;
  }

  private async evaluateTenantConditions() {
    const automations = await this.automationsRepository.findByTriggerType(TriggerType.CONDITION);
    const now = new Date();

    for (const automation of automations) {
      try {
        const met = await this.conditionMet(parseCondition(automation.condition), now);

        // Dispara só na borda falso -> verdadeiro; enquanto continuar
        // verdadeira, não repete.
        if (met && !automation.conditionState) {
          await this.automationsRepository.setConditionState(automation.id, true);
          await this.executeAutomation(automation);
        } else if (!met && automation.conditionState) {
          await this.automationsRepository.setConditionState(automation.id, false);
        }
      } catch (err) {
        this.logger.warn(`Condition of automation ${automation.id} failed: ${err.message}`);
      }
    }
  }

  private async conditionMet(condition: AutomationCondition, now: Date): Promise<boolean> {
    if (condition.type === 'occupancy') {
      const room = await this.automationsRepository.findRoom(condition.roomId);
      return !!room && occupancyMet(condition, room, now);
    }
    const latest = await this.automationsRepository.findLatestSensorReading(condition.deviceId, condition.kind);
    return sensorMet(condition, latest, now);
  }

  // ── Execução ────────────────────────────────────────────────────────────

  private async executeAutomation(automation: Automation): Promise<void> {
    try {
      this.logger.log(`Executing automation: ${automation.name} (${automation.id})`);

      let action: AutomationActionSpec;
      try {
        action = parseAction(automation.action);
      } catch (err) {
        throw new Error(`Invalid action: ${err.message}`);
      }

      // Revalida no momento da execução: o device pode ter sido removido ou
      // trocado de tópico depois que a automação foi salva.
      await this.assertActionTarget(action);

      if (action.kind === 'device') {
        await this.devicesService.control(action.deviceId, {
          command: action.command,
          intensity: action.intensity,
          temperature: action.temperature,
        });
      } else {
        this.mqttService.publish(
          orgTopic(automation.organizationId, action.topic),
          action.payload ?? {},
        );
      }

      await this.automationsRepository.updateLastRun(automation.id, new Date());
      await this.automationsRepository.createHistory({
        automationId: automation.id,
        success: true,
        logs: `Executed successfully at ${new Date().toISOString()}`,
      });

      this.logger.log(`Automation ${automation.id} executed successfully`);
    } catch (err) {
      this.logger.error(`Error executing automation ${automation.id}: ${err.message}`);
      await this.automationsRepository.createHistory({
        automationId: automation.id,
        success: false,
        logs: `Error: ${err.message}`,
      });
      throw err;
    }
  }

  async getAutomationStats() {
    const all = await this.findAll();

    return {
      total: all.length,
      enabled: all.filter(a => a.enabled).length,
      disabled: all.filter(a => !a.enabled).length,
      byTriggerType: {
        schedule: all.filter(a => a.triggerType === 'SCHEDULE').length,
        condition: all.filter(a => a.triggerType === 'CONDITION').length,
        manual: all.filter(a => a.triggerType === 'MANUAL').length,
      },
    };
  }
}
