import { Module } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { DevicesController } from './controller/devices.controller';
import { DevicesService } from './service/devices.service';
import { DevicesRepository } from './repository/devices.repository';
import { NodesModule } from '../nodes/nodes.module';

@Module({
  imports: [NodesModule],
  controllers: [DevicesController],
  providers: [DevicesService, DevicesRepository, PrismaService],
  exports: [DevicesService, DevicesRepository],
})
export class DevicesModule {}