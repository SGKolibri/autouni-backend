import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { PushPlatform } from '@prisma/client';

export class RegisterPushTokenDto {
  @ApiProperty({
    description: 'Token de registro do FCM gerado pelo app',
    example: 'dGVzdC10b2tlbi1mY20...',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  token: string;

  @ApiProperty({ enum: PushPlatform, example: PushPlatform.ANDROID })
  @IsEnum(PushPlatform)
  platform: PushPlatform;
}

export class UnregisterPushTokenDto {
  @ApiProperty({
    description: 'Token a remover',
    example: 'dGVzdC10b2tlbi1mY20...',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  token: string;
}
