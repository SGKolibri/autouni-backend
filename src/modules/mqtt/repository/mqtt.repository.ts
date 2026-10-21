import { Injectable } from '@nestjs/common';
import { Device, EnergyReading } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { IMqttRepository } from '../interfaces/mqtt.interface';

@Injectable()
export class MqttRepository implements IMqttRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findDeviceByTopic(topic: string): Promise<Device | null> {
    // Try exact match first
    let device = await this.prisma.device.findFirst({
      where: { mqttTopic: topic },
    });

    // If not found, try wildcard match (remove last segment)
    if (!device) {
      const baseTopic = topic.split('/').slice(0, -1).join('/');
      device = await this.prisma.device.findFirst({
        where: { mqttTopic: baseTopic },
      });
    }

    return device;
  }

  async findDeviceByMqttTopic(mqttTopic: string): Promise<Device | null> {
    return this.prisma.device.findFirst({
      where: { mqttTopic },
    });
  }

  /**
   * Este é o único caminho autorizado a escrever `lastSeen` e `online`:
   * uma mensagem chegando pelo broker é a evidência de que o aparelho está vivo.
   * Escritas vindas de HTTP (UI, automações) não tocam nesses campos.
   */
  async updateDeviceStatus(deviceId: string, status: string): Promise<Device> {
    return this.prisma.device.update({
      where: { id: deviceId },
      data: {
        status: status as any,
        lastSeen: new Date(),
        online: true,
      },
    });
  }

  async updateDeviceOnlineStatus(deviceId: string, online: boolean): Promise<Device> {
    return this.prisma.device.update({
      where: { id: deviceId },
      data: {
        online,
        // O heartbeat sobe mesmo quando o payload diz `false`: a mensagem chegou,
        // então houve comunicação. Um LWT publicado pelo broker após a queda é o
        // caso em que `online: false` e `lastSeen` recente convivem.
        lastSeen: new Date(),
      },
    });
  }

  async createEnergyReading(data: {
    deviceId: string;
    valueWh: number;
    voltage?: number | null;
    current?: number | null;
  }): Promise<EnergyReading> {
    const [reading] = await this.prisma.$transaction([
      this.prisma.energyReading.create({
        data: {
          deviceId: data.deviceId,
          valueWh: data.valueWh,
          voltage: data.voltage,
          current: data.current,
        },
      }),
      // Telemetria também é heartbeat.
      this.prisma.device.update({
        where: { id: data.deviceId },
        data: { lastSeen: new Date(), online: true },
      }),
    ]);

    return reading;
  }
}
