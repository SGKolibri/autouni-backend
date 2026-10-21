import { Logger } from '@nestjs/common';
import {
  PushMessage,
  PushSendResult,
  PushSender,
} from '../interfaces/push.interface';

/**
 * O pedaço do `firebase-admin/messaging` que usamos. Tipado à mão para os
 * testes não dependerem do SDK.
 */
export interface FcmMessaging {
  sendEachForMulticast(message: {
    tokens: string[];
    notification: { title: string; body: string };
    data: Record<string, string>;
    android: { priority: 'high'; notification: { channelId: string } };
    apns: { payload: { aps: { sound: string } } };
  }): Promise<{
    successCount: number;
    failureCount: number;
    responses: Array<{ success: boolean; error?: { code: string } }>;
  }>;
}

/** Códigos do FCM que significam "este token nunca mais vai funcionar". */
const INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

/** Máximo de tokens por chamada multicast do FCM. */
const MULTICAST_LIMIT = 500;

export class FirebasePushSender implements PushSender {
  /** Canal de notificação Android criado pelo app. */
  static readonly androidChannelId = 'autouni_alerts';

  readonly enabled = true;

  constructor(private readonly messaging: FcmMessaging) {}

  async send(tokens: string[], message: PushMessage): Promise<PushSendResult> {
    const result: PushSendResult = {
      successCount: 0,
      failureCount: 0,
      invalidTokens: [],
    };

    for (let start = 0; start < tokens.length; start += MULTICAST_LIMIT) {
      const batch = tokens.slice(start, start + MULTICAST_LIMIT);
      const response = await this.messaging.sendEachForMulticast({
        tokens: batch,
        notification: { title: message.title, body: message.body },
        data: message.data,
        android: {
          priority: 'high',
          notification: { channelId: FirebasePushSender.androidChannelId },
        },
        apns: { payload: { aps: { sound: 'default' } } },
      });
      result.successCount += response.successCount;
      result.failureCount += response.failureCount;
      response.responses.forEach((item, index) => {
        if (
          !item.success &&
          item.error &&
          INVALID_TOKEN_CODES.has(item.error.code)
        ) {
          result.invalidTokens.push(batch[index]);
        }
      });
    }

    return result;
  }
}

/** Usado quando o Firebase não está configurado: o push fica desligado. */
export class DisabledPushSender implements PushSender {
  readonly enabled = false;

  async send(
    _tokens: string[],
    _message: PushMessage,
  ): Promise<PushSendResult> {
    return { successCount: 0, failureCount: 0, invalidTokens: [] };
  }
}

export interface FirebaseCredentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

/**
 * Lê as credenciais da conta de serviço do ambiente:
 *
 * - `FIREBASE_SERVICE_ACCOUNT_JSON`: o JSON baixado do console do Firebase; ou
 * - `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`
 *   (a chave pode vir com `\n` escapado, como nos painéis de hospedagem).
 *
 * Sem configuração completa devolve `null` — o push fica desligado em vez de
 * derrubar o boot.
 */
export function parseFirebaseCredentials(
  env: Record<string, string | undefined>,
): FirebaseCredentials | null {
  const json = env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    try {
      const parsed = JSON.parse(json);
      return complete({
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key,
      });
    } catch {
      return null;
    }
  }

  return complete({
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  });
}

function complete(
  credentials: Partial<Record<keyof FirebaseCredentials, unknown>>,
): FirebaseCredentials | null {
  const { projectId, clientEmail, privateKey } = credentials;
  if (
    typeof projectId === 'string' &&
    projectId &&
    typeof clientEmail === 'string' &&
    clientEmail &&
    typeof privateKey === 'string' &&
    privateKey
  ) {
    return { projectId, clientEmail, privateKey };
  }
  return null;
}

/* istanbul ignore next -- inicialização real do SDK, sem lógica própria */
export function createPushSender(
  env: Record<string, string | undefined> = process.env,
): PushSender {
  const logger = new Logger('PushSender');
  const credentials = parseFirebaseCredentials(env);
  if (!credentials) {
    logger.warn('Firebase não configurado: push (FCM) desligado.');
    return new DisabledPushSender();
  }

  // Carregado só quando há credenciais, para não pesar no boot sem push.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { initializeApp, cert, getApps } = require('firebase-admin/app');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getMessaging } = require('firebase-admin/messaging');
  const appName = 'autouni-push';
  const app =
    getApps().find((existing: { name: string }) => existing.name === appName) ??
    initializeApp({ credential: cert(credentials) }, appName);
  logger.log(`Push (FCM) ligado para o projeto ${credentials.projectId}.`);
  return new FirebasePushSender(getMessaging(app) as FcmMessaging);
}
