import { IsString, IsOptional, IsNumber, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFloorDto {
  @ApiProperty({
    description: 'ID do prédio ao qual o andar pertence',
    example: 'uuid-do-predio',
  })
  @IsUUID()
  buildingId: string;

  @ApiProperty({
    description: 'Número do andar',
    example: 1,
  })
  @IsNumber()
  @Min(0)
  number: number;

  @ApiPropertyOptional({
    description: 'Nome descritivo do andar',
    example: 'Térreo',
  })
  @IsOptional()
  @IsString()
  name?: string;
}
