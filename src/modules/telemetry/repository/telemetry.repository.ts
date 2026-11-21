import { Injectable } from '@nestjs/common';
import { AlarmLevel, Prisma, SensorKind, UserRole } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { withTenant } from '../../../common/tenant/tenant-context';

@Injectable()
export class TelemetryRepository {
  constructor(private readonly prisma: PrismaService) {}

  createReading(data: {
    deviceId: string;
    kind: SensorKind;
    value: number;
    unit: string | null;
    raw: number | null;
    timestamp: Date;
  }) {
    return this.prisma.sensorReading.create({ data: withTenant(data) });
  }

  findReadings(params: {
    deviceId: string;
    kind?: SensorKind;
    from?: Date;
    to?: Date;
    limit?: number;
  }) {
    return this.prisma.sensorReading.findMany({
      where: {
        deviceId: params.deviceId,
        ...(params.kind ? { kind: params.kind } : {}),
        ...(params.from || params.to
          ? {
              timestamp: {
                ...(params.from ? { gte: params.from } : {}),
                ...(params.to ? { lte: params.to } : {}),
              },
            }
          : {}),
      },
      orderBy: { timestamp: 'desc' },
      take: Math.min(params.limit ?? 100, 1000),
    });
  }

  findLatestByRoom(roomId: string) {
    return this.prisma.sensorReading.findMany({
      where: { device: { roomId } },
      orderBy: { timestamp: 'desc' },
      distinct: ['deviceId', 'kind'],
      include: { device: { select: { id: true, name: true, channel: true } } },
    });
  }

  findLatest(deviceId: string, kind: SensorKind) {
    return this.prisma.sensorReading.findFirst({
      where: { deviceId, kind },
      orderBy: { timestamp: 'desc' },
    });
  }

  // Limite do device, se houver; senão o padrão da organização para o kind.
  async resolveThreshold(deviceId: string, kind: SensorKind) {
    const own = await this.prisma.sensorThreshold.findFirst({
      where: { deviceId, kind, enabled: true },
    });
    if (own) return own;
    return this.prisma.sensorThreshold.findFirst({
      where: { deviceId: null, kind, enabled: true },
    });
  }

  findThresholds() {
    return this.prisma.sensorThreshold.findMany({
      orderBy: [{ kind: 'asc' }, { createdAt: 'asc' }],
    });
  }

  findThreshold(kind: SensorKind, deviceId: string | null) {
    return this.prisma.sensorThreshold.findFirst({ where: { kind, deviceId } });
  }

  findThresholdById(id: string) {
    return this.prisma.sensorThreshold.findUnique({ where: { id } });
  }

  createThreshold(
    data: Omit<Prisma.SensorThresholdUncheckedCreateInput, 'organizationId'>,
  ) {
    return this.prisma.sensorThreshold.create({ data: withTenant(data) });
  }

  updateThreshold(
    id: string,
    data: Prisma.SensorThresholdUncheckedUpdateInput,
  ) {
    return this.prisma.sensorThreshold.update({ where: { id }, data });
  }

  deleteThreshold(id: string) {
    return this.prisma.sensorThreshold.delete({ where: { id } });
  }

  findOpenAlarm(deviceId: string, kind: SensorKind) {
    return this.prisma.sensorAlarm.findFirst({
      where: { deviceId, kind, clearedAt: null },
      orderBy: { startedAt: 'desc' },
    });
  }

  createAlarm(data: {
    deviceId: string;
    kind: SensorKind;
    level: AlarmLevel;
    value: number;
    threshold: number;
    startedAt: Date;
    lastNotifiedAt?: Date;
  }) {
    return this.prisma.sensorAlarm.create({
      data: withTenant({ ...data, peakValue: data.value }),
    });
  }

  updateAlarm(id: string, data: Prisma.SensorAlarmUncheckedUpdateInput) {
    return this.prisma.sensorAlarm.update({ where: { id }, data });
  }

  findAlarms(params: { active?: boolean; deviceId?: string; limit?: number }) {
    return this.prisma.sensorAlarm.findMany({
      where: {
        ...(params.active === true ? { clearedAt: null } : {}),
        ...(params.active === false ? { clearedAt: { not: null } } : {}),
        ...(params.deviceId ? { deviceId: params.deviceId } : {}),
      },
      orderBy: { startedAt: 'desc' },
      take: Math.min(params.limit ?? 100, 500),
      include: {
        device: {
          select: {
            id: true,
            name: true,
            roomId: true,
            room: { select: { name: true } },
          },
        },
      },
    });
  }

  findAlarmById(id: string) {
    return this.prisma.sensorAlarm.findUnique({ where: { id } });
  }

  // Quem recebe aviso de alarme: perfis que podem agir sobre o equipamento.
  findAlarmRecipients() {
    return this.prisma.user.findMany({
      where: {
        role: {
          in: [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.TECHNICIAN],
        },
      },
      select: { id: true },
    });
  }

  findRoom(roomId: string) {
    return this.prisma.room.findUnique({ where: { id: roomId } });
  }

  updateRoom(roomId: string, data: Prisma.RoomUncheckedUpdateInput) {
    return this.prisma.room.update({ where: { id: roomId }, data });
  }

  // Organization não tem escopo de tenant: o id vem do contexto da requisição.
  getAlarmReminderMinutes(organizationId: string) {
    return this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { alarmReminderMinutes: true },
    });
  }

  setAlarmReminderMinutes(organizationId: string, minutes: number) {
    return this.prisma.organization.update({
      where: { id: organizationId },
      data: { alarmReminderMinutes: minutes },
      select: { alarmReminderMinutes: true },
    });
  }

  // Sem escopo de tenant: chamado pela varredura de lembretes via runAsSystem.
  findAlarmsAwaitingReminder() {
    return this.prisma.sensorAlarm.findMany({
      where: {
        clearedAt: null,
        acknowledgedAt: null,
        organization: { alarmReminderMinutes: { gt: 0 } },
      },
      include: {
        device: true,
        organization: { select: { alarmReminderMinutes: true } },
      },
    });
  }

  // Sem escopo de tenant: chamado pela varredura periódica via runAsSystem.
  findOccupiedRoomsAllTenants() {
    return this.prisma.room.findMany({
      where: { occupied: true },
      select: {
        id: true,
        organizationId: true,
        lastMotionAt: true,
        vacancyTimeoutSec: true,
      },
    });
  }
}
