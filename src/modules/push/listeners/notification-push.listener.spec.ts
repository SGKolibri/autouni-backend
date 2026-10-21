import { NotificationPushListener } from './notification-push.listener';
import { PushService } from '../service/push.service';

describe('NotificationPushListener', () => {
  it('dispara o push quando uma notificação é criada', async () => {
    const pushService = {
      sendNotification: jest
        .fn()
        .mockResolvedValue({ sent: 1, failed: 0, removed: 0 }),
    } as unknown as jest.Mocked<PushService>;
    const listener = new NotificationPushListener(pushService);
    const notification = {
      id: 'n1',
      userId: 'user-1',
      type: 'INFO',
      title: 'Automação executada',
      message: 'Luzes desligadas',
      read: false,
      link: null,
      createdAt: new Date(),
    };

    await listener.handleNotificationCreated({
      userId: 'user-1',
      notification: notification as any,
    });

    expect(pushService.sendNotification).toHaveBeenCalledWith(notification);
  });
});
