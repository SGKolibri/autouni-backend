import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { RoomsController } from '../src/modules/rooms/controller/rooms.controller';
import { RoomsService } from '../src/modules/rooms/service/rooms.service';
import { RoomsRepository } from '../src/modules/rooms/repository/rooms.repository';
import { PrismaService } from '../prisma/prisma.service';
import { TEST_JWT_SECRET, generateTestToken } from './helpers/test-auth.helper';

describe('Rooms Module (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let authToken: string;
  let mockPrisma: any;

  const mockRoom = {
    id: 'room-uuid-1',
    floorId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Sala A101',
    type: 'CLASSROOM',
    createdAt: new Date('2025-01-01').toISOString(),
    updatedAt: new Date('2025-01-01').toISOString(),
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;

    mockPrisma = {
      room: {
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
      controllers: [RoomsController],
      providers: [
        RoomsService,
        RoomsRepository,
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
  // POST /rooms
  // ============================================================
  describe('POST /rooms', () => {
    it('should return 201 on valid create', async () => {
      mockPrisma.room.create.mockResolvedValue(mockRoom);

      const response = await request(app.getHttpServer())
        .post('/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          floorId: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Sala A101',
          type: 'CLASSROOM',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id', mockRoom.id);
      expect(response.body).toHaveProperty('name', 'Sala A101');
    });

    it('should return 400 when floorId is not a UUID', async () => {
      await request(app.getHttpServer())
        .post('/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ floorId: 'not-a-uuid', name: 'Sala A101', type: 'CLASSROOM' })
        .expect(400);
    });

    it('should return 400 when name is too short', async () => {
      await request(app.getHttpServer())
        .post('/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ floorId: '550e8400-e29b-41d4-a716-446655440000', name: 'AB', type: 'CLASSROOM' })
        .expect(400);
    });

    it('should return 400 when type is invalid enum', async () => {
      await request(app.getHttpServer())
        .post('/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ floorId: '550e8400-e29b-41d4-a716-446655440000', name: 'Sala A101', type: 'INVALID_TYPE' })
        .expect(400);
    });

    it('should return 401 when no auth token', async () => {
      await request(app.getHttpServer())
        .post('/rooms')
        .send({ floorId: '550e8400-e29b-41d4-a716-446655440000', name: 'Sala A101', type: 'CLASSROOM' })
        .expect(401);
    });
  });

  // ============================================================
  // GET /rooms
  // ============================================================
  describe('GET /rooms', () => {
    it('should return 200 with list of rooms', async () => {
      mockPrisma.room.findMany.mockResolvedValue([mockRoom]);

      const response = await request(app.getHttpServer())
        .get('/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
    });

    it('should return 401 when no auth token', async () => {
      await request(app.getHttpServer()).get('/rooms').expect(401);
    });
  });

  // ============================================================
  // GET /rooms/floor/:floorId
  // ============================================================
  describe('GET /rooms/floor/:floorId', () => {
    it('should return 200 with rooms for a floor', async () => {
      mockPrisma.room.findMany.mockResolvedValue([mockRoom]);

      const response = await request(app.getHttpServer())
        .get(`/rooms/floor/${mockRoom.floorId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
    });
  });

  // ============================================================
  // GET /rooms/type/:type
  // ============================================================
  describe('GET /rooms/type/:type', () => {
    it('should return 200 with rooms of given type', async () => {
      mockPrisma.room.findMany.mockResolvedValue([mockRoom]);

      const response = await request(app.getHttpServer())
        .get('/rooms/type/CLASSROOM')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // ============================================================
  // GET /rooms/:id
  // ============================================================
  describe('GET /rooms/:id', () => {
    it('should return 200 with room when found', async () => {
      mockPrisma.room.findUnique.mockResolvedValue(mockRoom);

      const response = await request(app.getHttpServer())
        .get(`/rooms/${mockRoom.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', mockRoom.id);
    });

    it('should return 404 when room not found', async () => {
      mockPrisma.room.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/rooms/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  // ============================================================
  // GET /rooms/:id/details
  // ============================================================
  describe('GET /rooms/:id/details', () => {
    it('should return 200 with room and devices when found', async () => {
      mockPrisma.room.findUnique.mockResolvedValue({ ...mockRoom, devices: [] });

      const response = await request(app.getHttpServer())
        .get(`/rooms/${mockRoom.id}/details`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('devices');
    });

    it('should return 404 when room not found', async () => {
      mockPrisma.room.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/rooms/non-existent/details')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  // ============================================================
  // PUT /rooms/:id
  // ============================================================
  describe('PUT /rooms/:id', () => {
    it('should return 200 with updated room', async () => {
      const updated = { ...mockRoom, name: 'Sala B101' };
      mockPrisma.room.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.room.update.mockResolvedValue(updated);

      const response = await request(app.getHttpServer())
        .put(`/rooms/${mockRoom.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Sala B101' })
        .expect(200);

      expect(response.body).toHaveProperty('name', 'Sala B101');
    });

    it('should return 404 when room not found', async () => {
      mockPrisma.room.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .put('/rooms/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Sala B101' })
        .expect(404);
    });

    it('should return 401 when no auth token', async () => {
      await request(app.getHttpServer())
        .put(`/rooms/${mockRoom.id}`)
        .send({ name: 'Sala B101' })
        .expect(401);
    });
  });

  // ============================================================
  // DELETE /rooms/:id
  // ============================================================
  describe('DELETE /rooms/:id', () => {
    it('should return 200 when room deleted', async () => {
      mockPrisma.room.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.room.delete.mockResolvedValue(mockRoom);

      const response = await request(app.getHttpServer())
        .delete(`/rooms/${mockRoom.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', mockRoom.id);
    });

    it('should return 404 when room not found', async () => {
      mockPrisma.room.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .delete('/rooms/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 401 when no auth token', async () => {
      await request(app.getHttpServer()).delete(`/rooms/${mockRoom.id}`).expect(401);
    });
  });
});
