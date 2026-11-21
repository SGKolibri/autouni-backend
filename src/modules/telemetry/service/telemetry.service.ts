import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import {
  AlarmLevel,
  Device,
  NotificationType,
  SensorAlarm,
  SensorKind,
  SensorReading,
} from '@prisma/client';
import { TelemetryRepository } from '../repository/telemetry.repository';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { NotificationsService } from '../../notifications/service/notifications.service';
import { TenantContext } from '../../../common/tenant/tenant-context';
import { InvalidPayloadError, parseSensorPayload } from '../payload-parsing';
import { channelAccepts, defaultSensorKind } from '../channel-capabilities';
import { alarmTransition } from './alarm-evaluation';

// Emitido quando algo que uma automação CONDITION pode observar mudou
// (leitura de sensor, ocupação de sala). Payload: { organizationId }.
export const TELEMETRY_CHANGED = 'telemetry.changed';

const KIND_LABEL: Record<SensorKind, string> = {
  GAS_MQ2: 'gás (MQ-2)',
  GAS_MQ135: 'qualidade do ar (MQ-135)',
  MOTION: 'presença',
};

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);

  constructor(
    private readonly repository: TelemetryRepository,
    private readonly realtime: RealtimeGateway,
    private readonly notifications: NotificationsService,
    private readonly events: EventEmitter2,
  ) {}

  /** Ingestão de `devices/<id>/sensor`. Roda no tenant do device. */
  async ingest(device: Device, payload: unknown, now = new Date()) {
    const measurements = parseSensorPayload(
      payload,
      defaultSensorKind(device.channel),
    );
    for (const m of measurements) {
      if (!channelAccepts(device.channel, m.kind)) {
        throw new InvalidPayloadError(
          `canal ${device.channel} não produz leitura ${m.kind}`,
        );
      }
    }

    const readings: SensorReading[] = [];
    for (const m of measurements) {
      const reading = await this.repository.createReading({
        deviceId: device.id,
        kind: m.kind,
        value: m.value,
        unit: m.unit,
        raw: m.raw,
        timestamp: now,
      });
      readings.push(reading);

      this.realtime.emitToOrganization(device.organizationId, 'sensor:update', {
        deviceId: device.id,
        roomId: device.roomId,
        kind: m.kind,
        value: m.value,
        unit: m.unit,
        raw: m.raw,
        timestamp: now,
      });

      if (m.kind === SensorKind.MOTION) {
        if (m.value === 1) await this.recordMotion(device, now);
      } else {
        await this.evaluateAlarm(device, m.kind, m.value, now);
      }
    }

    this.events.emit(TELEMETRY_CHANGED, {
      organizationId: device.organizationId,
    });
    return readings;
  }

  // ── Alarmes ─────────────────────────────────────────────────────────────

  private async evaluateAlarm(
    device: Device,
    kind: SensorKind,
    value: number,
    now: Date,
  ) {
    const threshold = await this.repository.resolveThreshold(device.id, kind);
    if (!threshold) return;

    const open = await this.repository.findOpenAlarm(device.id, kind);
    const transition = alarmTransition(value, threshold, open);

    switch (transition.action) {
      case 'open': {
        const alarm = await this.repository.createAlarm({
          deviceId: device.id,
          kind,
          level: transition.level,
          value,
          threshold: transition.threshold,
          startedAt: now,
        });
        this.emitAlarm(device, alarm, 'opened');
        await this.notifyAlarm(device, alarm, 'opened');
        return;
      }
      case 'escalate': {
        const alarm = await this.repository.updateAlarm(open!.id, {
          level: transition.level,
          threshold: transition.threshold,
          value,
          peakValue: Math.max(open!.peakValue, value),
        });
        this.emitAlarm(device, alarm, 'escalated');
        await this.notifyAlarm(device, alarm, 'escalated');
        return;
      }
      case 'update':
        await this.repository.updateAlarm(open!.id, {
          value,
          peakValue: Math.max(open!.peakValue, value),
        });
        return;
      case 'clear': {
        const alarm = await this.repository.updateAlarm(open!.id, {
          value,
          clearedAt: now,
        });
        this.emitAlarm(device, alarm, 'cleared');
        await this.notifyAlarm(device, alarm, 'cleared');
        return;
      }
    }
  }

  private emitAlarm(
    device: Device,
    alarm: SensorAlarm,
    state: 'opened' | 'escalated' | 'cleared',
  ) {
    this.realtime.emitToOrganization(device.organizationId, 'sensor:alarm', {
      state,
      alarm,
      deviceId: device.id,
      roomId: device.roomId,
    });
  }

  private async notifyAlarm(
    device: Device,
    alarm: SensorAlarm,
    state: 'opened' | 'escalated' | 'cleared',
  ) {
    const label = KIND_LABEL[alarm.kind];
    const recipients = await this.repository.findAlarmRecipients();
    const title =
      state === 'cleared'
        ? `Normalizado: ${label} em ${device.name}`
        : `${alarm.level === AlarmLevel.CRITICAL ? 'Alarme' : 'Atenção'}: ${label} em ${device.name}`;
    const message =
      state === 'cleared'
        ? `Leitura voltou a ${alarm.value} (pico ${alarm.peakValue}).`
        : `Leitura ${alarm.value} atingiu o limite de ${alarm.threshold}.`;
    const type: NotificationType =
      state === 'cleared'
        ? NotificationType.SUCCESS
        : alarm.level === AlarmLevel.CRITICAL
          ? NotificationType.ERROR
          : NotificationType.WARNING;

    for (const user of recipients) {
      await this.notifications.create({
        userId: user.id,
        type,
        title,
        message,
        link: `/devices/${device.id}`,
      });
    }
  }

  // ── Ocupação ────────────────────────────────────────────────────────────

  private async recordMotion(device: Device, now: Date) {
    const room = await this.repository.findRoom(device.roomId);
    if (!room) return;

    if (room.occupied) {
      await this.repository.updateRoom(room.id, { lastMotionAt: now });
      return;
    }

    await this.repository.updateRoom(room.id, {
      occupied: true,
      lastMotionAt: now,
      occupancyChangedAt: now,
    });
    this.emitOccupancy(device.organizationId, room.id, true, now);
  }

  private emitOccupancy(
    organizationId: string,
    roomId: string,
    occupied: boolean,
    at: Date,
  ) {
    this.realtime.emitToOrganization(organizationId, 'room:occupancy', {
      roomId,
      occupied,
      timestamp: at,
    });
  }

  // Sala vazia é ausência de movimento por `vacancyTimeoutSec`. Varre todas as
  // organizações e atualiza cada sala no tenant dela.
  @Interval(15000)
  async sweepVacancy(now = new Date()) {
    try {
      const rooms = await TenantContext.runAsSystem(() =>
        this.repository.findOccupiedRoomsAllTenants(),
      );
      const changedOrgs = new Set<string>();

      for (const room of rooms) {
        const last = room.lastMotionAt?.getTime() ?? 0;
        if (now.getTime() - last < room.vacancyTimeoutSec * 1000) continue;

        await TenantContext.runAsTenant(room.organizationId, () =>
          this.repository.updateRoom(room.id, {
            occupied: false,
            occupancyChangedAt: now,
          }),
        );
        this.emitOccupancy(room.organizationId, room.id, false, now);
        changedOrgs.add(room.organizationId);
      }

      for (const organizationId of changedOrgs) {
        this.events.emit(TELEMETRY_CHANGED, { organizationId });
      }
    } catch (err) {
      this.logger.error('Error in vacancy sweep', err as Error);
    }
  }
}
