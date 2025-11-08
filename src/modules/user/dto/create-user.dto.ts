import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../interfaces/user.interface';

export class CreateUserDto {
  @ApiProperty({ example: 'João da Silva' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'joao@email.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.VIEWER })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ minLength: 6 })
  @IsOptional()
  @IsString()
  password: string;

  @ApiProperty({ example: '+55 11 91234-5678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: '12345678901', description: '11 dígitos' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$/, {
    message: 'cpf deve ter 11 dígitos numéricos sem pontos',
  })
  cpf?: string;

  @ApiPropertyOptional({ example: 'http://example.com/avatar.jpg' })
  @IsOptional()
  @IsString()
  avatar?: string;
}
