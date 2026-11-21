import {
  InvalidRuleError,
  occupancyMet,
  parseAction,
  parseCondition,
  sensorMet,
} from './automation-rules';

describe('parseCondition', () => {
  it('parses occupancy and sensor conditions with defaults', () => {
    expect(
      parseCondition(
        '{"type":"occupancy","roomId":"r1","occupied":false,"forSeconds":600}',
      ),
    ).toEqual({
      type: 'occupancy',
      roomId: 'r1',
      occupied: false,
      forSeconds: 600,
    });
    expect(
      parseCondition({
        type: 'sensor',
        deviceId: 'd1',
        kind: 'GAS_MQ2',
        op: 'gte',
        value: 1800,
      }),
    ).toMatchObject({
      maxAgeSeconds: 300,
    });
  });

  it('rejects the old free-form expressions and malformed rules', () => {
    expect(() => parseCondition('temperature > 25')).toThrow(InvalidRuleError);
    expect(() =>
      parseCondition({
        type: 'sensor',
        deviceId: 'd1',
        kind: 'CO2',
        op: 'gt',
        value: 1,
      }),
    ).toThrow(/kind/);
    expect(() =>
      parseCondition({ type: 'occupancy', roomId: 'r1', occupied: 'no' }),
    ).toThrow(/occupied/);
  });
});

describe('parseAction', () => {
  it('accepts device commands and device command topics only', () => {
    expect(parseAction({ deviceId: 'd1', command: 'OFF' })).toEqual({
      kind: 'device',
      deviceId: 'd1',
      command: 'off',
    });
    expect(
      parseAction(
        '{"topic":"devices/ac-a206/command","payload":{"state":"OFF"}}',
      ),
    ).toMatchObject({ kind: 'topic' });
    expect(() =>
      parseAction({ topic: '$CONTROL/dynamic-security/v1' }),
    ).toThrow(InvalidRuleError);
    expect(() => parseAction({ topic: 'devices/x/status' })).toThrow(
      InvalidRuleError,
    );
    expect(() => parseAction({ deviceId: 'd1', command: 'explode' })).toThrow(
      /command/,
    );
  });
});

describe('condition evaluation', () => {
  const now = new Date('2026-11-17T12:00:00Z');

  it('requires the room to stay in the state for forSeconds', () => {
    const cond = {
      type: 'occupancy' as const,
      roomId: 'r',
      occupied: false,
      forSeconds: 600,
    };
    expect(
      occupancyMet(
        cond,
        {
          occupied: false,
          occupancyChangedAt: new Date(now.getTime() - 599_000),
        },
        now,
      ),
    ).toBe(false);
    expect(
      occupancyMet(
        cond,
        {
          occupied: false,
          occupancyChangedAt: new Date(now.getTime() - 600_000),
        },
        now,
      ),
    ).toBe(true);
    expect(
      occupancyMet(cond, { occupied: true, occupancyChangedAt: null }, now),
    ).toBe(false);
    expect(
      occupancyMet(cond, { occupied: false, occupancyChangedAt: null }, now),
    ).toBe(true);
  });

  it('ignores stale sensor readings', () => {
    const cond = {
      type: 'sensor' as const,
      deviceId: 'd',
      kind: 'GAS_MQ2' as const,
      op: 'gte' as const,
      value: 1800,
      maxAgeSeconds: 300,
    };
    expect(
      sensorMet(
        cond,
        { value: 1900, timestamp: new Date(now.getTime() - 10_000) },
        now,
      ),
    ).toBe(true);
    expect(
      sensorMet(
        cond,
        { value: 1900, timestamp: new Date(now.getTime() - 301_000) },
        now,
      ),
    ).toBe(false);
    expect(sensorMet(cond, { value: 1700, timestamp: now }, now)).toBe(false);
    expect(sensorMet(cond, null, now)).toBe(false);
  });
});
