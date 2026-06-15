import { Floor } from '@prisma/client';
import {
  BuildingConsumptionSnapshot,
  DeviceConsumptionLike,
} from '../../buildings/utils/building-energy.utils';

export type FloorRoomWithDevices = {
  devices?: DeviceConsumptionLike[] | null;
};

export type FloorWithRelations = Floor & {
  rooms?: FloorRoomWithDevices[] | null;
};

export type FloorWithEnergyToday = FloorWithRelations & BuildingConsumptionSnapshot;

export interface IFloorsRepository {
  create(data: CreateFloorData): Promise<Floor>;
  findAll(): Promise<FloorWithRelations[]>;
  findById(id: string): Promise<Floor | null>;
  findByIdWithRelations(id: string): Promise<FloorWithRelations | null>;
  findByBuilding(buildingId: string): Promise<FloorWithRelations[]>;
  update(id: string, data: UpdateFloorData): Promise<Floor>;
  delete(id: string): Promise<Floor>;
}

export interface CreateFloorData {
  buildingId: string;
  number: number;
  name?: string;
}

export interface UpdateFloorData {
  number?: number;
  name?: string;
}
