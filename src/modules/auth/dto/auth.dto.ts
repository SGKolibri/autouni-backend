import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({
    example: 'default',
    description:
      'Slug da organização. Só é exigido quando o mesmo e-mail existe em mais de uma organização.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  organization?: string;
}
