import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
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

  // Obrigatória: a coluna User.password é NOT NULL, e uma conta sem senha não
  // tem como entrar.
  @ApiProperty({ minLength: 6 })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
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
