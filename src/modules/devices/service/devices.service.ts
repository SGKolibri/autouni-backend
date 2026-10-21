import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Device } from '@prisma/client';
import { DevicesRepository } from '../repository/devices.repository';
import { MqttService } from '../../mqtt/service/mqtt.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { CreateDeviceDto } from '../dto/create-device.dto';
import { UpdateDeviceDto } from '../dto/update-device.dto';
import { ControlDeviceDto } from '../dto/control-device.dto';
import { BulkControlDeviceDto } from '../dto/bulk-control-device.dto';
import {
  DeviceStatus,
  DeviceCommand,
  FindDevicesFilters,
  ControlledDevice,
  BulkControlResult,
} from '../interfaces/devices.interface';

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(
    private readonly devicesRepository: DevicesRepository,
    private readonly mqttService: MqttService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async create(createDeviceDto: CreateDeviceDto): Promise<Device> {
    try {
      return await this.devicesRepository.create(createDeviceDto);
    } catch (error) {
      if (error.code === 'P2003') {
        throw new BadRequestException('Room not found or invalid roomId');
      }
      throw error;
    }
  }

  async findAll(filters?: FindDevicesFilters): Promise<Device[]> {
    return this.devicesRepository.findAll(filters);
  }

  async findById(id: string): Promise<Device> {
    const device = await this.devicesRepository.findById(id);
    
    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }
    
    return device;
  }

  async findByRoomId(roomId: string): Promise<Device[]> {
    return this.devicesRepository.findByRoomId(roomId);
  }

  async findByStatus(status: DeviceStatus): Promise<Device[]> {
    return this.devicesRepository.findByStatus(status);
  }

  async update(id: string, updateDeviceDto: UpdateDeviceDto): Promise<Device> {
    await this.findById(id); // Validates existence
    
    try {
      return await this.devicesRepository.update(id, updateDeviceDto);
    } catch (error) {
      if (error.code === 'P2003') {
        throw new BadRequestException('Room not found or invalid roomId');
      }
      throw error;
    }
  }

  async delete(id: string): Promise<Device> {
    await this.findById(id); // Validates existence
    return this.devicesRepository.delete(id);
  }

  async updateStatus(id: string, status: DeviceStatus): Promise<Device> {
    const device = await this.findById(id); // Validates existence

    this.publishCommand(device, status);

    const updated = await this.devicesRepository.updateStatus(id, status);
    this.emitStatus(updated);

    return updated;
  }

  async updateOnlineStatus(id: string, online: boolean): Promise<Device> {
    await this.findById(id); // Validates existence

    const updated = await this.devicesRepository.updateOnlineStatus(id, online);

    this.realtime.server?.emit('device:online', {
      deviceId: updated.id,
      online: updated.online,
      timestamp: new Date(),
    });

    return updated;
  }

  /**
   * Executa um comando de alto nível sobre o dispositivo.
   *
   * `toggle` é resolvido a partir do estado atual no banco, nunca do `value`
   * enviado pelo cliente — o frontend manda o status alvo junto, mas ele pode
   * estar desatualizado em relação ao que o hardware confirmou por MQTT.
   */
  async control(id: string, dto: ControlDeviceDto): Promise<ControlledDevice> {
    const device = await this.findById(id); // Validates existence
    const targetStatus = this.resolveTargetStatus(device.status as DeviceStatus, dto);

    const published = this.publishCommand(device, targetStatus, {
      temperature: dto.temperature,
      intensity: dto.intensity,
    });

    // Gravação otimista: o status alvo vai direto para o banco em vez de um
    // estado intermediário tipo STANDBY. Sem hardware real respondendo, um
    // estado "pendente" nunca seria confirmado e a UI ficaria travada.
    // Quando o dispositivo existir de fato, a confirmação chega em
    // `devices/<id>/status` e o MqttService sobrescreve isto com a verdade.
    const updated = await this.devicesRepository.updateStatus(id, targetStatus);
    this.emitStatus(updated);

    return { ...updated, pending: published };
  }

  /**
   * Aplica o mesmo comando a vários dispositivos. Um erro individual não
   * aborta o lote — o chamador recebe a contagem e os IDs que falharam.
   */
  async bulkControl(dto: BulkControlDeviceDto): Promise<BulkControlResult> {
    const failedDevices: string[] = [];
    let successCount = 0;

    for (const deviceId of dto.deviceIds) {
      try {
        await this.control(deviceId, { command: dto.command });
        successCount++;
      } catch (error) {
        this.logger.warn(
          `Bulk control failed for device ${deviceId}: ${error?.message ?? error}`,
        );
        failedDevices.push(deviceId);
      }
    }

    const failedCount = failedDevices.length;

    return {
      message: `Command '${dto.command}' applied to ${successCount} of ${dto.deviceIds.length} device(s)`,
      successCount,
      failedCount,
      failedDevices,
    };
  }

  private resolveTargetStatus(
    currentStatus: DeviceStatus,
    dto: ControlDeviceDto,
  ): DeviceStatus {
    switch (dto.command) {
      case DeviceCommand.ON:
        return DeviceStatus.ON;
      case DeviceCommand.OFF:
        return DeviceStatus.OFF;
      case DeviceCommand.TOGGLE:
        // Qualquer estado diferente de ON (inclusive STANDBY e ERROR) alterna
        // para ON — assim um device travado em ERROR sai do limbo com um clique.
        return currentStatus === DeviceStatus.ON ? DeviceStatus.OFF : DeviceStatus.ON;
      default:
        throw new BadRequestException(`Unsupported command: ${dto.command}`);
    }
  }

  /**
   * Publica o comando no tópico do dispositivo.
   * Retorna `true` quando a mensagem foi realmente entregue ao broker.
   */
  private publishCommand(
    device: Device,
    status: DeviceStatus,
    extras: { temperature?: number; intensity?: number } = {},
  ): boolean {
    if (!device.mqttTopic) {
      this.logger.warn(
        `Device ${device.id} has no mqttTopic; state persisted without publishing`,
      );
      return false;
    }

    if (!this.mqttService.isConnected()) {
      this.logger.warn(
        `MQTT not connected; command for device ${device.id} was not published`,
      );
      return false;
    }

    this.mqttService.publish(`${device.mqttTopic}/command`, {
      state: status,
      ...(extras.temperature !== undefined ? { temperature: extras.temperature } : {}),
      ...(extras.intensity !== undefined ? { intensity: extras.intensity } : {}),
    });

    return true;
  }

  private emitStatus(device: Device): void {
    this.realtime.server?.emit('device:status', {
      deviceId: device.id,
      status: device.status,
      timestamp: new Date(),
    });
  }

  async getDeviceStats() {
    const devices = await this.findAll();

    return {
      total: devices.length,
      // Contagem pela coluna `online`, não mais por uma janela de 5 minutos
      // sobre `lastSeen` — a heurística dava "offline" para todo device que
      // nunca tivesse falado com o broker, mesmo estando alcançável.
      online: devices.filter(d => d.online).length,
      offline: devices.filter(d => !d.online).length,
      byStatus: {
        on: devices.filter(d => d.status === 'ON').length,
        off: devices.filter(d => d.status === 'OFF').length,
        standby: devices.filter(d => d.status === 'STANDBY').length,
        error: devices.filter(d => d.status === 'ERROR').length,
      },
      byType: devices.reduce((acc, device) => {
        acc[device.type] = (acc[device.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}