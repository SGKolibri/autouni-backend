import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString, Min, IsPositive } from 'class-validator';
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

export class CleanupReadingsDto {
  @ApiPropertyOptional({ description: 'Number of days to keep readings', example: 90, default: 90 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  daysToKeep?: number;
}
