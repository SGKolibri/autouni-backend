import { Device } from '@prisma/client';
import { CreateDeviceDto } from '../dto/create-device.dto';
import { UpdateDeviceDto } from '../dto/update-device.dto';

export enum DeviceType {
  LIGHT = 'LIGHT',
  AC = 'AC',
  PROJECTOR = 'PROJECTOR',
  SPEAKER = 'SPEAKER',
  LOCK = 'LOCK',
  SENSOR = 'SENSOR',
  OTHER = 'OTHER',
}

export enum DeviceStatus {
  ON = 'ON',
  OFF = 'OFF',
  STANDBY = 'STANDBY',
  ERROR = 'ERROR',
}

export interface IDeviceRepository {
  create(data: CreateDeviceDto): Promise<Device>;
  findAll(): Promise<Device[]>;
  findById(id: string): Promise<Device | null>;
  findByRoomId(roomId: string): Promise<Device[]>;
  findByStatus(status: DeviceStatus): Promise<Device[]>;
  update(id: string, data: UpdateDeviceDto): Promise<Device>;
  delete(id: string): Promise<Device>;
  updateStatus(id: string, status: DeviceStatus): Promise<Device>;
  updateOnlineStatus(id: string, online: boolean): Promise<Device>;
}
