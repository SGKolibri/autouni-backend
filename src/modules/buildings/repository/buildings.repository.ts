import { Injectable } from '@nestjs/common';
import { Building } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import {
  IBuildingsRepository,
  CreateBuildingData,
  UpdateBuildingData,
  BuildingStats,
} from '../interfaces/buildings.interface';
import {
  countBuildingActiveDevices,
  countBuildingDevices,
  BuildingLike,
} from '../utils/building-energy.utils';

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
        activeDevices: 0,
        totalKwh: 0,
        count: 0,
        todayEnergyKwh: 0,
        dailyConsumptionKwh: 0,
        totalEnergy: 0,
        energyPeriod: 'today' as const,
        lastReadingAt: null,
        hasData: false,
      };
    }

    const totalFloors = building.floors.length;
    const totalRooms = building.floors.reduce(
      (sum, floor) => sum + floor.rooms.length,
      0,
    );
    const totalDevices = countBuildingDevices(building as BuildingLike);
    const activeDevices = countBuildingActiveDevices(building as BuildingLike);

    return {
      totalFloors,
      totalRooms,
      totalDevices,
      activeDevices,
      totalKwh: building.totalEnergy || 0,
      count: activeDevices,
      todayEnergyKwh: building.totalEnergy || 0,
      dailyConsumptionKwh: building.totalEnergy || 0,
      totalEnergy: building.totalEnergy || 0,
      energyPeriod: 'today' as const,
      lastReadingAt: null,
      hasData: (building.totalEnergy || 0) > 0,
    };
  }

  async findDevicesByBuildingId(buildingId: string) {
    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
      include: {
        floors: {
          include: {
            rooms: {
              include: {
                devices: {
                  select: {
                    status: true,
                    metadata: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return building?.floors.flatMap((floor) =>
      floor.rooms.flatMap((room) => room.devices),
    ) ?? [];
  }
}
