import { alarmTransition, clearBelow } from './alarm-evaluation';

const t = { warnAt: 1500, alarmAt: 1800, clearAt: 1300 };

describe('alarmTransition', () => {
  it('opens at the warning and critical levels', () => {
    expect(alarmTransition(1000, t, null)).toEqual({ action: 'none' });
    expect(alarmTransition(1600, t, null)).toEqual({
      action: 'open',
      level: 'WARNING',
      threshold: 1500,
    });
    expect(alarmTransition(1900, t, null)).toEqual({
      action: 'open',
      level: 'CRITICAL',
      threshold: 1800,
    });
  });

  it('escalates an open warning to critical', () => {
    expect(alarmTransition(1850, t, { level: 'WARNING' })).toEqual({
      action: 'escalate',
      level: 'CRITICAL',
      threshold: 1800,
    });
  });

  it('keeps the alarm open inside the hysteresis band', () => {
    expect(alarmTransition(1400, t, { level: 'WARNING' })).toEqual({
      action: 'update',
    });
    expect(alarmTransition(1299, t, { level: 'WARNING' })).toEqual({
      action: 'clear',
    });
  });

  it('falls back to warnAt, then alarmAt, as the clear level', () => {
    expect(clearBelow({ warnAt: 1500, alarmAt: 1800, clearAt: null })).toBe(
      1500,
    );
    expect(clearBelow({ warnAt: null, alarmAt: 1800, clearAt: null })).toBe(
      1800,
    );
    expect(
      alarmTransition(
        1700,
        { warnAt: null, alarmAt: 1800, clearAt: null },
        { level: 'CRITICAL' },
      ),
    ).toEqual({
      action: 'clear',
    });
  });
});
