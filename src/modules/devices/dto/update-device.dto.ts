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
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceChannel } from '@prisma/client';
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

  @ApiPropertyOptional({
    example: 'devices/ac-a206',
    description: 'Base dos tópicos do device: devices/<slug>, um único nível após devices/ (o backend assina devices/+/<sufixo>).',
  })
  @IsOptional()
  @IsString()
  @Matches(/^devices\/[A-Za-z0-9_-]+$/, {
    message: 'mqttTopic deve ter o formato devices/<slug> (letras, números, - e _)',
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

  @ApiPropertyOptional({
    description: 'Nó físico (ESP32) que hospeda o device. null desvincula.',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  nodeId?: string | null;

  @ApiPropertyOptional({
    enum: DeviceChannel,
    nullable: true,
    description: 'Canal físico no nó. Define que leituras o device pode enviar.',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsEnum(DeviceChannel)
  channel?: DeviceChannel | null;
}
