import { Module } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { NodesController } from './controller/nodes.controller';
import { NodesService } from './service/nodes.service';

@Module({
  controllers: [NodesController],
  providers: [NodesService, PrismaService],
  exports: [NodesService],
})
export class NodesModule {}
