import { Injectable } from '@nestjs/common';
import { EnergyReading } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  IEnergyRepository,
  EnergyAggregation,
  EnergyQueryParams,
  EnergyHistoryBucket,
  EnergyComparisonItem,
  ComparisonLevel,
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

  async findDevicesForConsumption(): Promise<Array<{ status?: string | null; metadata?: unknown }>> {
    return this.prisma.device.findMany({
      select: {
        status: true,
        metadata: true,
      },
    });
  }

  async aggregateGlobal(params?: EnergyQueryParams): Promise<EnergyAggregation> {
    const where: any = {};

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

  async getDeviceIdsForScope(
    level: 'building' | 'floor' | 'room' | 'device',
    id: string,
  ): Promise<string[]> {
    if (level === 'device') return [id];

    if (level === 'room') {
      const devices = await this.prisma.device.findMany({
        where: { roomId: id },
        select: { id: true },
      });
      return devices.map((d) => d.id);
    }

    if (level === 'floor') {
      const rooms = await this.prisma.room.findMany({
        where: { floorId: id },
        select: { id: true },
      });
      const roomIds = rooms.map((r) => r.id);
      if (roomIds.length === 0) return [];
      const devices = await this.prisma.device.findMany({
        where: { roomId: { in: roomIds } },
        select: { id: true },
      });
      return devices.map((d) => d.id);
    }

    // level === 'building'
    const floors = await this.prisma.floor.findMany({
      where: { buildingId: id },
      select: { id: true },
    });
    const floorIds = floors.map((f) => f.id);
    if (floorIds.length === 0) return [];
    const rooms = await this.prisma.room.findMany({
      where: { floorId: { in: floorIds } },
      select: { id: true },
    });
    const roomIds = rooms.map((r) => r.id);
    if (roomIds.length === 0) return [];
    const devices = await this.prisma.device.findMany({
      where: { roomId: { in: roomIds } },
      select: { id: true },
    });
    return devices.map((d) => d.id);
  }

  async getHistoryBuckets(
    from: Date,
    to: Date,
    bucketSize: 'hour' | 'day',
    deviceIds?: string[],
  ): Promise<EnergyHistoryBucket[]> {
    type RawRow = { bucket: Date; total_kwh: number; count: bigint };
    let rows: RawRow[];

    if (deviceIds && deviceIds.length > 0) {
      const placeholders = deviceIds.map((_, i) => `$${i + 4}`).join(', ');
      rows = await this.prisma.$queryRawUnsafe<RawRow[]>(
        `SELECT DATE_TRUNC($1, timestamp) AS bucket,
                SUM("valueWh") / 1000.0 AS total_kwh,
                COUNT(*)::int AS count
         FROM "EnergyReading"
         WHERE timestamp >= $2 AND timestamp <= $3
           AND "deviceId"::text IN (${placeholders})
         GROUP BY 1 ORDER BY 1`,
        bucketSize,
        from,
        to,
        ...deviceIds,
      );
    } else {
      rows = await this.prisma.$queryRawUnsafe<RawRow[]>(
        `SELECT DATE_TRUNC($1, timestamp) AS bucket,
                SUM("valueWh") / 1000.0 AS total_kwh,
                COUNT(*)::int AS count
         FROM "EnergyReading"
         WHERE timestamp >= $2 AND timestamp <= $3
         GROUP BY 1 ORDER BY 1`,
        bucketSize,
        from,
        to,
      );
    }

    return rows.map((row) => ({
      bucket: row.bucket,
      totalKwh: Number(row.total_kwh),
      count: Number(row.count),
    }));
  }

  async getComparisonStats(
    level: ComparisonLevel,
    params: EnergyQueryParams,
    id?: string,
  ): Promise<EnergyComparisonItem[]> {
    if (level === 'general') {
      const buildings = await this.prisma.building.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
      return Promise.all(
        buildings.map(async (b) => {
          const stats = await this.aggregateByBuilding(b.id, params);
          return { id: b.id, name: b.name, ...stats };
        }),
      );
    }

    if (level === 'building') {
      const floors = await this.prisma.floor.findMany({
        where: { buildingId: id },
        select: { id: true, number: true, name: true },
        orderBy: { number: 'asc' },
      });
      return Promise.all(
        floors.map(async (f) => {
          const stats = await this.aggregateByFloor(f.id, params);
          return { id: f.id, name: f.name ?? `Floor ${f.number}`, ...stats };
        }),
      );
    }

    if (level === 'floor') {
      const rooms = await this.prisma.room.findMany({
        where: { floorId: id },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
      return Promise.all(
        rooms.map(async (r) => {
          const stats = await this.aggregateByRoom(r.id, params);
          return { id: r.id, name: r.name, ...stats };
        }),
      );
    }

    // level === 'room'
    const devices = await this.prisma.device.findMany({
      where: { roomId: id },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return Promise.all(
      devices.map(async (d) => {
        const stats = await this.aggregateByDevice(d.id, params);
        return { id: d.id, name: d.name, ...stats };
      }),
    );
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
