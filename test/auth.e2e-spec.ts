import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtModule, JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthController } from '../src/modules/auth/controller/auth.controller';
import { AuthService } from '../src/modules/auth/service/auth.service';
import { AuthRepository } from '../src/modules/auth/repository/auth.repository';
import { PrismaService } from '../prisma/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from './helpers/mock-prisma.service';
import {
  TEST_JWT_SECRET,
  generateTestToken,
} from './helpers/test-auth.helper';
import {
  MOCK_USER,
  MOCK_USER_WITHOUT_PASSWORD,
  VALID_LOGIN_DTO,
  VALID_REGISTER_DTO,
  VALID_REGISTER_DTO_FULL,
} from './helpers/test-fixtures';

describe('Auth Module (e2e)', () => {
  let app: INestApplication;
  let mockPrisma: MockPrismaService;
  let jwtService: JwtService;

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;

    mockPrisma = createMockPrismaService();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          global: true,
          secret: TEST_JWT_SECRET,
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        AuthRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  // ============================================================
  // POST /auth/login
  // ============================================================
  describe('POST /auth/login', () => {
    it('should return 200 with tokens and user on valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER);
      mockPrisma.refreshToken.create.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(VALID_LOGIN_DTO)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body.user.email).toBe(MOCK_USER.email);
      expect(mockPrisma.refreshToken.create).toHaveBeenCalled();
    });

    it('should return 401 when email does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(VALID_LOGIN_DTO)
        .expect(401);
    });

    it('should return 401 when user has no password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER_WITHOUT_PASSWORD);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(VALID_LOGIN_DTO)
        .expect(401);
    });

    it('should return 401 when password is incorrect', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: VALID_LOGIN_DTO.email, password: 'wrongpassword' })
        .expect(401);
    });

    it('should return 400 when email is missing', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ password: 'password123' })
        .expect(400);
    });

    it('should return 400 when email format is invalid', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'not-an-email', password: 'password123' })
        .expect(400);
    });

    it('should return 400 when password is missing', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'joao@email.com' })
        .expect(400);
    });

    it('should return 400 when password is too short', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'joao@email.com', password: '123' })
        .expect(400);
    });

    it('should return 400 when non-whitelisted field is sent', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ ...VALID_LOGIN_DTO, hacker: true })
        .expect(400);
    });
  });

  // ============================================================
  // POST /auth/register
  // ============================================================
  describe('POST /auth/register', () => {
    it('should return 201 with user data on valid registration (required fields)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(MOCK_USER);

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(VALID_REGISTER_DTO)
        .expect(201);

      expect(response.body).not.toHaveProperty('password');
      expect(response.body).toHaveProperty('email', MOCK_USER.email);
      expect(mockPrisma.user.create).toHaveBeenCalled();
      const createArg = mockPrisma.user.create.mock.calls[0][0];
      expect(createArg.data.password).not.toBe(VALID_REGISTER_DTO.password);
      expect(createArg.data.password).toMatch(/^\$2[aby]?\$/);
    });

    it('should return 201 with all optional fields', async () => {
      // findUserByEmail returns null
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null)  // findUserByEmail
        .mockResolvedValueOnce(null); // findUserByCpf
      mockPrisma.user.create.mockResolvedValue({
        ...MOCK_USER,
        ...VALID_REGISTER_DTO_FULL,
      });

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(VALID_REGISTER_DTO_FULL)
        .expect(201);

      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 409 when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER);

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(VALID_REGISTER_DTO)
        .expect(409);
    });

    it('should return 409 when CPF already exists', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null)   // findUserByEmail
        .mockResolvedValueOnce(MOCK_USER); // findUserByCpf

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(VALID_REGISTER_DTO_FULL)
        .expect(409);
    });

    it('should return 400 when name is missing', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'joao@email.com', password: 'password123' })
        .expect(400);
    });

    it('should return 400 when email is missing', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Joao', password: 'password123' })
        .expect(400);
    });

    it('should return 400 when email format is invalid', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Joao', email: 'not-email', password: 'password123' })
        .expect(400);
    });

    it('should return 400 when password is missing', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Joao', email: 'joao@email.com' })
        .expect(400);
    });

    it('should return 400 when password is too short', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Joao', email: 'joao@email.com', password: '123' })
        .expect(400);
    });

    it('should return 400 when cpf format is invalid', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...VALID_REGISTER_DTO, cpf: 'abc123' })
        .expect(400);
    });

    it('should return 400 when role is an invalid enum value', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...VALID_REGISTER_DTO, role: 'SUPERUSER' })
        .expect(400);
    });
  });

  // ============================================================
  // POST /auth/refresh
  // ============================================================
  describe('POST /auth/refresh', () => {
    it('should return 200 with new accessToken on valid refresh token', async () => {
      const payload = {
        email: MOCK_USER.email,
        sub: MOCK_USER.id,
        role: MOCK_USER.role,
        name: MOCK_USER.name,
      };
      const refreshToken = jwtService.sign(payload, { expiresIn: '7d' });
      const tokenHash = bcrypt.hashSync(refreshToken, 10);

      mockPrisma.refreshToken.findMany.mockResolvedValue([
        {
          id: 'token-id-1',
          tokenHash,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      ]);
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER);

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(typeof response.body.accessToken).toBe('string');
    });

    it('should return 401 when refresh token is not a valid JWT', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'not.a.valid.jwt.token' })
        .expect(401);
    });

    it('should return 401 when no stored tokens exist for user', async () => {
      const payload = {
        email: MOCK_USER.email,
        sub: MOCK_USER.id,
        role: MOCK_USER.role,
        name: MOCK_USER.name,
      };
      const refreshToken = jwtService.sign(payload, { expiresIn: '7d' });

      mockPrisma.refreshToken.findMany.mockResolvedValue([]);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });

    it('should return 401 when stored token hash does not match', async () => {
      const payload = {
        email: MOCK_USER.email,
        sub: MOCK_USER.id,
        role: MOCK_USER.role,
        name: MOCK_USER.name,
      };
      const refreshToken = jwtService.sign(payload, { expiresIn: '7d' });

      mockPrisma.refreshToken.findMany.mockResolvedValue([
        {
          id: 'token-id-1',
          tokenHash: bcrypt.hashSync('completely-different-token', 10),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      ]);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });

    it('should return 401 when user not found after token verify', async () => {
      const payload = {
        email: MOCK_USER.email,
        sub: MOCK_USER.id,
        role: MOCK_USER.role,
        name: MOCK_USER.name,
      };
      const refreshToken = jwtService.sign(payload, { expiresIn: '7d' });
      const tokenHash = bcrypt.hashSync(refreshToken, 10);

      mockPrisma.refreshToken.findMany.mockResolvedValue([
        {
          id: 'token-id-1',
          tokenHash,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      ]);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });

    it('should return 400 when refreshToken field is missing', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .expect(400);
    });
  });

  // ============================================================
  // POST /auth/logout
  // ============================================================
  describe('POST /auth/logout', () => {
    it('should return 200 with success message when authenticated', async () => {
      const token = generateTestToken(jwtService);
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Logout realizado com sucesso',
      });
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalled();
    });

    it('should return 401 when no Authorization header', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(401);
    });

    it('should return 401 when token is invalid', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should return 400 when userId is empty in token payload', async () => {
      const token = generateTestToken(jwtService, { sub: '' });

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });
  });

  // ============================================================
  // AuthService.cleanExpiredTokens (not exposed via HTTP)
  // ============================================================
  describe('AuthService.cleanExpiredTokens', () => {
    it('should call deleteExpiredRefreshTokens on repository', async () => {
      const authService = app.get(AuthService);
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 3 });

      await authService.cleanExpiredTokens();

      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date),
          },
        },
      });
    });
  });
});
