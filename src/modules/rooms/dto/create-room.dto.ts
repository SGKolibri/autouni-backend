import {
  IsString,
  IsEnum,
  IsUUID,
  MinLength,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoomType } from '@prisma/client';

export class CreateRoomDto {
  @ApiProperty({
    description: 'ID do andar ao qual a sala pertence',
    example: 'uuid-do-andar',
  })
  @IsUUID()
  floorId: string;

  @ApiProperty({
    description: 'Nome da sala',
    example: 'Sala A101',
  })
  @IsString()
  @MinLength(3)
  name: string;

  @ApiProperty({
    description: 'Tipo da sala',
    enum: RoomType,
    example: 'CLASSROOM',
  })
  @IsEnum(RoomType)
  type: RoomType;

  @ApiPropertyOptional({
    description: 'Segundos sem movimento (PIR) até a sala ser considerada vazia',
    example: 600,
    default: 600,
  })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(86400)
  vacancyTimeoutSec?: number;
}
