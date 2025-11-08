import { Injectable, NotFoundException } from '@nestjs/common';
import { Floor } from '@prisma/client';
import { FloorsRepository } from '../repository/floors.repository';
import {
  CreateFloorData,
  UpdateFloorData,
} from '../interfaces/floors.interface';

@Injectable()
export class FloorsService {
  constructor(private readonly floorsRepository: FloorsRepository) {}

  async create(data: CreateFloorData): Promise<Floor> {
    return this.floorsRepository.create(data);
  }

  async findAll(): Promise<Floor[]> {
    return this.floorsRepository.findAll();
  }

  async findById(id: string): Promise<Floor> {
    const floor = await this.floorsRepository.findById(id);
    if (!floor) {
      throw new NotFoundException(`Floor with ID ${id} not found`);
    }
    return floor;
  }

  async findByIdWithRelations(id: string): Promise<Floor> {
    const floor = await this.floorsRepository.findByIdWithRelations(id);
    if (!floor) {
      throw new NotFoundException(`Floor with ID ${id} not found`);
    }
    return floor;
  }

  async findByBuilding(buildingId: string): Promise<Floor[]> {
    return this.floorsRepository.findByBuilding(buildingId);
  }

  async update(id: string, data: UpdateFloorData): Promise<Floor> {
    await this.findById(id);
    return this.floorsRepository.update(id, data);
  }

  async delete(id: string): Promise<Floor> {
    await this.findById(id);
    return this.floorsRepository.delete(id);
  }
}
