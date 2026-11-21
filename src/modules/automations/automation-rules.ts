import { SensorKind } from '@prisma/client';
import { DeviceCommand } from '../devices/interfaces/devices.interface';

export class InvalidRuleError extends Error {}

/**
 * Condição de uma automação CONDITION (campo `condition`, JSON):
 *   { "type": "occupancy", "roomId": "...", "occupied": false, "forSeconds": 600 }
 *   { "type": "sensor", "deviceId": "...", "kind": "GAS_MQ2", "op": "gte", "value": 1800 }
 */
export type AutomationCondition =
  | { type: 'occupancy'; roomId: string; occupied: boolean; forSeconds: number }
  | {
      type: 'sensor';
      deviceId: string;
      kind: SensorKind;
      op: 'gt' | 'gte' | 'lt' | 'lte';
      value: number;
      // Leitura mais velha que isso não vale: sensor calado não satisfaz condição.
      maxAgeSeconds: number;
    };

/**
 * Ação (campo `action`, JSON):
 *   { "deviceId": "...", "command": "off" }              (preferido)
 *   { "topic": "devices/x/command", "payload": {...} }  (legado; tópico precisa ser de um device da organização)
 */
export type AutomationActionSpec =
  | {
      kind: 'device';
      deviceId: string;
      command: DeviceCommand;
      intensity?: number;
      temperature?: number;
    }
  | { kind: 'topic'; topic: string; payload: unknown };

function asObject(raw: unknown, field: string): Record<string, any> {
  let value = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      throw new InvalidRuleError(`${field} deve ser JSON`);
    }
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new InvalidRuleError(`${field} deve ser um objeto JSON`);
  }
  return value as Record<string, any>;
}

const isId = (v: unknown) => typeof v === 'string' && v.length > 0;

export function parseCondition(raw: unknown): AutomationCondition {
  const c = asObject(raw, 'condition');

  if (c.type === 'occupancy') {
    if (!isId(c.roomId))
      throw new InvalidRuleError('condition.roomId obrigatório');
    if (typeof c.occupied !== 'boolean')
      throw new InvalidRuleError('condition.occupied deve ser booleano');
    const forSeconds = c.forSeconds ?? 0;
    if (typeof forSeconds !== 'number' || forSeconds < 0) {
      throw new InvalidRuleError('condition.forSeconds deve ser >= 0');
    }
    return {
      type: 'occupancy',
      roomId: c.roomId,
      occupied: c.occupied,
      forSeconds,
    };
  }

  if (c.type === 'sensor') {
    if (!isId(c.deviceId))
      throw new InvalidRuleError('condition.deviceId obrigatório');
    if (!(c.kind in SensorKind))
      throw new InvalidRuleError('condition.kind inválido');
    if (!['gt', 'gte', 'lt', 'lte'].includes(c.op))
      throw new InvalidRuleError('condition.op deve ser gt|gte|lt|lte');
    if (typeof c.value !== 'number' || !Number.isFinite(c.value)) {
      throw new InvalidRuleError('condition.value deve ser numérico');
    }
    const maxAgeSeconds = c.maxAgeSeconds ?? 300;
    if (typeof maxAgeSeconds !== 'number' || maxAgeSeconds <= 0) {
      throw new InvalidRuleError('condition.maxAgeSeconds deve ser > 0');
    }
    return {
      type: 'sensor',
      deviceId: c.deviceId,
      kind: c.kind,
      op: c.op,
      value: c.value,
      maxAgeSeconds,
    };
  }

  throw new InvalidRuleError('condition.type deve ser "occupancy" ou "sensor"');
}

export function parseAction(raw: unknown): AutomationActionSpec {
  const a = asObject(raw, 'action');

  if (a.deviceId !== undefined) {
    if (!isId(a.deviceId))
      throw new InvalidRuleError('action.deviceId inválido');
    const command = String(a.command ?? '').toLowerCase();
    if (!(Object.values(DeviceCommand) as string[]).includes(command)) {
      throw new InvalidRuleError(
        `action.command deve ser ${Object.values(DeviceCommand).join('|')}`,
      );
    }
    return {
      kind: 'device',
      deviceId: a.deviceId,
      command: command as DeviceCommand,
      ...(typeof a.intensity === 'number' ? { intensity: a.intensity } : {}),
      ...(typeof a.temperature === 'number'
        ? { temperature: a.temperature }
        : {}),
    };
  }

  if (
    typeof a.topic === 'string' &&
    /^devices\/[A-Za-z0-9_-]+\/command$/.test(a.topic)
  ) {
    return { kind: 'topic', topic: a.topic, payload: a.payload ?? {} };
  }

  throw new InvalidRuleError(
    'action precisa de deviceId+command, ou topic no formato devices/<slug>/command',
  );
}

export function occupancyMet(
  condition: Extract<AutomationCondition, { type: 'occupancy' }>,
  room: { occupied: boolean; occupancyChangedAt: Date | null },
  now: Date,
): boolean {
  if (room.occupied !== condition.occupied) return false;
  if (condition.forSeconds === 0) return true;
  // Sala que nunca registrou mudança está no estado inicial (vazia) desde sempre.
  if (!room.occupancyChangedAt) return !room.occupied;
  return (
    now.getTime() - room.occupancyChangedAt.getTime() >=
    condition.forSeconds * 1000
  );
}

export function sensorMet(
  condition: Extract<AutomationCondition, { type: 'sensor' }>,
  latest: { value: number; timestamp: Date } | null,
  now: Date,
): boolean {
  if (!latest) return false;
  if (
    now.getTime() - latest.timestamp.getTime() >
    condition.maxAgeSeconds * 1000
  )
    return false;
  switch (condition.op) {
    case 'gt':
      return latest.value > condition.value;
    case 'gte':
      return latest.value >= condition.value;
    case 'lt':
      return latest.value < condition.value;
    case 'lte':
      return latest.value <= condition.value;
  }
}
