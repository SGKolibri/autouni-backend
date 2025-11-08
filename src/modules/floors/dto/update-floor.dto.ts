import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateFloorDto } from './create-floor.dto';

// buildingId não pode ser alterado após criação
export class UpdateFloorDto extends PartialType(
  OmitType(CreateFloorDto, ['buildingId'] as const),
) {}
