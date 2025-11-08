import { Module } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EnergyService } from './service/energy.service';
import { EnergyRepository } from './repository/energy.repository';
import { EnergyController } from './controller/energy.controller';

@Module({
  controllers: [EnergyController],
  providers: [EnergyService, EnergyRepository, PrismaService],
  exports: [EnergyService, EnergyRepository],
})
export class EnergyModule {}