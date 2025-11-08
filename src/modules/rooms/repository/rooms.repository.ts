import { Injectable } from '@nestjs/common';
import { Room, RoomType } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import {
  IRoomsRepository,
  CreateRoomData,
  UpdateRoomData,
} from '../interfaces/rooms.interface';

@Injectable()
export class RoomsRepository implements IRoomsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateRoomData): Promise<Room> {
    return this.prisma.room.create({
      data,
    });
  }

  async findAll(): Promise<Room[]> {
    return this.prisma.room.findMany({
      include: {
        floor: {
          include: {
            building: true,
          },
        },
        devices: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findById(id: string): Promise<Room | null> {
    return this.prisma.room.findUnique({
      where: { id },
      include: {
        floor: {
          include: {
            building: true,
          },
        },
      },
    });
  }

  async findByIdWithRelations(id: string): Promise<Room | null> {
    return this.prisma.room.findUnique({
      where: { id },
      include: {
        floor: {
          include: {
            building: true,
          },
        },
        devices: true,
      },
    });
  }

  async findByFloor(floorId: string): Promise<Room[]> {
    return this.prisma.room.findMany({
      where: { floorId },
      include: {
        devices: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findByType(type: RoomType): Promise<Room[]> {
    return this.prisma.room.findMany({
      where: { type },
      include: {
        floor: {
          include: {
            building: true,
          },
        },
        devices: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async update(id: string, data: UpdateRoomData): Promise<Room> {
    return this.prisma.room.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Room> {
    return this.prisma.room.delete({
      where: { id },
    });
  }
}
