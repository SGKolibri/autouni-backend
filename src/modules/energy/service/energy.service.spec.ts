import { EnergyService } from './energy.service';

const LAST_READING_AT = new Date('2026-05-25T23:41:01.945Z');

function makeRepo(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    aggregateGlobal: jest.fn().mockResolvedValue({ totalKwh: 0, count: 0 }),
    findDevicesForConsumption: jest.fn().mockResolvedValue([]),
    getLastReadingTimestamp: jest.fn().mockResolvedValue(LAST_READING_AT),
    findReadingsByDevice: jest.fn(),
    findReadingsByRoom: jest.fn(),
    aggregateByDevice: jest.fn(),
    aggregateByRoom: jest.fn(),
    aggregateByFloor: jest.fn(),
    aggregateByBuilding: jest.fn(),
    getDeviceIdsForScope: jest.fn(),
    getHistoryBuckets: jest.fn(),
    getComparisonStats: jest.fn(),
    deleteOldReadings: jest.fn(),
    createReading: jest.fn(),
    ...overrides,
  } as any;
}

describe('EnergyService.getGlobalStats', () => {
  it('uses fallback consumption when today has no telemetry; count reflects readings (0)', async () => {
    const repo = makeRepo({
      aggregateGlobal: jest.fn().mockResolvedValue({ totalKwh: 0, count: 0 }),
      findDevicesForConsumption: jest.fn().mockResolvedValue([
        { status: 'on', metadata: { power: '120W' } },
        { status: 'ON', powerRating: '50W' },
      ]),
    });

    const service = new EnergyService(repo);
    const result = await service.getGlobalStats('today');

    expect(result.totalKwh).toBeGreaterThan(0);
    expect(result.totalEnergy).toBe(result.todayEnergyKwh);
    expect(result.activeDevices).toBe(2);
    expect(result.totalDevices).toBe(2);
    // count and readingCount must be the number of EnergyReading rows — NOT activeDevices
    expect(result.count).toBe(0);
    expect(result.readingCount).toBe(0);
    expect(result.hasData).toBe(true);
    expect(result.lastReadingAt).toBe(LAST_READING_AT);
  });

  it('keeps telemetry totals when readings exist', async () => {
    const repo = makeRepo({
      aggregateGlobal: jest.fn().mockResolvedValue({
        totalKwh: 5.5,
        count: 11,
        avgWh: 500,
        maxWh: 900,
        minWh: 50,
      }),
      findDevicesForConsumption: jest.fn().mockResolvedValue([
        { status: 'on', metadata: { power: 120 } },
      ]),
    });

    const service = new EnergyService(repo);
    const result = await service.getGlobalStats('today');

    expect(result.totalKwh).toBe(5.5);
    expect(result.count).toBe(11);
    expect(result.readingCount).toBe(11);
    expect(result.avgWh).toBe(500);
    expect(result.activeDevices).toBe(1);
    expect(result.totalDevices).toBe(1);
    expect(result.hasData).toBe(true);
    expect(result.lastReadingAt).toBe(LAST_READING_AT);
  });

  it('falls back to estimation when telemetry count > 0 but total energy is zero', async () => {
    const repo = makeRepo({
      aggregateGlobal: jest.fn().mockResolvedValue({ totalKwh: 0, count: 233 }),
      findDevicesForConsumption: jest.fn().mockResolvedValue([
        { status: 'ON', metadata: { power: '60W' } },
      ]),
    });

    const service = new EnergyService(repo);
    const result = await service.getGlobalStats('today');

    expect(result.totalKwh).toBeGreaterThan(0);
    expect(result.todayEnergyKwh).toBeGreaterThan(0);
    expect(result.activeDevices).toBe(1);
    // readingCount is the actual DB count, even though energy fell back to estimation
    expect(result.readingCount).toBe(233);
    expect(result.hasData).toBe(true);
  });

  it('returns hasData false when no readings and all devices lack power data', async () => {
    const repo = makeRepo({
      aggregateGlobal: jest.fn().mockResolvedValue({ totalKwh: 0, count: 0 }),
      findDevicesForConsumption: jest.fn().mockResolvedValue([
        { status: 'ON', metadata: { type: 'PIR', range: '6m' } },
        { status: 'ON', metadata: { brand: 'Epson', resolution: '1920x1080' } },
      ]),
      getLastReadingTimestamp: jest.fn().mockResolvedValue(LAST_READING_AT),
    });

    const service = new EnergyService(repo);
    const result = await service.getGlobalStats('today');

    expect(result.totalKwh).toBe(0);
    expect(result.count).toBe(0);
    expect(result.hasData).toBe(false);
    expect(result.lastReadingAt).toBe(LAST_READING_AT);
  });
});
