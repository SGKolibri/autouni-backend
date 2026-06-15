import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString, Min, IsPositive, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEnergyReadingDto {
  @ApiProperty({ description: 'Device ID', example: 'uuid-device-123' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({ description: 'Energy value in Watt-hours (Wh)', example: 150.5 })
  @IsNumber()
  @IsPositive()
  valueWh: number;

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
