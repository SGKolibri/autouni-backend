import { Module } from '@nestjs/common';
import { ReportsController } from './controller/reports.controller';
import { ReportsService } from './service/reports.service';
import { ReportsRepository } from './repository/reports.repository';
import { ReportGenerationService } from './service/report-generation.service';
import { ReportGenerationListener } from './listeners/report-generation.listener';
import { EmailService } from './service/email.service';
import { PrismaService } from 'prisma/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ReportsRepository,
    ReportGenerationService,
    ReportGenerationListener,
    EmailService,
    PrismaService,
  ],
  exports: [ReportsService],
})
export class ReportsModule {}
