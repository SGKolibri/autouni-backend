import { Module } from '@nestjs/common';
import { BuildingsController } from './controller/buildings.controller';
import { BuildingsService } from './service/buildings.service';
import { BuildingsRepository } from './repository/buildings.repository';
import { PrismaService } from 'prisma/prisma.service';
import { EnergyModule } from '../energy/energy.module';

@Module({
  imports: [EnergyModule],
  controllers: [BuildingsController],
  providers: [BuildingsService, BuildingsRepository, PrismaService],
  exports: [BuildingsService],
})
export class BuildingsModule {}
