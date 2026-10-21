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

export enum DeviceCommand {
  ON = 'on',
  OFF = 'off',
  TOGGLE = 'toggle',
}

/**
 * Filtros opcionais de GET /devices. Ausência de um campo significa "não filtrar".
 */
export interface FindDevicesFilters {
  status?: DeviceStatus;
  type?: DeviceType;
}

/**
 * Device retornado pelas rotas de controle.
 *
 * `pending` = o comando saiu no broker e ainda não foi confirmado pelo hardware.
 * É `false` quando não havia para onde publicar (device sem `mqttTopic`) ou quando
 * o cliente MQTT estava desconectado — nesses casos o estado gravado é tudo o que existe.
 */
export type ControlledDevice = Device & { pending: boolean };

export interface BulkControlResult {
  message: string;
  successCount: number;
  failedCount: number;
  failedDevices: string[];
}

export interface IDeviceRepository {
  create(data: CreateDeviceDto): Promise<Device>;
  findAll(filters?: FindDevicesFilters): Promise<Device[]>;
  findById(id: string): Promise<Device | null>;
  findByRoomId(roomId: string): Promise<Device[]>;
  findByStatus(status: DeviceStatus): Promise<Device[]>;
  update(id: string, data: UpdateDeviceDto): Promise<Device>;
  delete(id: string): Promise<Device>;
  updateStatus(id: string, status: DeviceStatus): Promise<Device>;
  updateOnlineStatus(id: string, online: boolean): Promise<Device>;
}
