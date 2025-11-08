import { Injectable } from '@nestjs/common';
import { Notification, NotificationType } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import {
  INotificationsRepository,
  CreateNotificationData,
} from '../interfaces/notifications.interface';

@Injectable()
export class NotificationsRepository implements INotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateNotificationData): Promise<Notification> {
    return this.prisma.notification.create({
      data,
    });
  }

  async findAll(): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(id: string): Promise<Notification | null> {
    return this.prisma.notification.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findByUser(userId: string): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findUnreadByUser(userId: string): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: {
        userId,
        read: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async markAsRead(id: string): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: { read: true },
    });
    return result.count;
  }

  async delete(id: string): Promise<Notification> {
    return this.prisma.notification.delete({
      where: { id },
    });
  }
}
