import { Module, Global } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MqttService } from './service/mqtt.service';
import { MqttDynsecService } from './service/mqtt-dynsec.service';
import { MqttRepository } from './repository/mqtt.repository';
import { EnergyModule } from '../energy/energy.module';
import { TelemetryModule } from '../telemetry/telemetry.module';

@Global()
@Module({
  imports: [EnergyModule, TelemetryModule],
  providers: [MqttService, MqttDynsecService, MqttRepository, PrismaService],
  exports: [MqttService, MqttDynsecService, MqttRepository],
})
export class MqttModule {}
