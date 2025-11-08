import { Device } from '@prisma/client';

export interface MqttMessage {
  topic: string;
  payload: any;
  qos?: 0 | 1 | 2;
  retain?: boolean;
}

export interface DeviceStatusUpdate {
  deviceId: string;
  status: string;
  online?: boolean;
}

export interface DeviceEnergyReading {
  deviceId: string;
  valueWh: number;
  voltage?: number;
  current?: number;
  power?: number;
}

export interface IMqttRepository {
  findDeviceByTopic(topic: string): Promise<Device | null>;
  findDeviceByMqttTopic(mqttTopic: string): Promise<Device | null>;
  updateDeviceStatus(deviceId: string, status: string): Promise<Device>;
  updateDeviceOnlineStatus(deviceId: string, online: boolean): Promise<Device>;
  createEnergyReading(data: {
    deviceId: string;
    valueWh: number;
    voltage?: number | null;
    current?: number | null;
  }): Promise<any>;
}

export interface IMqttService {
  publish(topic: string, payload: any, options?: { qos?: 0 | 1 | 2; retain?: boolean }): void;
  subscribe(topic: string | string[], qos?: 0 | 1 | 2): void;
  unsubscribe(topic: string | string[]): void;
  isConnected(): boolean;
}
