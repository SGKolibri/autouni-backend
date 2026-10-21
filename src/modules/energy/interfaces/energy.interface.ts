import { EnergyReading } from '@prisma/client';

export interface EnergyAggregation {
  totalKwh: number;
  count: number;
  avgWh?: number;
  maxWh?: number;
  minWh?: number;
}

export interface EnergyQueryParams {
  from?: Date;
  to?: Date;
  limit?: number;
}

export interface EnergyHistoryBucket {
  bucket: Date;
  totalKwh: number;
  count: number;
}

export interface EnergyComparisonItem {
  id: string;
  name: string;
  totalKwh: number;
  count: number;
  avgWh?: number;
}

export interface EnergyConsumptionSnapshot {
  totalKwh: number;
  /** Number of EnergyReading rows in the queried period. 0 means no telemetry data. */
  count: number;
  /** Same as count — explicit alias to distinguish from activeDevices. */
  readingCount: number;
  avgWh?: number;
  maxWh?: number;
  minWh?: number;
  totalDevices: number;
  activeDevices: number;
  todayEnergyKwh: number;
  dailyConsumptionKwh: number;
  totalEnergy: number;
  energyPeriod: 'today';
  /** Timestamp of the most recent EnergyReading in the database (any period). Null if table is empty. */
  lastReadingAt: Date | null;
  /** True when the snapshot carries non-zero energy from telemetry or estimation. */
  hasData: boolean;
}

export type ComparisonLevel = 'general' | 'building' | 'floor' | 'room';
export type ScopeLevel = 'general' | 'building' | 'floor' | 'room' | 'device';

export interface IEnergyRepository {
  createReading(data: {
    deviceId: string;
    valueWh: number;
    voltage?: number | null;
    current?: number | null;
  }): Promise<EnergyReading>;
  
  findReadingsByDevice(
    deviceId: string,
    params?: EnergyQueryParams,
  ): Promise<EnergyReading[]>;
  
  findReadingsByRoom(
    roomId: string,
    params?: EnergyQueryParams,
  ): Promise<EnergyReading[]>;
  
  aggregateByDevice(
    deviceId: string,
    params?: EnergyQueryParams,
  ): Promise<EnergyAggregation>;
  
  aggregateByRoom(
    roomId: string,
    params?: EnergyQueryParams,
  ): Promise<EnergyAggregation>;
  
  aggregateByFloor(
    floorId: string,
    params?: EnergyQueryParams,
  ): Promise<EnergyAggregation>;
  
  aggregateByBuilding(
    buildingId: string,
    params?: EnergyQueryParams,
  ): Promise<EnergyAggregation>;

  findDevicesForConsumption(): Promise<Array<{ status?: string | null; metadata?: unknown }>>;

  aggregateGlobal(params?: EnergyQueryParams): Promise<EnergyAggregation>;

  getLastReadingTimestamp(): Promise<Date | null>;

  getDeviceIdsForScope(level: Exclude<ScopeLevel, 'general'>, id: string): Promise<string[]>;

  getHistoryBuckets(
    from: Date,
    to: Date,
    bucketSize: 'hour' | 'day',
    deviceIds?: string[],
  ): Promise<EnergyHistoryBucket[]>;

  getComparisonStats(
    level: ComparisonLevel,
    params: EnergyQueryParams,
    id?: string,
  ): Promise<EnergyComparisonItem[]>;

  deleteOldReadings(beforeDate: Date): Promise<number>;
}
