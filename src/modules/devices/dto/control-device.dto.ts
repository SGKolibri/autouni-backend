import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceCommand, DeviceStatus } from '../interfaces/devices.interface';

export class ControlDeviceDto {
  @ApiProperty({
    enum: DeviceCommand,
    example: DeviceCommand.TOGGLE,
    description:
      'Ação a executar. `toggle` é resolvido a partir do status atual no banco.',
  })
  @IsNotEmpty()
  @IsIn(Object.values(DeviceCommand), {
    message: `command must be one of: ${Object.values(DeviceCommand).join(', ')}`,
  })
  command: DeviceCommand;

  @ApiPropertyOptional({
    enum: DeviceStatus,
    example: DeviceStatus.ON,
    description:
      'Status alvo sugerido pelo cliente. Aceito por compatibilidade, mas tratado apenas como hint: ' +
      '`command` sempre vence, e `toggle` é resolvido a partir do estado atual no banco.',
  })
  @IsOptional()
  @IsEnum(DeviceStatus)
  value?: DeviceStatus;

  @ApiPropertyOptional({
    example: 22,
    description: 'Temperatura alvo (Celsius). Repassada no payload MQTT quando presente.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'temperature must be a number' })
  @Min(-50)
  @Max(150)
  temperature?: number;

  @ApiPropertyOptional({
    example: 75,
    description: 'Intensidade/brightness 0-100. Repassada no payload MQTT quando presente.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  intensity?: number;
}
