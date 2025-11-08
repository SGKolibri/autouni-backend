import { IsString, IsOptional, IsNumber, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBuildingDto {
  @ApiProperty({
    description: 'Nome do prédio',
    example: 'Bloco A - Engenharia',
  })
  @IsString()
  @MinLength(3)
  name: string;

  @ApiPropertyOptional({
    description: 'Descrição do prédio',
    example: 'Prédio principal de Engenharia',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Localização do prédio',
    example: 'Campus Central - Setor Norte',
  })
  @IsString()
  location: string;

  @ApiPropertyOptional({
    description: 'Energia total consumida (kWh)',
    example: 1500.5,
  })
  @IsOptional()
  @IsNumber()
  totalEnergy?: number;

  @ApiPropertyOptional({
    description: 'Número de dispositivos ativos',
    example: 45,
  })
  @IsOptional()
  @IsNumber()
  activeDevices?: number;
}
