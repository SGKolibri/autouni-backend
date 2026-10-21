import { Module } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { PushController } from './controller/push.controller';
import { PushService } from './service/push.service';
import { PushRepository } from './repository/push.repository';
import { NotificationPushListener } from './listeners/notification-push.listener';
import { PUSH_SENDER } from './interfaces/push.interface';
import { createPushSender } from './sender/firebase-push.sender';

/**
 * Push (FCM): registro do token de cada aparelho e envio de toda notificação
 * criada (evento `notification.created`). Sem credenciais do Firebase no
 * ambiente o módulo sobe com o envio desligado.
 */
@Module({
  controllers: [PushController],
  providers: [
    PushService,
    PushRepository,
    NotificationPushListener,
    PrismaService,
    { provide: PUSH_SENDER, useFactory: () => createPushSender() },
  ],
  exports: [PushService],
})
export class PushModule {}
