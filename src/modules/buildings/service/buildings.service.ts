import { Injectable, NotFoundException } from '@nestjs/common';
import { Building } from '@prisma/client';
import { BuildingsRepository } from '../repository/buildings.repository';
import {
  CreateBuildingData,
  UpdateBuildingData,
  BuildingStats,
} from '../interfaces/buildings.interface';

@Injectable()
export class BuildingsService {
  constructor(private readonly buildingsRepository: BuildingsRepository) {}

  async create(data: CreateBuildingData): Promise<Building> {
    return this.buildingsRepository.create(data);
  }

  async findAll(): Promise<Building[]> {
    return this.buildingsRepository.findAll();
  }

  async findById(id: string): Promise<Building> {
    const building = await this.buildingsRepository.findById(id);
    if (!building) {
      throw new NotFoundException(`Building with ID ${id} not found`);
    }
    return building;
  }

  async findByIdWithRelations(id: string): Promise<Building> {
    const building = await this.buildingsRepository.findByIdWithRelations(id);
    if (!building) {
      throw new NotFoundException(`Building with ID ${id} not found`);
    }
    return building;
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
    await this.findById(id);
    return this.buildingsRepository.getStats(id);
  }
}
