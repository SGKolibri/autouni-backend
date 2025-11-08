import { Module } from '@nestjs/common';
import { ReportsController } from './controller/reports.controller';
import { ReportsService } from './service/reports.service';
import { ReportsRepository } from './repository/reports.repository';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ReportsRepository, PrismaService],
  exports: [ReportsService],
})
export class ReportsModule {}
