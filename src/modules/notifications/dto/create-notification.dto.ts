import {
  IsString,
  IsEnum,
  IsUUID,
  IsOptional,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';

export class CreateNotificationDto {
  @ApiProperty({
    description: 'ID do usuário que receberá a notificação',
    example: 'uuid-do-usuario',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Tipo da notificação',
    enum: NotificationType,
    example: 'INFO',
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({
    description: 'Título da notificação',
    example: 'Dispositivo desconectado',
  })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiProperty({
    description: 'Mensagem da notificação',
    example: 'O dispositivo Ar Condicionado A101 foi desconectado',
  })
  @IsString()
  @MinLength(5)
  message: string;

  @ApiPropertyOptional({
    description: 'Link relacionado à notificação',
    example: '/devices/uuid-do-dispositivo',
  })
  @IsOptional()
  @IsString()
  link?: string;
}
