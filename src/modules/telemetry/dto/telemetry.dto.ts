import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SensorKind } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

// Presença não tem limite de alarme: vira ocupação de sala.
export const THRESHOLD_KINDS = [
  SensorKind.GAS_MQ2,
  SensorKind.GAS_MQ135,
] as const;

export class SensorReadingsQueryDto {
  @ApiPropertyOptional({ enum: SensorKind })
  @IsOptional()
  @IsEnum(SensorKind)
  kind?: SensorKind;

  @ApiPropertyOptional({ example: '2026-11-17T00:00:00Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({ example: '2026-11-17T23:59:59Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;

  @ApiPropertyOptional({ example: 100, default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number;
}

export class UpsertThresholdDto {
  @ApiProperty({ enum: THRESHOLD_KINDS })
  @IsIn(THRESHOLD_KINDS)
  kind: SensorKind;

  @ApiPropertyOptional({
    description: 'Omitido = padrão da organização para o kind',
  })
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @ApiPropertyOptional({
    description: 'Nível de atenção (WARNING)',
    example: 1500,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  warnAt?: number;

  @ApiProperty({ description: 'Nível de alarme (CRITICAL)', example: 1800 })
  @IsNumber()
  @Min(0)
  alarmAt: number;

  @ApiPropertyOptional({
    description: 'Abaixo disto o alarme se encerra (histerese)',
    example: 1300,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  clearAt?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class AlarmsQueryDto {
  @ApiPropertyOptional({
    description: 'true = só abertos; false = só encerrados',
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @ApiPropertyOptional({ default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
