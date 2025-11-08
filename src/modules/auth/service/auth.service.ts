import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthRepository } from '../repository/auth.repository';
import { LoginDto } from '../dto/auth.dto';
import { JwtPayload, LoginResponse, RefreshResponse } from '../interfaces/auth.interfaces';
import { RegisterDto } from '../dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.authRepository.findUserByEmail(email);

    if (!user || !user.password) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const { password: _, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    const payload: JwtPayload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      name: user.name,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    // Store refresh token hash in database
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    await this.authRepository.createRefreshToken({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  async register(registerDto: RegisterDto): Promise<Omit<LoginResponse['user'], 'password'>> {
    // Check if user already exists by email
    const existingUserByEmail = await this.authRepository.findUserByEmail(
      registerDto.email,
    );

    if (existingUserByEmail) {
      throw new ConflictException('Email já cadastrado');
    }

    // Check if user already exists by CPF (if provided)
    if (registerDto.cpf) {
      const existingUserByCpf = await this.authRepository.findUserByCpf(
        registerDto.cpf,
      );

      if (existingUserByCpf) {
        throw new ConflictException('CPF já cadastrado');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Create user
    const user = await this.authRepository.createUser({
      ...registerDto,
      password: hashedPassword,
    });

    // Remove password from response
    const { password, ...result } = user;
    return result;
  }

  async refreshToken(token: string): Promise<RefreshResponse> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);

      // Verify if refresh token exists in database
      const storedTokens = await this.authRepository.findRefreshTokensByUserId(
        payload.sub,
      );

      if (!storedTokens.length) {
        throw new UnauthorizedException('Token inválido');
      }

      const isValidToken = await Promise.all(
        storedTokens.map(async (stored) => {
          return await bcrypt.compare(token, stored.tokenHash);
        }),
      );

      if (!isValidToken.some((valid) => valid)) {
        throw new UnauthorizedException('Token inválido');
      }

      const user = await this.authRepository.findUserByEmail(payload.email);

      if (!user) {
        throw new UnauthorizedException('Usuário não encontrado');
      }

      const newAccessToken = this.jwtService.sign({
        email: user.email,
        sub: user.id,
        role: user.role,
        name: user.name,
      } as JwtPayload, {
        expiresIn: '15m',
      });

      return {
        accessToken: newAccessToken,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }

  async logout(userId: string): Promise<{ message: string }> {
    if (!userId) {
      throw new BadRequestException('ID do usuário não fornecido');
    }

    await this.authRepository.deleteRefreshTokensByUserId(userId);

    return { message: 'Logout realizado com sucesso' };
  }

  async cleanExpiredTokens(): Promise<void> {
    await this.authRepository.deleteExpiredRefreshTokens();
  }
}