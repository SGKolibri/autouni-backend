import {
  IsEnum,
  IsNotEmpty,
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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceChannel } from '@prisma/client';
import { DeviceType, DeviceStatus } from '../interfaces/devices.interface';

export class CreateDeviceDto {
  @ApiProperty({ example: 'H201' })
  @IsNotEmpty()
  @IsString()
  room: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  roomId: string;

  @ApiProperty({
    example: 'Luminária Hall',
    description: 'Nome do dispositivo',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ enum: DeviceType })
  @IsNotEmpty()
  @IsEnum(DeviceType)
  type: DeviceType;

  @ApiProperty({ enum: DeviceStatus })
  @IsNotEmpty()
  @IsEnum(DeviceStatus)
  status: DeviceStatus;

  @ApiProperty({
    example: 'devices/ac-a206',
    description: 'Base dos tópicos do device: devices/<slug>, um único nível após devices/ (o backend assina devices/+/<sufixo>).',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^devices\/[A-Za-z0-9_-]+$/, {
    message: 'mqttTopic deve ter o formato devices/<slug> (letras, números, - e _)',
  })
  mqttTopic: string;

  @ApiPropertyOptional({ example: 60, description: 'Potência em Watts' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'powerRating must be a number' })
  powerRating?: number; // Watts

  @ApiPropertyOptional({
    example: 75,
    description: 'Intensidade/brightness 0-100',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  intensity?: number; // 0-100

  @ApiPropertyOptional({
    example: 24,
    description: 'Temperatura (Celsius) — para ACs',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'temperature must be a number' })
  @Min(-50)
  @Max(150)
  temperature?: number; // Celsius, para ACs

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  online?: boolean;

  @ApiPropertyOptional({
    example: new Date().toISOString(),
    description: 'Última vez visto (ISO string)',
  })
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
