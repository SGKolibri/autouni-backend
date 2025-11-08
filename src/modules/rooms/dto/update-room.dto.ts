import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateRoomDto } from './create-room.dto';

// floorId não pode ser alterado após criação
export class UpdateRoomDto extends PartialType(
  OmitType(CreateRoomDto, ['floorId'] as const),
) {}
