import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { connect, MqttClient } from 'mqtt';
import { MqttRepository } from '../repository/mqtt.repository';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { IMqttService } from '../interfaces/mqtt.interface';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy, IMqttService {
  private client: MqttClient;
  private readonly logger = new Logger(MqttService.name);
  private connected = false;
  private connectionAttempts = 0;
  private maxRetries = 10;

  constructor(
    private readonly mqttRepository: MqttRepository,
    private readonly realtime: RealtimeGateway,
  ) {}

  onModuleInit() {
    this.connect();
  }

  onModuleDestroy() {
    this.disconnect();
  }

  private connect() {
    const url = process.env.MQTT_URL ?? 'mqtt://localhost:1883';
    const username = process.env.MQTT_USERNAME;
    const password = process.env.MQTT_PASSWORD;

    this.logger.log(`Attempting to connect to MQTT broker at ${url} (attempt ${this.connectionAttempts + 1}/${this.maxRetries})`);

    this.client = connect(url, {
      username,
      password,
      reconnectPeriod: 5000,
      connectTimeout: 30000,
    });

    this.client.on('connect', () => {
      this.connected = true;
      this.connectionAttempts = 0;
      this.logger.log(`✅ Connected to MQTT broker at ${url}`);
      this.subscribeToDefaultTopics();
    });

    this.client.on('message', (topic, payload) => this.handleMessage(topic, payload));

    this.client.on('error', (err) => {
      this.connected = false;
      this.connectionAttempts++;
      this.logger.error(
        `❌ MQTT connection error (attempt ${this.connectionAttempts}/${this.maxRetries}): ${err.message}`,
        err,
      );
      
      if (this.connectionAttempts >= this.maxRetries) {
        this.logger.warn(
          `⚠️ Max MQTT connection retries (${this.maxRetries}) reached. The application will continue without MQTT support. ` +
          `Please ensure the MQTT broker is running and accessible at: ${url}`,
        );
      }
    });

    this.client.on('disconnect', () => {
      this.connected = false;
      this.logger.warn('Disconnected from MQTT broker');
    });

    this.client.on('reconnect', () => {
      this.logger.log('Attempting to reconnect to MQTT broker...');
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
    const topics = [
      'devices/+/status',
      'devices/+/energy',
      'devices/+/reading',
      'devices/+/online',
    ];

    topics.forEach((topic) => {
      this.client.subscribe(topic, { qos: 0 }, (err) => {
        if (err) {
          this.logger.error(`Failed to subscribe to ${topic}`, err);
        } else {
          this.logger.debug(`Subscribed to ${topic}`);
        }
      });
    });
  }

  private async handleMessage(topic: string, payload: Buffer) {
    try {
      const msg = payload.toString();
      let parsed: any;

      try {
        parsed = JSON.parse(msg);
      } catch {
        parsed = msg;
      }

      this.logger.debug(`MQTT message on ${topic}: ${msg}`);

      const device = await this.mqttRepository.findDeviceByTopic(topic);
      
      if (!device) {
        this.logger.warn(`No device found for topic ${topic}`);
        this.realtime.server?.emit('mqtt.raw', { topic, payload: parsed });
        return;
      }

      // Handle status updates
      if (topic.endsWith('/status')) {
        await this.handleStatusUpdate(device.id, parsed);
        return;
      }

      // Handle online/offline status
      if (topic.endsWith('/online')) {
        await this.handleOnlineStatus(device.id, parsed);
        return;
      }

      // Handle energy readings
      if (topic.endsWith('/energy') || topic.endsWith('/reading')) {
        await this.handleEnergyReading(device.id, parsed);
        return;
      }

      // Fallback: emit raw MQTT message
      this.realtime.server?.emit('mqtt.raw', { topic, payload: parsed, deviceId: device.id });
    } catch (err) {
      this.logger.error('Error handling MQTT message', err);
    }
  }

  private async handleStatusUpdate(deviceId: string, payload: any) {
    const status = typeof payload === 'object' ? payload.status : String(payload);
    
    const updatedDevice = await this.mqttRepository.updateDeviceStatus(deviceId, status);
    
    this.realtime.server?.emit('device.status', {
      deviceId: updatedDevice.id,
      status: updatedDevice.status,
      timestamp: new Date(),
    });

    this.logger.debug(`Device ${deviceId} status updated to ${status}`);
  }

  private async handleOnlineStatus(deviceId: string, payload: any) {
    const online = typeof payload === 'object' ? payload.online : payload === 'true' || payload === '1';
    
    const updatedDevice = await this.mqttRepository.updateDeviceOnlineStatus(deviceId, online);
    
    this.realtime.server?.emit('device.online', {
      deviceId: updatedDevice.id,
      online,
      timestamp: new Date(),
    });

    this.logger.debug(`Device ${deviceId} online status: ${online}`);
  }

  private async handleEnergyReading(deviceId: string, payload: any) {
    const valueWh = payload.valueWh ?? payload.power ?? payload.watts ?? payload.value ?? 0;
    const voltage = payload.voltage ?? null;
    const current = payload.current ?? null;

    const reading = await this.mqttRepository.createEnergyReading({
      deviceId,
      valueWh: Number(valueWh),
      voltage: voltage ? Number(voltage) : null,
      current: current ? Number(current) : null,
    });

    this.realtime.server?.emit('energy.reading', {
      deviceId,
      reading,
      timestamp: new Date(),
    });

    this.logger.debug(`Energy reading created for device ${deviceId}: ${valueWh}Wh`);
  }

  // Public API methods
  publish(topic: string, payload: any, options?: { qos?: 0 | 1 | 2; retain?: boolean }): void {
    if (!this.connected) {
      this.logger.warn(
        `⚠️ Cannot publish to ${topic}: MQTT client not connected. ` +
        `Make sure the MQTT broker is running at ${process.env.MQTT_URL ?? 'mqtt://localhost:1883'}`,
      );
      return;
    }

    const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
    
    this.client.publish(topic, message, { qos: options?.qos ?? 0, retain: options?.retain ?? false }, (err) => {
      if (err) {
        this.logger.error(`Failed to publish to ${topic}`, err);
      } else {
        this.logger.debug(`Published to ${topic}: ${message}`);
      }
    });
  }

  subscribe(topic: string | string[], qos: 0 | 1 | 2 = 0): void {
    if (!this.connected) {
      this.logger.warn('Cannot subscribe: MQTT client not connected');
      return;
    }

    this.client.subscribe(topic, { qos }, (err) => {
      if (err) {
        this.logger.error(`Failed to subscribe to ${topic}`, err);
      } else {
        this.logger.log(`Subscribed to ${topic}`);
      }
    });
  }

  unsubscribe(topic: string | string[]): void {
    if (!this.connected) {
      this.logger.warn('Cannot unsubscribe: MQTT client not connected');
      return;
    }

    this.client.unsubscribe(topic, (err) => {
      if (err) {
        this.logger.error(`Failed to unsubscribe from ${topic}`, err);
      } else {
        this.logger.log(`Unsubscribed from ${topic}`);
      }
    });
  }

  isConnected(): boolean {
    return this.connected;
  }
}