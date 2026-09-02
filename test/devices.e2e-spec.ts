import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { DevicesController } from '../src/modules/devices/controller/devices.controller';
import { DevicesService } from '../src/modules/devices/service/devices.service';
import { DevicesRepository } from '../src/modules/devices/repository/devices.repository';
import { PrismaService } from '../prisma/prisma.service';
import { TEST_JWT_SECRET, generateTestToken } from './helpers/test-auth.helper';

describe('Devices Module (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let authToken: string;
  let mockPrisma: any;

  const VALID_ROOM_UUID = '550e8400-e29b-41d4-a716-446655440000';

  const mockDevice = {
    id: 'device-uuid-1',
    roomId: VALID_ROOM_UUID,
    room: 'H201',
    name: 'Luz Principal',
    type: 'LIGHT',
    status: 'OFF',
    mqttTopic: 'devices/light-101',
    online: false,
    lastSeen: null,
    powerRating: 60,
    intensity: null,
    temperature: null,
    createdAt: new Date('2025-01-01').toISOString(),
    updatedAt: new Date('2025-01-01').toISOString(),
  };

  const validCreateDto = {
    room: 'H201',
    roomId: VALID_ROOM_UUID,
    name: 'Luz Principal',
    type: 'LIGHT',
    status: 'OFF',
    mqttTopic: 'devices/light-101',
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;

    mockPrisma = {
      device: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
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
      controllers: [DevicesController],
      providers: [
        DevicesService,
        DevicesRepository,
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
  // POST /devices
  // ============================================================
  describe('POST /devices', () => {
    it('should return 201 on valid create', async () => {
      mockPrisma.device.create.mockResolvedValue(mockDevice);

      const response = await request(app.getHttpServer())
        .post('/devices')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validCreateDto)
        .expect(201);

      expect(response.body).toHaveProperty('id', mockDevice.id);
    });

    it('should return 400 when name is missing', async () => {
      const { name, ...dto } = validCreateDto;
      await request(app.getHttpServer())
        .post('/devices')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto)
        .expect(400);
    });

    it('should return 400 when type is invalid enum', async () => {
      await request(app.getHttpServer())
        .post('/devices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...validCreateDto, type: 'INVALID_TYPE' })
        .expect(400);
    });

    it('should return 400 when status is invalid enum', async () => {
      await request(app.getHttpServer())
        .post('/devices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...validCreateDto, status: 'INVALID_STATUS' })
        .expect(400);
    });

    it('should return 400 when roomId is not a UUID', async () => {
      await request(app.getHttpServer())
        .post('/devices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...validCreateDto, roomId: 'not-a-uuid' })
        .expect(400);
    });

    it('should return 400 when mqttTopic has invalid characters', async () => {
      await request(app.getHttpServer())
        .post('/devices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...validCreateDto, mqttTopic: 'invalid topic with spaces' })
        .expect(400);
    });

    it('should return 401 when no auth token', async () => {
      await request(app.getHttpServer()).post('/devices').send(validCreateDto).expect(401);
    });
  });

  // ============================================================
  // GET /devices
  // ============================================================
  describe('GET /devices', () => {
    it('should return 200 with list of devices', async () => {
      mockPrisma.device.findMany.mockResolvedValue([mockDevice]);

      const response = await request(app.getHttpServer())
        .get('/devices')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
    });

    it('should return 401 when no auth token', async () => {
      await request(app.getHttpServer()).get('/devices').expect(401);
    });
  });

  // ============================================================
  // GET /devices/stats
  // ============================================================
  describe('GET /devices/stats', () => {
    it('should return 200 with device statistics', async () => {
      mockPrisma.device.findMany.mockResolvedValue([mockDevice]);

      const response = await request(app.getHttpServer())
        .get('/devices/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('online');
      expect(response.body).toHaveProperty('offline');
      expect(response.body).toHaveProperty('byStatus');
      expect(response.body).toHaveProperty('byType');
    });
  });

  // ============================================================
  // GET /devices/room/:roomId
  // ============================================================
  describe('GET /devices/room/:roomId', () => {
    it('should return 200 with devices for a room', async () => {
      mockPrisma.device.findMany.mockResolvedValue([mockDevice]);

      const response = await request(app.getHttpServer())
        .get(`/devices/room/${VALID_ROOM_UUID}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // ============================================================
  // GET /devices/status/:status
  // ============================================================
  describe('GET /devices/status/:status', () => {
    it('should return 200 with devices by status', async () => {
      mockPrisma.device.findMany.mockResolvedValue([mockDevice]);

      const response = await request(app.getHttpServer())
        .get('/devices/status/OFF')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // ============================================================
  // GET /devices/:id
  // ============================================================
  describe('GET /devices/:id', () => {
    it('should return 200 with device when found', async () => {
      mockPrisma.device.findUnique.mockResolvedValue(mockDevice);

      const response = await request(app.getHttpServer())
        .get(`/devices/${mockDevice.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', mockDevice.id);
    });

    it('should return 404 when device not found', async () => {
      mockPrisma.device.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/devices/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  // ============================================================
  // PUT /devices/:id
  // ============================================================
  describe('PUT /devices/:id', () => {
    it('should return 200 with updated device', async () => {
      const updated = { ...mockDevice, name: 'Luz Secundária' };
      mockPrisma.device.findUnique
        .mockResolvedValueOnce(mockDevice) // findById check in service
        .mockResolvedValueOnce(mockDevice); // findUnique check in repository
      mockPrisma.device.update.mockResolvedValue(updated);

      const response = await request(app.getHttpServer())
        .put(`/devices/${mockDevice.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Luz Secundária' })
        .expect(200);

      expect(response.body).toHaveProperty('name', 'Luz Secundária');
    });

    it('should return 404 when device not found', async () => {
      mockPrisma.device.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .put('/devices/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test' })
        .expect(404);
    });

    it('should return 401 when no auth token', async () => {
      await request(app.getHttpServer())
        .put(`/devices/${mockDevice.id}`)
        .send({ name: 'Test' })
        .expect(401);
    });
  });

  // ============================================================
  // PUT /devices/:id/status
  // ============================================================
  describe('PUT /devices/:id/status', () => {
    it('should return 200 with updated status', async () => {
      const updated = { ...mockDevice, status: 'ON' };
      mockPrisma.device.findUnique.mockResolvedValue(mockDevice);
      mockPrisma.device.update.mockResolvedValue(updated);

      const response = await request(app.getHttpServer())
        .put(`/devices/${mockDevice.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'ON' })
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ON');
    });

    it('should return 404 when device not found', async () => {
      mockPrisma.device.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .put('/devices/non-existent/status')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'ON' })
        .expect(404);
    });
  });

  // ============================================================
  // PUT /devices/:id/online
  // ============================================================
  describe('PUT /devices/:id/online', () => {
    it('should return 200 when online status updated', async () => {
      const updated = { ...mockDevice };
      mockPrisma.device.findUnique.mockResolvedValue(mockDevice);
      mockPrisma.device.update.mockResolvedValue(updated);

      await request(app.getHttpServer())
        .put(`/devices/${mockDevice.id}/online`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ online: true })
        .expect(200);
    });
  });

  // ============================================================
  // DELETE /devices/:id
  // ============================================================
  describe('DELETE /devices/:id', () => {
    it('should return 204 when device deleted', async () => {
      mockPrisma.device.findUnique
        .mockResolvedValueOnce(mockDevice)  // service findById check
        .mockResolvedValueOnce(mockDevice); // repository delete check
      mockPrisma.device.delete.mockResolvedValue(mockDevice);

      await request(app.getHttpServer())
        .delete(`/devices/${mockDevice.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });

    it('should return 404 when device not found', async () => {
      mockPrisma.device.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .delete('/devices/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 401 when no auth token', async () => {
      await request(app.getHttpServer()).delete(`/devices/${mockDevice.id}`).expect(401);
    });
  });
});
