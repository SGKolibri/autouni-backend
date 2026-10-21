import {
  estimateBuildingDailyConsumptionKwh,
  summarizeBuildingConsumption,
} from './building-energy.utils';

describe('building-energy utils', () => {
  it('returns zero consumption for a building without devices', () => {
    const building = { floors: [] };
    const from = new Date('2026-06-14T00:00:00.000Z');
    const to = new Date('2026-06-14T12:00:00.000Z');

    expect(summarizeBuildingConsumption(building, from, to, 0, 0)).toEqual({
      totalKwh: 0,
      count: 0,
      totalDevices: 0,
      activeDevices: 0,
      todayEnergyKwh: 0,
      dailyConsumptionKwh: 0,
      totalEnergy: 0,
      energyPeriod: 'today',
    });
  });

  it('normalizes lowercase on status and estimates from nominal power', () => {
    const building = {
      floors: [
        {
          rooms: [
            {
              devices: [
                { status: 'on', powerRating: '100W' },
                { status: 'OFF', metadata: { power: '200W' } },
              ],
            },
          ],
        },
      ],
    };
    const from = new Date('2026-06-14T00:00:00.000Z');
    const to = new Date('2026-06-14T06:00:00.000Z');

    expect(estimateBuildingDailyConsumptionKwh(building, from, to)).toBe(0.6);
    expect(summarizeBuildingConsumption(building, from, to, 0, 0)).toEqual({
      totalKwh: 0.6,
      count: 1,
      totalDevices: 2,
      activeDevices: 1,
      todayEnergyKwh: 0.6,
      dailyConsumptionKwh: 0.6,
      totalEnergy: 0.6,
      energyPeriod: 'today',
    });
  });

  it('parses BTU power values without telemetry', () => {
    const building = {
      floors: [
        {
          rooms: [
            {
              devices: [{ status: 'ON', metadata: { power: '24000 BTU' } }],
            },
          ],
        },
      ],
    };
    const from = new Date('2026-06-14T00:00:00.000Z');
    const to = new Date('2026-06-14T01:00:00.000Z');

    expect(summarizeBuildingConsumption(building, from, to, 0, 0).todayEnergyKwh).toBeGreaterThan(0);
  });

  it('falls back when telemetry exists but sums to zero', () => {
    const building = {
      floors: [
        {
          rooms: [
            {
              devices: [{ status: 'ON', metadata: { power: '100W' } }],
            },
          ],
        },
      ],
    };
    const from = new Date('2026-06-14T00:00:00.000Z');
    const to = new Date('2026-06-14T01:00:00.000Z');

    expect(summarizeBuildingConsumption(building, from, to, 0, 12).todayEnergyKwh).toBeGreaterThan(0);
  });

  it('accepts boolean true as active status', () => {
    const building = {
      floors: [
        {
          rooms: [
            {
              devices: [{ status: true, metadata: { power: '100W' } }],
            },
          ],
        },
      ],
    };
    const from = new Date('2026-06-14T00:00:00.000Z');
    const to = new Date('2026-06-14T01:00:00.000Z');

    expect(summarizeBuildingConsumption(building, from, to, 0, 0).activeDevices).toBe(1);
  });

  it('uses telemetry when available across multiple floors, rooms and devices', () => {
    const building = {
      floors: [
        {
          rooms: [
            {
              devices: [
                { status: 'on', powerRating: 60 },
                { status: 'OFF', powerRating: 40 },
              ],
            },
            {
              devices: [{ status: 'ON', metadata: { power: 25 } }],
            },
          ],
        },
        {
          rooms: [
            {
              devices: [
                { status: 'standby', powerRating: 15 },
                { status: 'on', metadata: { power: '75' } },
              ],
            },
          ],
        },
      ],
    };
    const from = new Date('2026-06-14T00:00:00.000Z');
    const to = new Date('2026-06-14T18:00:00.000Z');

    expect(summarizeBuildingConsumption(building, from, to, 3.25, 4)).toEqual({
      totalKwh: 3.25,
      count: 4,
      totalDevices: 5,
      activeDevices: 3,
      todayEnergyKwh: 3.25,
      dailyConsumptionKwh: 3.25,
      totalEnergy: 3.25,
      energyPeriod: 'today',
    });
  });
});
