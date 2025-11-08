import { Injectable, NotFoundException } from '@nestjs/common';
import { Room, RoomType } from '@prisma/client';
import { RoomsRepository } from '../repository/rooms.repository';
import { CreateRoomData, UpdateRoomData } from '../interfaces/rooms.interface';

@Injectable()
export class RoomsService {
  constructor(private readonly roomsRepository: RoomsRepository) {}

  async create(data: CreateRoomData): Promise<Room> {
    return this.roomsRepository.create(data);
  }

  async findAll(): Promise<Room[]> {
    return this.roomsRepository.findAll();
  }

  async findById(id: string): Promise<Room> {
    const room = await this.roomsRepository.findById(id);
    if (!room) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }
    return room;
  }

  async findByIdWithRelations(id: string): Promise<Room> {
    const room = await this.roomsRepository.findByIdWithRelations(id);
    if (!room) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }
    return room;
  }

  async findByFloor(floorId: string): Promise<Room[]> {
    return this.roomsRepository.findByFloor(floorId);
  }

  async findByType(type: RoomType): Promise<Room[]> {
    return this.roomsRepository.findByType(type);
  }

  async update(id: string, data: UpdateRoomData): Promise<Room> {
    await this.findById(id);
    return this.roomsRepository.update(id, data);
  }

  async delete(id: string): Promise<Room> {
    await this.findById(id);
    return this.roomsRepository.delete(id);
  }
}
