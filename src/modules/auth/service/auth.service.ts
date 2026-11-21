import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthRepository } from '../repository/auth.repository';
import { LoginDto } from '../dto/auth.dto';
import {
  JwtPayload,
  LoginResponse,
  RefreshResponse,
  UserWithOrganization,
} from '../interfaces/auth.interfaces';
import { RegisterDto } from '../dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * O mesmo e-mail pode existir em várias organizações. A senha é conferida em
   * todas as contas candidatas, para que a resposta não revele em quais
   * organizações um e-mail existe; só quando a senha confere em mais de uma é
   * que o cliente precisa informar `organization`.
   */
  async validateUser(email: string, password: string, organization?: string) {
    const candidates = await this.authRepository.findUsersByEmailForLogin(email, organization);

    const matches: UserWithOrganization[] = [];
    for (const candidate of candidates) {
      if (candidate.password && (await bcrypt.compare(password, candidate.password))) {
        matches.push(candidate);
      }
    }

    if (matches.length === 0) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    if (matches.length > 1) {
      throw new BadRequestException({
        message: 'Informe a organização para entrar',
        organizations: matches.map((m) => ({ slug: m.organization.slug, name: m.organization.name })),
      });
    }

    const { password: _, ...result } = matches[0];
    return result;
  }

  private sign(user: Pick<User, 'id' | 'email' | 'role' | 'name' | 'organizationId'>, typ: JwtPayload['typ']) {
    const payload: JwtPayload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      name: user.name,
      orgId: user.organizationId,
      typ,
    };
    return this.jwtService.sign(payload, { expiresIn: typ === 'access' ? '15m' : '7d' });
  }

  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const user = await this.validateUser(loginDto.email, loginDto.password, loginDto.organization);

    const accessToken = this.sign(user, 'access');
    const refreshToken = this.sign(user, 'refresh');

    const tokenHash = await bcrypt.hash(refreshToken, 10);
    await this.authRepository.createRefreshToken({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  /** Só chamado por ADMIN autenticado: o usuário nasce VIEWER na organização dele. */
  async register(registerDto: RegisterDto): Promise<Omit<LoginResponse['user'], 'password'>> {
    const existingUserByEmail = await this.authRepository.findUserByEmail(registerDto.email);
    if (existingUserByEmail) {
      throw new ConflictException('Email já cadastrado');
    }

    if (registerDto.cpf) {
      const existingUserByCpf = await this.authRepository.findUserByCpf(registerDto.cpf);
      if (existingUserByCpf) {
        throw new ConflictException('CPF já cadastrado');
      }
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = await this.authRepository.createUser({
      ...registerDto,
      password: hashedPassword,
    });

    const { password, ...result } = user;
    return result;
  }

  async refreshToken(token: string): Promise<RefreshResponse> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      if (payload.typ !== 'refresh' || !payload.orgId) {
        throw new UnauthorizedException('Token inválido');
      }

      const storedTokens = await this.authRepository.findRefreshTokensByUserId(payload.sub);
      if (!storedTokens.length) {
        throw new UnauthorizedException('Token inválido');
      }

      const isValidToken = await Promise.all(
        storedTokens.map((stored) => bcrypt.compare(token, stored.tokenHash)),
      );
      if (!isValidToken.some((valid) => valid)) {
        throw new UnauthorizedException('Token inválido');
      }

      // Relê o usuário para que papel e organização venham do banco, não do token.
      const user = await this.authRepository.findUserForRefresh(payload.sub, payload.orgId);
      if (!user) {
        throw new UnauthorizedException('Usuário não encontrado');
      }

      return { accessToken: this.sign(user, 'access') };
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
