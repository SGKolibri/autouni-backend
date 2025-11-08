import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportStatus } from '@prisma/client';

export class UpdateReportStatusDto {
  @ApiProperty({
    description: 'Novo status do relatório',
    enum: ReportStatus,
    example: 'COMPLETED',
  })
  @IsEnum(ReportStatus)
  status: ReportStatus;

  @ApiPropertyOptional({
    description: 'URL do arquivo gerado',
    example: 'https://storage.autouni.com/reports/uuid-do-relatorio.pdf',
  })
  @IsOptional()
  @IsString()
  fileUrl?: string;
}
