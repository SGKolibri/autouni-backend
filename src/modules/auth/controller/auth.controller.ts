import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from '../service/auth.service';
import { LoginDto } from '../dto/auth.dto';
import { RegisterDto } from '../dto/register.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '../../../guards/auth.guard';
import { Public } from '../decorators/public.decorator';
import { RefreshTokenDto } from '../dto/refresh-token.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Realiza o login do usuário',
    description: 'Autentica o usuário e retorna accessToken e refreshToken JWT'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Login realizado com sucesso.',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 'uuid-user-123',
          email: 'user@example.com',
          name: 'João Silva',
          role: 'ADMIN',
          createdAt: '2025-01-01T00:00:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Credenciais inválidas.',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid credentials',
        error: 'Unauthorized'
      }
    }
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('register')
  @ApiOperation({ 
    summary: 'Registra um novo usuário',
    description: 'Cria uma nova conta de usuário no sistema'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Usuário registrado com sucesso.',
    schema: {
      example: {
        id: 'uuid-user-456',
        email: 'novo@example.com',
        name: 'Novo Usuário',
        cpf: '12345678900',
        role: 'VIEWER',
        createdAt: '2025-01-11T10:30:00.000Z'
      }
    }
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Email ou CPF já cadastrado.',
    schema: {
      example: {
        statusCode: 409,
        message: 'Email or CPF already exists',
        error: 'Conflict'
      }
    }
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Renova o token de acesso',
    description: 'Usa o refresh token para gerar um novo access token'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Token renovado com sucesso.',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Token inválido ou expirado.',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid or expired refresh token',
        error: 'Unauthorized'
      }
    }
  })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Realiza o logout do usuário',
    description: 'Invalida o refresh token do usuário autenticado'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Logout realizado com sucesso.',
    schema: {
      example: {
        message: 'Logout realizado com sucesso'
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Não autorizado.',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized'
      }
    }
  })
  async logout(@Request() req: any) {
    return this.authService.logout(req.user.sub);
  }
}
