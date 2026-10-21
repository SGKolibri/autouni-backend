import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceStatus, DeviceType } from '../interfaces/devices.interface';

export class FindDevicesQueryDto {
  @ApiPropertyOptional({
    enum: DeviceStatus,
    description: 'Filtra por status operacional. Omitido = todos.',
  })
  @IsOptional()
  @IsEnum(DeviceStatus)
  status?: DeviceStatus;

  @ApiPropertyOptional({
    enum: DeviceType,
    description: 'Filtra por tipo de dispositivo. Omitido = todos.',
  })
  @IsOptional()
  @IsEnum(DeviceType)
  type?: DeviceType;
}
