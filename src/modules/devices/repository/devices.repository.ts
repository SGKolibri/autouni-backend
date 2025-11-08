import { Injectable, NotFoundException } from '@nestjs/common';
import { Device, DeviceStatus as PrismaDeviceStatus } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { IDeviceRepository, DeviceStatus } from '../interfaces/devices.interface';
import { CreateDeviceDto } from '../dto/create-device.dto';
import { UpdateDeviceDto } from '../dto/update-device.dto';

@Injectable()
export class DevicesRepository implements IDeviceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateDeviceDto): Promise<Device> {
    const { room, ...deviceData } = data;
    
    return this.prisma.device.create({
      data: {
        ...deviceData,
        status: data.status as PrismaDeviceStatus,
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

  async findAll(): Promise<Device[]> {
    return this.prisma.device.findMany({
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

    const { room, ...updateData } = data;

    return this.prisma.device.update({
      where: { id },
      data: {
        ...updateData,
        status: data.status ? (data.status as PrismaDeviceStatus) : undefined,
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

  async updateStatus(id: string, status: DeviceStatus): Promise<Device> {
    return this.prisma.device.update({
      where: { id },
      data: {
        status: status as PrismaDeviceStatus,
        lastSeen: new Date(),
      },
    });
  }

  async updateOnlineStatus(id: string, online: boolean): Promise<Device> {
    return this.prisma.device.update({
      where: { id },
      data: {
        lastSeen: new Date(),
        // online status is inferred from lastSeen timestamp
      },
    });
  }
}