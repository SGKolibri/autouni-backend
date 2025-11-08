import { Floor } from '@prisma/client';

export interface IFloorsRepository {
  create(data: CreateFloorData): Promise<Floor>;
  findAll(): Promise<Floor[]>;
  findById(id: string): Promise<Floor | null>;
  findByIdWithRelations(id: string): Promise<Floor | null>;
  findByBuilding(buildingId: string): Promise<Floor[]>;
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
