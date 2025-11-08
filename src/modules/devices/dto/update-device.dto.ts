import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  IsUUID,
  IsBoolean,
  IsNumber,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceType, DeviceStatus } from '../interfaces/devices.interface';

export class UpdateDeviceDto {
  @ApiPropertyOptional({ example: 'H201' })
  @IsOptional()
  @IsString()
  room?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  roomId?: string;

  @ApiPropertyOptional({ example: 'Luminária Hall', description: 'Nome do dispositivo' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: DeviceType })
  @IsOptional()
  @IsEnum(DeviceType)
  type?: DeviceType;

  @ApiPropertyOptional({ enum: DeviceStatus })
  @IsOptional()
  @IsEnum(DeviceStatus)
  status?: DeviceStatus;

  @ApiPropertyOptional({ example: 'building/floor/room/device' })
  @IsOptional()
  @IsString()
  @Matches(/^[-\w\/]+$/, {
    message:
      'mqttTopic must contain only letters, numbers, hyphens, underscores and slashes',
  })
  mqttTopic?: string;

  @ApiPropertyOptional({ example: 60, description: 'Potência em Watts' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'powerRating must be a number' })
  powerRating?: number;

  @ApiPropertyOptional({ example: 75, description: 'Intensidade/brightness 0-100' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  intensity?: number;

  @ApiPropertyOptional({ example: 24, description: 'Temperatura (Celsius) — para ACs' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'temperature must be a number' })
  @Min(-50)
  @Max(150)
  temperature?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  online?: boolean;

  @ApiPropertyOptional({ example: new Date().toISOString(), description: 'Última vez visto (ISO string)' })
  @IsOptional()
  @IsDateString()
  lastSeen?: Date | string;
}