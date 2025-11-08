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

  async updateDeviceStatus(deviceId: string, status: string): Promise<Device> {
    return this.prisma.device.update({
      where: { id: deviceId },
      data: {
        status: status as any,
        lastSeen: new Date(),
      },
    });
  }

  async updateDeviceOnlineStatus(deviceId: string, online: boolean): Promise<Device> {
    return this.prisma.device.update({
      where: { id: deviceId },
      data: {
        lastSeen: new Date(),
        // online status can be inferred from lastSeen timestamp
      },
    });
  }

  async createEnergyReading(data: {
    deviceId: string;
    valueWh: number;
    voltage?: number | null;
    current?: number | null;
  }): Promise<EnergyReading> {
    return this.prisma.energyReading.create({
      data: {
        deviceId: data.deviceId,
        valueWh: data.valueWh,
        voltage: data.voltage,
        current: data.current,
      },
    });
  }
}
