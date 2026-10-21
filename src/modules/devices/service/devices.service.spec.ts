import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { DevicesRepository } from '../repository/devices.repository';
import { MqttService } from '../../mqtt/service/mqtt.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { DeviceCommand, DeviceStatus } from '../interfaces/devices.interface';

describe('DevicesService', () => {
  let service: DevicesService;
  let repository: jest.Mocked<DevicesRepository>;
  let mqttService: jest.Mocked<MqttService>;
  let emit: jest.Mock;

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
    emit = jest.fn();

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
        {
          provide: MqttService,
          useValue: {
            publish: jest.fn(),
            isConnected: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: RealtimeGateway,
          useValue: { server: { emit } },
        },
      ],
    }).compile();

    service = module.get<DevicesService>(DevicesService);
    repository = module.get(DevicesRepository);
    mqttService = module.get(MqttService);
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

    it('should publish the command to MQTT and emit device:status', async () => {
      repository.findById.mockResolvedValue(mockDevice as any);
      repository.updateStatus.mockResolvedValue({ ...mockDevice, status: 'ON' } as any);

      await service.updateStatus('device-uuid-1', DeviceStatus.ON);

      expect(mqttService.publish).toHaveBeenCalledWith('devices/light-101/command', {
        state: DeviceStatus.ON,
      });
      expect(emit).toHaveBeenCalledWith(
        'device:status',
        expect.objectContaining({ deviceId: 'device-uuid-1', status: 'ON' }),
      );
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

  describe('control', () => {
    const controlled = (status: string) => ({ ...mockDevice, status });

    it('should turn the device on and publish the command', async () => {
      repository.findById.mockResolvedValue(mockDevice as any);
      repository.updateStatus.mockResolvedValue(controlled('ON') as any);

      const result = await service.control('device-uuid-1', {
        command: DeviceCommand.ON,
      });

      expect(mqttService.publish).toHaveBeenCalledWith('devices/light-101/command', {
        state: DeviceStatus.ON,
      });
      expect(repository.updateStatus).toHaveBeenCalledWith('device-uuid-1', DeviceStatus.ON);
      expect(result.status).toBe('ON');
      expect(result.pending).toBe(true);
    });

    it('should forward temperature and intensity in the MQTT payload', async () => {
      repository.findById.mockResolvedValue(mockDevice as any);
      repository.updateStatus.mockResolvedValue(controlled('ON') as any);

      await service.control('device-uuid-1', {
        command: DeviceCommand.ON,
        temperature: 22,
        intensity: 80,
      });

      expect(mqttService.publish).toHaveBeenCalledWith('devices/light-101/command', {
        state: DeviceStatus.ON,
        temperature: 22,
        intensity: 80,
      });
    });

    it('should emit device:status on the websocket', async () => {
      repository.findById.mockResolvedValue(mockDevice as any);
      repository.updateStatus.mockResolvedValue(controlled('ON') as any);

      await service.control('device-uuid-1', { command: DeviceCommand.ON });

      expect(emit).toHaveBeenCalledWith(
        'device:status',
        expect.objectContaining({ deviceId: 'device-uuid-1', status: 'ON' }),
      );
    });

    it('should throw NotFoundException when device does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.control('non-existent', { command: DeviceCommand.ON }),
      ).rejects.toThrow(NotFoundException);
      expect(mqttService.publish).not.toHaveBeenCalled();
      expect(repository.updateStatus).not.toHaveBeenCalled();
    });

    describe('toggle', () => {
      it('should turn OFF a device that is ON', async () => {
        repository.findById.mockResolvedValue(controlled('ON') as any);
        repository.updateStatus.mockResolvedValue(controlled('OFF') as any);

        const result = await service.control('device-uuid-1', {
          command: DeviceCommand.TOGGLE,
        });

        expect(result.status).toBe('OFF');
        expect(mqttService.publish).toHaveBeenCalledWith(
          'devices/light-101/command',
          { state: DeviceStatus.OFF },
        );
      });

      it('should turn ON a device that is OFF', async () => {
        repository.findById.mockResolvedValue(controlled('OFF') as any);
        repository.updateStatus.mockResolvedValue(controlled('ON') as any);

        const result = await service.control('device-uuid-1', {
          command: DeviceCommand.TOGGLE,
        });

        expect(result.status).toBe('ON');
      });

      it('should turn ON a device stuck in STANDBY', async () => {
        repository.findById.mockResolvedValue(controlled('STANDBY') as any);
        repository.updateStatus.mockResolvedValue(controlled('ON') as any);

        await service.control('device-uuid-1', { command: DeviceCommand.TOGGLE });

        expect(repository.updateStatus).toHaveBeenCalledWith(
          'device-uuid-1',
          DeviceStatus.ON,
        );
      });

      it('should turn ON a device stuck in ERROR', async () => {
        repository.findById.mockResolvedValue(controlled('ERROR') as any);
        repository.updateStatus.mockResolvedValue(controlled('ON') as any);

        await service.control('device-uuid-1', { command: DeviceCommand.TOGGLE });

        expect(repository.updateStatus).toHaveBeenCalledWith(
          'device-uuid-1',
          DeviceStatus.ON,
        );
      });

      it('should ignore the client-provided value hint and use the stored status', async () => {
        // Cliente acha que o device está OFF, mas o banco diz ON (confirmado por MQTT).
        repository.findById.mockResolvedValue(controlled('ON') as any);
        repository.updateStatus.mockResolvedValue(controlled('OFF') as any);

        await service.control('device-uuid-1', {
          command: DeviceCommand.TOGGLE,
          value: DeviceStatus.ON,
        });

        expect(repository.updateStatus).toHaveBeenCalledWith(
          'device-uuid-1',
          DeviceStatus.OFF,
        );
      });
    });

    describe('when the command cannot reach the broker', () => {
      it('should persist the status but report pending=false for a device without mqttTopic', async () => {
        const topicless = { ...mockDevice, mqttTopic: null };
        repository.findById.mockResolvedValue(topicless as any);
        repository.updateStatus.mockResolvedValue({ ...topicless, status: 'ON' } as any);

        const result = await service.control('device-uuid-1', {
          command: DeviceCommand.ON,
        });

        expect(mqttService.publish).not.toHaveBeenCalled();
        expect(repository.updateStatus).toHaveBeenCalledWith('device-uuid-1', DeviceStatus.ON);
        expect(result.status).toBe('ON');
        expect(result.pending).toBe(false);
      });

      it('should report pending=false when the MQTT client is disconnected', async () => {
        mqttService.isConnected.mockReturnValue(false);
        repository.findById.mockResolvedValue(mockDevice as any);
        repository.updateStatus.mockResolvedValue(controlled('ON') as any);

        const result = await service.control('device-uuid-1', {
          command: DeviceCommand.ON,
        });

        expect(mqttService.publish).not.toHaveBeenCalled();
        expect(result.pending).toBe(false);
      });
    });
  });

  describe('bulkControl', () => {
    it('should apply the command to every device', async () => {
      repository.findById.mockResolvedValue(mockDevice as any);
      repository.updateStatus.mockResolvedValue({ ...mockDevice, status: 'OFF' } as any);

      const result = await service.bulkControl({
        deviceIds: ['device-uuid-1', 'device-uuid-2'],
        command: DeviceCommand.OFF,
      });

      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.failedDevices).toEqual([]);
    });

    it('should not abort the batch when one device fails', async () => {
      repository.findById
        .mockResolvedValueOnce(mockDevice as any)
        .mockResolvedValueOnce(null) // segundo device não existe
        .mockResolvedValueOnce(mockDevice as any);
      repository.updateStatus.mockResolvedValue({ ...mockDevice, status: 'ON' } as any);

      const result = await service.bulkControl({
        deviceIds: ['ok-1', 'missing', 'ok-2'],
        command: DeviceCommand.ON,
      });

      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(1);
      expect(result.failedDevices).toEqual(['missing']);
    });

    it('should report every device as failed when none exist', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await service.bulkControl({
        deviceIds: ['a', 'b'],
        command: DeviceCommand.OFF,
      });

      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(2);
      expect(result.failedDevices).toEqual(['a', 'b']);
    });
  });

  describe('findAll', () => {
    it('should forward status and type filters to the repository', async () => {
      repository.findAll.mockResolvedValue([mockDevice] as any);

      await service.findAll({ status: DeviceStatus.ON, type: undefined });

      expect(repository.findAll).toHaveBeenCalledWith({
        status: DeviceStatus.ON,
        type: undefined,
      });
    });
  });

  describe('getDeviceStats', () => {
    it('should count online from the column, not from a lastSeen window', async () => {
      // Um device pode estar online sem lastSeen recente e vice-versa: a coluna
      // é a fonte da verdade, então a contagem não pode olhar para lastSeen.
      const staleButOnline = new Date(Date.now() - 60 * 60 * 1000); // 1h atrás

      const devices = [
        { ...mockDevice, id: '1', status: 'ON', online: true, lastSeen: staleButOnline, type: 'LIGHT' },
        { ...mockDevice, id: '2', status: 'OFF', online: false, lastSeen: new Date(), type: 'AC' },
        { ...mockDevice, id: '3', status: 'STANDBY', online: true, lastSeen: null, type: 'LIGHT' },
        { ...mockDevice, id: '4', status: 'ERROR', online: false, lastSeen: null, type: 'SENSOR' },
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
