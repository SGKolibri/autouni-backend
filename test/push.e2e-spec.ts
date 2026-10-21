import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PushController } from '../src/modules/push/controller/push.controller';
import { PushService } from '../src/modules/push/service/push.service';
import { PushRepository } from '../src/modules/push/repository/push.repository';
import { NotificationPushListener } from '../src/modules/push/listeners/notification-push.listener';
import { PUSH_SENDER } from '../src/modules/push/interfaces/push.interface';
import { NotificationsController } from '../src/modules/notifications/controller/notifications.controller';
import { NotificationsService } from '../src/modules/notifications/service/notifications.service';
import { NotificationsRepository } from '../src/modules/notifications/repository/notifications.repository';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_TEST_PAYLOAD,
  TEST_JWT_SECRET,
  generateTestToken,
} from './helpers/test-auth.helper';

describe('Push Module (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let mockPrisma: any;
  let sender: { enabled: boolean; send: jest.Mock };

  const USER_ID = DEFAULT_TEST_PAYLOAD.sub;
  const RECIPIENT_UUID = '550e8400-e29b-41d4-a716-446655440000';

  const savedToken = {
    id: 'push-token-1',
    userId: USER_ID,
    token: 'fcm-token-abc',
    platform: 'ANDROID',
    createdAt: new Date('2026-10-21T12:00:00.000Z'),
    updatedAt: new Date('2026-10-21T12:00:00.000Z'),
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;

    mockPrisma = {
      pushToken: {
        upsert: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn(),
      },
      notification: {
        create: jest.fn(),
      },
      $connect: jest.fn(),
      $disconnect: jest.fn(),
    };
    sender = { enabled: true, send: jest.fn() };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          global: true,
          secret: TEST_JWT_SECRET,
          signOptions: { expiresIn: '15m' },
        }),
        EventEmitterModule.forRoot(),
      ],
      controllers: [PushController, NotificationsController],
      providers: [
        PushService,
        PushRepository,
        NotificationPushListener,
        NotificationsService,
        NotificationsRepository,
        { provide: PUSH_SENDER, useValue: sender },
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

    authToken = generateTestToken(moduleFixture.get(JwtService));
  });

  beforeEach(() => jest.clearAllMocks());

  afterAll(async () => {
    await app.close();
  });

  describe('POST /push/tokens', () => {
    it('registra o token para o usuário do JWT', async () => {
      mockPrisma.pushToken.upsert.mockResolvedValue(savedToken);

      const response = await request(app.getHttpServer())
        .post('/push/tokens')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ token: 'fcm-token-abc', platform: 'ANDROID' })
        .expect(200);

      expect(response.body).toEqual({
        id: 'push-token-1',
        token: 'fcm-token-abc',
        platform: 'ANDROID',
        createdAt: '2026-10-21T12:00:00.000Z',
        updatedAt: '2026-10-21T12:00:00.000Z',
      });
      expect(mockPrisma.pushToken.upsert).toHaveBeenCalledWith({
        where: { token: 'fcm-token-abc' },
        create: {
          userId: USER_ID,
          token: 'fcm-token-abc',
          platform: 'ANDROID',
        },
        update: { userId: USER_ID, platform: 'ANDROID' },
      });
    });

    it('400 para plataforma desconhecida', async () => {
      await request(app.getHttpServer())
        .post('/push/tokens')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ token: 'fcm-token-abc', platform: 'SYMBIAN' })
        .expect(400);
    });

    it('400 sem token', async () => {
      await request(app.getHttpServer())
        .post('/push/tokens')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ platform: 'IOS' })
        .expect(400);
    });

    it('400 com userId no corpo (o dono vem só do JWT)', async () => {
      await request(app.getHttpServer())
        .post('/push/tokens')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ token: 't', platform: 'IOS', userId: 'outro' })
        .expect(400);
    });

    it('401 sem autenticação', async () => {
      await request(app.getHttpServer())
        .post('/push/tokens')
        .send({ token: 'fcm-token-abc', platform: 'ANDROID' })
        .expect(401);
    });
  });

  describe('DELETE /push/tokens', () => {
    it('remove só o token do próprio usuário', async () => {
      mockPrisma.pushToken.deleteMany.mockResolvedValue({ count: 1 });

      await request(app.getHttpServer())
        .delete('/push/tokens')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ token: 'fcm-token-abc' })
        .expect(204);

      expect(mockPrisma.pushToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: USER_ID, token: 'fcm-token-abc' },
      });
    });

    it('é idempotente', async () => {
      mockPrisma.pushToken.deleteMany.mockResolvedValue({ count: 0 });

      await request(app.getHttpServer())
        .delete('/push/tokens')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ token: 'nao-existe' })
        .expect(204);
    });

    it('401 sem autenticação', async () => {
      await request(app.getHttpServer())
        .delete('/push/tokens')
        .send({ token: 'fcm-token-abc' })
        .expect(401);
    });
  });

  describe('notificação criada → push (FCM)', () => {
    async function waitFor(assertion: () => void) {
      for (let attempt = 0; attempt < 50; attempt++) {
        try {
          assertion();
          return;
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }
      assertion();
    }

    it('envia para os aparelhos do destinatário e apaga tokens inválidos', async () => {
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notification-1',
        userId: RECIPIENT_UUID,
        type: 'WARNING',
        title: 'Consumo alto',
        message: 'Bloco A acima do normal',
        read: false,
        link: '/devices/device-1',
        createdAt: new Date(),
      });
      mockPrisma.pushToken.findMany.mockResolvedValue([
        { token: 'aparelho-1' },
        { token: 'aparelho-velho' },
      ]);
      mockPrisma.pushToken.deleteMany.mockResolvedValue({ count: 1 });
      sender.send.mockResolvedValue({
        successCount: 1,
        failureCount: 1,
        invalidTokens: ['aparelho-velho'],
      });

      await request(app.getHttpServer())
        .post('/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: RECIPIENT_UUID,
          type: 'WARNING',
          title: 'Consumo alto',
          message: 'Bloco A acima do normal',
          link: '/devices/device-1',
        })
        .expect(201);

      await waitFor(() =>
        expect(mockPrisma.pushToken.deleteMany).toHaveBeenCalled(),
      );
      expect(mockPrisma.pushToken.findMany).toHaveBeenCalledWith({
        where: { userId: RECIPIENT_UUID },
        select: { token: true },
      });
      expect(sender.send).toHaveBeenCalledWith(
        ['aparelho-1', 'aparelho-velho'],
        {
          title: 'Consumo alto',
          body: 'Bloco A acima do normal',
          data: {
            notificationId: 'notification-1',
            type: 'WARNING',
            link: '/devices/device-1',
          },
        },
      );
      expect(mockPrisma.pushToken.deleteMany).toHaveBeenCalledWith({
        where: { token: { in: ['aparelho-velho'] } },
      });
    });

    it('falha do FCM não afeta a criação da notificação', async () => {
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notification-2',
        userId: RECIPIENT_UUID,
        type: 'INFO',
        title: 'Teste',
        message: 'Mensagem de teste',
        read: false,
        link: null,
        createdAt: new Date(),
      });
      mockPrisma.pushToken.findMany.mockResolvedValue([
        { token: 'aparelho-1' },
      ]);
      sender.send.mockRejectedValue(new Error('FCM fora do ar'));

      await request(app.getHttpServer())
        .post('/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: RECIPIENT_UUID,
          type: 'INFO',
          title: 'Teste',
          message: 'Mensagem de teste',
        })
        .expect(201);

      await waitFor(() => expect(sender.send).toHaveBeenCalled());
    });
  });
});
