import { Injectable } from '@nestjs/common';
import { Floor } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import {
  IFloorsRepository,
  CreateFloorData,
  UpdateFloorData,
} from '../interfaces/floors.interface';

@Injectable()
export class FloorsRepository implements IFloorsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateFloorData): Promise<Floor> {
    return this.prisma.floor.create({
      data,
    });
  }

  async findAll(): Promise<Floor[]> {
    return this.prisma.floor.findMany({
      include: {
        building: true,
        rooms: {
          include: {
            devices: true,
          },
        },
      },
      orderBy: [{ buildingId: 'asc' }, { number: 'asc' }],
    });
  }

  async findById(id: string): Promise<Floor | null> {
    return this.prisma.floor.findUnique({
      where: { id },
      include: {
        building: true,
      },
    });
  }

  async findByIdWithRelations(id: string): Promise<Floor | null> {
    return this.prisma.floor.findUnique({
      where: { id },
      include: {
        building: true,
        rooms: {
          include: {
            devices: true,
          },
        },
      },
    });
  }

  async findByBuilding(buildingId: string): Promise<Floor[]> {
    return this.prisma.floor.findMany({
      where: { buildingId },
      include: {
        rooms: {
          include: {
            devices: true,
          },
        },
      },
      orderBy: {
        number: 'asc',
      },
    });
  }

  async update(id: string, data: UpdateFloorData): Promise<Floor> {
    return this.prisma.floor.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Floor> {
    return this.prisma.floor.delete({
      where: { id },
    });
  }
}
