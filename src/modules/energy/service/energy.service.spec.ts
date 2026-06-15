import { EnergyService } from './energy.service';

describe('EnergyService', () => {
  it('uses fallback consumption when today has no telemetry', async () => {
    const energyRepository = {
      aggregateGlobal: jest.fn().mockResolvedValue({
        totalKwh: 0,
        count: 0,
      }),
      findDevicesForConsumption: jest.fn().mockResolvedValue([
        { status: 'on', metadata: { power: '120W' } },
        { status: 'ON', powerRating: '50W' },
      ]),
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
    } as any;

    const service = new EnergyService(energyRepository);
    const result = await service.getGlobalStats('today');

    expect(result.totalKwh).toBeGreaterThan(0);
    expect(result.totalEnergy).toBe(result.todayEnergyKwh);
    expect(result.activeDevices).toBe(2);
    expect(result.totalDevices).toBe(2);
    expect(result.count).toBe(2);
  });

  it('keeps telemetry totals when readings exist', async () => {
    const energyRepository = {
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
    } as any;

    const service = new EnergyService(energyRepository);
    const result = await service.getGlobalStats('today');

    expect(result.totalKwh).toBe(5.5);
    expect(result.count).toBe(11);
    expect(result.avgWh).toBe(500);
    expect(result.activeDevices).toBe(1);
    expect(result.totalDevices).toBe(1);
  });
});
