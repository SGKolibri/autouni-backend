import { Building } from '@prisma/client';
import { BuildingLike } from '../utils/building-energy.utils';
import { BuildingConsumptionSnapshot } from '../utils/building-energy.utils';

export type BuildingWithRelations = Building & BuildingLike;

export type BuildingWithEnergyToday = BuildingWithRelations & BuildingConsumptionSnapshot;

export interface IBuildingsRepository {
  create(data: CreateBuildingData): Promise<Building>;
  findAll(): Promise<Building[]>;
  findById(id: string): Promise<Building | null>;
  findByIdWithRelations(id: string): Promise<Building | null>;
  findDevicesByBuildingId?(buildingId: string): Promise<Array<{ status?: string | null; metadata?: unknown }>>;
  update(id: string, data: UpdateBuildingData): Promise<Building>;
  delete(id: string): Promise<Building>;
  getStats(id: string): Promise<BuildingStats>;
}

export interface CreateBuildingData {
  name: string;
  description?: string;
  location: string;
  totalEnergy?: number;
  activeDevices?: number;
}

export interface UpdateBuildingData {
  name?: string;
  description?: string;
  location?: string;
  totalEnergy?: number;
  activeDevices?: number;
}

export interface BuildingStats {
  totalFloors: number;
  totalRooms: number;
  totalDevices: number;
  activeDevices: number;
  totalKwh: number;
  count: number;
  todayEnergyKwh: number;
  dailyConsumptionKwh: number;
  totalEnergy: number;
  energyPeriod: 'today';
}

export type BuildingConsumption = BuildingConsumptionSnapshot;
