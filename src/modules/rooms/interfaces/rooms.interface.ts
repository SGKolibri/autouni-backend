import { Room, RoomType } from '@prisma/client';

export interface IRoomsRepository {
  create(data: CreateRoomData): Promise<Room>;
  findAll(): Promise<Room[]>;
  findById(id: string): Promise<Room | null>;
  findByIdWithRelations(id: string): Promise<Room | null>;
  findByFloor(floorId: string): Promise<Room[]>;
  findByType(type: RoomType): Promise<Room[]>;
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
