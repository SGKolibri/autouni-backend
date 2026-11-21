import { Test, TestingModule } from '@nestjs/testing';
import { EnergyService } from './energy.service';
import { EnergyRepository } from '../repository/energy.repository';

describe('EnergyService', () => {
  let service: EnergyService;
  let repository: jest.Mocked<EnergyRepository>;

  const mockReading = {
    id: 'reading-uuid-1',
    deviceId: 'device-uuid-1',
    energyWh: 150.5,
    powerW: 1200,
    voltage: 220,
    current: 0.68,
    timestamp: new Date('2025-01-01'),
    createdAt: new Date('2025-01-01'),
  };

  const mockAggregation = {
    totalKwh: 1.5,
    count: 10,
    avgWh: 150,
    maxWh: 200,
    minWh: 100,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnergyService,
        {
          provide: EnergyRepository,
          useValue: {
            createReading: jest.fn(),
            findLastReading: jest.fn().mockResolvedValue(null),
            findReadingsByDevice: jest.fn(),
            findReadingsByRoom: jest.fn(),
            aggregateByDevice: jest.fn(),
            aggregateByRoom: jest.fn(),
            aggregateByFloor: jest.fn(),
            aggregateByBuilding: jest.fn(),
            deleteOldReadings: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EnergyService>(EnergyService);
    repository = module.get(EnergyRepository);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createReading', () => {
    it('should store an explicit interval energy as-is', async () => {
      repository.createReading.mockResolvedValue(mockReading as any);
      const result = await service.createReading({ deviceId: 'device-uuid-1', energyWh: 150.5, voltage: 220, current: 0.68 });
      expect(result).toEqual(mockReading);
      expect(repository.createReading).toHaveBeenCalledWith(
        expect.objectContaining({ deviceId: 'device-uuid-1', energyWh: 150.5, voltage: 220, current: 0.68 }),
      );
    });

    it('should derive interval energy from the meter accumulator', async () => {
      repository.findLastReading.mockResolvedValue({ energyTotalWh: 1000, powerW: null, timestamp: new Date() } as any);
      await service.createReading({ deviceId: 'device-uuid-1', energyTotalWh: 1004 });
      expect(repository.createReading).toHaveBeenCalledWith(expect.objectContaining({ energyWh: 4, energyTotalWh: 1004 }));
    });

    it('should reject a reading without energy or power', async () => {
      await expect(service.createReading({ deviceId: 'device-uuid-1', voltage: 220 })).rejects.toThrow(/energyWh/);
      expect(repository.createReading).not.toHaveBeenCalled();
    });
  });

  describe('ingestMeasurement', () => {
    it('should refuse energy from a channel that does not measure energy', async () => {
      await expect(
        service.ingestMeasurement({ id: 'd', channel: 'GAS_MQ2' } as any, { powerW: 10 }),
      ).rejects.toThrow(/não produz leitura de energia/);
    });
  });

  describe('getDeviceReadings', () => {
    it('should return readings for a device', async () => {
      repository.findReadingsByDevice.mockResolvedValue([mockReading] as any);
      const result = await service.getDeviceReadings('device-uuid-1');
      expect(result).toHaveLength(1);
      expect(repository.findReadingsByDevice).toHaveBeenCalledWith('device-uuid-1', undefined);
    });

    it('should pass query params to repository', async () => {
      repository.findReadingsByDevice.mockResolvedValue([]);
      const params = { from: new Date('2025-01-01'), to: new Date('2025-01-31'), limit: 50 };
      await service.getDeviceReadings('device-uuid-1', params);
      expect(repository.findReadingsByDevice).toHaveBeenCalledWith('device-uuid-1', params);
    });
  });

  describe('getRoomReadings', () => {
    it('should return readings for a room', async () => {
      repository.findReadingsByRoom.mockResolvedValue([mockReading] as any);
      const result = await service.getRoomReadings('room-uuid-1');
      expect(result).toHaveLength(1);
      expect(repository.findReadingsByRoom).toHaveBeenCalledWith('room-uuid-1', undefined);
    });
  });

  describe('getDeviceEnergyStats', () => {
    it('should return aggregated stats for a device', async () => {
      repository.aggregateByDevice.mockResolvedValue(mockAggregation);
      const result = await service.getDeviceEnergyStats('device-uuid-1');
      expect(result).toEqual(mockAggregation);
      expect(repository.aggregateByDevice).toHaveBeenCalledWith('device-uuid-1', undefined);
    });

    it('should pass params to repository', async () => {
      repository.aggregateByDevice.mockResolvedValue(mockAggregation);
      const params = { from: new Date('2025-01-01') };
      await service.getDeviceEnergyStats('device-uuid-1', params);
      expect(repository.aggregateByDevice).toHaveBeenCalledWith('device-uuid-1', params);
    });
  });

  describe('getRoomEnergyStats', () => {
    it('should return aggregated stats for a room', async () => {
      repository.aggregateByRoom.mockResolvedValue(mockAggregation);
      const result = await service.getRoomEnergyStats('room-uuid-1');
      expect(result).toEqual(mockAggregation);
    });
  });

  describe('getFloorEnergyStats', () => {
    it('should return aggregated stats for a floor', async () => {
      repository.aggregateByFloor.mockResolvedValue(mockAggregation);
      const result = await service.getFloorEnergyStats('floor-uuid-1');
      expect(result).toEqual(mockAggregation);
    });
  });

  describe('getBuildingEnergyStats', () => {
    it('should return aggregated stats for a building', async () => {
      repository.aggregateByBuilding.mockResolvedValue(mockAggregation);
      const result = await service.getBuildingEnergyStats('building-uuid-1');
      expect(result).toEqual(mockAggregation);
    });
  });

  describe('deviceEnergyKwh (legacy)', () => {
    it('should return totalKwh for device', async () => {
      repository.aggregateByDevice.mockResolvedValue(mockAggregation);
      const result = await service.deviceEnergyKwh('device-uuid-1');
      expect(result).toBe(mockAggregation.totalKwh);
    });

    it('should pass from/to dates to aggregation', async () => {
      repository.aggregateByDevice.mockResolvedValue(mockAggregation);
      const from = new Date('2025-01-01');
      const to = new Date('2025-01-31');
      await service.deviceEnergyKwh('device-uuid-1', from, to);
      expect(repository.aggregateByDevice).toHaveBeenCalledWith('device-uuid-1', { from, to });
    });
  });

  describe('roomEnergyKwh (legacy)', () => {
    it('should return totalKwh for room', async () => {
      repository.aggregateByRoom.mockResolvedValue(mockAggregation);
      const result = await service.roomEnergyKwh('room-uuid-1');
      expect(result).toBe(mockAggregation.totalKwh);
    });
  });

  describe('buildingEnergyKwh (legacy)', () => {
    it('should return totalKwh for building', async () => {
      repository.aggregateByBuilding.mockResolvedValue(mockAggregation);
      const result = await service.buildingEnergyKwh('building-uuid-1');
      expect(result).toBe(mockAggregation.totalKwh);
    });
  });

  describe('cleanupOldReadings', () => {
    it('should delete readings older than default 90 days', async () => {
      repository.deleteOldReadings.mockResolvedValue(50);
      const result = await service.cleanupOldReadings();
      expect(result).toBe(50);
      expect(repository.deleteOldReadings).toHaveBeenCalledWith(expect.any(Date));
      const calledDate = repository.deleteOldReadings.mock.calls[0][0] as Date;
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - 90);
      expect(Math.abs(calledDate.getTime() - expectedDate.getTime())).toBeLessThan(1000);
    });

    it('should delete readings older than custom days', async () => {
      repository.deleteOldReadings.mockResolvedValue(10);
      const result = await service.cleanupOldReadings(30);
      expect(result).toBe(10);
      const calledDate = repository.deleteOldReadings.mock.calls[0][0] as Date;
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - 30);
      expect(Math.abs(calledDate.getTime() - expectedDate.getTime())).toBeLessThan(1000);
    });
  });
});
