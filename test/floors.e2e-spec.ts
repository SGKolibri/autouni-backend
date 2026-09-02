import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { FloorsController } from '../src/modules/floors/controller/floors.controller';
import { FloorsService } from '../src/modules/floors/service/floors.service';
import { FloorsRepository } from '../src/modules/floors/repository/floors.repository';
import { PrismaService } from '../prisma/prisma.service';
import { TEST_JWT_SECRET, generateTestToken } from './helpers/test-auth.helper';

describe('Floors Module (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let authToken: string;
  let mockPrisma: any;

  const mockFloor = {
    id: 'floor-uuid-1',
    buildingId: '550e8400-e29b-41d4-a716-446655440000',
    number: 1,
    name: 'Térreo',
    createdAt: new Date('2025-01-01').toISOString(),
    updatedAt: new Date('2025-01-01').toISOString(),
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;

    mockPrisma = {
      floor: {
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
      controllers: [FloorsController],
      providers: [
        FloorsService,
        FloorsRepository,
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
  // POST /floors
  // ============================================================
  describe('POST /floors', () => {
    it('should return 201 on valid create', async () => {
      mockPrisma.floor.create.mockResolvedValue(mockFloor);

      const response = await request(app.getHttpServer())
        .post('/floors')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ buildingId: '550e8400-e29b-41d4-a716-446655440000', number: 1, name: 'Térreo' })
        .expect(201);

      expect(response.body).toHaveProperty('id', mockFloor.id);
    });

    it('should return 400 when buildingId is not a UUID', async () => {
      await request(app.getHttpServer())
        .post('/floors')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ buildingId: 'not-a-uuid', number: 1 })
        .expect(400);
    });

    it('should return 400 when number is missing', async () => {
      await request(app.getHttpServer())
        .post('/floors')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ buildingId: '550e8400-e29b-41d4-a716-446655440000' })
        .expect(400);
    });

    it('should return 400 when number is negative', async () => {
      await request(app.getHttpServer())
        .post('/floors')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ buildingId: '550e8400-e29b-41d4-a716-446655440000', number: -1 })
        .expect(400);
    });

    it('should return 401 when no auth token', async () => {
      await request(app.getHttpServer())
        .post('/floors')
        .send({ buildingId: '550e8400-e29b-41d4-a716-446655440000', number: 1 })
        .expect(401);
    });
  });

  // ============================================================
  // GET /floors
  // ============================================================
  describe('GET /floors', () => {
    it('should return 200 with list of floors', async () => {
      mockPrisma.floor.findMany.mockResolvedValue([mockFloor]);

      const response = await request(app.getHttpServer())
        .get('/floors')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
    });

    it('should return 401 when no auth token', async () => {
      await request(app.getHttpServer()).get('/floors').expect(401);
    });
  });

  // ============================================================
  // GET /floors/building/:buildingId
  // ============================================================
  describe('GET /floors/building/:buildingId', () => {
    it('should return 200 with floors for building', async () => {
      mockPrisma.floor.findMany.mockResolvedValue([mockFloor]);

      const response = await request(app.getHttpServer())
        .get(`/floors/building/${mockFloor.buildingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
    });
  });

  // ============================================================
  // GET /floors/:id
  // ============================================================
  describe('GET /floors/:id', () => {
    it('should return 200 with floor when found', async () => {
      mockPrisma.floor.findUnique.mockResolvedValue(mockFloor);

      const response = await request(app.getHttpServer())
        .get(`/floors/${mockFloor.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', mockFloor.id);
    });

    it('should return 404 when floor not found', async () => {
      mockPrisma.floor.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/floors/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  // ============================================================
  // GET /floors/:id/details
  // ============================================================
  describe('GET /floors/:id/details', () => {
    it('should return 200 with floor and relations when found', async () => {
      mockPrisma.floor.findUnique.mockResolvedValue({ ...mockFloor, rooms: [], building: {} });

      const response = await request(app.getHttpServer())
        .get(`/floors/${mockFloor.id}/details`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', mockFloor.id);
    });

    it('should return 404 when floor not found', async () => {
      mockPrisma.floor.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/floors/non-existent/details')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  // ============================================================
  // PUT /floors/:id
  // ============================================================
  describe('PUT /floors/:id', () => {
    it('should return 200 with updated floor', async () => {
      const updated = { ...mockFloor, name: 'Primeiro Andar' };
      mockPrisma.floor.findUnique.mockResolvedValue(mockFloor);
      mockPrisma.floor.update.mockResolvedValue(updated);

      const response = await request(app.getHttpServer())
        .put(`/floors/${mockFloor.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Primeiro Andar' })
        .expect(200);

      expect(response.body).toHaveProperty('name', 'Primeiro Andar');
    });

    it('should return 404 when floor not found', async () => {
      mockPrisma.floor.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .put('/floors/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test' })
        .expect(404);
    });

    it('should return 401 when no auth token', async () => {
      await request(app.getHttpServer())
        .put(`/floors/${mockFloor.id}`)
        .send({ name: 'Test' })
        .expect(401);
    });
  });

  // ============================================================
  // DELETE /floors/:id
  // ============================================================
  describe('DELETE /floors/:id', () => {
    it('should return 200 when floor deleted', async () => {
      mockPrisma.floor.findUnique.mockResolvedValue(mockFloor);
      mockPrisma.floor.delete.mockResolvedValue(mockFloor);

      const response = await request(app.getHttpServer())
        .delete(`/floors/${mockFloor.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', mockFloor.id);
    });

    it('should return 404 when floor not found', async () => {
      mockPrisma.floor.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .delete('/floors/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 401 when no auth token', async () => {
      await request(app.getHttpServer()).delete(`/floors/${mockFloor.id}`).expect(401);
    });
  });
});
