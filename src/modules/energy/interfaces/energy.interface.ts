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
  
  deleteOldReadings(beforeDate: Date): Promise<number>;
}
