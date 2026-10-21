import {
  FirebasePushSender,
  DisabledPushSender,
  parseFirebaseCredentials,
  FcmMessaging,
} from './firebase-push.sender';

describe('FirebasePushSender', () => {
  const message = {
    title: 'Consumo alto',
    body: 'Bloco A acima do normal',
    data: { notificationId: 'n1', type: 'WARNING' },
  };

  function messagingReturning(
    responses: Array<{ success: boolean; code?: string }>,
  ): jest.Mocked<FcmMessaging> {
    return {
      sendEachForMulticast: jest.fn().mockResolvedValue({
        successCount: responses.filter((r) => r.success).length,
        failureCount: responses.filter((r) => !r.success).length,
        responses: responses.map((r) => ({
          success: r.success,
          error: r.code ? { code: r.code } : undefined,
        })),
      }),
    };
  }

  it('está habilitado', () => {
    expect(new FirebasePushSender(messagingReturning([])).enabled).toBe(true);
  });

  it('monta a mensagem multicast com notificação, dados e prioridade alta', async () => {
    const messaging = messagingReturning([{ success: true }]);
    const sender = new FirebasePushSender(messaging);

    await sender.send(['t1'], message);

    expect(messaging.sendEachForMulticast).toHaveBeenCalledWith({
      tokens: ['t1'],
      notification: { title: 'Consumo alto', body: 'Bloco A acima do normal' },
      data: { notificationId: 'n1', type: 'WARNING' },
      android: {
        priority: 'high',
        notification: { channelId: FirebasePushSender.androidChannelId },
      },
      apns: { payload: { aps: { sound: 'default' } } },
    });
  });

  it('separa tokens inválidos de falhas temporárias', async () => {
    const messaging = messagingReturning([
      { success: true },
      { success: false, code: 'messaging/registration-token-not-registered' },
      { success: false, code: 'messaging/invalid-registration-token' },
      { success: false, code: 'messaging/internal-error' },
    ]);
    const sender = new FirebasePushSender(messaging);

    const result = await sender.send(['ok', 'velho', 'lixo', 'temp'], message);

    expect(result).toEqual({
      successCount: 1,
      failureCount: 3,
      invalidTokens: ['velho', 'lixo'],
    });
  });

  it('divide em lotes de 500 tokens (limite do FCM)', async () => {
    const messaging: jest.Mocked<FcmMessaging> = {
      sendEachForMulticast: jest
        .fn()
        .mockImplementation(async ({ tokens }) => ({
          successCount: tokens.length,
          failureCount: 0,
          responses: tokens.map(() => ({ success: true })),
        })),
    };
    const sender = new FirebasePushSender(messaging);
    const tokens = Array.from({ length: 1201 }, (_, i) => `t${i}`);

    const result = await sender.send(tokens, message);

    const batches = messaging.sendEachForMulticast.mock.calls.map(
      ([multicast]) => multicast.tokens.length,
    );
    expect(batches).toEqual([500, 500, 201]);
    expect(result.successCount).toBe(1201);
  });

  it('sem tokens, não chama o FCM', async () => {
    const messaging = messagingReturning([]);

    const result = await new FirebasePushSender(messaging).send([], message);

    expect(messaging.sendEachForMulticast).not.toHaveBeenCalled();
    expect(result).toEqual({
      successCount: 0,
      failureCount: 0,
      invalidTokens: [],
    });
  });
});

describe('DisabledPushSender', () => {
  it('fica desligado e não envia nada', async () => {
    const sender = new DisabledPushSender();

    expect(sender.enabled).toBe(false);
    await expect(
      sender.send(['t1'], { title: 't', body: 'b', data: {} }),
    ).resolves.toEqual({ successCount: 0, failureCount: 0, invalidTokens: [] });
  });
});

describe('parseFirebaseCredentials', () => {
  it('lê o JSON da conta de serviço', () => {
    const json = JSON.stringify({
      project_id: 'autouni',
      client_email: 'push@autouni.iam.gserviceaccount.com',
      private_key:
        '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
    });

    expect(
      parseFirebaseCredentials({ FIREBASE_SERVICE_ACCOUNT_JSON: json }),
    ).toEqual({
      projectId: 'autouni',
      clientEmail: 'push@autouni.iam.gserviceaccount.com',
      privateKey:
        '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
    });
  });

  it('lê as três variáveis separadas, convertendo \\n escapado da chave', () => {
    expect(
      parseFirebaseCredentials({
        FIREBASE_PROJECT_ID: 'autouni',
        FIREBASE_CLIENT_EMAIL: 'push@autouni.iam.gserviceaccount.com',
        FIREBASE_PRIVATE_KEY:
          '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n',
      }),
    ).toEqual({
      projectId: 'autouni',
      clientEmail: 'push@autouni.iam.gserviceaccount.com',
      privateKey:
        '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
    });
  });

  it('sem configuração, devolve null (push desligado)', () => {
    expect(parseFirebaseCredentials({})).toBeNull();
    expect(
      parseFirebaseCredentials({ FIREBASE_PROJECT_ID: 'autouni' }),
    ).toBeNull();
  });

  it('JSON inválido ou incompleto devolve null em vez de derrubar o boot', () => {
    expect(
      parseFirebaseCredentials({
        FIREBASE_SERVICE_ACCOUNT_JSON: '{nao-e-json',
      }),
    ).toBeNull();
    expect(
      parseFirebaseCredentials({
        FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({ project_id: 'x' }),
      }),
    ).toBeNull();
  });
});
