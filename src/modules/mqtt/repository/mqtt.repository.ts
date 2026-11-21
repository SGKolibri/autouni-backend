import { Injectable } from '@nestjs/common';
import { Device, DeviceNode, DeviceStatus } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { IMqttRepository } from '../interfaces/mqtt.interface';

/**
 * Único caminho autorizado a escrever `lastSeen` e `online`: uma mensagem
 * chegando pelo broker é a evidência de que o aparelho está vivo. Escritas
 * vindas de HTTP (UI, automações) não tocam nesses campos.
 *
 * Tudo roda no tenant indicado pelo prefixo `org/<id>/` do tópico.
 */
@Injectable()
export class MqttRepository implements IMqttRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findDeviceByMqttTopic(mqttTopic: string): Promise<Device | null> {
    // Roda no tenant do prefixo do tópico; o slug só é único dentro dele.
    return this.prisma.device.findFirst({ where: { mqttTopic } });
  }

  async findNodeByUsername(mqttUsername: string): Promise<DeviceNode | null> {
    return this.prisma.deviceNode.findFirst({ where: { mqttUsername } });
  }

  async updateDeviceStatus(deviceId: string, status: DeviceStatus): Promise<Device> {
    return this.prisma.device.update({
      where: { id: deviceId },
      data: { status, lastSeen: new Date(), online: true },
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

  // Telemetria também é heartbeat.
  async touchDevice(deviceId: string): Promise<void> {
    await this.prisma.device.update({
      where: { id: deviceId },
      data: { lastSeen: new Date(), online: true },
    });
  }

  async touchNode(nodeId: string | null): Promise<void> {
    if (!nodeId) return;
    await this.prisma.deviceNode.update({
      where: { id: nodeId },
      data: { lastSeen: new Date(), online: true },
    });
  }

  /** Marca o nó e todos os devices dele; devolve os ids afetados. */
  async setNodeOnline(nodeId: string, online: boolean): Promise<string[]> {
    const now = new Date();
    await this.prisma.deviceNode.update({
      where: { id: nodeId },
      data: { online, lastSeen: now },
    });
    const devices = await this.prisma.device.findMany({
      where: { nodeId },
      select: { id: true },
    });
    await this.prisma.device.updateMany({
      where: { nodeId },
      data: { online, lastSeen: now },
    });
    return devices.map((d) => d.id);
  }
}
