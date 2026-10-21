import { Injectable, NotFoundException } from '@nestjs/common';
import { Room, RoomType } from '@prisma/client';
import { RoomsRepository } from '../repository/rooms.repository';
import {
  CreateRoomData,
  UpdateRoomData,
  RoomWithEnergyToday,
  RoomWithRelations,
} from '../interfaces/rooms.interface';
import { EnergyService } from '../../energy/service/energy.service';
import {
  summarizeDevicesConsumption,
  DeviceConsumptionLike,
} from '../../buildings/utils/building-energy.utils';
import { getAppTimeZone, resolvePeriodRange } from '../../energy/utils/energy-period.utils';

@Injectable()
export class RoomsService {
  constructor(
    private readonly roomsRepository: RoomsRepository,
    private readonly energyService: EnergyService,
  ) {}

  async create(data: CreateRoomData): Promise<Room> {
    return this.roomsRepository.create(data);
  }

  async findAll(): Promise<RoomWithEnergyToday[]> {
    const rooms = await this.roomsRepository.findAll();
    const { from, to } = resolvePeriodRange('today', new Date(), getAppTimeZone());
    return Promise.all(rooms.map((room) => this.enrichRoom(room, from, to)));
  }

  async findById(id: string): Promise<Room> {
    const room = await this.roomsRepository.findById(id);
    if (!room) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }
    return room;
  }

  async findByIdWithRelations(id: string): Promise<RoomWithEnergyToday> {
    const room = await this.roomsRepository.findByIdWithRelations(id);
    if (!room) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }

    const { from, to } = resolvePeriodRange('today', new Date(), getAppTimeZone());
    return this.enrichRoom(room, from, to);
  }

  async findByFloor(floorId: string): Promise<RoomWithEnergyToday[]> {
    const rooms = await this.roomsRepository.findByFloor(floorId);
    const { from, to } = resolvePeriodRange('today', new Date(), getAppTimeZone());
    return Promise.all(rooms.map((room) => this.enrichRoom(room, from, to)));
  }

  async findByType(type: RoomType): Promise<RoomWithEnergyToday[]> {
    const rooms = await this.roomsRepository.findByType(type);
    const { from, to } = resolvePeriodRange('today', new Date(), getAppTimeZone());
    return Promise.all(rooms.map((room) => this.enrichRoom(room, from, to)));
  }

  async update(id: string, data: UpdateRoomData): Promise<Room> {
    await this.findById(id);
    return this.roomsRepository.update(id, data);
  }

  async delete(id: string): Promise<Room> {
    await this.findById(id);
    return this.roomsRepository.delete(id);
  }

  private async enrichRoom(
    room: RoomWithRelations,
    from: Date,
    to: Date,
  ): Promise<RoomWithEnergyToday> {
    const energyStats = await this.energyService.getRoomEnergyStats(room.id, { from, to });
    return {
      ...room,
      ...summarizeDevicesConsumption(
        (room.devices ?? []) as DeviceConsumptionLike[],
        from,
        to,
        energyStats.totalKwh,
        energyStats.count,
      ),
    };
  }
}
