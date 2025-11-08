import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { TriggerType } from '../interfaces/automations.interface';

export class AutomationActionDto {
  @ApiPropertyOptional({ description: 'MQTT topic to publish to' })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiPropertyOptional({ description: 'Payload to send with the action' })
  @IsOptional()
  payload?: any;

  @ApiPropertyOptional({ description: 'Action type', enum: ['mqtt', 'http', 'notification'] })
  @IsOptional()
  @IsString()
  type?: 'mqtt' | 'http' | 'notification';
}

export class CreateAutomationDto {
  @ApiProperty({ description: 'Automation name', example: 'Turn off lights at night' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Automation description', example: 'Automatically turn off all lights at 11 PM' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Creator user ID' })
  @IsOptional()
  @IsString()
  creatorId?: string;

  @ApiProperty({ 
    description: 'Trigger type', 
    enum: TriggerType,
    example: TriggerType.SCHEDULE 
  })
  @IsEnum(TriggerType)
  @IsNotEmpty()
  triggerType: TriggerType;

  @ApiPropertyOptional({ 
    description: 'Cron expression for SCHEDULE trigger type', 
    example: '0 23 * * *' 
  })
  @IsOptional()
  @IsString()
  cron?: string;

  @ApiPropertyOptional({ 
    description: 'Condition expression for CONDITION trigger type',
    example: 'temperature > 25'
  })
  @IsOptional()
  @IsString()
  condition?: string;

  @ApiProperty({ 
    description: 'Action to execute (JSON string or object)',
    example: { topic: 'devices/light/command', payload: { state: 'OFF' } }
  })
  @IsNotEmpty()
  action: string | AutomationActionDto;

  @ApiPropertyOptional({ description: 'Whether automation is enabled', default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateAutomationDto {
  @ApiPropertyOptional({ description: 'Automation name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Automation description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Trigger type', 
    enum: TriggerType 
  })
  @IsOptional()
  @IsEnum(TriggerType)
  triggerType?: TriggerType;

  @ApiPropertyOptional({ description: 'Cron expression' })
  @IsOptional()
  @IsString()
  cron?: string;

  @ApiPropertyOptional({ description: 'Condition expression' })
  @IsOptional()
  @IsString()
  condition?: string;

  @ApiPropertyOptional({ description: 'Action to execute' })
  @IsOptional()
  action?: string | AutomationActionDto;

  @ApiPropertyOptional({ description: 'Whether automation is enabled' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class ToggleAutomationDto {
  @ApiProperty({ description: 'Enable or disable automation' })
  @IsBoolean()
  @IsNotEmpty()
  enabled: boolean;
}
