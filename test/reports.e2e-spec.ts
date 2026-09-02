import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ReportsController } from '../src/modules/reports/controller/reports.controller';
import { ReportsService } from '../src/modules/reports/service/reports.service';
import { ReportsRepository } from '../src/modules/reports/repository/reports.repository';
import { PrismaService } from '../prisma/prisma.service';
import { TEST_JWT_SECRET, generateTestToken } from './helpers/test-auth.helper';

describe('Reports Module (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let authToken: string;
  let mockPrisma: any;

  const VALID_USER_UUID = '550e8400-e29b-41d4-a716-446655440000';

  const mockReport = {
    id: 'report-uuid-1',
    type: 'ENERGY_CONSUMPTION',
    title: 'Consumo de Energia - Janeiro 2025',
    format: 'PDF',
    status: 'PENDING',
    filters: { startDate: '2025-01-01' },
    fileUrl: null,
    createdById: VALID_USER_UUID,
    createdAt: new Date('2025-01-01').toISOString(),
    updatedAt: new Date('2025-01-01').toISOString(),
  };

  const validCreateDto = {
    type: 'ENERGY_CONSUMPTION',
    title: 'Consumo de Energia - Janeiro 2025',
    format: 'PDF',
    filters: { startDate: '2025-01-01' },
    createdById: VALID_USER_UUID,
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;

    mockPrisma = {
      report: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $connect: jest.fn(),
      $disconnect: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          global: true,
          secret: TEST_JWT_SECRET,
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [ReportsController],
      providers: [
        ReportsService,
        ReportsRepository,
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

  beforeEach(() => jest.clearAllMocks());

  afterAll(async () => {
    await app.close();
  });

  // ============================================================
  // POST /reports
  // ============================================================
  describe('POST /reports', () => {
    it('should return 201 on valid create', async () => {
      mockPrisma.report.create.mockResolvedValue(mockReport);

      const response = await request(app.getHttpServer())
        .post('/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validCreateDto)
        .expect(201);

      expect(response.body).toHaveProperty('id', mockReport.id);
    });

    it('should return 400 when type is invalid enum', async () => {
      await request(app.getHttpServer())
        .post('/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...validCreateDto, type: 'INVALID_TYPE' })
        .expect(400);
    });

    it('should return 400 when title is too short', async () => {
      await request(app.getHttpServer())
        .post('/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...validCreateDto, title: 'AB' })
        .expect(400);
    });

    it('should return 400 when format is invalid enum', async () => {
      await request(app.getHttpServer())
        .post('/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...validCreateDto, format: 'DOCX' })
        .expect(400);
    });

    it('should return 400 when createdById is not a UUID', async () => {
      await request(app.getHttpServer())
        .post('/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...validCreateDto, createdById: 'not-a-uuid' })
        .expect(400);
    });

    it('should return 401 when no auth token', async () => {
      await request(app.getHttpServer()).post('/reports').send(validCreateDto).expect(401);
    });
  });

  // ============================================================
  // GET /reports
  // ============================================================
  describe('GET /reports', () => {
    it('should return 200 with list of reports', async () => {
      mockPrisma.report.findMany.mockResolvedValue([mockReport]);

      const response = await request(app.getHttpServer())
        .get('/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
    });

    it('should return 401 when no auth token', async () => {
      await request(app.getHttpServer()).get('/reports').expect(401);
    });
  });

  // ============================================================
  // GET /reports/me
  // ============================================================
  describe('GET /reports/me', () => {
    it('should return 200 with authenticated user reports', async () => {
      mockPrisma.report.findMany.mockResolvedValue([mockReport]);

      const response = await request(app.getHttpServer())
        .get('/reports/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // ============================================================
  // GET /reports/type/:type
  // ============================================================
  describe('GET /reports/type/:type', () => {
    it('should return 200 with reports of given type', async () => {
      mockPrisma.report.findMany.mockResolvedValue([mockReport]);

      const response = await request(app.getHttpServer())
        .get('/reports/type/ENERGY_CONSUMPTION')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // ============================================================
  // GET /reports/status/:status
  // ============================================================
  describe('GET /reports/status/:status', () => {
    it('should return 200 with reports of given status', async () => {
      mockPrisma.report.findMany.mockResolvedValue([mockReport]);

      const response = await request(app.getHttpServer())
        .get('/reports/status/PENDING')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // ============================================================
  // GET /reports/creator/:creatorId
  // ============================================================
  describe('GET /reports/creator/:creatorId', () => {
    it('should return 200 with reports by creator', async () => {
      mockPrisma.report.findMany.mockResolvedValue([mockReport]);

      const response = await request(app.getHttpServer())
        .get(`/reports/creator/${VALID_USER_UUID}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // ============================================================
  // GET /reports/:id
  // ============================================================
  describe('GET /reports/:id', () => {
    it('should return 200 with report when found', async () => {
      mockPrisma.report.findUnique.mockResolvedValue(mockReport);

      const response = await request(app.getHttpServer())
        .get(`/reports/${mockReport.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', mockReport.id);
    });

    it('should return 404 when report not found', async () => {
      mockPrisma.report.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/reports/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  // ============================================================
  // PUT /reports/:id
  // ============================================================
  describe('PUT /reports/:id', () => {
    it('should return 200 with updated report', async () => {
      const updated = { ...mockReport, title: 'Updated Title For Report' };
      mockPrisma.report.findUnique.mockResolvedValue(mockReport);
      mockPrisma.report.update.mockResolvedValue(updated);

      const response = await request(app.getHttpServer())
        .put(`/reports/${mockReport.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated Title For Report' })
        .expect(200);

      expect(response.body).toHaveProperty('title', 'Updated Title For Report');
    });

    it('should return 404 when report not found', async () => {
      mockPrisma.report.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .put('/reports/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated Title For Report' })
        .expect(404);
    });

    it('should return 401 when no auth token', async () => {
      await request(app.getHttpServer())
        .put(`/reports/${mockReport.id}`)
        .send({ title: 'Test' })
        .expect(401);
    });
  });

  // ============================================================
  // PATCH /reports/:id/status
  // ============================================================
  describe('PATCH /reports/:id/status', () => {
    it('should return 200 with updated status', async () => {
      const updated = { ...mockReport, status: 'COMPLETED' };
      mockPrisma.report.findUnique.mockResolvedValue(mockReport);
      mockPrisma.report.update.mockResolvedValue(updated);

      const response = await request(app.getHttpServer())
        .patch(`/reports/${mockReport.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'COMPLETED' })
        .expect(200);

      expect(response.body).toHaveProperty('status', 'COMPLETED');
    });

    it('should return 404 when report not found', async () => {
      mockPrisma.report.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .patch('/reports/non-existent/status')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'COMPLETED' })
        .expect(404);
    });
  });

  // ============================================================
  // DELETE /reports/:id
  // ============================================================
  describe('DELETE /reports/:id', () => {
    it('should return 200 when report deleted', async () => {
      mockPrisma.report.findUnique.mockResolvedValue(mockReport);
      mockPrisma.report.delete.mockResolvedValue(mockReport);

      const response = await request(app.getHttpServer())
        .delete(`/reports/${mockReport.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', mockReport.id);
    });

    it('should return 404 when report not found', async () => {
      mockPrisma.report.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .delete('/reports/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 401 when no auth token', async () => {
      await request(app.getHttpServer()).delete(`/reports/${mockReport.id}`).expect(401);
    });
  });
});
