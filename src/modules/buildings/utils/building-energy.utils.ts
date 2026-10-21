type DeviceLike = {
  status?: string | boolean | null;
  powerRating?: number | string | null;
  metadata?: unknown;
};

type RoomLike = {
  devices?: DeviceLike[] | null;
};

type FloorLike = {
  rooms?: RoomLike[] | null;
};

export type BuildingLike = {
  floors?: FloorLike[] | null;
};

export type DeviceConsumptionLike = DeviceLike;

export interface BuildingConsumptionSnapshot {
  totalKwh: number;
  /** EnergyReading rows counted. 0 means no telemetry for the period. */
  count: number;
  totalDevices: number;
  activeDevices: number;
  todayEnergyKwh: number;
  dailyConsumptionKwh: number;
  totalEnergy: number;
  energyPeriod: 'today';
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractNumericValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const normalized = value.trim();
    const direct = Number(normalized);
    if (Number.isFinite(direct)) {
      return direct;
    }

    const match = normalized.match(
      /^(-?\d+(?:[.,]\d+)?)\s*(w|kw|wh|kwh|btu(?:\/h)?|btuh)?$/i,
    );
    if (!match) {
      return null;
    }

    const magnitude = Number(match[1].replace(',', '.'));
    if (!Number.isFinite(magnitude)) {
      return null;
    }

    const unit = (match[2] ?? 'w').toLowerCase();
    if (unit === 'kw' || unit === 'kwh') {
      return magnitude * 1000;
    }

    if (unit === 'btu' || unit === 'btu/h' || unit === 'btuh') {
      return magnitude * 0.29307107;
    }

    return magnitude;
  }

  return null;
}

function extractMetadataPower(metadata: unknown): number | null {
  if (!isPlainObject(metadata)) {
    return null;
  }

  const powerKeys = ['power', 'powerRating', 'nominalPower', 'watts'];
  for (const key of powerKeys) {
    const extracted = extractNumericValue(metadata[key]);
    if (extracted !== null) {
      return extracted;
    }
  }

  for (const value of Object.values(metadata)) {
    if (typeof value === 'object' && value !== null) {
      const nested = extractMetadataPower(value);
      if (nested !== null) {
        return nested;
      }
    }
  }

  return null;
}

function extractMetadataActiveState(metadata: unknown): unknown {
  if (!isPlainObject(metadata)) {
    return null;
  }

  const statusKeys = ['status', 'state', 'powerState'];
  for (const key of statusKeys) {
    const value = metadata[key];
    if (typeof value === 'string' || typeof value === 'boolean') {
      return value;
    }
  }

  for (const value of Object.values(metadata)) {
    if (typeof value === 'object' && value !== null) {
      const nested = extractMetadataActiveState(value);
      if (nested !== null) {
        return nested;
      }
    }
  }

  return null;
}

export function isDeviceActive(device: DeviceLike): boolean {
  const rawStatus = device.status ?? extractMetadataActiveState(device.metadata);
  if (typeof rawStatus === 'boolean') {
    return rawStatus;
  }

  const status = normalizeString(rawStatus);
  return status === 'on' || status === 'true';
}

export function getDevicePowerWatts(device: DeviceLike): number {
  const directPower = extractNumericValue(device.powerRating);
  if (directPower !== null) {
    return directPower;
  }

  return extractMetadataPower(device.metadata) ?? 0;
}

export function countBuildingDevices(building: BuildingLike): number {
  return flattenBuildingDevices(building).length;
}

export function countBuildingActiveDevices(building: BuildingLike): number {
  return flattenBuildingDevices(building).filter((device) => isDeviceActive(device)).length;
}

export function flattenBuildingDevices(building: BuildingLike): DeviceLike[] {
  return building.floors?.flatMap((floor) =>
    floor.rooms?.flatMap((room) => room.devices ?? []) ?? [],
  ) ?? [];
}

export function estimateDevicesDailyConsumptionKwh(
  devices: DeviceConsumptionLike[],
  from: Date,
  to: Date,
): number {
  const elapsedHours = Math.max((to.getTime() - from.getTime()) / 3_600_000, 0);
  if (elapsedHours === 0) {
    return 0;
  }

  const totalWatts = devices
    .filter((device) => isDeviceActive(device))
    .reduce((sum, device) => sum + getDevicePowerWatts(device), 0);

  return (totalWatts * elapsedHours) / 1000;
}

export function estimateBuildingDailyConsumptionKwh(
  building: BuildingLike,
  from: Date,
  to: Date,
): number {
  return estimateDevicesDailyConsumptionKwh(flattenBuildingDevices(building), from, to);
}

export function summarizeDevicesConsumption(
  devices: DeviceConsumptionLike[],
  from: Date,
  to: Date,
  telemetryKwh?: number | null,
  telemetryCount?: number | null,
): BuildingConsumptionSnapshot {
  const totalDevices = devices.length;
  const activeDevices = devices.filter((device) => isDeviceActive(device)).length;
  const estimatedKwh = estimateDevicesDailyConsumptionKwh(devices, from, to);
  const telemetryValue = telemetryKwh ?? 0;
  const hasUsableTelemetry = (telemetryCount ?? 0) > 0 && telemetryValue > 0;
  const dailyConsumptionKwh = hasUsableTelemetry ? telemetryValue : estimatedKwh;

  return {
    totalKwh: dailyConsumptionKwh,
    count: hasUsableTelemetry ? telemetryCount ?? 0 : activeDevices,
    totalDevices,
    activeDevices,
    todayEnergyKwh: dailyConsumptionKwh,
    dailyConsumptionKwh,
    totalEnergy: dailyConsumptionKwh,
    energyPeriod: 'today',
  };
}

export function summarizeBuildingConsumption(
  building: BuildingLike,
  from: Date,
  to: Date,
  telemetryKwh?: number | null,
  telemetryCount?: number | null,
): BuildingConsumptionSnapshot {
  return summarizeDevicesConsumption(flattenBuildingDevices(building), from, to, telemetryKwh, telemetryCount);
}
