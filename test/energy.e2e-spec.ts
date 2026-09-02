import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { EnergyController } from '../src/modules/energy/controller/energy.controller';
import { EnergyService } from '../src/modules/energy/service/energy.service';
import { EnergyRepository } from '../src/modules/energy/repository/energy.repository';
import { PrismaService } from '../prisma/prisma.service';
import { TEST_JWT_SECRET, generateTestToken } from './helpers/test-auth.helper';

describe('Energy Module (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let authToken: string;
  let mockPrisma: any;

  const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

  const mockReading = {
    id: 'reading-uuid-1',
    deviceId: VALID_UUID,
    valueWh: 150.5,
    voltage: 220,
    current: 0.68,
    timestamp: new Date('2025-01-01').toISOString(),
    createdAt: new Date('2025-01-01').toISOString(),
  };

  const mockAggregation = {
    _sum: { valueWh: 150000 },
    _count: 100,
    _avg: { valueWh: 1500 },
    _max: { valueWh: 3000 },
    _min: { valueWh: 50 },
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;

    mockPrisma = {
      energyReading: {
        create: jest.fn(),
        findMany: jest.fn(),
        aggregate: jest.fn(),
        deleteMany: jest.fn(),
      },
      device: {
        findMany: jest.fn(),
      },
      room: {
        findMany: jest.fn(),
      },
      floor: {
        findMany: jest.fn(),
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
      controllers: [EnergyController],
      providers: [
        EnergyService,
        EnergyRepository,
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
  // POST /energy/readings
  // ============================================================
  describe('POST /energy/readings', () => {
    it('should return 201 on valid create', async () => {
      mockPrisma.energyReading.create.mockResolvedValue(mockReading);

      const response = await request(app.getHttpServer())
        .post('/energy/readings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ deviceId: VALID_UUID, valueWh: 150.5, voltage: 220, current: 0.68 })
        .expect(201);

      expect(response.body).toHaveProperty('id', mockReading.id);
      expect(response.body).toHaveProperty('valueWh', 150.5);
    });

    it('should return 201 with only required fields', async () => {
      mockPrisma.energyReading.create.mockResolvedValue({ ...mockReading, voltage: null, current: null });

      await request(app.getHttpServer())
        .post('/energy/readings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ deviceId: VALID_UUID, valueWh: 100 })
        .expect(201);
    });

    it('should return 401 when no auth token', async () => {
      await request(app.getHttpServer())
        .post('/energy/readings')
        .send({ deviceId: VALID_UUID, valueWh: 150 })
        .expect(401);
    });
  });

  // ============================================================
  // GET /energy/devices/:deviceId/readings
  // ============================================================
  describe('GET /energy/devices/:deviceId/readings', () => {
    it('should return 200 with readings for device', async () => {
      mockPrisma.energyReading.findMany.mockResolvedValue([mockReading]);

      const response = await request(app.getHttpServer())
        .get(`/energy/devices/${VALID_UUID}/readings`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
    });

    it('should return 400 when deviceId is not a UUID', async () => {
      await request(app.getHttpServer())
        .get('/energy/devices/not-a-uuid/readings')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should return 401 when no auth token', async () => {
      await request(app.getHttpServer())
        .get(`/energy/devices/${VALID_UUID}/readings`)
        .expect(401);
    });
  });

  // ============================================================
  // GET /energy/devices/:deviceId/stats
  // ============================================================
  describe('GET /energy/devices/:deviceId/stats', () => {
    it('should return 200 with energy stats for device', async () => {
      mockPrisma.energyReading.aggregate.mockResolvedValue(mockAggregation);

      const response = await request(app.getHttpServer())
        .get(`/energy/devices/${VALID_UUID}/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalKwh');
      expect(response.body).toHaveProperty('count');
    });

    it('should return 400 when deviceId is not a UUID', async () => {
      await request(app.getHttpServer())
        .get('/energy/devices/not-a-uuid/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  // ============================================================
  // GET /energy/rooms/:roomId/readings
  // ============================================================
  describe('GET /energy/rooms/:roomId/readings', () => {
    it('should return 200 with readings for room', async () => {
      mockPrisma.energyReading.findMany.mockResolvedValue([mockReading]);

      const response = await request(app.getHttpServer())
        .get(`/energy/rooms/${VALID_UUID}/readings`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 400 when roomId is not a UUID', async () => {
      await request(app.getHttpServer())
        .get('/energy/rooms/not-a-uuid/readings')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  // ============================================================
  // GET /energy/rooms/:roomId/stats
  // ============================================================
  describe('GET /energy/rooms/:roomId/stats', () => {
    it('should return 200 with energy stats for room (no devices)', async () => {
      mockPrisma.device.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get(`/energy/rooms/${VALID_UUID}/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalKwh', 0);
    });

    it('should return 200 with energy stats for room (with devices)', async () => {
      mockPrisma.device.findMany.mockResolvedValue([{ id: 'device-1' }]);
      mockPrisma.energyReading.aggregate.mockResolvedValue(mockAggregation);

      const response = await request(app.getHttpServer())
        .get(`/energy/rooms/${VALID_UUID}/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalKwh');
    });
  });

  // ============================================================
  // GET /energy/floors/:floorId/stats
  // ============================================================
  describe('GET /energy/floors/:floorId/stats', () => {
    it('should return 200 with energy stats for floor (no rooms)', async () => {
      mockPrisma.room.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get(`/energy/floors/${VALID_UUID}/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalKwh', 0);
    });

    it('should return 400 when floorId is not a UUID', async () => {
      await request(app.getHttpServer())
        .get('/energy/floors/not-a-uuid/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  // ============================================================
  // GET /energy/buildings/:buildingId/stats
  // ============================================================
  describe('GET /energy/buildings/:buildingId/stats', () => {
    it('should return 200 with energy stats for building (no floors)', async () => {
      mockPrisma.floor.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get(`/energy/buildings/${VALID_UUID}/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalKwh', 0);
    });

    it('should return 200 with energy stats for building (with data)', async () => {
      mockPrisma.floor.findMany.mockResolvedValue([{ id: 'floor-1' }]);
      mockPrisma.room.findMany.mockResolvedValue([{ id: 'room-1' }]);
      mockPrisma.device.findMany.mockResolvedValue([{ id: 'device-1' }]);
      mockPrisma.energyReading.aggregate.mockResolvedValue(mockAggregation);

      const response = await request(app.getHttpServer())
        .get(`/energy/buildings/${VALID_UUID}/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalKwh');
    });

    it('should return 401 when no auth token', async () => {
      await request(app.getHttpServer()).get(`/energy/buildings/${VALID_UUID}/stats`).expect(401);
    });
  });

  // ============================================================
  // DELETE /energy/readings/cleanup
  // ============================================================
  describe('DELETE /energy/readings/cleanup', () => {
    it('should return 200 with cleanup result', async () => {
      mockPrisma.energyReading.deleteMany.mockResolvedValue({ count: 50 });

      const response = await request(app.getHttpServer())
        .delete('/energy/readings/cleanup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ daysToKeep: 30 })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Old readings cleaned up successfully');
      expect(response.body).toHaveProperty('deletedCount', 50);
    });

    it('should use default 90 days when daysToKeep not provided', async () => {
      mockPrisma.energyReading.deleteMany.mockResolvedValue({ count: 100 });

      const response = await request(app.getHttpServer())
        .delete('/energy/readings/cleanup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      expect(response.body).toHaveProperty('deletedCount', 100);
    });

    it('should return 401 when no auth token', async () => {
      await request(app.getHttpServer())
        .delete('/energy/readings/cleanup')
        .send({ daysToKeep: 30 })
        .expect(401);
    });
  });
});
