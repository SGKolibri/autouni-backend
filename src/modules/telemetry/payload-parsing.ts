import { DeviceStatus, SensorKind } from '@prisma/client';

export class InvalidPayloadError extends Error {}

export function toFiniteNumber(value: unknown, field: string): number | null {
  if (value === undefined || value === null) return null;
  const n =
    typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    throw new InvalidPayloadError(`${field} deve ser numérico`);
  }
  return n;
}

function inRange(
  value: number | null,
  field: string,
  min: number,
  max: number,
) {
  if (value !== null && (value < min || value > max)) {
    throw new InvalidPayloadError(
      `${field} fora da faixa [${min}, ${max}]: ${value}`,
    );
  }
  return value;
}

function asObject(payload: unknown): Record<string, unknown> {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    Array.isArray(payload)
  ) {
    throw new InvalidPayloadError('payload deve ser um objeto JSON');
  }
  return payload as Record<string, unknown>;
}

export function parseStatus(payload: unknown): DeviceStatus {
  const raw =
    typeof payload === 'object' && payload !== null
      ? (payload as any).status
      : payload;
  const value = typeof raw === 'string' ? raw.trim().toUpperCase() : raw;
  if (typeof value !== 'string' || !(value in DeviceStatus)) {
    throw new InvalidPayloadError(
      `status inválido: ${JSON.stringify(raw)}; esperado ${Object.keys(DeviceStatus).join('|')}`,
    );
  }
  return value as DeviceStatus;
}

export function parseBoolean(payload: unknown, field: string): boolean {
  const raw =
    typeof payload === 'object' && payload !== null
      ? (payload as any)[field]
      : payload;
  if (raw === true || raw === 1 || raw === 'true' || raw === '1') return true;
  if (raw === false || raw === 0 || raw === 'false' || raw === '0')
    return false;
  throw new InvalidPayloadError(
    `${field} deve ser booleano, recebido ${JSON.stringify(raw)}`,
  );
}

export interface EnergyMeasurement {
  energyWh: number | null;
  energyTotalWh: number | null;
  powerW: number | null;
  voltage: number | null;
  current: number | null;
  frequency: number | null;
  powerFactor: number | null;
}

/**
 * Contrato de `devices/<id>/energy`:
 *   { "powerW", "energyTotalWh" | "energyWh", "voltage", "current", "frequency", "powerFactor" }
 * Pelo menos um entre energyWh, energyTotalWh e powerW. Zero é valor válido
 * (carga desligada), diferente de ausente.
 */
export function parseEnergyPayload(payload: unknown): EnergyMeasurement {
  const p = asObject(payload);

  const m: EnergyMeasurement = {
    energyWh: inRange(
      toFiniteNumber(p.energyWh, 'energyWh'),
      'energyWh',
      0,
      1e9,
    ),
    energyTotalWh: inRange(
      toFiniteNumber(p.energyTotalWh, 'energyTotalWh'),
      'energyTotalWh',
      0,
      1e12,
    ),
    powerW: inRange(toFiniteNumber(p.powerW, 'powerW'), 'powerW', 0, 1e6),
    voltage: inRange(toFiniteNumber(p.voltage, 'voltage'), 'voltage', 0, 500),
    current: inRange(toFiniteNumber(p.current, 'current'), 'current', 0, 200),
    frequency: inRange(
      toFiniteNumber(p.frequency, 'frequency'),
      'frequency',
      0,
      100,
    ),
    powerFactor: inRange(
      toFiniteNumber(p.powerFactor ?? p.pf, 'powerFactor'),
      'powerFactor',
      0,
      1,
    ),
  };

  if (m.energyWh === null && m.energyTotalWh === null && m.powerW === null) {
    if ('valueWh' in p || 'power' in p || 'watts' in p || 'value' in p) {
      throw new InvalidPayloadError(
        'payload legado (valueWh/power/watts/value) não é mais aceito: ' +
          'envie powerW e energyTotalWh (ou energyWh)',
      );
    }
    throw new InvalidPayloadError(
      'payload sem energyWh, energyTotalWh nem powerW',
    );
  }

  return m;
}

export interface PreviousEnergyReading {
  energyTotalWh: number | null;
  powerW: number | null;
  timestamp: Date;
}

// Lacuna máxima integrável. Acima disso (device caiu, broker reiniciou) a
// potência medida agora não diz nada sobre o intervalo perdido.
export const MAX_INTEGRATION_GAP_SECONDS = 300;

/**
 * Energia consumida desde a leitura anterior, em Wh.
 *
 * 1. `energyWh` enviado: é o intervalo, usado como está.
 * 2. `energyTotalWh` (contador do PZEM): diferença para o contador anterior.
 *    Primeira leitura só estabelece a base (0). Contador menor que o anterior
 *    significa medidor zerado: conta o que acumulou desde o zero.
 * 3. Só `powerW`: integra a potência no tempo (trapézio com a anterior),
 *    desde que a lacuna não passe de MAX_INTEGRATION_GAP_SECONDS.
 */
export function computeIntervalEnergyWh(
  m: EnergyMeasurement,
  previous: PreviousEnergyReading | null,
  now: Date,
): number {
  if (m.energyWh !== null) return m.energyWh;

  if (m.energyTotalWh !== null) {
    if (!previous || previous.energyTotalWh === null) return 0;
    const diff = m.energyTotalWh - previous.energyTotalWh;
    return diff >= 0 ? diff : m.energyTotalWh;
  }

  const power = m.powerW as number;
  if (!previous) return 0;
  const seconds = (now.getTime() - previous.timestamp.getTime()) / 1000;
  if (seconds <= 0 || seconds > MAX_INTEGRATION_GAP_SECONDS) return 0;
  const average =
    previous.powerW !== null ? (previous.powerW + power) / 2 : power;
  return (average * seconds) / 3600;
}

export interface SensorMeasurement {
  kind: SensorKind;
  value: number;
  unit: string | null;
  raw: number | null;
}

/**
 * Contrato de `devices/<id>/sensor`:
 *   { "kind": "GAS_MQ2", "value": 512, "unit": "adc", "raw": 512 }
 *   { "readings": [ {...}, {...} ] }
 *   { "motion": true }   (atalho para MOTION)
 * `kind` pode ser omitido quando o canal do device o determina.
 */
export function parseSensorPayload(
  payload: unknown,
  fallbackKind: SensorKind | null,
): SensorMeasurement[] {
  const p = asObject(payload);
  const entries: unknown[] = Array.isArray(p.readings) ? p.readings : [p];
  if (entries.length === 0) throw new InvalidPayloadError('readings vazio');

  return entries.map((entry) => {
    const e = asObject(entry);
    const kindRaw =
      e.kind ?? ('motion' in e ? SensorKind.MOTION : fallbackKind);
    if (typeof kindRaw !== 'string' || !(kindRaw in SensorKind)) {
      throw new InvalidPayloadError(
        `kind inválido: ${JSON.stringify(kindRaw)}; esperado ${Object.keys(SensorKind).join('|')}`,
      );
    }
    const kind = kindRaw as SensorKind;

    let value: number;
    if (kind === SensorKind.MOTION) {
      value = parseBoolean('motion' in e ? e.motion : e.value, 'motion')
        ? 1
        : 0;
    } else {
      const v = inRange(toFiniteNumber(e.value, 'value'), 'value', 0, 1e6);
      if (v === null) throw new InvalidPayloadError('value obrigatório');
      value = v;
    }

    const unit =
      e.unit === undefined || e.unit === null
        ? null
        : String(e.unit).slice(0, 16);
    return { kind, value, unit, raw: toFiniteNumber(e.raw, 'raw') };
  });
}
