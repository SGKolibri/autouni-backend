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
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

  @ApiProperty({ example: 'building/floor/room/device' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[-\w\/]+$/, {
    message:
      'mqttTopic must contain only letters, numbers, hyphens, underscores and slashes',
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
}
