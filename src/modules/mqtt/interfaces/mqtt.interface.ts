import { Device, DeviceNode, DeviceStatus } from '@prisma/client';

export interface IMqttRepository {
  findDeviceByMqttTopic(mqttTopic: string): Promise<Device | null>;
  findNodeByUsername(mqttUsername: string): Promise<DeviceNode | null>;
  updateDeviceStatus(deviceId: string, status: DeviceStatus): Promise<Device>;
  updateDeviceOnlineStatus(deviceId: string, online: boolean): Promise<Device>;
  touchDevice(deviceId: string): Promise<void>;
  touchNode(nodeId: string | null): Promise<void>;
  setNodeOnline(nodeId: string, online: boolean): Promise<string[]>;
}

export interface IMqttService {
  publish(topic: string, payload: any, options?: { qos?: 0 | 1 | 2; retain?: boolean }): void;
  subscribe(topic: string | string[], qos?: 0 | 1 | 2): void;
  unsubscribe(topic: string | string[]): void;
  isConnected(): boolean;
}
