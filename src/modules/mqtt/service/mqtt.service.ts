import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { connect, MqttClient } from 'mqtt';
import { Device } from '@prisma/client';
import { MqttRepository } from '../repository/mqtt.repository';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { IMqttService } from '../interfaces/mqtt.interface';
import { EnergyService } from '../../energy/service/energy.service';
import { TelemetryService } from '../../telemetry/service/telemetry.service';
import { TenantContext } from '../../../common/tenant/tenant-context';
import {
  InvalidPayloadError,
  parseBoolean,
  parseStatus,
} from '../../telemetry/payload-parsing';

import { INBOUND_SUBSCRIPTIONS, parseInboundTopic } from '../topics';

type MessageListener = (topic: string, payload: Buffer) => void;

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy, IMqttService {
  private client: MqttClient;
  private readonly logger = new Logger(MqttService.name);
  private connected = false;
  private readonly connectListeners: Array<() => void> = [];
  private readonly messageListeners: MessageListener[] = [];
  // Mensagens de um mesmo device são processadas em ordem: a energia do
  // intervalo depende da leitura anterior, e duas mensagens concorrentes
  // calculariam o delta contra a mesma base.
  private readonly deviceQueues = new Map<string, Promise<void>>();

  constructor(
    private readonly mqttRepository: MqttRepository,
    private readonly realtime: RealtimeGateway,
    private readonly energyService: EnergyService,
    private readonly telemetryService: TelemetryService,
  ) {}

  onModuleInit() {
    const mqttUrl = process.env.MQTT_URL?.trim();

    if (mqttUrl && mqttUrl.length > 0) {
      this.logger.log(`MQTT is enabled (${mqttUrl}). Attempting to connect...`);
      this.connect(mqttUrl);
    } else {
      this.logger.warn('MQTT_URL not configured. MQTT features disabled.');
    }
  }

  onModuleDestroy() {
    this.disconnect();
  }

  onConnect(listener: () => void) {
    this.connectListeners.push(listener);
    if (this.connected) listener();
  }

  onMessage(listener: MessageListener) {
    this.messageListeners.push(listener);
  }

  private connect(url: string) {
    this.client = connect(url, {
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
      reconnectPeriod: 5000,
      connectTimeout: 30000,
    });

    this.client.on('connect', () => {
      this.connected = true;
      this.logger.log(`Connected to MQTT broker at ${url}`);
      this.subscribeToDefaultTopics();
      for (const listener of this.connectListeners) listener();
    });

    this.client.on('message', (topic, payload) => this.handleMessage(topic, payload));

    this.client.on('error', (err) => {
      this.connected = false;
      this.logger.error(`MQTT connection error: ${err.message}`);
    });

    this.client.on('close', () => {
      this.connected = false;
    });

    this.client.on('reconnect', () => {
      this.logger.log('Reconnecting to MQTT broker...');
    });
  }

  private disconnect() {
    if (this.client) {
      this.client.end();
      this.connected = false;
      this.logger.log('Disconnected from MQTT broker');
    }
  }

  private subscribeToDefaultTopics() {
    const topics = INBOUND_SUBSCRIPTIONS;
    this.client.subscribe(topics, { qos: 1 }, (err) => {
      if (err) this.logger.error(`Failed to subscribe to device topics: ${err.message}`);
      else this.logger.debug(`Subscribed to ${topics.join(', ')}`);
    });
  }

  private parse(payload: Buffer): unknown {
    const msg = payload.toString();
    try {
      return JSON.parse(msg);
    } catch {
      return msg;
    }
  }

  private async handleMessage(topic: string, payload: Buffer) {
    for (const listener of this.messageListeners) listener(topic, payload);
    if (topic.startsWith('$')) return;

    const parsed = parseInboundTopic(topic);
    if (!parsed) return;
    try {
      if (parsed.kind === 'node') {
        await this.handleNodeOnline(parsed.organizationId, parsed.mqttUsername, this.parse(payload));
        return;
      }
      const key = `${parsed.organizationId}/${parsed.mqttTopic}`;
      await this.enqueue(key, () =>
        this.handleDeviceMessage(parsed.organizationId, parsed.mqttTopic, parsed.suffix, this.parse(payload)),
      );
    } catch (err) {
      if (err instanceof InvalidPayloadError) {
        this.logger.warn(`Rejected MQTT message on ${topic}: ${err.message}`);
      } else {
        this.logger.error(`Error handling MQTT message on ${topic}`, err as Error);
      }
    }
  }

  private enqueue(key: string, task: () => Promise<void>): Promise<void> {
    const previous = this.deviceQueues.get(key) ?? Promise.resolve();
    const next = previous.then(task, task);
    const tail = next.catch(() => undefined);
    this.deviceQueues.set(key, tail);
    tail.then(() => {
      if (this.deviceQueues.get(key) === tail) this.deviceQueues.delete(key);
    });
    return next;
  }

  private async handleDeviceMessage(
    organizationId: string,
    mqttTopic: string,
    suffix: string,
    payload: unknown,
  ) {
    // O tenant vem do prefixo do tópico (garantido pela ACL do broker); a
    // busca já roda no escopo dele, então um slug de outra organização não
    // é encontrado.
    await TenantContext.runAsTenant(organizationId, async () => {
      const device = await this.mqttRepository.findDeviceByMqttTopic(mqttTopic);
      if (!device) {
        this.logger.warn(`No device registered for org ${organizationId} ${mqttTopic}/${suffix}`);
        return;
      }
      switch (suffix) {
        case 'status':
          return this.handleStatus(device, payload);
        case 'online':
          return this.handleOnline(device, payload);
        case 'energy':
          return this.handleEnergy(device, payload);
        case 'sensor':
          return this.handleSensor(device, payload);
      }
    });
  }

  private async handleStatus(device: Device, payload: unknown) {
    const status = parseStatus(payload);
    const updated = await this.mqttRepository.updateDeviceStatus(device.id, status);
    await this.mqttRepository.touchNode(device.nodeId);
    this.realtime.emitToOrganization(device.organizationId, 'device:status', {
      deviceId: updated.id,
      status: updated.status,
      timestamp: new Date(),
    });
  }

  private async handleOnline(device: Device, payload: unknown) {
    const online = parseBoolean(payload, 'online');
    const updated = await this.mqttRepository.updateDeviceOnlineStatus(device.id, online);
    this.realtime.emitToOrganization(device.organizationId, 'device:online', {
      deviceId: updated.id,
      online: updated.online,
      timestamp: new Date(),
    });
  }

  private async handleEnergy(device: Device, payload: unknown) {
    const reading = await this.energyService.ingestMeasurement(device, payload);
    await this.mqttRepository.touchDevice(device.id);
    await this.mqttRepository.touchNode(device.nodeId);

    this.realtime.emitToOrganization(device.organizationId, 'energy:update', {
      deviceId: device.id,
      // `power` é potência instantânea (W); `energy` é a energia do intervalo (Wh).
      power: reading.powerW,
      energy: reading.energyWh,
      energyTotalWh: reading.energyTotalWh,
      voltage: reading.voltage,
      current: reading.current,
      frequency: reading.frequency,
      powerFactor: reading.powerFactor,
      reading,
      timestamp: reading.timestamp,
    });
  }

  private async handleSensor(device: Device, payload: unknown) {
    await this.telemetryService.ingest(device, payload);
    await this.mqttRepository.touchDevice(device.id);
    await this.mqttRepository.touchNode(device.nodeId);
  }

  private async handleNodeOnline(organizationId: string, mqttUsername: string, payload: unknown) {
    const online = parseBoolean(payload, 'online');
    await TenantContext.runAsTenant(organizationId, async () => {
      const node = await this.mqttRepository.findNodeByUsername(mqttUsername);
      if (!node) {
        this.logger.warn(`No node ${mqttUsername} registered in org ${organizationId}`);
        return;
      }
      // O LWT do nó vale para todos os devices dele: se o ESP32 caiu, nenhum
      // canal está alcançável.
      const devices = await this.mqttRepository.setNodeOnline(node.id, online);
      this.realtime.emitToOrganization(node.organizationId, 'node:online', {
        nodeId: node.id,
        online,
        timestamp: new Date(),
      });
      for (const deviceId of devices) {
        this.realtime.emitToOrganization(node.organizationId, 'device:online', {
          deviceId,
          online,
          timestamp: new Date(),
        });
      }
    });
  }

  publish(topic: string, payload: any, options?: { qos?: 0 | 1 | 2; retain?: boolean }): void {
    if (!this.client || !this.connected) {
      this.logger.warn(`Cannot publish to ${topic}: MQTT client not connected`);
      return;
    }

    const message = typeof payload === 'string' ? payload : JSON.stringify(payload);

    this.client.publish(topic, message, { qos: options?.qos ?? 0, retain: options?.retain ?? false }, (err) => {
      if (err) {
        this.logger.error(`Failed to publish to ${topic}: ${err.message}`);
      } else {
        this.logger.debug(`Published to ${topic}`);
      }
    });
  }

  subscribe(topic: string | string[], qos: 0 | 1 | 2 = 0): void {
    if (!this.client || !this.connected) {
      this.logger.warn('Cannot subscribe: MQTT client not connected');
      return;
    }

    this.client.subscribe(topic, { qos }, (err) => {
      if (err) {
        this.logger.error(`Failed to subscribe to ${topic}: ${err.message}`);
      }
    });
  }

  subscribeAndWait(topic: string, qos: 0 | 1 | 2 = 1): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.connected) return reject(new Error('MQTT client not connected'));
      this.client.subscribe(topic, { qos }, (err) => (err ? reject(err) : resolve()));
    });
  }

  unsubscribe(topic: string | string[]): void {
    if (!this.client || !this.connected) {
      this.logger.warn('Cannot unsubscribe: MQTT client not connected');
      return;
    }

    this.client.unsubscribe(topic, (err) => {
      if (err) {
        this.logger.error(`Failed to unsubscribe from ${topic}: ${err.message}`);
      }
    });
  }

  isConnected(): boolean {
    return this.connected;
  }
}
