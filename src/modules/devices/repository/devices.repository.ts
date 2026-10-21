import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Device,
  DeviceStatus as PrismaDeviceStatus,
  DeviceType as PrismaDeviceType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  IDeviceRepository,
  DeviceStatus,
  FindDevicesFilters,
} from '../interfaces/devices.interface';
import { CreateDeviceDto } from '../dto/create-device.dto';
import { UpdateDeviceDto } from '../dto/update-device.dto';

/**
 * Campos aceitos pelos DTOs que NÃO são colunas do model `Device`.
 * Eles vivem dentro de `Device.metadata` (Json). Deixá-los chegar crus no
 * `prisma.device.update` gera erro de validação do Prisma → HTTP 500.
 */
const METADATA_FIELDS = ['powerRating', 'intensity', 'temperature'] as const;

@Injectable()
export class DevicesRepository implements IDeviceRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Separa o payload do DTO em (colunas do Device) x (atributos que vão para metadata).
   *
   * - `room` é um rótulo textual vindo do frontend, não uma coluna — descartado.
   * - `lastSeen` é heartbeat de MQTT: aceito no DTO por compatibilidade com o
   *   `Partial<Device>` que o frontend envia, mas ignorado aqui de propósito.
   *   Escrita via HTTP não é evidência de que o aparelho está vivo.
   */
  private splitDeviceFields(
    data: CreateDeviceDto | UpdateDeviceDto,
    existingMetadata?: Prisma.JsonValue,
  ): { columns: Record<string, any>; metadata?: Prisma.InputJsonValue } {
    const { room, lastSeen, ...rest } = data as Record<string, any>;

    const columns: Record<string, any> = {};
    const metadataPatch: Record<string, any> = {};

    for (const [key, value] of Object.entries(rest)) {
      if ((METADATA_FIELDS as readonly string[]).includes(key)) {
        if (value !== undefined) metadataPatch[key] = value;
      } else if (value !== undefined) {
        columns[key] = value;
      }
    }

    if (Object.keys(metadataPatch).length === 0) {
      return { columns };
    }

    // Merge raso sobre o metadata existente — preserva a convenção do seed
    // (`{ brand, power }`) em vez de sobrescrever o objeto inteiro.
    const base =
      existingMetadata && typeof existingMetadata === 'object' && !Array.isArray(existingMetadata)
        ? (existingMetadata as Record<string, any>)
        : {};

    return { columns, metadata: { ...base, ...metadataPatch } };
  }

  async create(data: CreateDeviceDto): Promise<Device> {
    const { columns, metadata } = this.splitDeviceFields(data);

    return this.prisma.device.create({
      data: {
        ...(columns as Prisma.DeviceUncheckedCreateInput),
        status: data.status as PrismaDeviceStatus,
        ...(metadata !== undefined ? { metadata } : {}),
      },
      include: {
        room: {
          include: {
            floor: {
              include: {
                building: true,
              },
            },
          },
        },
      },
    });
  }

  async findAll(filters?: FindDevicesFilters): Promise<Device[]> {
    const where: Prisma.DeviceWhereInput = {};

    if (filters?.status) where.status = filters.status as PrismaDeviceStatus;
    if (filters?.type) where.type = filters.type as PrismaDeviceType;

    return this.prisma.device.findMany({
      where,
      include: {
        room: {
          include: {
            floor: {
              include: {
                building: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(id: string): Promise<Device | null> {
    return this.prisma.device.findUnique({
      where: { id },
      include: {
        room: {
          include: {
            floor: {
              include: {
                building: true,
              },
            },
          },
        },
        readings: {
          orderBy: {
            timestamp: 'desc',
          },
          take: 10,
        },
      },
    });
  }

  async findByRoomId(roomId: string): Promise<Device[]> {
    return this.prisma.device.findMany({
      where: { roomId },
      include: {
        room: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findByStatus(status: DeviceStatus): Promise<Device[]> {
    return this.prisma.device.findMany({
      where: { status: status as PrismaDeviceStatus },
      include: {
        room: {
          include: {
            floor: {
              include: {
                building: true,
              },
            },
          },
        },
      },
    });
  }

  async update(id: string, data: UpdateDeviceDto): Promise<Device> {
    const exists = await this.prisma.device.findUnique({ where: { id } });
    
    if (!exists) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }

    const { columns, metadata } = this.splitDeviceFields(data, exists.metadata);

    return this.prisma.device.update({
      where: { id },
      data: {
        ...(columns as Prisma.DeviceUncheckedUpdateInput),
        status: data.status ? (data.status as PrismaDeviceStatus) : undefined,
        ...(metadata !== undefined ? { metadata } : {}),
      },
      include: {
        room: {
          include: {
            floor: {
              include: {
                building: true,
              },
            },
          },
        },
      },
    });
  }

  async delete(id: string): Promise<Device> {
    const exists = await this.prisma.device.findUnique({ where: { id } });
    
    if (!exists) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }

    return this.prisma.device.delete({
      where: { id },
    });
  }

  /**
   * Grava apenas o estado lógico.
   *
   * `lastSeen` NÃO é tocado aqui de propósito: esta escrita vem de HTTP, e um
   * comando enviado pela UI não prova que o aparelho está vivo. O heartbeat é
   * atualizado exclusivamente pelo caminho MQTT (`MqttRepository`).
   */
  async updateStatus(id: string, status: DeviceStatus): Promise<Device> {
    return this.prisma.device.update({
      where: { id },
      data: {
        status: status as PrismaDeviceStatus,
      },
    });
  }

  /**
   * Persiste a alcançabilidade de verdade. Antes esta função descartava o
   * parâmetro `online` e só carimbava `lastSeen`, o que fazia "marcar como
   * offline" deixar o device online.
   */
  async updateOnlineStatus(id: string, online: boolean): Promise<Device> {
    return this.prisma.device.update({
      where: { id },
      data: { online },
    });
  }
}