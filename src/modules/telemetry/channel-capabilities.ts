import { DeviceChannel, SensorKind } from '@prisma/client';

export type ReadingKind = 'ENERGY' | SensorKind;

// Que leitura cada canal físico pode produzir. Um device sem canal (cadastro
// antigo, sem nó) aceita qualquer leitura, para não quebrar a base existente.
const ACCEPTS: Record<DeviceChannel, ReadingKind[]> = {
  ENERGY_METER: ['ENERGY'],
  // Relé e dimmer podem ter medição própria no mesmo circuito.
  RELAY: ['ENERGY'],
  DIMMER: ['ENERGY'],
  IR: [],
  GAS_MQ2: [SensorKind.GAS_MQ2],
  GAS_MQ135: [SensorKind.GAS_MQ135],
  PIR: [SensorKind.MOTION],
};

// Canais que recebem comando (`<topic>/command`).
export const COMMANDABLE_CHANNELS: DeviceChannel[] = [
  DeviceChannel.RELAY,
  DeviceChannel.DIMMER,
  DeviceChannel.IR,
];

export function channelAccepts(
  channel: DeviceChannel | null | undefined,
  kind: ReadingKind,
): boolean {
  if (!channel) return true;
  return ACCEPTS[channel].includes(kind);
}

// Leitura de sensor padrão do canal, para payloads que omitem `kind`.
export function defaultSensorKind(
  channel: DeviceChannel | null | undefined,
): SensorKind | null {
  switch (channel) {
    case DeviceChannel.GAS_MQ2:
      return SensorKind.GAS_MQ2;
    case DeviceChannel.GAS_MQ135:
      return SensorKind.GAS_MQ135;
    case DeviceChannel.PIR:
      return SensorKind.MOTION;
    default:
      return null;
  }
}
