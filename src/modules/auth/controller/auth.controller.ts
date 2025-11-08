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
  @ApiOperation({ summary: 'Realiza o login do usuário' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso.' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas.' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Registra um novo usuário' })
  @ApiResponse({ status: 201, description: 'Usuário registrado com sucesso.' })
  @ApiResponse({ status: 409, description: 'Email ou CPF já cadastrado.' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renova o token de acesso' })
  @ApiResponse({ status: 200, description: 'Token renovado com sucesso.' })
  @ApiResponse({ status: 401, description: 'Token inválido ou expirado.' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Realiza o logout do usuário' })
  @ApiResponse({ status: 200, description: 'Logout realizado com sucesso.' })
  @ApiResponse({ status: 401, description: 'Não autorizado.' })
  async logout(@Request() req: any) {
    return this.authService.logout(req.user.sub);
  }
}
