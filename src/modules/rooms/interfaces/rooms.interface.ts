import { Room, RoomType } from '@prisma/client';
import {
  BuildingConsumptionSnapshot,
  DeviceConsumptionLike,
} from '../../buildings/utils/building-energy.utils';

export type RoomWithRelations = Room & {
  devices?: DeviceConsumptionLike[] | null;
};

export type RoomWithEnergyToday = RoomWithRelations & BuildingConsumptionSnapshot;

export interface IRoomsRepository {
  create(data: CreateRoomData): Promise<Room>;
  findAll(): Promise<RoomWithRelations[]>;
  findById(id: string): Promise<Room | null>;
  findByIdWithRelations(id: string): Promise<RoomWithRelations | null>;
  findByFloor(floorId: string): Promise<RoomWithRelations[]>;
  findByType(type: RoomType): Promise<RoomWithRelations[]>;
  update(id: string, data: UpdateRoomData): Promise<Room>;
  delete(id: string): Promise<Room>;
}

export interface CreateRoomData {
  floorId: string;
  name: string;
  type: RoomType;
}

export interface UpdateRoomData {
  name?: string;
  type?: RoomType;
}
