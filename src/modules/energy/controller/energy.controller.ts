import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Delete,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { EnergyService } from '../service/energy.service';
import {
  CreateEnergyReadingDto,
  EnergyQueryDto,
  EnergyStatsDto,
  CleanupReadingsDto,
} from '../dto/energy.dto';
import { AuthGuard } from '../../../guards/auth.guard';

@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('Energy')
@Controller('energy')
export class EnergyController {
  constructor(private readonly energyService: EnergyService) {}

  @Post('readings')
  @ApiOperation({ summary: 'Create a new energy reading' })
  @ApiResponse({ status: 201, description: 'Energy reading created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createReading(@Body() createReadingDto: CreateEnergyReadingDto) {
    return this.energyService.createReading(createReadingDto);
  }

  @Get('devices/:deviceId/readings')
  @ApiOperation({ summary: 'Get energy readings for a specific device' })
  @ApiParam({ name: 'deviceId', description: 'Device ID', type: String })
  @ApiResponse({ status: 200, description: 'List of energy readings' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDeviceReadings(
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
    @Query() query: EnergyQueryDto,
  ) {
    const params = {
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      limit: query.limit,
    };
    return this.energyService.getDeviceReadings(deviceId, params);
  }

  @Get('devices/:deviceId/stats')
  @ApiOperation({ summary: 'Get energy statistics for a specific device' })
  @ApiParam({ name: 'deviceId', description: 'Device ID', type: String })
  @ApiResponse({ status: 200, description: 'Energy statistics for device' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDeviceStats(
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
    @Query() query: EnergyStatsDto,
  ) {
    const params = {
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    };
    return this.energyService.getDeviceEnergyStats(deviceId, params);
  }

  @Get('rooms/:roomId/readings')
  @ApiOperation({ summary: 'Get energy readings for all devices in a room' })
  @ApiParam({ name: 'roomId', description: 'Room ID', type: String })
  @ApiResponse({ status: 200, description: 'List of energy readings' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRoomReadings(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query() query: EnergyQueryDto,
  ) {
    const params = {
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      limit: query.limit,
    };
    return this.energyService.getRoomReadings(roomId, params);
  }

  @Get('rooms/:roomId/stats')
  @ApiOperation({ summary: 'Get energy statistics for a room' })
  @ApiParam({ name: 'roomId', description: 'Room ID', type: String })
  @ApiResponse({ status: 200, description: 'Energy statistics for room' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRoomStats(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query() query: EnergyStatsDto,
  ) {
    const params = {
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    };
    return this.energyService.getRoomEnergyStats(roomId, params);
  }

  @Get('floors/:floorId/stats')
  @ApiOperation({ summary: 'Get energy statistics for a floor' })
  @ApiParam({ name: 'floorId', description: 'Floor ID', type: String })
  @ApiResponse({ status: 200, description: 'Energy statistics for floor' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getFloorStats(
    @Param('floorId', ParseUUIDPipe) floorId: string,
    @Query() query: EnergyStatsDto,
  ) {
    const params = {
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    };
    return this.energyService.getFloorEnergyStats(floorId, params);
  }

  @Get('buildings/:buildingId/stats')
  @ApiOperation({ summary: 'Get energy statistics for a building' })
  @ApiParam({ name: 'buildingId', description: 'Building ID', type: String })
  @ApiResponse({ status: 200, description: 'Energy statistics for building' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getBuildingStats(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Query() query: EnergyStatsDto,
  ) {
    const params = {
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    };
    return this.energyService.getBuildingEnergyStats(buildingId, params);
  }

  @Delete('readings/cleanup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clean up old energy readings' })
  @ApiResponse({ status: 200, description: 'Old readings cleaned up successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async cleanupOldReadings(@Body() cleanupDto: CleanupReadingsDto) {
    const deletedCount = await this.energyService.cleanupOldReadings(
      cleanupDto.daysToKeep || 90,
    );
    return {
      message: 'Old readings cleaned up successfully',
      deletedCount,
    };
  }
}
