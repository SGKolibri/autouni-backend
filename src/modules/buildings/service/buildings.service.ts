import { Injectable, NotFoundException } from '@nestjs/common';
import { Building } from '@prisma/client';
import { BuildingsRepository } from '../repository/buildings.repository';
import { EnergyService } from '../../energy/service/energy.service';
import {
  CreateBuildingData,
  UpdateBuildingData,
  BuildingStats,
  BuildingWithEnergyToday,
} from '../interfaces/buildings.interface';
import {
  summarizeBuildingConsumption,
  BuildingLike,
} from '../utils/building-energy.utils';
import { resolvePeriodRange, getAppTimeZone } from '../../energy/utils/energy-period.utils';

@Injectable()
export class BuildingsService {
  constructor(
    private readonly buildingsRepository: BuildingsRepository,
    private readonly energyService: EnergyService,
  ) {}

  async create(data: CreateBuildingData): Promise<Building> {
    return this.buildingsRepository.create(data);
  }

  async findAll(): Promise<BuildingWithEnergyToday[]> {
    const { from: startOfToday, to: now } = resolvePeriodRange(
      'today',
      new Date(),
      getAppTimeZone(),
    );

    const [buildings, lastReadingAt] = await Promise.all([
      this.buildingsRepository.findAll(),
      this.energyService.getLastReadingTimestamp(),
    ]);

    return Promise.all(
      buildings.map(async (building) => {
        const energyStats = await this.energyService.getBuildingEnergyStats(
          building.id,
          { from: startOfToday, to: now },
        );
        const consumption = summarizeBuildingConsumption(
          building as BuildingLike,
          startOfToday,
          now,
          energyStats.totalKwh,
          energyStats.count,
        );

        return { ...building, ...consumption, lastReadingAt };
      }),
    );
  }

  async findById(id: string): Promise<Building> {
    const building = await this.buildingsRepository.findById(id);
    if (!building) {
      throw new NotFoundException(`Building with ID ${id} not found`);
    }
    return building;
  }

  async findByIdWithRelations(id: string): Promise<BuildingWithEnergyToday> {
    const building = await this.buildingsRepository.findByIdWithRelations(id);
    if (!building) {
      throw new NotFoundException(`Building with ID ${id} not found`);
    }

    const { from: startOfToday, to: now } = resolvePeriodRange(
      'today',
      new Date(),
      getAppTimeZone(),
    );
    const [energyStats, lastReadingAt] = await Promise.all([
      this.energyService.getBuildingEnergyStats(id, { from: startOfToday, to: now }),
      this.energyService.getLastReadingTimestamp(),
    ]);

    return {
      ...building,
      ...summarizeBuildingConsumption(
        building as BuildingLike,
        startOfToday,
        now,
        energyStats.totalKwh,
        energyStats.count,
      ),
      lastReadingAt,
    };
  }

  async update(id: string, data: UpdateBuildingData): Promise<Building> {
    await this.findById(id);
    return this.buildingsRepository.update(id, data);
  }

  async delete(id: string): Promise<Building> {
    await this.findById(id);
    return this.buildingsRepository.delete(id);
  }

  async getStats(id: string): Promise<BuildingStats> {
    const building = await this.findByIdWithRelations(id);
    const floors = building.floors ?? [];
    const totalFloors = floors.length;
    const totalRooms = floors.reduce(
      (sum, floor) => sum + (floor.rooms?.length ?? 0),
      0,
    );

    return {
      totalFloors,
      totalRooms,
      totalDevices: building.totalDevices,
      activeDevices: building.activeDevices,
      totalKwh: building.totalKwh,
      count: building.count,
      todayEnergyKwh: building.todayEnergyKwh,
      dailyConsumptionKwh: building.dailyConsumptionKwh,
      totalEnergy: building.totalEnergy,
      energyPeriod: building.energyPeriod,
      lastReadingAt: building.lastReadingAt,
      hasData: building.totalKwh > 0,
    };
  }
}
