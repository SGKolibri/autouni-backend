import { Module } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { TelemetryRepository } from './repository/telemetry.repository';
import { TelemetryService } from './service/telemetry.service';
import { SensorsQueryService } from './service/sensors-query.service';
import { SensorsController } from './controller/sensors.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [SensorsController],
  providers: [
    TelemetryService,
    SensorsQueryService,
    TelemetryRepository,
    PrismaService,
  ],
  exports: [TelemetryService, TelemetryRepository],
})
export class TelemetryModule {}
