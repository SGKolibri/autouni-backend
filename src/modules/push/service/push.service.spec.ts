import { Test, TestingModule } from '@nestjs/testing';
import { PushPlatform } from '@prisma/client';
import { PushService } from './push.service';
import { PushRepository } from '../repository/push.repository';
import { PUSH_SENDER, PushSender } from '../interfaces/push.interface';

describe('PushService', () => {
  let service: PushService;
  let repository: jest.Mocked<PushRepository>;
  let sender: jest.Mocked<PushSender> & { enabled: boolean };

  const notification = {
    id: 'notification-1',
    userId: 'user-1',
    type: 'WARNING' as const,
    title: 'Consumo alto',
    message: 'Bloco A acima do normal',
    link: '/devices/device-1',
  };

  beforeEach(async () => {
    sender = { enabled: true, send: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushService,
        {
          provide: PushRepository,
          useValue: {
            upsert: jest.fn(),
            deleteForUser: jest.fn(),
            findTokensByUser: jest.fn(),
            deleteTokens: jest.fn(),
          },
        },
        { provide: PUSH_SENDER, useValue: sender },
      ],
    }).compile();

    service = module.get(PushService);
    repository = module.get(PushRepository);
  });

  afterEach(() => jest.clearAllMocks());

  describe('register', () => {
    it('registra o token para o usuário autenticado', async () => {
      const saved = {
        id: 'token-1',
        userId: 'user-1',
        token: 'fcm-token',
        platform: PushPlatform.ANDROID,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      repository.upsert.mockResolvedValue(saved);

      const result = await service.register('user-1', {
        token: 'fcm-token',
        platform: PushPlatform.ANDROID,
      });

      expect(repository.upsert).toHaveBeenCalledWith(
        'user-1',
        'fcm-token',
        PushPlatform.ANDROID,
      );
      expect(result).toEqual({
        id: 'token-1',
        token: 'fcm-token',
        platform: PushPlatform.ANDROID,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
      });
    });
  });

  describe('unregister', () => {
    it('remove só o token do próprio usuário', async () => {
      repository.deleteForUser.mockResolvedValue(1);

      await service.unregister('user-1', 'fcm-token');

      expect(repository.deleteForUser).toHaveBeenCalledWith(
        'user-1',
        'fcm-token',
      );
    });

    it('é idempotente: token desconhecido não é erro', async () => {
      repository.deleteForUser.mockResolvedValue(0);

      await expect(
        service.unregister('user-1', 'desconhecido'),
      ).resolves.toBeUndefined();
    });
  });

  describe('sendNotification', () => {
    it('envia título, mensagem e dados do deep link para os aparelhos do usuário', async () => {
      repository.findTokensByUser.mockResolvedValue(['t1', 't2']);
      sender.send.mockResolvedValue({
        successCount: 2,
        failureCount: 0,
        invalidTokens: [],
      });

      const result = await service.sendNotification(notification);

      expect(repository.findTokensByUser).toHaveBeenCalledWith('user-1');
      expect(sender.send).toHaveBeenCalledWith(['t1', 't2'], {
        title: 'Consumo alto',
        body: 'Bloco A acima do normal',
        data: {
          notificationId: 'notification-1',
          type: 'WARNING',
          link: '/devices/device-1',
        },
      });
      expect(result).toEqual({ sent: 2, failed: 0, removed: 0 });
      expect(repository.deleteTokens).not.toHaveBeenCalled();
    });

    it('omite o link quando a notificação não tem', async () => {
      repository.findTokensByUser.mockResolvedValue(['t1']);
      sender.send.mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        invalidTokens: [],
      });

      await service.sendNotification({ ...notification, link: null });

      expect(sender.send.mock.calls[0][1].data).toEqual({
        notificationId: 'notification-1',
        type: 'WARNING',
      });
    });

    it('apaga tokens que o FCM declarou inválidos', async () => {
      repository.findTokensByUser.mockResolvedValue(['ok', 'velho']);
      sender.send.mockResolvedValue({
        successCount: 1,
        failureCount: 1,
        invalidTokens: ['velho'],
      });
      repository.deleteTokens.mockResolvedValue(1);

      const result = await service.sendNotification(notification);

      expect(repository.deleteTokens).toHaveBeenCalledWith(['velho']);
      expect(result).toEqual({ sent: 1, failed: 1, removed: 1 });
    });

    it('não chama o FCM quando o usuário não tem aparelhos', async () => {
      repository.findTokensByUser.mockResolvedValue([]);

      const result = await service.sendNotification(notification);

      expect(sender.send).not.toHaveBeenCalled();
      expect(result).toEqual({ sent: 0, failed: 0, removed: 0 });
    });

    it('não faz nada com o push desligado (sem credenciais do Firebase)', async () => {
      sender.enabled = false;

      const result = await service.sendNotification(notification);

      expect(repository.findTokensByUser).not.toHaveBeenCalled();
      expect(sender.send).not.toHaveBeenCalled();
      expect(result).toEqual({ sent: 0, failed: 0, removed: 0 });
    });

    it('falha do FCM não propaga (a notificação já foi gravada)', async () => {
      repository.findTokensByUser.mockResolvedValue(['t1']);
      sender.send.mockRejectedValue(new Error('FCM fora do ar'));

      const result = await service.sendNotification(notification);

      expect(result).toEqual({ sent: 0, failed: 1, removed: 0 });
    });
  });
});
