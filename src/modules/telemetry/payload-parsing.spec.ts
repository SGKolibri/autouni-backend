import { SensorKind } from '@prisma/client';
import {
  computeIntervalEnergyWh,
  InvalidPayloadError,
  parseBoolean,
  parseEnergyPayload,
  parseSensorPayload,
  parseStatus,
} from './payload-parsing';

describe('parseEnergyPayload', () => {
  it('keeps zero distinct from missing', () => {
    const m = parseEnergyPayload({ powerW: 0, current: 0, voltage: 220 });
    expect(m.current).toBe(0);
    expect(m.powerW).toBe(0);
    expect(m.frequency).toBeNull();
  });

  it('rejects the legacy valueWh payload with an explanation', () => {
    expect(() => parseEnergyPayload({ valueWh: 12 })).toThrow(/legado/);
  });

  it('rejects payloads with no energy or power', () => {
    expect(() => parseEnergyPayload({ voltage: 220 })).toThrow(
      InvalidPayloadError,
    );
  });

  it('rejects out-of-range and non-numeric values', () => {
    expect(() => parseEnergyPayload({ powerW: -1 })).toThrow(/faixa/);
    expect(() => parseEnergyPayload({ powerW: 'abc' })).toThrow(/numérico/);
    expect(() => parseEnergyPayload({ powerW: 10, powerFactor: 1.5 })).toThrow(
      /powerFactor/,
    );
  });

  it('accepts pf as an alias of powerFactor', () => {
    expect(parseEnergyPayload({ powerW: 10, pf: 0.9 }).powerFactor).toBe(0.9);
  });

  it('rejects non-object payloads', () => {
    expect(() => parseEnergyPayload('12')).toThrow(InvalidPayloadError);
    expect(() => parseEnergyPayload([1])).toThrow(InvalidPayloadError);
  });
});

describe('computeIntervalEnergyWh', () => {
  const now = new Date('2026-11-17T12:00:00Z');
  const base = {
    energyWh: null,
    energyTotalWh: null,
    powerW: null,
    voltage: null,
    current: null,
    frequency: null,
    powerFactor: null,
  };

  it('uses energyWh as-is', () => {
    expect(computeIntervalEnergyWh({ ...base, energyWh: 3.2 }, null, now)).toBe(
      3.2,
    );
  });

  it('diffs the meter accumulator and treats the first reading as baseline', () => {
    expect(
      computeIntervalEnergyWh({ ...base, energyTotalWh: 1000 }, null, now),
    ).toBe(0);
    const prev = {
      energyTotalWh: 1000,
      powerW: null,
      timestamp: new Date(now.getTime() - 5000),
    };
    expect(
      computeIntervalEnergyWh({ ...base, energyTotalWh: 1002.5 }, prev, now),
    ).toBeCloseTo(2.5);
  });

  it('handles a meter reset by counting energy since zero', () => {
    const prev = {
      energyTotalWh: 5000,
      powerW: null,
      timestamp: new Date(now.getTime() - 5000),
    };
    expect(
      computeIntervalEnergyWh({ ...base, energyTotalWh: 4 }, prev, now),
    ).toBe(4);
  });

  it('integrates power with the trapezoid rule', () => {
    const prev = {
      energyTotalWh: null,
      powerW: 100,
      timestamp: new Date(now.getTime() - (3600 * 1000) / 12),
    };
    // 5 min a uma média de 150 W = 12,5 Wh. Acima do limite de lacuna -> 0.
    expect(
      computeIntervalEnergyWh(
        { ...base, powerW: 200 },
        { ...prev, timestamp: new Date(now.getTime() - 300_000) },
        now,
      ),
    ).toBeCloseTo(12.5);
    expect(
      computeIntervalEnergyWh(
        { ...base, powerW: 200 },
        { ...prev, timestamp: new Date(now.getTime() - 301_000) },
        now,
      ),
    ).toBe(0);
  });

  it('does not inflate when a device sends power every 5 s', () => {
    // 60 W constantes por uma hora, amostrados a cada 5 s, somam 60 Wh.
    let total = 0;
    let prev: { energyTotalWh: null; powerW: number; timestamp: Date } | null =
      null;
    for (let t = 0; t <= 3600; t += 5) {
      const ts = new Date(now.getTime() + t * 1000);
      total += computeIntervalEnergyWh({ ...base, powerW: 60 }, prev, ts);
      prev = { energyTotalWh: null, powerW: 60, timestamp: ts };
    }
    expect(total).toBeCloseTo(60);
  });
});

describe('parseStatus / parseBoolean', () => {
  it('accepts enum values in raw or JSON form and rejects others', () => {
    expect(parseStatus('ON')).toBe('ON');
    expect(parseStatus({ status: 'off' })).toBe('OFF');
    expect(() => parseStatus('BROKEN')).toThrow(InvalidPayloadError);
  });

  it('parses booleans strictly', () => {
    expect(parseBoolean('true', 'online')).toBe(true);
    expect(parseBoolean({ online: false }, 'online')).toBe(false);
    expect(() => parseBoolean('yes', 'online')).toThrow(InvalidPayloadError);
  });
});

describe('parseSensorPayload', () => {
  it('infers kind from the channel and supports batches', () => {
    expect(
      parseSensorPayload({ value: 900, unit: 'adc' }, SensorKind.GAS_MQ2),
    ).toEqual([{ kind: 'GAS_MQ2', value: 900, unit: 'adc', raw: null }]);
    const batch = parseSensorPayload(
      {
        readings: [
          { kind: 'GAS_MQ2', value: 1 },
          { kind: 'GAS_MQ135', value: 2 },
        ],
      },
      null,
    );
    expect(batch.map((r) => r.kind)).toEqual(['GAS_MQ2', 'GAS_MQ135']);
  });

  it('normalizes motion to 1/0', () => {
    expect(parseSensorPayload({ motion: true }, null)[0]).toMatchObject({
      kind: 'MOTION',
      value: 1,
    });
    expect(parseSensorPayload({ value: 0 }, SensorKind.MOTION)[0].value).toBe(
      0,
    );
  });

  it('rejects unknown kinds and missing values', () => {
    expect(() => parseSensorPayload({ kind: 'CO2', value: 1 }, null)).toThrow(
      /kind/,
    );
    expect(() => parseSensorPayload({ kind: 'GAS_MQ2' }, null)).toThrow(
      /value/,
    );
  });
});
