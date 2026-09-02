import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AutomationsService } from './automations.service';
import { AutomationsRepository } from '../repository/automations.repository';
import { MqttService } from '../../mqtt/service/mqtt.service';
import { TriggerType } from '../interfaces/automations.interface';

jest.mock('cron-parser', () => ({
  CronExpressionParser: {
    parse: jest.fn((expr: string) => {
      if (expr === 'invalid-cron' || expr === 'not-a-valid-cron') {
        throw new Error(`Invalid cron expression: ${expr}`);
      }
      const mockDate = new Date();
      return {
        next: () => ({ toDate: () => new Date(mockDate.getTime() - 1000) }),
      };
    }),
  },
}));

describe('AutomationsService', () => {
  let service: AutomationsService;
  let repository: jest.Mocked<AutomationsRepository>;
  let mqttService: jest.Mocked<MqttService>;

  const mockAutomation = {
    id: 'automation-uuid-1',
    name: 'Turn off lights',
    description: 'Turns off lights at night',
    creatorId: 'user-uuid-1',
    triggerType: 'SCHEDULE',
    cron: '0 22 * * *',
    condition: null,
    action: JSON.stringify({ topic: 'devices/lights/command', payload: { state: 'OFF' } }),
    enabled: true,
    lastRunAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomationsService,
        {
          provide: AutomationsRepository,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            findByCreatorId: jest.fn(),
            findEnabled: jest.fn(),
            findByTriggerType: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            toggleEnabled: jest.fn(),
            updateLastRun: jest.fn(),
            createHistory: jest.fn(),
            findHistory: jest.fn(),
          },
        },
        {
          provide: MqttService,
          useValue: {
            publish: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AutomationsService>(AutomationsService);
    repository = module.get(AutomationsRepository);
    mqttService = module.get(MqttService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create automation with MANUAL trigger type', async () => {
      repository.create.mockResolvedValue(mockAutomation as any);
      const dto = {
        name: 'Test Automation',
        triggerType: TriggerType.MANUAL,
        action: { topic: 'test/topic' },
      };
      const result = await service.create(dto);
      expect(result).toEqual(mockAutomation);
    });

    it('should create automation with valid SCHEDULE trigger and cron', async () => {
      repository.create.mockResolvedValue(mockAutomation as any);
      const dto = {
        name: 'Scheduled Automation',
        triggerType: TriggerType.SCHEDULE,
        cron: '0 22 * * *',
        action: '{"topic":"test"}',
      };
      const result = await service.create(dto);
      expect(result).toEqual(mockAutomation);
    });

    it('should throw BadRequestException when SCHEDULE type has no cron', async () => {
      const dto = {
        name: 'Scheduled Automation',
        triggerType: TriggerType.SCHEDULE,
        action: '{"topic":"test"}',
      };
      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when cron expression is invalid', async () => {
      const dto = {
        name: 'Scheduled Automation',
        triggerType: TriggerType.SCHEDULE,
        cron: 'not-a-valid-cron',
        action: '{"topic":"test"}',
      };
      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should stringify object action before creating', async () => {
      repository.create.mockResolvedValue(mockAutomation as any);
      const dto = {
        name: 'Test Automation',
        triggerType: TriggerType.MANUAL,
        action: { topic: 'test/topic', payload: { state: 'ON' } },
      };
      await service.create(dto);
      expect(typeof dto.action).toBe('string');
    });
  });

  describe('findAll', () => {
    it('should return all automations', async () => {
      repository.findAll.mockResolvedValue([mockAutomation] as any);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('should return automation when found', async () => {
      repository.findById.mockResolvedValue(mockAutomation as any);
      const result = await service.findById('automation-uuid-1');
      expect(result).toEqual(mockAutomation);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByCreatorId', () => {
    it('should return automations by creator', async () => {
      repository.findByCreatorId.mockResolvedValue([mockAutomation] as any);
      const result = await service.findByCreatorId('user-uuid-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('findEnabled', () => {
    it('should return enabled automations', async () => {
      repository.findEnabled.mockResolvedValue([mockAutomation] as any);
      const result = await service.findEnabled();
      expect(result).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('should update automation when found', async () => {
      const updated = { ...mockAutomation, name: 'Updated Name' };
      repository.findById.mockResolvedValue(mockAutomation as any);
      repository.update.mockResolvedValue(updated as any);
      const result = await service.update('automation-uuid-1', { name: 'Updated Name' });
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.update('non-existent', {})).rejects.toThrow(NotFoundException);
    });

    it('should validate cron when updating with SCHEDULE type and cron', async () => {
      repository.findById.mockResolvedValue(mockAutomation as any);
      await expect(
        service.update('automation-uuid-1', {
          triggerType: TriggerType.SCHEDULE,
          cron: 'invalid-cron',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should stringify object action during update', async () => {
      const updated = { ...mockAutomation };
      repository.findById.mockResolvedValue(mockAutomation as any);
      repository.update.mockResolvedValue(updated as any);
      const dto: any = { action: { topic: 'new/topic' } };
      await service.update('automation-uuid-1', dto);
      expect(typeof dto.action).toBe('string');
    });
  });

  describe('delete', () => {
    it('should delete automation when found', async () => {
      repository.findById.mockResolvedValue(mockAutomation as any);
      repository.delete.mockResolvedValue(mockAutomation as any);
      const result = await service.delete('automation-uuid-1');
      expect(result).toEqual(mockAutomation);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.delete('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggleEnabled', () => {
    it('should toggle automation when found', async () => {
      const disabled = { ...mockAutomation, enabled: false };
      repository.findById.mockResolvedValue(mockAutomation as any);
      repository.toggleEnabled.mockResolvedValue(disabled as any);
      const result = await service.toggleEnabled('automation-uuid-1', false);
      expect(result.enabled).toBe(false);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.toggleEnabled('non-existent', false)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getHistory', () => {
    it('should return automation history', async () => {
      const mockHistory = [{ id: 'h1', automationId: 'automation-uuid-1', success: true }];
      repository.findById.mockResolvedValue(mockAutomation as any);
      repository.findHistory.mockResolvedValue(mockHistory as any);
      const result = await service.getHistory('automation-uuid-1', 10);
      expect(result).toEqual(mockHistory);
      expect(repository.findHistory).toHaveBeenCalledWith('automation-uuid-1', 10);
    });

    it('should throw NotFoundException when automation not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.getHistory('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('executeManually', () => {
    it('should execute automation when found and enabled', async () => {
      repository.findById.mockResolvedValue(mockAutomation as any);
      repository.updateLastRun.mockResolvedValue(mockAutomation as any);
      repository.createHistory.mockResolvedValue({} as any);

      await service.executeManually('automation-uuid-1');
      expect(mqttService.publish).toHaveBeenCalled();
      expect(repository.updateLastRun).toHaveBeenCalled();
      expect(repository.createHistory).toHaveBeenCalledWith(
        expect.objectContaining({ automationId: 'automation-uuid-1', success: true }),
      );
    });

    it('should throw BadRequestException when automation is disabled', async () => {
      const disabled = { ...mockAutomation, enabled: false };
      repository.findById.mockResolvedValue(disabled as any);
      await expect(service.executeManually('automation-uuid-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when automation not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.executeManually('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAutomationStats', () => {
    it('should return correct stats', async () => {
      const automations = [
        { ...mockAutomation, enabled: true, triggerType: 'SCHEDULE' },
        { ...mockAutomation, id: '2', enabled: true, triggerType: 'CONDITION' },
        { ...mockAutomation, id: '3', enabled: false, triggerType: 'MANUAL' },
      ];
      repository.findAll.mockResolvedValue(automations as any);
      const stats = await service.getAutomationStats();
      expect(stats.total).toBe(3);
      expect(stats.enabled).toBe(2);
      expect(stats.disabled).toBe(1);
      expect(stats.byTriggerType.schedule).toBe(1);
      expect(stats.byTriggerType.condition).toBe(1);
      expect(stats.byTriggerType.manual).toBe(1);
    });
  });
});
