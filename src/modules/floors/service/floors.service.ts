import { Injectable, NotFoundException } from '@nestjs/common';
import { Floor } from '@prisma/client';
import { FloorsRepository } from '../repository/floors.repository';
import {
  CreateFloorData,
  UpdateFloorData,
  FloorWithEnergyToday,
  FloorWithRelations,
} from '../interfaces/floors.interface';
import { EnergyService } from '../../energy/service/energy.service';
import {
  summarizeDevicesConsumption,
  DeviceConsumptionLike,
} from '../../buildings/utils/building-energy.utils';
import { getAppTimeZone, resolvePeriodRange } from '../../energy/utils/energy-period.utils';

@Injectable()
export class FloorsService {
  constructor(
    private readonly floorsRepository: FloorsRepository,
    private readonly energyService: EnergyService,
  ) {}

  async create(data: CreateFloorData): Promise<Floor> {
    return this.floorsRepository.create(data);
  }

  async findAll(): Promise<FloorWithEnergyToday[]> {
    const floors = await this.floorsRepository.findAll();
    const { from, to } = resolvePeriodRange('today', new Date(), getAppTimeZone());

    return Promise.all(floors.map((floor) => this.enrichFloor(floor, from, to)));
  }

  async findById(id: string): Promise<Floor> {
    const floor = await this.floorsRepository.findById(id);
    if (!floor) {
      throw new NotFoundException(`Floor with ID ${id} not found`);
    }
    return floor;
  }

  async findByIdWithRelations(id: string): Promise<FloorWithEnergyToday> {
    const floor = await this.floorsRepository.findByIdWithRelations(id);
    if (!floor) {
      throw new NotFoundException(`Floor with ID ${id} not found`);
    }

    const { from, to } = resolvePeriodRange('today', new Date(), getAppTimeZone());
    return this.enrichFloor(floor, from, to);
  }

  async findByBuilding(buildingId: string): Promise<FloorWithEnergyToday[]> {
    const floors = await this.floorsRepository.findByBuilding(buildingId);
    const { from, to } = resolvePeriodRange('today', new Date(), getAppTimeZone());
    return Promise.all(floors.map((floor) => this.enrichFloor(floor, from, to)));
  }

  async update(id: string, data: UpdateFloorData): Promise<Floor> {
    await this.findById(id);
    return this.floorsRepository.update(id, data);
  }

  async delete(id: string): Promise<Floor> {
    await this.findById(id);
    return this.floorsRepository.delete(id);
  }

  private async enrichFloor(
    floor: FloorWithRelations,
    from: Date,
    to: Date,
  ): Promise<FloorWithEnergyToday> {
    const energyStats = await this.energyService.getFloorEnergyStats(floor.id, { from, to });
    const devices = floor.rooms?.flatMap((room) => room.devices ?? []) ?? [];
    return {
      ...floor,
      ...summarizeDevicesConsumption(
        devices as DeviceConsumptionLike[],
        from,
        to,
        energyStats.totalKwh,
        energyStats.count,
      ),
    };
  }
}
