import { ArrayNotEmpty, IsArray, IsIn, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DeviceCommand } from '../interfaces/devices.interface';

export class BulkControlDeviceDto {
  @ApiProperty({
    type: [String],
    example: [
      'e497d85a-b9c7-4c7f-9e9c-0aecb6e2a025',
      '9f1c2d3e-4b5a-6789-0123-456789abcdef',
    ],
    description: 'UUIDs dos dispositivos a controlar.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true, message: 'each value in deviceIds must be a UUID' })
  deviceIds: string[];

  @ApiProperty({
    enum: DeviceCommand,
    example: DeviceCommand.OFF,
    description: 'Ação aplicada a todos os dispositivos da lista.',
  })
  @IsNotEmpty()
  @IsIn(Object.values(DeviceCommand), {
    message: `command must be one of: ${Object.values(DeviceCommand).join(', ')}`,
  })
  command: DeviceCommand;
}
