import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString, Min, Max, IsIn, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEnergyReadingDto {
  @ApiProperty({ description: 'Device ID', example: 'uuid-device-123' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiPropertyOptional({
    description: 'Energia consumida no intervalo desde a leitura anterior (Wh). É o valor somado nas estatísticas.',
    example: 2.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  energyWh?: number;

  @ApiPropertyOptional({
    description: 'Contador acumulado do medidor (Wh). Sem energyWh, o intervalo é a diferença para a leitura anterior.',
    example: 123456.7,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  energyTotalWh?: number;

  @ApiPropertyOptional({ description: 'Potência instantânea (W)', example: 150 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  powerW?: number;

  @ApiPropertyOptional({ description: 'Voltage in Volts (V)', example: 220 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  voltage?: number;

  @ApiPropertyOptional({ description: 'Current in Amperes (A)', example: 0.68 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  current?: number;

  @ApiPropertyOptional({ description: 'Frequência da rede (Hz)', example: 60 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  frequency?: number;

  @ApiPropertyOptional({ description: 'Fator de potência (0-1)', example: 0.92 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  powerFactor?: number;

  @ApiPropertyOptional({ description: 'Momento da medição (backfill). Padrão: agora.', example: '2026-11-17T12:00:00Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  timestamp?: Date;
}

export class EnergyQueryDto {
  @ApiPropertyOptional({ description: 'Start date (ISO 8601)', example: '2024-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)', example: '2024-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ description: 'Maximum number of results', example: 100, default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class EnergyStatsDto {
  @ApiPropertyOptional({ description: 'Start date for statistics', example: '2024-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'End date for statistics', example: '2024-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class EnergyHistoryQueryDto {
  @ApiPropertyOptional({
    description: 'Time period — hourly buckets for today, daily for week/month',
    enum: ['today', 'week', 'month'],
    example: 'today',
  })
  @IsOptional()
  @IsIn(['today', 'week', 'month'])
  period?: 'today' | 'week' | 'month';

  @ApiPropertyOptional({
    description: 'Hierarchy level to scope the history',
    enum: ['general', 'building', 'floor', 'room', 'device'],
    example: 'general',
  })
  @IsOptional()
  @IsIn(['general', 'building', 'floor', 'room', 'device'])
  level?: 'general' | 'building' | 'floor' | 'room' | 'device';

  @ApiPropertyOptional({
    description: 'Entity ID (required when level is not general)',
    example: 'uuid-building-123',
  })
  @IsOptional()
  @IsString()
  id?: string;
}

export class EnergyComparisonQueryDto {
  @ApiPropertyOptional({
    description: 'Hierarchy level to compare (general compares buildings, building compares its floors, etc.)',
    enum: ['general', 'building', 'floor', 'room'],
    example: 'general',
  })
  @IsOptional()
  @IsIn(['general', 'building', 'floor', 'room'])
  level?: 'general' | 'building' | 'floor' | 'room';

  @ApiPropertyOptional({
    description: 'Parent entity ID (required when level is not general)',
    example: 'uuid-building-123',
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({
    description: 'Time period for comparison stats',
    enum: ['today', 'week', 'month'],
    example: 'today',
  })
  @IsOptional()
  @IsIn(['today', 'week', 'month'])
  period?: 'today' | 'week' | 'month';
}

export class GlobalStatsQueryDto {
  @ApiPropertyOptional({
    description: 'Preset time period for statistics',
    enum: ['today', 'week', 'month'],
    example: 'today',
  })
  @IsOptional()
  @IsIn(['today', 'week', 'month'])
  period?: 'today' | 'week' | 'month';
}

export class CleanupReadingsDto {
  @ApiPropertyOptional({ description: 'Number of days to keep readings', example: 90, default: 90 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  daysToKeep?: number;
}
