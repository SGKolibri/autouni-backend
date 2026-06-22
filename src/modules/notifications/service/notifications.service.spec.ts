import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from '../repository/notifications.repository';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let repository: jest.Mocked<NotificationsRepository>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockNotification = {
    id: 'notification-uuid-1',
    userId: 'user-uuid-1',
    type: 'INFO',
    title: 'Dispositivo desconectado',
    message: 'O dispositivo foi desconectado',
    read: false,
    link: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: NotificationsRepository,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            findByUser: jest.fn(),
            findUnreadByUser: jest.fn(),
            markAsRead: jest.fn(),
            markAllAsRead: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    repository = module.get(NotificationsRepository);
    eventEmitter = module.get(EventEmitter2);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create notification and emit event', async () => {
      repository.create.mockResolvedValue(mockNotification as any);
      const dto = {
        userId: 'user-uuid-1',
        type: 'INFO' as any,
        title: 'Dispositivo desconectado',
        message: 'O dispositivo foi desconectado',
      };
      const result = await service.create(dto);
      expect(result).toEqual(mockNotification);
      expect(repository.create).toHaveBeenCalledWith(dto);
      expect(eventEmitter.emit).toHaveBeenCalledWith('notification.created', {
        userId: mockNotification.userId,
        notification: mockNotification,
      });
    });
  });

  describe('findAll', () => {
    it('should return all notifications', async () => {
      repository.findAll.mockResolvedValue([mockNotification] as any);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no notifications', async () => {
      repository.findAll.mockResolvedValue([]);
      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return notification when found', async () => {
      repository.findById.mockResolvedValue(mockNotification as any);
      const result = await service.findById('notification-uuid-1');
      expect(result).toEqual(mockNotification);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByUser', () => {
    it('should return notifications for a user', async () => {
      repository.findByUser.mockResolvedValue([mockNotification] as any);
      const result = await service.findByUser('user-uuid-1');
      expect(result).toHaveLength(1);
      expect(repository.findByUser).toHaveBeenCalledWith('user-uuid-1');
    });
  });

  describe('findUnreadByUser', () => {
    it('should return unread notifications for a user', async () => {
      repository.findUnreadByUser.mockResolvedValue([mockNotification] as any);
      const result = await service.findUnreadByUser('user-uuid-1');
      expect(result).toHaveLength(1);
      expect(repository.findUnreadByUser).toHaveBeenCalledWith('user-uuid-1');
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read when found', async () => {
      const updated = { ...mockNotification, read: true };
      repository.findById.mockResolvedValue(mockNotification as any);
      repository.markAsRead.mockResolvedValue(updated as any);
      const result = await service.markAsRead('notification-uuid-1');
      expect(result.read).toBe(true);
    });

    it('should throw NotFoundException when notification not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.markAsRead('non-existent')).rejects.toThrow(NotFoundException);
      expect(repository.markAsRead).not.toHaveBeenCalled();
    });
  });

  describe('markAllAsRead', () => {
    it('should return count of marked notifications', async () => {
      repository.markAllAsRead.mockResolvedValue(5);
      const result = await service.markAllAsRead('user-uuid-1');
      expect(result).toEqual({ count: 5 });
      expect(repository.markAllAsRead).toHaveBeenCalledWith('user-uuid-1');
    });

    it('should return zero when no unread notifications', async () => {
      repository.markAllAsRead.mockResolvedValue(0);
      const result = await service.markAllAsRead('user-uuid-1');
      expect(result).toEqual({ count: 0 });
    });
  });

  describe('delete', () => {
    it('should delete notification when found', async () => {
      repository.findById.mockResolvedValue(mockNotification as any);
      repository.delete.mockResolvedValue(mockNotification as any);
      const result = await service.delete('notification-uuid-1');
      expect(result).toEqual(mockNotification);
    });

    it('should throw NotFoundException when notification not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.delete('non-existent')).rejects.toThrow(NotFoundException);
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});
