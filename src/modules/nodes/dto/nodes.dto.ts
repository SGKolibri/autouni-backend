import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateNodeDto {
  @ApiProperty({ example: 'ESP32 Sala A206' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Sala onde o nó está instalado' })
  @IsOptional()
  @IsUUID()
  roomId?: string;

  @ApiPropertyOptional({
    example: '24:6F:28:AA:BB:CC',
    description: 'MAC ou chip id do ESP32',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  hardwareId?: string;

  @ApiPropertyOptional({ example: '0.3.0' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  firmwareVersion?: string;
}

export class UpdateNodeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  roomId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  hardwareId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  firmwareVersion?: string;
}
