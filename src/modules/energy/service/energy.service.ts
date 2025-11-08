import { Injectable, NotFoundException } from '@nestjs/common';
import { EnergyReading } from '@prisma/client';
import { EnergyRepository } from '../repository/energy.repository';
import { EnergyAggregation, EnergyQueryParams } from '../interfaces/energy.interface';

@Injectable()
export class EnergyService {
  constructor(private readonly energyRepository: EnergyRepository) {}

  async createReading(data: {
    deviceId: string;
    valueWh: number;
    voltage?: number | null;
    current?: number | null;
  }): Promise<EnergyReading> {
    return this.energyRepository.createReading(data);
  }

  async getDeviceReadings(
    deviceId: string,
    params?: EnergyQueryParams,
  ): Promise<EnergyReading[]> {
    return this.energyRepository.findReadingsByDevice(deviceId, params);
  }

  async getRoomReadings(
    roomId: string,
    params?: EnergyQueryParams,
  ): Promise<EnergyReading[]> {
    return this.energyRepository.findReadingsByRoom(roomId, params);
  }

  async getDeviceEnergyStats(
    deviceId: string,
    params?: EnergyQueryParams,
  ): Promise<EnergyAggregation> {
    return this.energyRepository.aggregateByDevice(deviceId, params);
  }

  async getRoomEnergyStats(
    roomId: string,
    params?: EnergyQueryParams,
  ): Promise<EnergyAggregation> {
    return this.energyRepository.aggregateByRoom(roomId, params);
  }

  async getFloorEnergyStats(
    floorId: string,
    params?: EnergyQueryParams,
  ): Promise<EnergyAggregation> {
    return this.energyRepository.aggregateByFloor(floorId, params);
  }

  async getBuildingEnergyStats(
    buildingId: string,
    params?: EnergyQueryParams,
  ): Promise<EnergyAggregation> {
    return this.energyRepository.aggregateByBuilding(buildingId, params);
  }

  // Legacy methods for backward compatibility
  async deviceEnergyKwh(deviceId: string, from?: Date, to?: Date): Promise<number> {
    const stats = await this.energyRepository.aggregateByDevice(deviceId, { from, to });
    return stats.totalKwh;
  }

  async roomEnergyKwh(roomId: string, from?: Date, to?: Date): Promise<number> {
    const stats = await this.energyRepository.aggregateByRoom(roomId, { from, to });
    return stats.totalKwh;
  }

  async buildingEnergyKwh(buildingId: string, from?: Date, to?: Date): Promise<number> {
    const stats = await this.energyRepository.aggregateByBuilding(buildingId, { from, to });
    return stats.totalKwh;
  }

  async cleanupOldReadings(daysToKeep: number = 90): Promise<number> {
    const beforeDate = new Date();
    beforeDate.setDate(beforeDate.getDate() - daysToKeep);
    return this.energyRepository.deleteOldReadings(beforeDate);
  }
}