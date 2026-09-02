import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { DevicesRepository } from '../repository/devices.repository';
import { DeviceStatus } from '../interfaces/devices.interface';

describe('DevicesService', () => {
  let service: DevicesService;
  let repository: jest.Mocked<DevicesRepository>;

  const mockDevice = {
    id: 'device-uuid-1',
    roomId: 'room-uuid-1',
    room: 'H201',
    name: 'Luz Principal',
    type: 'LIGHT',
    status: 'OFF',
    mqttTopic: 'devices/light-101',
    online: false,
    lastSeen: null,
    powerRating: 60,
    intensity: null,
    temperature: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const createDeviceDto = {
    room: 'H201',
    roomId: 'room-uuid-1',
    name: 'Luz Principal',
    type: 'LIGHT' as any,
    status: 'OFF' as any,
    mqttTopic: 'devices/light-101',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicesService,
        {
          provide: DevicesRepository,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            findByRoomId: jest.fn(),
            findByStatus: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            updateStatus: jest.fn(),
            updateOnlineStatus: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DevicesService>(DevicesService);
    repository = module.get(DevicesRepository);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and return device', async () => {
      repository.create.mockResolvedValue(mockDevice as any);
      const result = await service.create(createDeviceDto);
      expect(result).toEqual(mockDevice);
    });

    it('should throw BadRequestException on P2003 error (invalid roomId)', async () => {
      const p2003Error = { code: 'P2003', message: 'Foreign key constraint failed' };
      repository.create.mockRejectedValue(p2003Error);
      await expect(service.create(createDeviceDto)).rejects.toThrow(BadRequestException);
    });

    it('should rethrow other errors', async () => {
      const genericError = new Error('Unexpected DB error');
      repository.create.mockRejectedValue(genericError);
      await expect(service.create(createDeviceDto)).rejects.toThrow('Unexpected DB error');
    });
  });

  describe('findAll', () => {
    it('should return all devices', async () => {
      repository.findAll.mockResolvedValue([mockDevice] as any);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no devices', async () => {
      repository.findAll.mockResolvedValue([]);
      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return device when found', async () => {
      repository.findById.mockResolvedValue(mockDevice as any);
      const result = await service.findById('device-uuid-1');
      expect(result).toEqual(mockDevice);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByRoomId', () => {
    it('should return devices for a room', async () => {
      repository.findByRoomId.mockResolvedValue([mockDevice] as any);
      const result = await service.findByRoomId('room-uuid-1');
      expect(result).toHaveLength(1);
      expect(repository.findByRoomId).toHaveBeenCalledWith('room-uuid-1');
    });
  });

  describe('findByStatus', () => {
    it('should return devices with given status', async () => {
      repository.findByStatus.mockResolvedValue([mockDevice] as any);
      const result = await service.findByStatus(DeviceStatus.OFF);
      expect(result).toHaveLength(1);
      expect(repository.findByStatus).toHaveBeenCalledWith(DeviceStatus.OFF);
    });
  });

  describe('update', () => {
    it('should update device when found', async () => {
      const updated = { ...mockDevice, name: 'Luz Secundária' };
      repository.findById.mockResolvedValue(mockDevice as any);
      repository.update.mockResolvedValue(updated as any);
      const result = await service.update('device-uuid-1', { name: 'Luz Secundária' } as any);
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when device not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.update('non-existent', {} as any)).rejects.toThrow(NotFoundException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException on P2003 error during update', async () => {
      repository.findById.mockResolvedValue(mockDevice as any);
      const p2003Error = { code: 'P2003', message: 'Foreign key constraint failed' };
      repository.update.mockRejectedValue(p2003Error);
      await expect(service.update('device-uuid-1', { roomId: 'bad-room' } as any)).rejects.toThrow(BadRequestException);
    });

    it('should rethrow other errors during update', async () => {
      repository.findById.mockResolvedValue(mockDevice as any);
      const genericError = new Error('DB error');
      repository.update.mockRejectedValue(genericError);
      await expect(service.update('device-uuid-1', {} as any)).rejects.toThrow('DB error');
    });
  });

  describe('delete', () => {
    it('should delete device when found', async () => {
      repository.findById.mockResolvedValue(mockDevice as any);
      repository.delete.mockResolvedValue(mockDevice as any);
      await service.delete('device-uuid-1');
      expect(repository.delete).toHaveBeenCalledWith('device-uuid-1');
    });

    it('should throw NotFoundException when device not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.delete('non-existent')).rejects.toThrow(NotFoundException);
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('should update status when device found', async () => {
      const updated = { ...mockDevice, status: 'ON' };
      repository.findById.mockResolvedValue(mockDevice as any);
      repository.updateStatus.mockResolvedValue(updated as any);
      const result = await service.updateStatus('device-uuid-1', DeviceStatus.ON);
      expect(result.status).toBe('ON');
    });

    it('should throw NotFoundException when device not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.updateStatus('non-existent', DeviceStatus.ON)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateOnlineStatus', () => {
    it('should update online status when device found', async () => {
      const updated = { ...mockDevice, online: true };
      repository.findById.mockResolvedValue(mockDevice as any);
      repository.updateOnlineStatus.mockResolvedValue(updated as any);
      const result = await service.updateOnlineStatus('device-uuid-1', true);
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when device not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.updateOnlineStatus('non-existent', true)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDeviceStats', () => {
    it('should return correct stats from all devices', async () => {
      const now = new Date();
      const recentDate = new Date(now.getTime() - 2 * 60 * 1000); // 2 min ago
      const oldDate = new Date(now.getTime() - 10 * 60 * 1000); // 10 min ago

      const devices = [
        { ...mockDevice, id: '1', status: 'ON', lastSeen: recentDate, type: 'LIGHT' },
        { ...mockDevice, id: '2', status: 'OFF', lastSeen: oldDate, type: 'AC' },
        { ...mockDevice, id: '3', status: 'STANDBY', lastSeen: null, type: 'LIGHT' },
        { ...mockDevice, id: '4', status: 'ERROR', lastSeen: recentDate, type: 'SENSOR' },
      ];
      repository.findAll.mockResolvedValue(devices as any);
      const stats = await service.getDeviceStats();
      expect(stats.total).toBe(4);
      expect(stats.online).toBe(2);
      expect(stats.offline).toBe(2);
      expect(stats.byStatus.on).toBe(1);
      expect(stats.byStatus.off).toBe(1);
      expect(stats.byStatus.standby).toBe(1);
      expect(stats.byStatus.error).toBe(1);
      expect(stats.byType['LIGHT']).toBe(2);
      expect(stats.byType['AC']).toBe(1);
      expect(stats.byType['SENSOR']).toBe(1);
    });

    it('should return zero stats when no devices', async () => {
      repository.findAll.mockResolvedValue([]);
      const stats = await service.getDeviceStats();
      expect(stats.total).toBe(0);
      expect(stats.online).toBe(0);
      expect(stats.offline).toBe(0);
    });
  });
});
