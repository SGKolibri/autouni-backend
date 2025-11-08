import { Building } from '@prisma/client';

export interface IBuildingsRepository {
  create(data: CreateBuildingData): Promise<Building>;
  findAll(): Promise<Building[]>;
  findById(id: string): Promise<Building | null>;
  findByIdWithRelations(id: string): Promise<Building | null>;
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
  totalEnergy: number;
  activeDevices: number;
}
