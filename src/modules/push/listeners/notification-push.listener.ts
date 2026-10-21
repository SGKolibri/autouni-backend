import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Notification } from '@prisma/client';
import { PushService } from '../service/push.service';

/** Payload de `notification.created` (emitido por NotificationsService). */
export interface NotificationCreatedEvent {
  userId: string;
  notification: Notification;
}

/** Toda notificação criada também vira push nos aparelhos do usuário. */
@Injectable()
export class NotificationPushListener {
  constructor(private readonly pushService: PushService) {}

  @OnEvent('notification.created', { async: true })
  async handleNotificationCreated(event: NotificationCreatedEvent) {
    await this.pushService.sendNotification(event.notification);
  }
}
