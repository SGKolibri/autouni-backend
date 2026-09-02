import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { NotificationsController } from '../src/modules/notifications/controller/notifications.controller';
import { NotificationsService } from '../src/modules/notifications/service/notifications.service';
import { NotificationsRepository } from '../src/modules/notifications/repository/notifications.repository';
import { PrismaService } from '../prisma/prisma.service';
import { TEST_JWT_SECRET, generateTestToken } from './helpers/test-auth.helper';

describe('Notifications Module (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let authToken: string;
  let mockPrisma: any;

  const VALID_USER_UUID = '550e8400-e29b-41d4-a716-446655440000';

  const mockNotification = {
    id: 'notification-uuid-1',
    userId: VALID_USER_UUID,
    type: 'INFO',
    title: 'Dispositivo desconectado',
    message: 'O dispositivo foi desconectado',
    read: false,
    link: null,
    createdAt: new Date('2025-01-01').toISOString(),
    updatedAt: new Date('2025-01-01').toISOString(),
  };

  const validCreateDto = {
    userId: VALID_USER_UUID,
    type: 'INFO',
    title: 'Dispositivo desconectado',
    message: 'O dispositivo foi desconectado',
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;

    mockPrisma = {
      notification: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
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
        EventEmitterModule.forRoot(),
      ],
      controllers: [NotificationsController],
      providers: [
        NotificationsService,
        NotificationsRepository,
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
  // POST /notifications
  // ============================================================
  describe('POST /notifications', () => {
    it('should return 201 on valid create', async () => {
      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      const response = await request(app.getHttpServer())
        .post('/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validCreateDto)
        .expect(201);

      expect(response.body).toHaveProperty('id', mockNotification.id);
      expect(response.body).toHaveProperty('type', 'INFO');
    });

    it('should return 400 when userId is not a UUID', async () => {
      await request(app.getHttpServer())
        .post('/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...validCreateDto, userId: 'not-a-uuid' })
        .expect(400);
    });

    it('should return 400 when type is invalid enum', async () => {
      await request(app.getHttpServer())
        .post('/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...validCreateDto, type: 'INVALID_TYPE' })
        .expect(400);
    });

    it('should return 400 when title is too short', async () => {
      await request(app.getHttpServer())
        .post('/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...validCreateDto, title: 'AB' })
        .expect(400);
    });

    it('should return 400 when message is too short', async () => {
      await request(app.getHttpServer())
        .post('/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...validCreateDto, message: 'Hi' })
        .expect(400);
    });

    it('should return 401 when no auth token', async () => {
      await request(app.getHttpServer()).post('/notifications').send(validCreateDto).expect(401);
    });
  });

  // ============================================================
  // GET /notifications
  // ============================================================
  describe('GET /notifications', () => {
    it('should return 200 with list of notifications', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([mockNotification]);

      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
    });

    it('should return 401 when no auth token', async () => {
      await request(app.getHttpServer()).get('/notifications').expect(401);
    });
  });

  // ============================================================
  // GET /notifications/me
  // ============================================================
  describe('GET /notifications/me', () => {
    it('should return 200 with authenticated user notifications', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([mockNotification]);

      const response = await request(app.getHttpServer())
        .get('/notifications/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // ============================================================
  // GET /notifications/me/unread
  // ============================================================
  describe('GET /notifications/me/unread', () => {
    it('should return 200 with unread notifications', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([mockNotification]);

      const response = await request(app.getHttpServer())
        .get('/notifications/me/unread')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // ============================================================
  // GET /notifications/user/:userId
  // ============================================================
  describe('GET /notifications/user/:userId', () => {
    it('should return 200 with notifications for user', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([mockNotification]);

      const response = await request(app.getHttpServer())
        .get(`/notifications/user/${VALID_USER_UUID}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // ============================================================
  // GET /notifications/:id
  // ============================================================
  describe('GET /notifications/:id', () => {
    it('should return 200 with notification when found', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(mockNotification);

      const response = await request(app.getHttpServer())
        .get(`/notifications/${mockNotification.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', mockNotification.id);
    });

    it('should return 404 when notification not found', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/notifications/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  // ============================================================
  // PATCH /notifications/:id/read
  // ============================================================
  describe('PATCH /notifications/:id/read', () => {
    it('should return 200 when notification marked as read', async () => {
      const updated = { ...mockNotification, read: true };
      mockPrisma.notification.findUnique.mockResolvedValue(mockNotification);
      mockPrisma.notification.update.mockResolvedValue(updated);

      const response = await request(app.getHttpServer())
        .patch(`/notifications/${mockNotification.id}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('read', true);
    });

    it('should return 404 when notification not found', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .patch('/notifications/non-existent/read')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  // ============================================================
  // PATCH /notifications/me/read-all
  // ============================================================
  describe('PATCH /notifications/me/read-all', () => {
    it('should return 200 with count of marked notifications', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });

      const response = await request(app.getHttpServer())
        .patch('/notifications/me/read-all')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('count');
    });
  });

  // ============================================================
  // DELETE /notifications/:id
  // ============================================================
  describe('DELETE /notifications/:id', () => {
    it('should return 200 when notification deleted', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(mockNotification);
      mockPrisma.notification.delete.mockResolvedValue(mockNotification);

      const response = await request(app.getHttpServer())
        .delete(`/notifications/${mockNotification.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', mockNotification.id);
    });

    it('should return 404 when notification not found', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .delete('/notifications/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 401 when no auth token', async () => {
      await request(app.getHttpServer()).delete(`/notifications/${mockNotification.id}`).expect(401);
    });
  });
});
