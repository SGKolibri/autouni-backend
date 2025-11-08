import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Device } from '@prisma/client';
import { DevicesRepository } from '../repository/devices.repository';
import { CreateDeviceDto } from '../dto/create-device.dto';
import { UpdateDeviceDto } from '../dto/update-device.dto';
import { DeviceStatus } from '../interfaces/devices.interface';

@Injectable()
export class DevicesService {
  constructor(private readonly devicesRepository: DevicesRepository) {}

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

  async findAll(): Promise<Device[]> {
    return this.devicesRepository.findAll();
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
    await this.findById(id); // Validates existence
    return this.devicesRepository.updateStatus(id, status);
  }

  async updateOnlineStatus(id: string, online: boolean): Promise<Device> {
    await this.findById(id); // Validates existence
    return this.devicesRepository.updateOnlineStatus(id, online);
  }

  async getDeviceStats() {
    const devices = await this.findAll();
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    return {
      total: devices.length,
      online: devices.filter(d => d.lastSeen && d.lastSeen > fiveMinutesAgo).length,
      offline: devices.filter(d => !d.lastSeen || d.lastSeen <= fiveMinutesAgo).length,
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