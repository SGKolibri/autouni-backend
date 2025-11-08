import { Notification, NotificationType } from '@prisma/client';

export interface INotificationsRepository {
  create(data: CreateNotificationData): Promise<Notification>;
  findAll(): Promise<Notification[]>;
  findById(id: string): Promise<Notification | null>;
  findByUser(userId: string): Promise<Notification[]>;
  findUnreadByUser(userId: string): Promise<Notification[]>;
  markAsRead(id: string): Promise<Notification>;
  markAllAsRead(userId: string): Promise<number>;
  delete(id: string): Promise<Notification>;
}

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

export interface UpdateNotificationData {
  read?: boolean;
}
