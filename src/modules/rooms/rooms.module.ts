import { Module } from '@nestjs/common';
import { RoomsController } from './controller/rooms.controller';
import { RoomsService } from './service/rooms.service';
import { RoomsRepository } from './repository/rooms.repository';
import { PrismaService } from 'prisma/prisma.service';
import { EnergyModule } from '../energy/energy.module';

@Module({
  imports: [EnergyModule],
  controllers: [RoomsController],
  providers: [RoomsService, RoomsRepository, PrismaService],
  exports: [RoomsService],
})
export class RoomsModule {}
