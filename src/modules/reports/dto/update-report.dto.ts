import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateReportDto } from './create-report.dto';

// createdById não pode ser alterado após criação
export class UpdateReportDto extends PartialType(
  OmitType(CreateReportDto, ['createdById'] as const),
) {}
