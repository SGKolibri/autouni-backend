import {
  IsOptional,
  IsString,
  IsEnum,
  IsUUID,
  IsObject,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportType, ReportFormat } from '@prisma/client';

export class CreateReportDto {
  @ApiProperty({
    description: 'Tipo do relatório',
    enum: ReportType,
    example: 'ENERGY_CONSUMPTION',
  })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiProperty({
    description: 'Título do relatório',
    example: 'Consumo de Energia - Novembro 2025',
  })
  @IsString()
  @MinLength(5)
  title: string;

  @ApiProperty({
    description: 'Formato do relatório',
    enum: ReportFormat,
    example: 'PDF',
  })
  @IsEnum(ReportFormat)
  format: ReportFormat;

  @ApiProperty({
    description: 'Filtros aplicados ao relatório (JSON)',
    example: {
      startDate: '2025-11-01',
      endDate: '2025-11-30',
      buildingId: 'uuid-do-predio',
    },
  })
  @IsObject()
  filters: any;

  @ApiPropertyOptional({
    description: 'Ignorado: o autor é sempre o usuário autenticado. Aceito por compatibilidade.',
    example: 'uuid-do-usuario',
  })
  @IsOptional()
  @IsUUID()
  createdById?: string;
}
