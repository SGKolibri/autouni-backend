import { Injectable } from '@nestjs/common';
import { EnergyReading } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  IEnergyRepository,
  EnergyAggregation,
  EnergyQueryParams,
} from '../interfaces/energy.interface';

@Injectable()
export class EnergyRepository implements IEnergyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createReading(data: {
    deviceId: string;
    valueWh: number;
    voltage?: number | null;
    current?: number | null;
  }): Promise<EnergyReading> {
    return this.prisma.energyReading.create({
      data: {
        deviceId: data.deviceId,
        valueWh: data.valueWh,
        voltage: data.voltage,
        current: data.current,
      },
      include: {
        device: {
          include: {
            room: true,
          },
        },
      },
    });
  }

  async findReadingsByDevice(
    deviceId: string,
    params?: EnergyQueryParams,
  ): Promise<EnergyReading[]> {
    const where: any = { deviceId };
    
    if (params?.from || params?.to) {
      where.timestamp = {};
      if (params.from) where.timestamp.gte = params.from;
      if (params.to) where.timestamp.lte = params.to;
    }

    return this.prisma.energyReading.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: params?.limit || 100,
      include: {
        device: true,
      },
    });
  }

  async findReadingsByRoom(
    roomId: string,
    params?: EnergyQueryParams,
  ): Promise<EnergyReading[]> {
    const where: any = {
      device: {
        roomId,
      },
    };

    if (params?.from || params?.to) {
      where.timestamp = {};
      if (params.from) where.timestamp.gte = params.from;
      if (params.to) where.timestamp.lte = params.to;
    }

    return this.prisma.energyReading.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: params?.limit || 100,
      include: {
        device: {
          include: {
            room: true,
          },
        },
      },
    });
  }

  async aggregateByDevice(
    deviceId: string,
    params?: EnergyQueryParams,
  ): Promise<EnergyAggregation> {
    const where: any = { deviceId };

    if (params?.from || params?.to) {
      where.timestamp = {};
      if (params.from) where.timestamp.gte = params.from;
      if (params.to) where.timestamp.lte = params.to;
    }

    const result = await this.prisma.energyReading.aggregate({
      where,
      _sum: { valueWh: true },
      _count: true,
      _avg: { valueWh: true },
      _max: { valueWh: true },
      _min: { valueWh: true },
    });

    return {
      totalKwh: (result._sum?.valueWh ?? 0) / 1000,
      count: result._count,
      avgWh: result._avg?.valueWh ?? undefined,
      maxWh: result._max?.valueWh ?? undefined,
      minWh: result._min?.valueWh ?? undefined,
    };
  }

  async aggregateByRoom(
    roomId: string,
    params?: EnergyQueryParams,
  ): Promise<EnergyAggregation> {
    const devices = await this.prisma.device.findMany({
      where: { roomId },
      select: { id: true },
    });

    if (devices.length === 0) {
      return { totalKwh: 0, count: 0 };
    }

    const deviceIds = devices.map((d) => d.id);
    const where: any = { deviceId: { in: deviceIds } };

    if (params?.from || params?.to) {
      where.timestamp = {};
      if (params.from) where.timestamp.gte = params.from;
      if (params.to) where.timestamp.lte = params.to;
    }

    const result = await this.prisma.energyReading.aggregate({
      where,
      _sum: { valueWh: true },
      _count: true,
      _avg: { valueWh: true },
      _max: { valueWh: true },
      _min: { valueWh: true },
    });

    return {
      totalKwh: (result._sum?.valueWh ?? 0) / 1000,
      count: result._count,
      avgWh: result._avg?.valueWh ?? undefined,
      maxWh: result._max?.valueWh ?? undefined,
      minWh: result._min?.valueWh ?? undefined,
    };
  }

  async aggregateByFloor(
    floorId: string,
    params?: EnergyQueryParams,
  ): Promise<EnergyAggregation> {
    const rooms = await this.prisma.room.findMany({
      where: { floorId },
      select: { id: true },
    });

    if (rooms.length === 0) {
      return { totalKwh: 0, count: 0 };
    }

    const roomIds = rooms.map((r) => r.id);
    const devices = await this.prisma.device.findMany({
      where: { roomId: { in: roomIds } },
      select: { id: true },
    });

    if (devices.length === 0) {
      return { totalKwh: 0, count: 0 };
    }

    const deviceIds = devices.map((d) => d.id);
    const where: any = { deviceId: { in: deviceIds } };

    if (params?.from || params?.to) {
      where.timestamp = {};
      if (params.from) where.timestamp.gte = params.from;
      if (params.to) where.timestamp.lte = params.to;
    }

    const result = await this.prisma.energyReading.aggregate({
      where,
      _sum: { valueWh: true },
      _count: true,
      _avg: { valueWh: true },
      _max: { valueWh: true },
      _min: { valueWh: true },
    });

    return {
      totalKwh: (result._sum?.valueWh ?? 0) / 1000,
      count: result._count,
      avgWh: result._avg?.valueWh ?? undefined,
      maxWh: result._max?.valueWh ?? undefined,
      minWh: result._min?.valueWh ?? undefined,
    };
  }

  async aggregateByBuilding(
    buildingId: string,
    params?: EnergyQueryParams,
  ): Promise<EnergyAggregation> {
    const floors = await this.prisma.floor.findMany({
      where: { buildingId },
      select: { id: true },
    });

    if (floors.length === 0) {
      return { totalKwh: 0, count: 0 };
    }

    const floorIds = floors.map((f) => f.id);
    const rooms = await this.prisma.room.findMany({
      where: { floorId: { in: floorIds } },
      select: { id: true },
    });

    if (rooms.length === 0) {
      return { totalKwh: 0, count: 0 };
    }

    const roomIds = rooms.map((r) => r.id);
    const devices = await this.prisma.device.findMany({
      where: { roomId: { in: roomIds } },
      select: { id: true },
    });

    if (devices.length === 0) {
      return { totalKwh: 0, count: 0 };
    }

    const deviceIds = devices.map((d) => d.id);
    const where: any = { deviceId: { in: deviceIds } };

    if (params?.from || params?.to) {
      where.timestamp = {};
      if (params.from) where.timestamp.gte = params.from;
      if (params.to) where.timestamp.lte = params.to;
    }

    const result = await this.prisma.energyReading.aggregate({
      where,
      _sum: { valueWh: true },
      _count: true,
      _avg: { valueWh: true },
      _max: { valueWh: true },
      _min: { valueWh: true },
    });

    return {
      totalKwh: (result._sum?.valueWh ?? 0) / 1000,
      count: result._count,
      avgWh: result._avg?.valueWh ?? undefined,
      maxWh: result._max?.valueWh ?? undefined,
      minWh: result._min?.valueWh ?? undefined,
    };
  }

  async deleteOldReadings(beforeDate: Date): Promise<number> {
    const result = await this.prisma.energyReading.deleteMany({
      where: {
        timestamp: {
          lt: beforeDate,
        },
      },
    });

    return result.count;
  }
}
