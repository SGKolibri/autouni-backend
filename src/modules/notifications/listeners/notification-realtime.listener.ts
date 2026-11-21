import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Notification } from '@prisma/client';
import { RealtimeGateway } from '../../realtime/realtime.gateway';

/** Toda notificação criada é entregue ao vivo ao painel web do destinatário. */
@Injectable()
export class NotificationRealtimeListener {
  constructor(private readonly realtime: RealtimeGateway) {}

  @OnEvent('notification.created')
  handleNotificationCreated(event: { userId: string; notification: Notification }) {
    this.realtime.emitToUser(event.userId, 'notification:new', event.notification);
  }
}
