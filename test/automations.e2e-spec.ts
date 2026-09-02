import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { AutomationsController } from '../src/modules/automations/controller/automations.controller';
import { AutomationsService } from '../src/modules/automations/service/automations.service';
import { AutomationsRepository } from '../src/modules/automations/repository/automations.repository';
import { MqttService } from '../src/modules/mqtt/service/mqtt.service';
import { PrismaService } from '../prisma/prisma.service';
import { TEST_JWT_SECRET, generateTestToken } from './helpers/test-auth.helper';

describe('Automations Module (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let authToken: string;
  let mockPrisma: any;
  let mockMqttService: any;

  const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

  const mockAutomation = {
    id: VALID_UUID,
    name: 'Turn off lights at night',
    description: 'Turns off lights at 22h',
    creatorId: '6ba7b810-9dad-41d1-80b4-00c04fd430c8',
    triggerType: 'SCHEDULE',
    cron: '0 22 * * *',
    condition: null,
    action: JSON.stringify({ topic: 'devices/lights/command', payload: { state: 'OFF' } }),
    enabled: true,
    lastRunAt: null,
    createdAt: new Date('2025-01-01').toISOString(),
    updatedAt: new Date('2025-01-01').toISOString(),
  };

  const validCreateDto = {
    name: 'Turn off lights at night',
    triggerType: 'SCHEDULE',
    cron: '0 22 * * *',
    action: { topic: 'devices/lights/command', payload: { state: 'OFF' } },
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;

    mockPrisma = {
      automation: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      automationHistory: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      $connect: jest.fn(),
      $disconnect: jest.fn(),
    };

    mockMqttService = {
      publish: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      isConnected: jest.fn().mockReturnValue(false),
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          global: true,
          secret: TEST_JWT_SECRET,
          signOptions: { expiresIn: '15m' },
        }),
        ScheduleModule.forRoot(),
      ],
      controllers: [AutomationsController],
      providers: [
        AutomationsService,
        AutomationsRepository,
        { provide: MqttService, useValue: mockMqttService },
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
  // POST /automations
  // ============================================================
  describe('POST /automations', () => {
    it('should return 201 on valid create with SCHEDULE trigger', async () => {
      mockPrisma.automation.create.mockResolvedValue(mockAutomation);

      const response = await request(app.getHttpServer())
        .post('/automations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validCreateDto)
        .expect(201);

      expect(response.body).toHaveProperty('id', VALID_UUID);
      expect(response.body).toHaveProperty('name', 'Turn off lights at night');
    });

    it('should return 201 on valid create with MANUAL trigger', async () => {
      const manualAutomation = { ...mockAutomation, triggerType: 'MANUAL', cron: null };
      mockPrisma.automation.create.mockResolvedValue(manualAutomation);

      const response = await request(app.getHttpServer())
        .post('/automations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Manual Automation', triggerType: 'MANUAL', action: { topic: 'test' } })
        .expect(201);

      expect(response.body).toHaveProperty('triggerType', 'MANUAL');
    });

    it('should return 400 when name is missing', async () => {
      await request(app.getHttpServer())
        .post('/automations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ triggerType: 'MANUAL', action: {} })
        .expect(400);
    });

    it('should return 400 when triggerType is invalid', async () => {
      await request(app.getHttpServer())
        .post('/automations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test', triggerType: 'INVALID', action: {} })
        .expect(400);
    });

    it('should return 400 when SCHEDULE type has no cron', async () => {
      await request(app.getHttpServer())
        .post('/automations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test', triggerType: 'SCHEDULE', action: {} })
        .expect(400);
    });

    it('should return 400 when cron expression is invalid', async () => {
      await request(app.getHttpServer())
        .post('/automations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test', triggerType: 'SCHEDULE', cron: 'invalid-cron', action: {} })
        .expect(400);
    });

    it('should return 401 when no auth token', async () => {
      await request(app.getHttpServer()).post('/automations').send(validCreateDto).expect(401);
    });
  });

  // ============================================================
  // GET /automations
  // ============================================================
  describe('GET /automations', () => {
    it('should return 200 with list of automations', async () => {
      mockPrisma.automation.findMany.mockResolvedValue([mockAutomation]);

      const response = await request(app.getHttpServer())
        .get('/automations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
    });

    it('should return 401 when no auth token', async () => {
      await request(app.getHttpServer()).get('/automations').expect(401);
    });
  });

  // ============================================================
  // GET /automations/stats
  // ============================================================
  describe('GET /automations/stats', () => {
    it('should return 200 with automation statistics', async () => {
      mockPrisma.automation.findMany.mockResolvedValue([mockAutomation]);

      const response = await request(app.getHttpServer())
        .get('/automations/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('enabled');
      expect(response.body).toHaveProperty('disabled');
      expect(response.body).toHaveProperty('byTriggerType');
    });
  });

  // ============================================================
  // GET /automations/enabled
  // ============================================================
  describe('GET /automations/enabled', () => {
    it('should return 200 with enabled automations', async () => {
      mockPrisma.automation.findMany.mockResolvedValue([mockAutomation]);

      const response = await request(app.getHttpServer())
        .get('/automations/enabled')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // ============================================================
  // GET /automations/creator/:creatorId
  // ============================================================
  describe('GET /automations/creator/:creatorId', () => {
    it('should return 200 with automations by creator', async () => {
      mockPrisma.automation.findMany.mockResolvedValue([mockAutomation]);

      const response = await request(app.getHttpServer())
        .get(`/automations/creator/${VALID_UUID}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 400 when creatorId is not a UUID', async () => {
      await request(app.getHttpServer())
        .get('/automations/creator/not-a-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  // ============================================================
  // GET /automations/:id
  // ============================================================
  describe('GET /automations/:id', () => {
    it('should return 200 with automation when found', async () => {
      mockPrisma.automation.findUnique.mockResolvedValue(mockAutomation);

      const response = await request(app.getHttpServer())
        .get(`/automations/${VALID_UUID}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', VALID_UUID);
    });

    it('should return 404 when automation not found', async () => {
      mockPrisma.automation.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get(`/automations/${VALID_UUID}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  // ============================================================
  // GET /automations/:id/history
  // ============================================================
  describe('GET /automations/:id/history', () => {
    it('should return 200 with automation history', async () => {
      mockPrisma.automation.findUnique.mockResolvedValue(mockAutomation);
      mockPrisma.automationHistory.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get(`/automations/${VALID_UUID}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 404 when automation not found', async () => {
      mockPrisma.automation.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get(`/automations/${VALID_UUID}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  // ============================================================
  // PUT /automations/:id
  // ============================================================
  describe('PUT /automations/:id', () => {
    it('should return 200 with updated automation', async () => {
      const updated = { ...mockAutomation, name: 'Updated Name' };
      mockPrisma.automation.findUnique
        .mockResolvedValueOnce(mockAutomation)
        .mockResolvedValueOnce(mockAutomation);
      mockPrisma.automation.update.mockResolvedValue(updated);

      const response = await request(app.getHttpServer())
        .put(`/automations/${VALID_UUID}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body).toHaveProperty('name', 'Updated Name');
    });

    it('should return 404 when automation not found', async () => {
      mockPrisma.automation.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .put(`/automations/${VALID_UUID}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test' })
        .expect(404);
    });
  });

  // ============================================================
  // PATCH /automations/:id/toggle
  // ============================================================
  describe('PATCH /automations/:id/toggle', () => {
    it('should return 200 when automation toggled', async () => {
      const disabled = { ...mockAutomation, enabled: false };
      mockPrisma.automation.findUnique.mockResolvedValue(mockAutomation);
      mockPrisma.automation.update.mockResolvedValue(disabled);

      const response = await request(app.getHttpServer())
        .patch(`/automations/${VALID_UUID}/toggle`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ enabled: false })
        .expect(200);

      expect(response.body).toHaveProperty('enabled', false);
    });

    it('should return 400 when enabled is missing', async () => {
      await request(app.getHttpServer())
        .patch(`/automations/${VALID_UUID}/toggle`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);
    });
  });

  // ============================================================
  // POST /automations/:id/execute
  // ============================================================
  describe('POST /automations/:id/execute', () => {
    it('should return 200 when automation executed manually', async () => {
      mockPrisma.automation.findUnique.mockResolvedValue(mockAutomation);
      mockPrisma.automation.update.mockResolvedValue(mockAutomation);
      mockPrisma.automationHistory.create.mockResolvedValue({});

      const response = await request(app.getHttpServer())
        .post(`/automations/${VALID_UUID}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Automation executed successfully');
    });

    it('should return 400 when automation is disabled', async () => {
      mockPrisma.automation.findUnique.mockResolvedValue({ ...mockAutomation, enabled: false });

      await request(app.getHttpServer())
        .post(`/automations/${VALID_UUID}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should return 404 when automation not found', async () => {
      mockPrisma.automation.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post(`/automations/${VALID_UUID}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  // ============================================================
  // DELETE /automations/:id
  // ============================================================
  describe('DELETE /automations/:id', () => {
    it('should return 204 when automation deleted', async () => {
      mockPrisma.automation.findUnique
        .mockResolvedValueOnce(mockAutomation)
        .mockResolvedValueOnce(mockAutomation);
      mockPrisma.automation.delete.mockResolvedValue(mockAutomation);

      await request(app.getHttpServer())
        .delete(`/automations/${VALID_UUID}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });

    it('should return 404 when automation not found', async () => {
      mockPrisma.automation.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .delete(`/automations/${VALID_UUID}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 401 when no auth token', async () => {
      await request(app.getHttpServer()).delete(`/automations/${VALID_UUID}`).expect(401);
    });
  });
});
