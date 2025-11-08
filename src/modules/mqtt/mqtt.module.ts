import { Module, Global } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MqttService } from './service/mqtt.service';
import { MqttRepository } from './repository/mqtt.repository';

@Global()
@Module({
  providers: [MqttService, MqttRepository, PrismaService],
  exports: [MqttService, MqttRepository],
})
export class MqttModule {}