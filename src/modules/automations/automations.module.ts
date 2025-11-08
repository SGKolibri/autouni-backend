import { Module } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AutomationsService } from './service/automations.service';
import { AutomationsRepository } from './repository/automations.repository';
import { AutomationsController } from './controller/automations.controller';

@Module({
  controllers: [AutomationsController],
  providers: [AutomationsService, AutomationsRepository, PrismaService],
  exports: [AutomationsService, AutomationsRepository],
})
export class AutomationsModule {}