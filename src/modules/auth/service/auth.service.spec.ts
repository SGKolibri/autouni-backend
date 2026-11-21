import { Test, TestingModule } from '@nestjs/testing';
import {
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { AuthRepository } from '../repository/auth.repository';

describe('AuthService', () => {
  let service: AuthService;
  let authRepository: jest.Mocked<AuthRepository>;
  let jwtService: jest.Mocked<JwtService>;

  const hashedPassword = bcrypt.hashSync('password123', 10);

  const mockUser = {
    id: 'user-uuid-1',
    email: 'joao@email.com',
    name: 'Joao da Silva',
    password: hashedPassword,
    phone: null,
    cpf: null,
    role: 'VIEWER',
    avatar: null,
    organizationId: 'org-1',
    organization: { id: 'org-1', slug: 'default', name: 'Organização padrão' },
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AuthRepository,
          useValue: {
            findUsersByEmailForLogin: jest.fn(),
            findUserForRefresh: jest.fn(),
            findUserByEmail: jest.fn(),
            findUserByCpf: jest.fn(),
            createUser: jest.fn(),
            createRefreshToken: jest.fn(),
            findRefreshTokensByUserId: jest.fn(),
            deleteRefreshTokensByUserId: jest.fn(),
            deleteExpiredRefreshTokens: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    authRepository = module.get(AuthRepository);
    jwtService = module.get(JwtService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user without password on valid credentials', async () => {
      authRepository.findUsersByEmailForLogin.mockResolvedValue([mockUser] as any);
      const result = await service.validateUser('joao@email.com', 'password123');
      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe('joao@email.com');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      authRepository.findUsersByEmailForLogin.mockResolvedValue([]);
      await expect(service.validateUser('notfound@email.com', 'password123')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user has no password', async () => {
      authRepository.findUsersByEmailForLogin.mockResolvedValue([{ ...mockUser, password: null }] as any);
      await expect(service.validateUser('joao@email.com', 'password123')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      authRepository.findUsersByEmailForLogin.mockResolvedValue([mockUser] as any);
      await expect(service.validateUser('joao@email.com', 'wrongpassword')).rejects.toThrow(UnauthorizedException);
    });

    it('should pick the only organization whose password matches', async () => {
      const other = { ...mockUser, id: 'user-2', organizationId: 'org-2', password: bcrypt.hashSync('other-pass', 10) };
      authRepository.findUsersByEmailForLogin.mockResolvedValue([mockUser, other] as any);
      const result = await service.validateUser('joao@email.com', 'other-pass');
      expect(result.organizationId).toBe('org-2');
    });

    it('should ask for the organization when the password matches in more than one', async () => {
      const twin = { ...mockUser, id: 'user-2', organizationId: 'org-2', organization: { id: 'org-2', slug: 'campus-2', name: 'Campus 2' } };
      authRepository.findUsersByEmailForLogin.mockResolvedValue([mockUser, twin] as any);
      await expect(service.validateUser('joao@email.com', 'password123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    it('should return tokens and user on valid credentials', async () => {
      authRepository.findUsersByEmailForLogin.mockResolvedValue([mockUser] as any);
      authRepository.createRefreshToken.mockResolvedValue(undefined as any);

      const result = await service.login({ email: 'joao@email.com', password: 'password123' });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).not.toHaveProperty('password');
      expect(authRepository.createRefreshToken).toHaveBeenCalled();
    });

    it('should sign access and refresh tokens with the organization and token type', async () => {
      authRepository.findUsersByEmailForLogin.mockResolvedValue([mockUser] as any);
      await service.login({ email: 'joao@email.com', password: 'password123' });
      const payloads = jwtService.sign.mock.calls.map((c) => c[0] as any);
      expect(payloads.map((p) => p.typ)).toEqual(['access', 'refresh']);
      expect(payloads.every((p) => p.orgId === 'org-1')).toBe(true);
    });

    it('should throw when credentials are invalid', async () => {
      authRepository.findUsersByEmailForLogin.mockResolvedValue([]);
      await expect(service.login({ email: 'notfound@email.com', password: 'pass' })).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should create and return user without password', async () => {
      authRepository.findUserByEmail.mockResolvedValue(null);
      const createdUser = { ...mockUser };
      authRepository.createUser.mockResolvedValue(createdUser as any);

      const result = await service.register({
        name: 'Joao da Silva',
        email: 'joao@email.com',
        password: 'password123',
      });
      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe('joao@email.com');
    });

    it('should throw ConflictException when email already exists', async () => {
      authRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      await expect(service.register({ name: 'Joao', email: 'joao@email.com', password: 'password123' })).rejects.toThrow(ConflictException);
      expect(authRepository.createUser).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when CPF already exists', async () => {
      authRepository.findUserByEmail.mockResolvedValue(null);
      authRepository.findUserByCpf.mockResolvedValue(mockUser as any);
      await expect(
        service.register({ name: 'Joao', email: 'joao@email.com', password: 'password123', cpf: '12345678901' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should hash password before storing', async () => {
      authRepository.findUserByEmail.mockResolvedValue(null);
      authRepository.createUser.mockResolvedValue(mockUser as any);

      await service.register({ name: 'Joao', email: 'joao@email.com', password: 'password123' });
      const callArg = authRepository.createUser.mock.calls[0][0];
      expect(callArg.password).not.toBe('password123');
      expect(callArg.password).toMatch(/^\$2[aby]?\$/);
    });

    it('should skip CPF check when cpf not provided', async () => {
      authRepository.findUserByEmail.mockResolvedValue(null);
      authRepository.createUser.mockResolvedValue(mockUser as any);

      await service.register({ name: 'Joao', email: 'joao@email.com', password: 'password123' });
      expect(authRepository.findUserByCpf).not.toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    const tokenPayload = { email: 'joao@email.com', sub: 'user-uuid-1', role: 'VIEWER', name: 'Joao', orgId: 'org-1', typ: 'refresh' };
    const rawToken = 'raw-refresh-token';
    const tokenHash = bcrypt.hashSync(rawToken, 10);

    it('should return new accessToken when refresh token is valid', async () => {
      jwtService.verify.mockReturnValue(tokenPayload as any);
      authRepository.findRefreshTokensByUserId.mockResolvedValue([
        { id: 'rt-1', tokenHash, expiresAt: new Date(Date.now() + 1000000) },
      ] as any);
      authRepository.findUserForRefresh.mockResolvedValue(mockUser as any);

      const result = await service.refreshToken(rawToken);
      expect(result).toHaveProperty('accessToken');
      expect(authRepository.findUserForRefresh).toHaveBeenCalledWith('user-uuid-1', 'org-1');
    });

    it('should reject an access token used as refresh token', async () => {
      jwtService.verify.mockReturnValue({ ...tokenPayload, typ: 'access' } as any);
      await expect(service.refreshToken(rawToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when JWT verify fails', async () => {
      jwtService.verify.mockImplementation(() => { throw new Error('invalid token'); });
      await expect(service.refreshToken('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when no stored tokens exist', async () => {
      jwtService.verify.mockReturnValue(tokenPayload as any);
      authRepository.findRefreshTokensByUserId.mockResolvedValue([]);
      await expect(service.refreshToken(rawToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token hash does not match', async () => {
      jwtService.verify.mockReturnValue(tokenPayload as any);
      authRepository.findRefreshTokensByUserId.mockResolvedValue([
        { id: 'rt-1', tokenHash: bcrypt.hashSync('different-token', 10), expiresAt: new Date(Date.now() + 1000000) },
      ] as any);
      await expect(service.refreshToken(rawToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      jwtService.verify.mockReturnValue(tokenPayload as any);
      authRepository.findRefreshTokensByUserId.mockResolvedValue([
        { id: 'rt-1', tokenHash, expiresAt: new Date(Date.now() + 1000000) },
      ] as any);
      authRepository.findUserForRefresh.mockResolvedValue(null);
      await expect(service.refreshToken(rawToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should delete tokens and return success message', async () => {
      authRepository.deleteRefreshTokensByUserId.mockResolvedValue(undefined as any);
      const result = await service.logout('user-uuid-1');
      expect(result).toEqual({ message: 'Logout realizado com sucesso' });
      expect(authRepository.deleteRefreshTokensByUserId).toHaveBeenCalledWith('user-uuid-1');
    });

    it('should throw BadRequestException when userId is empty', async () => {
      await expect(service.logout('')).rejects.toThrow(BadRequestException);
    });
  });

  describe('cleanExpiredTokens', () => {
    it('should call deleteExpiredRefreshTokens', async () => {
      authRepository.deleteExpiredRefreshTokens.mockResolvedValue(undefined as any);
      await service.cleanExpiredTokens();
      expect(authRepository.deleteExpiredRefreshTokens).toHaveBeenCalled();
    });
  });
});
