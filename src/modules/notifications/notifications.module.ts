import { Module } from '@nestjs/common';
import { NotificationsController } from './controller/notifications.controller';
import { NotificationsService } from './service/notifications.service';
import { NotificationsRepository } from './repository/notifications.repository';
import { PrismaService } from 'prisma/prisma.service';
import { NotificationRealtimeListener } from './listeners/notification-realtime.listener';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsRepository, PrismaService, NotificationRealtimeListener],
  exports: [NotificationsService],
})
export class NotificationsModule {}
