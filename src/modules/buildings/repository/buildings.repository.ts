import { Injectable } from '@nestjs/common';
import { Building } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import {
  IBuildingsRepository,
  CreateBuildingData,
  UpdateBuildingData,
  BuildingStats,
} from '../interfaces/buildings.interface';

@Injectable()
export class BuildingsRepository implements IBuildingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateBuildingData): Promise<Building> {
    return this.prisma.building.create({
      data,
    });
  }

  async findAll(): Promise<Building[]> {
    return this.prisma.building.findMany({
      include: {
        floors: {
          include: {
            rooms: {
              include: {
                devices: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findById(id: string): Promise<Building | null> {
    return this.prisma.building.findUnique({
      where: { id },
    });
  }

  async findByIdWithRelations(id: string): Promise<Building | null> {
    return this.prisma.building.findUnique({
      where: { id },
      include: {
        floors: {
          include: {
            rooms: {
              include: {
                devices: true,
              },
            },
          },
        },
      },
    });
  }

  async update(id: string, data: UpdateBuildingData): Promise<Building> {
    return this.prisma.building.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Building> {
    return this.prisma.building.delete({
      where: { id },
    });
  }

  async getStats(id: string): Promise<BuildingStats> {
    const building = await this.prisma.building.findUnique({
      where: { id },
      include: {
        floors: {
          include: {
            rooms: {
              include: {
                devices: {
                  select: {
                    id: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!building) {
      return {
        totalFloors: 0,
        totalRooms: 0,
        totalDevices: 0,
        totalEnergy: 0,
        activeDevices: 0,
      };
    }

    const totalFloors = building.floors.length;
    const totalRooms = building.floors.reduce(
      (sum, floor) => sum + floor.rooms.length,
      0,
    );
    const totalDevices = building.floors.reduce(
      (sum, floor) =>
        sum +
        floor.rooms.reduce((roomSum, room) => roomSum + room.devices.length, 0),
      0,
    );
    const activeDevices = building.floors.reduce(
      (sum, floor) =>
        sum +
        floor.rooms.reduce(
          (roomSum, room) =>
            roomSum +
            room.devices.filter((d) => d.status === 'ON').length,
          0,
        ),
      0,
    );

    return {
      totalFloors,
      totalRooms,
      totalDevices,
      totalEnergy: building.totalEnergy || 0,
      activeDevices,
    };
  }
}
