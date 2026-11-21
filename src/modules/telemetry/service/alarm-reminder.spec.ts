import { AlarmLevel, NotificationType, SensorKind } from '@prisma/client';
import { TelemetryService } from './telemetry.service';

const ORG = '00000000-0000-0000-0000-000000000001';
const device = { id: 'dev-1', name: 'Sensor Gás MQ-135 A206', organizationId: ORG, roomId: 'room-1' };

function makeAlarm(overrides: Record<string, unknown> = {}) {
  return {
    id: 'alarm-1',
    organizationId: ORG,
    deviceId: device.id,
    kind: SensorKind.GAS_MQ135,
    level: AlarmLevel.CRITICAL,
    value: 2500,
    peakValue: 2999,
    threshold: 1800,
    startedAt: new Date('2026-11-21T22:00:00Z'),
    lastNotifiedAt: new Date('2026-11-21T22:00:00Z'),
    clearedAt: null,
    acknowledgedAt: null,
    acknowledgedById: null,
    device,
    organization: { alarmReminderMinutes: 5 },
    ...overrides,
  };
}

function setup(alarms: unknown[]) {
  const repository = {
    findAlarmsAwaitingReminder: jest.fn().mockResolvedValue(alarms),
    findAlarmRecipients: jest.fn().mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]),
    updateAlarm: jest.fn().mockResolvedValue({}),
  };
  const notifications = { create: jest.fn().mockResolvedValue({}) };
  const service = new TelemetryService(
    repository as any,
    { emitToOrganization: jest.fn() } as any,
    notifications as any,
    { emit: jest.fn() } as any,
  );
  return { service, repository, notifications };
}

describe('TelemetryService.sweepAlarmReminders', () => {
  it('relembra todos os destinatários quando o intervalo passou desde o último aviso', async () => {
    const { service, repository, notifications } = setup([makeAlarm()]);
    const now = new Date('2026-11-21T22:05:00Z');

    await service.sweepAlarmReminders(now);

    expect(repository.updateAlarm).toHaveBeenCalledWith('alarm-1', { lastNotifiedAt: now });
    expect(notifications.create).toHaveBeenCalledTimes(2);
    const sent = notifications.create.mock.calls[0][0];
    expect(sent.type).toBe(NotificationType.ERROR);
    expect(sent.title).toContain('Lembrete');
    expect(sent.message).toContain('Ativo há 5 min');
    expect(sent.link).toBe('/devices/dev-1');
  });

  it('não relembra antes do intervalo', async () => {
    const { service, repository, notifications } = setup([makeAlarm()]);

    await service.sweepAlarmReminders(new Date('2026-11-21T22:04:59Z'));

    expect(repository.updateAlarm).not.toHaveBeenCalled();
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('respeita o intervalo configurado na organização', async () => {
    const alarm = makeAlarm({ organization: { alarmReminderMinutes: 15 } });
    const { service, notifications } = setup([alarm]);

    await service.sweepAlarmReminders(new Date('2026-11-21T22:10:00Z'));
    expect(notifications.create).not.toHaveBeenCalled();

    await service.sweepAlarmReminders(new Date('2026-11-21T22:15:00Z'));
    expect(notifications.create).toHaveBeenCalled();
  });

  it('conta da abertura quando o alarme nunca registrou aviso', async () => {
    const { service, notifications } = setup([makeAlarm({ lastNotifiedAt: null })]);

    await service.sweepAlarmReminders(new Date('2026-11-21T22:05:00Z'));

    expect(notifications.create).toHaveBeenCalled();
  });
});
