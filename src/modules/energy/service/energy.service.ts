import { Injectable } from '@nestjs/common';
import { EnergyReading } from '@prisma/client';
import { EnergyRepository } from '../repository/energy.repository';
import {
  EnergyAggregation,
  EnergyQueryParams,
  ComparisonLevel,
  ScopeLevel,
  EnergyConsumptionSnapshot,
} from '../interfaces/energy.interface';
import {
  summarizeDevicesConsumption,
  DeviceConsumptionLike,
} from '../../buildings/utils/building-energy.utils';
import {
  getAppTimeZone,
  resolvePeriodRange,
} from '../utils/energy-period.utils';

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

  async getLastReadingTimestamp(): Promise<Date | null> {
    return this.energyRepository.getLastReadingTimestamp();
  }

  async getGlobalStats(
    period?: 'today' | 'week' | 'month',
  ): Promise<EnergyConsumptionSnapshot & {
    period: { label: string; from: Date; to: Date };
    avgWh?: number;
    maxWh?: number;
    minWh?: number;
  }> {
    const { from, to } = resolvePeriodRange(period, new Date(), getAppTimeZone());
    const [telemetry, devices, lastReadingAt] = await Promise.all([
      this.energyRepository.aggregateGlobal({ from, to }),
      this.energyRepository.findDevicesForConsumption(),
      this.energyRepository.getLastReadingTimestamp(),
    ]);
    const snapshot = summarizeDevicesConsumption(
      devices as DeviceConsumptionLike[],
      from,
      to,
      telemetry.totalKwh,
      telemetry.count,
    );

    return {
      ...snapshot,
      totalKwh: snapshot.totalEnergy,
      // count and readingCount always reflect EnergyReading rows in the period — never activeDevices
      count: telemetry.count,
      readingCount: telemetry.count,
      lastReadingAt,
      hasData: telemetry.count > 0 || snapshot.totalEnergy > 0,
      avgWh: telemetry.count > 0 ? telemetry.avgWh : undefined,
      maxWh: telemetry.count > 0 ? telemetry.maxWh : undefined,
      minWh: telemetry.count > 0 ? telemetry.minWh : undefined,
      period: { label: period ?? 'all', from, to },
    };
  }

  async getEnergyHistory(
    period: 'today' | 'week' | 'month' = 'today',
    level: ScopeLevel = 'general',
    id?: string,
  ) {
    const { from, to } = resolvePeriodRange(period, new Date(), getAppTimeZone());
    const bucketSize: 'hour' | 'day' = period === 'today' ? 'hour' : 'day';

    let deviceIds: string[] | undefined;
    if (level !== 'general') {
      deviceIds = await this.energyRepository.getDeviceIdsForScope(level, id!);
    }

    const history = await this.energyRepository.getHistoryBuckets(from, to, bucketSize, deviceIds);
    return { history, period: { label: period, from, to }, level };
  }

  async getEnergyComparison(
    level: ComparisonLevel = 'general',
    id?: string,
    period?: 'today' | 'week' | 'month',
  ) {
    const { from, to } = resolvePeriodRange(period, new Date(), getAppTimeZone());
    const comparison = await this.energyRepository.getComparisonStats(level, { from, to }, id);
    return { comparison, level, period: { label: period ?? 'all', from, to } };
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