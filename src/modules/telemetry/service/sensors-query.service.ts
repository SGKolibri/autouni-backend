import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TelemetryRepository } from '../repository/telemetry.repository';
import { TenantContext } from '../../../common/tenant/tenant-context';
import {
  AlarmSettingsDto,
  AlarmsQueryDto,
  SensorReadingsQueryDto,
  UpsertThresholdDto,
} from '../dto/telemetry.dto';
import { RealtimeGateway } from '../../realtime/realtime.gateway';

/** Consultas e configuração expostas por HTTP (leituras, limites, alarmes). */
@Injectable()
export class SensorsQueryService {
  constructor(
    private readonly repository: TelemetryRepository,
    private readonly realtime: RealtimeGateway,
  ) {}

  readings(deviceId: string, query: SensorReadingsQueryDto) {
    return this.repository.findReadings({ deviceId, ...query });
  }

  async roomSnapshot(roomId: string) {
    const room = await this.repository.findRoom(roomId);
    if (!room) throw new NotFoundException(`Room with ID ${roomId} not found`);
    const latest = await this.repository.findLatestByRoom(roomId);
    return {
      roomId,
      occupied: room.occupied,
      lastMotionAt: room.lastMotionAt,
      occupancyChangedAt: room.occupancyChangedAt,
      vacancyTimeoutSec: room.vacancyTimeoutSec,
      latest,
    };
  }

  thresholds() {
    return this.repository.findThresholds();
  }

  async upsertThreshold(dto: UpsertThresholdDto) {
    const warnAt = dto.warnAt ?? null;
    const clearAt = dto.clearAt ?? null;
    if (warnAt !== null && warnAt >= dto.alarmAt) {
      throw new BadRequestException('warnAt deve ser menor que alarmAt');
    }
    if (clearAt !== null && clearAt > (warnAt ?? dto.alarmAt)) {
      throw new BadRequestException(
        'clearAt deve ser no máximo o nível que abre o alarme',
      );
    }

    const deviceId = dto.deviceId ?? null;
    const data = {
      warnAt,
      alarmAt: dto.alarmAt,
      clearAt,
      enabled: dto.enabled ?? true,
    };
    const existing = await this.repository.findThreshold(dto.kind, deviceId);
    return existing
      ? this.repository.updateThreshold(existing.id, data)
      : this.repository.createThreshold({ ...data, kind: dto.kind, deviceId });
  }

  async deleteThreshold(id: string) {
    if (!(await this.repository.findThresholdById(id))) {
      throw new NotFoundException(`Threshold with ID ${id} not found`);
    }
    return this.repository.deleteThreshold(id);
  }

  alarms(query: AlarmsQueryDto) {
    return this.repository.findAlarms(query);
  }

  async alarmSettings() {
    const org = await this.repository.getAlarmReminderMinutes(
      TenantContext.requireOrganizationId(),
    );
    return { reminderMinutes: org.alarmReminderMinutes };
  }

  async updateAlarmSettings(dto: AlarmSettingsDto) {
    const org = await this.repository.setAlarmReminderMinutes(
      TenantContext.requireOrganizationId(),
      dto.reminderMinutes,
    );
    return { reminderMinutes: org.alarmReminderMinutes };
  }

  async acknowledge(id: string, userId: string) {
    const alarm = await this.repository.findAlarmById(id);
    if (!alarm) throw new NotFoundException(`Alarm with ID ${id} not found`);
    if (alarm.acknowledgedAt) return alarm;
    const updated = await this.repository.updateAlarm(id, {
      acknowledgedAt: new Date(),
      acknowledgedById: userId,
    });
    this.realtime.emitToOrganization(updated.organizationId, 'sensor:alarm', {
      state: 'acknowledged',
      alarm: updated,
      deviceId: updated.deviceId,
    });
    return updated;
  }
}
