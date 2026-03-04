import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { UserController } from '../src/modules/user/controller/user.controller';
import { UserService } from '../src/modules/user/service/user.service';
import { PrismaUserRepository } from '../src/modules/user/repository/prisma-user.repository';
import { PrismaService } from '../prisma/prisma.service';
import { comparePassword } from '../src/utils/password.util';
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
  MOCK_ADMIN_USER,
  MOCK_USER_LIST,
  VALID_CREATE_USER_DTO,
  VALID_CREATE_ADMIN_DTO,
  VALID_UPDATE_USER_DTO,
} from './helpers/test-fixtures';

describe('User Module (e2e)', () => {
  let app: INestApplication;
  let mockPrisma: MockPrismaService;
  let jwtService: JwtService;
  let authToken: string;

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
      controllers: [UserController],
      providers: [
        UserService,
        PrismaUserRepository,
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
    authToken = generateTestToken(jwtService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  // ============================================================
  // POST /users
  // ============================================================
  describe('POST /users', () => {
    it('should return 201 on valid create (non-ADMIN, no password)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        ...MOCK_USER,
        ...VALID_CREATE_USER_DTO,
      });

      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(VALID_CREATE_USER_DTO)
        .expect(201);

      expect(response.body).toHaveProperty('email', VALID_CREATE_USER_DTO.email);
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    it('should return 201 on valid create (ADMIN with password)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        ...MOCK_ADMIN_USER,
        ...VALID_CREATE_ADMIN_DTO,
      });

      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(VALID_CREATE_ADMIN_DTO)
        .expect(201);

      expect(response.body).toHaveProperty('email', VALID_CREATE_ADMIN_DTO.email);
    });

    it('should return 400 when role is ADMIN without password', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Admin', email: 'admin@email.com', role: 'ADMIN' })
        .expect(400);
    });

    it('should return 400 when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER);

      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(VALID_CREATE_USER_DTO)
        .expect(400);
    });

    it('should hash password when provided', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(MOCK_USER);

      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...VALID_CREATE_USER_DTO, password: 'mypassword123' })
        .expect(201);

      const createArg = mockPrisma.user.create.mock.calls[0][0];
      expect(createArg.data.password).not.toBe('mypassword123');
      expect(createArg.data.password).toMatch(/^\$2[aby]?\$/);
    });

    it('should return 400 when name is missing', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'novo@email.com' })
        .expect(400);
    });

    it('should return 400 when email is missing', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Novo' })
        .expect(400);
    });

    it('should return 400 when email format is invalid', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Novo', email: 'not-email' })
        .expect(400);
    });

    it('should return 400 when cpf format is invalid', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...VALID_CREATE_USER_DTO, cpf: 'abc' })
        .expect(400);
    });

    it('should return 400 when role is an invalid enum value', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...VALID_CREATE_USER_DTO, role: 'SUPERUSER' })
        .expect(400);
    });

    it('should return 401 when no auth token', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send(VALID_CREATE_USER_DTO)
        .expect(401);
    });
  });

  // ============================================================
  // GET /users
  // ============================================================
  describe('GET /users', () => {
    it('should return 200 with array of users', async () => {
      mockPrisma.user.findMany.mockResolvedValue(MOCK_USER_LIST);

      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
    });

    it('should return 401 when no auth token', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .expect(401);
    });
  });

  // ============================================================
  // GET /users/:id
  // ============================================================
  describe('GET /users/:id', () => {
    it('should return 200 with user when found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER);

      const response = await request(app.getHttpServer())
        .get(`/users/${MOCK_USER.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', MOCK_USER.id);
      expect(response.body).toHaveProperty('email', MOCK_USER.email);
    });

    it('should return 404 when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/users/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 401 when no auth token', async () => {
      await request(app.getHttpServer())
        .get(`/users/${MOCK_USER.id}`)
        .expect(401);
    });
  });

  // ============================================================
  // PUT /users/:id
  // ============================================================
  describe('PUT /users/:id', () => {
    it('should return 200 with updated user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER);
      mockPrisma.user.update.mockResolvedValue({
        ...MOCK_USER,
        ...VALID_UPDATE_USER_DTO,
      });

      const response = await request(app.getHttpServer())
        .put(`/users/${MOCK_USER.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(VALID_UPDATE_USER_DTO)
        .expect(200);

      expect(response.body).toHaveProperty('name', VALID_UPDATE_USER_DTO.name);
    });

    it('should return 404 when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .put('/users/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send(VALID_UPDATE_USER_DTO)
        .expect(404);
    });

    it('should return 400 when upgrading to ADMIN without password and user has no password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER_WITHOUT_PASSWORD);

      await request(app.getHttpServer())
        .put(`/users/${MOCK_USER_WITHOUT_PASSWORD.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ role: 'ADMIN' })
        .expect(400);
    });

    it('should hash password when updating', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER);
      mockPrisma.user.update.mockResolvedValue(MOCK_USER);

      await request(app.getHttpServer())
        .put(`/users/${MOCK_USER.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ password: 'newpassword123' })
        .expect(200);

      const updateArg = mockPrisma.user.update.mock.calls[0][0];
      expect(updateArg.data.password).not.toBe('newpassword123');
      expect(updateArg.data.password).toMatch(/^\$2[aby]?\$/);
    });

    it('should return 401 when no auth token', async () => {
      await request(app.getHttpServer())
        .put(`/users/${MOCK_USER.id}`)
        .send(VALID_UPDATE_USER_DTO)
        .expect(401);
    });
  });

  // ============================================================
  // DELETE /users/:id
  // ============================================================
  describe('DELETE /users/:id', () => {
    it('should return 200 when user deleted', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER);
      mockPrisma.user.delete.mockResolvedValue(MOCK_USER);

      const response = await request(app.getHttpServer())
        .delete(`/users/${MOCK_USER.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', MOCK_USER.id);
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: MOCK_USER.id },
      });
    });

    it('should return 404 when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .delete('/users/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 401 when no auth token', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${MOCK_USER.id}`)
        .expect(401);
    });
  });

  // ============================================================
  // UserService - methods not exposed via HTTP
  // ============================================================
  describe('UserService (direct)', () => {
    it('findByEmail should delegate to repository', async () => {
      const userService = app.get(UserService);
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER);

      const result = await userService.findByEmail('joao@email.com');

      expect(result).toEqual(MOCK_USER);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'joao@email.com' },
      });
    });

    it('getAdminEmails should return array of admin emails', async () => {
      const userService = app.get(UserService);
      mockPrisma.user.findMany.mockResolvedValue([
        { ...MOCK_ADMIN_USER, email: 'admin1@email.com' },
        { ...MOCK_ADMIN_USER, email: 'admin2@email.com' },
      ]);

      const emails = await userService.getAdminEmails();

      expect(emails).toEqual(['admin1@email.com', 'admin2@email.com']);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { role: 'ADMIN' },
      });
    });
  });

  // ============================================================
  // PrismaUserRepository - methods not called by service
  // ============================================================
  describe('PrismaUserRepository (direct)', () => {
    it('findByCpf should query by cpf', async () => {
      const repo = app.get(PrismaUserRepository);
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER);

      const result = await repo.findByCpf('12345678901');

      expect(result).toEqual(MOCK_USER);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { cpf: '12345678901' },
      });
    });

    it('isAdmin should return true for ADMIN user', async () => {
      const repo = app.get(PrismaUserRepository);
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_ADMIN_USER);

      const result = await repo.isAdmin('admin-uuid-456');

      expect(result).toBe(true);
    });

    it('isAdmin should return false for non-ADMIN user', async () => {
      const repo = app.get(PrismaUserRepository);
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER);

      const result = await repo.isAdmin('user-uuid-123');

      expect(result).toBe(false);
    });

    it('isAdmin should return false when user not found', async () => {
      const repo = app.get(PrismaUserRepository);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await repo.isAdmin('non-existent-id');

      expect(result).toBe(false);
    });
  });

  // ============================================================
  // password.util.ts - comparePassword
  // ============================================================
  describe('Password utility', () => {
    it('comparePassword should return true for matching password', async () => {
      const result = await comparePassword('password123', MOCK_USER.password);
      expect(result).toBe(true);
    });

    it('comparePassword should return false for mismatched password', async () => {
      const result = await comparePassword('wrongpassword', MOCK_USER.password);
      expect(result).toBe(false);
    });
  });

  // ============================================================
  // AuthGuard - additional branch coverage
  // ============================================================
  describe('AuthGuard (additional branches)', () => {
    it('should return 401 when Authorization header has non-Bearer type', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Basic ${authToken}`)
        .expect(401);
    });
  });
});
