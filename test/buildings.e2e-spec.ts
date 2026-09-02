import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { BuildingsController } from '../src/modules/buildings/controller/buildings.controller';
import { BuildingsService } from '../src/modules/buildings/service/buildings.service';
import { BuildingsRepository } from '../src/modules/buildings/repository/buildings.repository';
import { PrismaService } from '../prisma/prisma.service';
import { TEST_JWT_SECRET, generateTestToken } from './helpers/test-auth.helper';

describe('Buildings Module (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let authToken: string;
  let mockPrisma: any;

  const mockBuilding = {
    id: 'building-uuid-1',
    name: 'Bloco A',
    description: 'Main block',
    location: 'Campus Central',
    totalEnergy: 0,
    activeDevices: 0,
    createdAt: new Date('2025-01-01').toISOString(),
    updatedAt: new Date('2025-01-01').toISOString(),
  };

  const mockBuildingWithStats = {
    floors: [
      {
        rooms: [
          {
            devices: [
              { id: 'd1', status: 'ON' },
              { id: 'd2', status: 'OFF' },
            ],
          },
        ],
      },
    ],
    totalEnergy: 500,
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;

    mockPrisma = {
      building: {
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
      controllers: [BuildingsController],
      providers: [
        BuildingsService,
        BuildingsRepository,
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
  // POST /buildings
  // ============================================================
  describe('POST /buildings', () => {
    it('should return 201 on valid create', async () => {
      mockPrisma.building.create.mockResolvedValue(mockBuilding);

      const response = await request(app.getHttpServer())
        .post('/buildings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Bloco A', location: 'Campus Central' })
        .expect(201);

      expect(response.body).toHaveProperty('id', mockBuilding.id);
      expect(response.body).toHaveProperty('name', 'Bloco A');
    });

    it('should return 400 when name is too short', async () => {
      await request(app.getHttpServer())
        .post('/buildings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'AB', location: 'Campus' })
        .expect(400);
    });

    it('should return 400 when name is missing', async () => {
      await request(app.getHttpServer())
        .post('/buildings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ location: 'Campus Central' })
        .expect(400);
    });

    it('should return 400 when location is missing', async () => {
      await request(app.getHttpServer())
        .post('/buildings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Bloco A' })
        .expect(400);
    });

    it('should return 401 when no auth token', async () => {
      await request(app.getHttpServer())
        .post('/buildings')
        .send({ name: 'Bloco A', location: 'Campus' })
        .expect(401);
    });
  });

  // ============================================================
  // GET /buildings
  // ============================================================
  describe('GET /buildings', () => {
    it('should return 200 with list of buildings', async () => {
      mockPrisma.building.findMany.mockResolvedValue([mockBuilding]);

      const response = await request(app.getHttpServer())
        .get('/buildings')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
    });

    it('should return 200 with empty array when no buildings', async () => {
      mockPrisma.building.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/buildings')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return 401 when no auth token', async () => {
      await request(app.getHttpServer()).get('/buildings').expect(401);
    });
  });

  // ============================================================
  // GET /buildings/:id
  // ============================================================
  describe('GET /buildings/:id', () => {
    it('should return 200 with building when found', async () => {
      mockPrisma.building.findUnique.mockResolvedValue(mockBuilding);

      const response = await request(app.getHttpServer())
        .get(`/buildings/${mockBuilding.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', mockBuilding.id);
    });

    it('should return 404 when building not found', async () => {
      mockPrisma.building.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/buildings/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 401 when no auth token', async () => {
      await request(app.getHttpServer()).get(`/buildings/${mockBuilding.id}`).expect(401);
    });
  });

  // ============================================================
  // GET /buildings/:id/details
  // ============================================================
  describe('GET /buildings/:id/details', () => {
    it('should return 200 with building and relations when found', async () => {
      mockPrisma.building.findUnique.mockResolvedValue({ ...mockBuilding, floors: [] });

      const response = await request(app.getHttpServer())
        .get(`/buildings/${mockBuilding.id}/details`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', mockBuilding.id);
      expect(response.body).toHaveProperty('floors');
    });

    it('should return 404 when building not found', async () => {
      mockPrisma.building.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/buildings/non-existent/details')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  // ============================================================
  // GET /buildings/:id/stats
  // ============================================================
  describe('GET /buildings/:id/stats', () => {
    it('should return 200 with stats when building found', async () => {
      mockPrisma.building.findUnique
        .mockResolvedValueOnce(mockBuilding)
        .mockResolvedValueOnce({ ...mockBuilding, ...mockBuildingWithStats });

      const response = await request(app.getHttpServer())
        .get(`/buildings/${mockBuilding.id}/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalFloors');
      expect(response.body).toHaveProperty('totalRooms');
      expect(response.body).toHaveProperty('totalDevices');
    });

    it('should return 404 when building not found', async () => {
      mockPrisma.building.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/buildings/non-existent/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  // ============================================================
  // PUT /buildings/:id
  // ============================================================
  describe('PUT /buildings/:id', () => {
    it('should return 200 with updated building', async () => {
      const updated = { ...mockBuilding, name: 'Bloco B' };
      mockPrisma.building.findUnique.mockResolvedValue(mockBuilding);
      mockPrisma.building.update.mockResolvedValue(updated);

      const response = await request(app.getHttpServer())
        .put(`/buildings/${mockBuilding.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Bloco B', location: 'Campus Norte' })
        .expect(200);

      expect(response.body).toHaveProperty('name', 'Bloco B');
    });

    it('should return 404 when building not found', async () => {
      mockPrisma.building.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .put('/buildings/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Bloco B', location: 'Campus Norte' })
        .expect(404);
    });

    it('should return 401 when no auth token', async () => {
      await request(app.getHttpServer())
        .put(`/buildings/${mockBuilding.id}`)
        .send({ name: 'Bloco B', location: 'Campus Norte' })
        .expect(401);
    });
  });

  // ============================================================
  // DELETE /buildings/:id
  // ============================================================
  describe('DELETE /buildings/:id', () => {
    it('should return 200 when building deleted', async () => {
      mockPrisma.building.findUnique.mockResolvedValue(mockBuilding);
      mockPrisma.building.delete.mockResolvedValue(mockBuilding);

      const response = await request(app.getHttpServer())
        .delete(`/buildings/${mockBuilding.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', mockBuilding.id);
    });

    it('should return 404 when building not found', async () => {
      mockPrisma.building.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .delete('/buildings/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 401 when no auth token', async () => {
      await request(app.getHttpServer()).delete(`/buildings/${mockBuilding.id}`).expect(401);
    });
  });
});
