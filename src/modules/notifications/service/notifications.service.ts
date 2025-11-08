import { Injectable, NotFoundException } from '@nestjs/common';
import { Notification } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationsRepository } from '../repository/notifications.repository';
import { CreateNotificationData } from '../interfaces/notifications.interface';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(data: CreateNotificationData): Promise<Notification> {
    const notification = await this.notificationsRepository.create(data);

    // Emite evento para enviar notificação em tempo real via WebSocket
    this.eventEmitter.emit('notification.created', {
      userId: notification.userId,
      notification,
    });

    return notification;
  }

  async findAll(): Promise<Notification[]> {
    return this.notificationsRepository.findAll();
  }

  async findById(id: string): Promise<Notification> {
    const notification = await this.notificationsRepository.findById(id);
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    return notification;
  }

  async findByUser(userId: string): Promise<Notification[]> {
    return this.notificationsRepository.findByUser(userId);
  }

  async findUnreadByUser(userId: string): Promise<Notification[]> {
    return this.notificationsRepository.findUnreadByUser(userId);
  }

  async markAsRead(id: string): Promise<Notification> {
    await this.findById(id);
    return this.notificationsRepository.markAsRead(id);
  }

  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const count = await this.notificationsRepository.markAllAsRead(userId);
    return { count };
  }

  async delete(id: string): Promise<Notification> {
    await this.findById(id);
    return this.notificationsRepository.delete(id);
  }
}
