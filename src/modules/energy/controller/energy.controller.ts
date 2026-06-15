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
  GlobalStatsQueryDto,
  EnergyHistoryQueryDto,
  EnergyComparisonQueryDto,
} from '../dto/energy.dto';
import { AuthGuard } from '../../../guards/auth.guard';

@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('Energy')
@Controller('energy')
export class EnergyController {
  constructor(private readonly energyService: EnergyService) {}

  @Get('history')
  @ApiOperation({
    summary: 'Get energy consumption history',
    description: 'Retorna histórico de consumo em buckets de tempo (horário para today, diário para week/month). Use level+id para escopar por building/floor/room/device.',
  })
  @ApiResponse({
    status: 200,
    description: 'Energy history buckets',
    schema: {
      example: {
        history: [
          { bucket: '2026-05-13T00:00:00.000Z', totalKwh: 1.25, count: 5 },
          { bucket: '2026-05-13T01:00:00.000Z', totalKwh: 0.87, count: 3 },
        ],
        period: { label: 'today', from: '2026-05-13T00:00:00.000Z', to: '2026-05-13T14:30:00.000Z' },
        level: 'general',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getEnergyHistory(@Query() query: EnergyHistoryQueryDto) {
    return this.energyService.getEnergyHistory(
      query.period ?? 'today',
      query.level ?? 'general',
      query.id,
    );
  }

  @Get('comparison')
  @ApiOperation({
    summary: 'Compare energy consumption across entities',
    description: 'Compara consumo entre entidades no nível solicitado: general→buildings, building→floors, floor→rooms, room→devices.',
  })
  @ApiResponse({
    status: 200,
    description: 'Energy comparison across entities',
    schema: {
      example: {
        comparison: [
          { id: 'uuid-1', name: 'Building A', totalKwh: 1250.5, count: 5000, avgWh: 250.1 },
          { id: 'uuid-2', name: 'Building B', totalKwh: 980.3, count: 3920, avgWh: 250.1 },
        ],
        level: 'general',
        period: { label: 'today', from: '2026-05-13T00:00:00.000Z', to: '2026-05-13T14:30:00.000Z' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getEnergyComparison(@Query() query: EnergyComparisonQueryDto) {
    return this.energyService.getEnergyComparison(
      query.level ?? 'general',
      query.id,
      query.period,
    );
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get global energy statistics',
    description: 'Retorna estatísticas agregadas de consumo energético de todos os dispositivos. Use ?period=today|week|month para filtrar por período.',
  })
  @ApiResponse({
    status: 200,
    description: 'Global energy statistics',
    schema: {
      example: {
        totalKwh: 4820.5,
        count: 19280,
        avgWh: 250.0,
        maxWh: 1500.0,
        minWh: 1.0,
        totalDevices: 250,
        activeDevices: 180,
        todayEnergyKwh: 4820.5,
        dailyConsumptionKwh: 4820.5,
        totalEnergy: 4820.5,
        energyPeriod: 'today',
        period: {
          label: 'today',
          from: '2026-05-13T00:00:00.000Z',
          to: '2026-05-13T14:30:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getGlobalStats(@Query() query: GlobalStatsQueryDto) {
    return this.energyService.getGlobalStats(query.period);
  }

  @Post('readings')
  @ApiOperation({ 
    summary: 'Create a new energy reading',
    description: 'Registra uma nova leitura de consumo energético para um dispositivo'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Energy reading created successfully',
    schema: {
      example: {
        id: 'uuid-reading-1',
        deviceId: 'uuid-device-1',
        valueWh: 150.5,
        voltage: 220,
        current: 0.68,
        timestamp: '2025-01-11T10:00:00.000Z',
        createdAt: '2025-01-11T10:00:00.000Z'
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - Invalid data',
    schema: {
      example: {
        statusCode: 400,
        message: ['valueWh must be a positive number'],
        error: 'Bad Request'
      }
    }
  })
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
  @ApiOperation({ 
    summary: 'Get energy statistics for a specific device',
    description: 'Retorna estatísticas agregadas de consumo energético de um dispositivo'
  })
  @ApiParam({ name: 'deviceId', description: 'Device ID', type: String })
  @ApiResponse({ 
    status: 200, 
    description: 'Energy statistics for device',
    schema: {
      example: {
        totalKwh: 125.5,
        count: 500,
        avgWh: 251.0,
        maxWh: 500.0,
        minWh: 50.0,
        period: {
          from: '2025-01-01T00:00:00.000Z',
          to: '2025-01-31T23:59:59.000Z'
        }
      }
    }
  })
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
  @ApiOperation({ 
    summary: 'Get energy statistics for a building',
    description: 'Retorna estatísticas agregadas de consumo energético de todo um prédio'
  })
  @ApiParam({ name: 'buildingId', description: 'Building ID', type: String })
  @ApiResponse({ 
    status: 200, 
    description: 'Energy statistics for building',
    schema: {
      example: {
        totalKwh: 12500.00,
        count: 50000,
        avgWh: 250.0,
        maxWh: 1500.0,
        minWh: 1.0,
        floorCount: 5,
        roomCount: 50,
        deviceCount: 250
      }
    }
  })
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
  @ApiOperation({ 
    summary: 'Clean up old energy readings',
    description: 'Remove leituras de energia antigas do banco de dados para economia de espaço'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Old readings cleaned up successfully',
    schema: {
      example: {
        message: 'Old readings cleaned up successfully',
        deletedCount: 1500
      }
    }
  })
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
