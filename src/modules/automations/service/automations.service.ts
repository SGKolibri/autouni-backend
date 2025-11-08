import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Automation, AutomationHistory } from '@prisma/client';
const cronParser = require('cron-parser');
import { AutomationsRepository } from '../repository/automations.repository';
import { MqttService } from '../../mqtt/service/mqtt.service';
import {
  TriggerType,
  CreateAutomationDto,
  UpdateAutomationDto,
  AutomationAction,
} from '../interfaces/automations.interface';

@Injectable()
export class AutomationsService {
  private readonly logger = new Logger(AutomationsService.name);

  constructor(
    private readonly automationsRepository: AutomationsRepository,
    private readonly mqttService: MqttService,
  ) {}

  async create(createAutomationDto: CreateAutomationDto): Promise<Automation> {
    // Validate action format
    if (typeof createAutomationDto.action === 'object') {
      createAutomationDto.action = JSON.stringify(createAutomationDto.action);
    }

    // Validate cron expression if trigger type is SCHEDULE
    if (createAutomationDto.triggerType === TriggerType.SCHEDULE) {
      if (!createAutomationDto.cron) {
        throw new BadRequestException('Cron expression is required for SCHEDULE trigger type');
      }
      this.validateCronExpression(createAutomationDto.cron);
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
    await this.findById(id); // Validate existence

    // Validate action format
    if (updateAutomationDto.action && typeof updateAutomationDto.action === 'object') {
      updateAutomationDto.action = JSON.stringify(updateAutomationDto.action);
    }

    // Validate cron expression if updating trigger type to SCHEDULE or updating cron
    if (
      (updateAutomationDto.triggerType === TriggerType.SCHEDULE || updateAutomationDto.cron) &&
      updateAutomationDto.cron
    ) {
      this.validateCronExpression(updateAutomationDto.cron);
    }

    return this.automationsRepository.update(id, updateAutomationDto);
  }

  async delete(id: string): Promise<Automation> {
    await this.findById(id); // Validate existence
    return this.automationsRepository.delete(id);
  }

  async toggleEnabled(id: string, enabled: boolean): Promise<Automation> {
    await this.findById(id); // Validate existence
    return this.automationsRepository.toggleEnabled(id, enabled);
  }

  async getHistory(id: string, limit?: number): Promise<AutomationHistory[]> {
    await this.findById(id); // Validate existence
    return this.automationsRepository.findHistory(id, limit);
  }

  async executeManually(id: string): Promise<void> {
    const automation = await this.findById(id);
    
    if (!automation.enabled) {
      throw new BadRequestException('Automation is disabled');
    }

    await this.executeAutomation(automation);
  }

  // Scheduled task to evaluate and execute automations
  @Interval(30000) // Run every 30 seconds
  async evaluateSchedules() {
    try {
      const scheduleAutomations = await this.automationsRepository.findByTriggerType(TriggerType.SCHEDULE);
      const now = new Date();
      
      for (const automation of scheduleAutomations) {
        try {
          if (!automation.cron) continue;

          // Use cron-parser to determine if automation should run
          const shouldRun = this.shouldRunAutomation(automation.cron, automation.lastRunAt, now);

          if (shouldRun) {
            await this.executeAutomation(automation);
          }
        } catch (err) {
          this.logger.error(`Error executing automation ${automation.id}`, err);
          await this.automationsRepository.createHistory({
            automationId: automation.id,
            success: false,
            logs: `Error: ${err.message}`,
          });
        }
      }
    } catch (err) {
      this.logger.error('Error in evaluateSchedules', err);
    }
  }

  private validateCronExpression(cronExpression: string): void {
    try {
      cronParser.parseExpression(cronExpression);
    } catch (err) {
      throw new BadRequestException(`Invalid cron expression: ${err.message}`);
    }
  }

  private shouldRunAutomation(cronExpression: string, lastRunAt: Date | null, now: Date): boolean {
    try {
      const interval = cronParser.parseExpression(cronExpression, {
        currentDate: lastRunAt || new Date(now.getTime() - 60000), // Start from lastRun or 1 minute ago
      });

      const nextRun = interval.next().toDate();
      
      // Check if the next scheduled run is in the past (meaning it should have run)
      return nextRun <= now;
    } catch (err) {
      this.logger.error(`Error parsing cron expression: ${cronExpression}`, err);
      return false;
    }
  }

  private async executeAutomation(automation: Automation): Promise<void> {
    try {
      this.logger.log(`Executing automation: ${automation.name} (${automation.id})`);

      // Parse action
      let action: AutomationAction;
      try {
        action = typeof automation.action === 'string' 
          ? JSON.parse(automation.action) 
          : automation.action as any;
      } catch {
        throw new Error('Invalid action format');
      }

      // Execute action based on type
      if (action.topic) {
        // MQTT action
        this.mqttService.publish(action.topic, action.payload ?? {});
        this.logger.debug(`Published MQTT message to ${action.topic}`);
      }

      // TODO: Add support for other action types (HTTP, notification, etc.)

      // Update last run timestamp
      await this.automationsRepository.updateLastRun(automation.id, new Date());

      // Create success history entry
      await this.automationsRepository.createHistory({
        automationId: automation.id,
        success: true,
        logs: `Executed successfully at ${new Date().toISOString()}`,
      });

      this.logger.log(`Automation ${automation.id} executed successfully`);
    } catch (err) {
      this.logger.error(`Error executing automation ${automation.id}`, err);
      
      // Create failure history entry
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