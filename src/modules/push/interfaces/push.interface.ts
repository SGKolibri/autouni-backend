import { Notification, PushPlatform, PushToken } from '@prisma/client';

/** Token de injeção do [PushSender] ativo (Firebase ou desligado). */
export const PUSH_SENDER = Symbol('PUSH_SENDER');

/** Conteúdo de um push: o que aparece na bandeja + dados para o deep link. */
export interface PushMessage {
  title: string;
  body: string;
  /** Pares string → string (exigência do FCM para `data`). */
  data: Record<string, string>;
}

export interface PushSendResult {
  successCount: number;
  failureCount: number;
  /** Tokens que o FCM declarou inválidos/expirados — devem ser apagados. */
  invalidTokens: string[];
}

/** Canal de entrega de push. Mantém o firebase-admin isolado e mockável. */
export interface PushSender {
  /** `false` quando não há credenciais do Firebase: nada é enviado. */
  readonly enabled: boolean;
  send(tokens: string[], message: PushMessage): Promise<PushSendResult>;
}

/** Resumo de um disparo para uma notificação. */
export interface PushDispatchResult {
  sent: number;
  failed: number;
  /** Tokens inválidos apagados do banco. */
  removed: number;
}

/** Token como devolvido pela API (sem o userId). */
export type PushTokenView = Pick<
  PushToken,
  'id' | 'token' | 'platform' | 'createdAt' | 'updatedAt'
>;

export type PushNotification = Pick<
  Notification,
  'id' | 'userId' | 'type' | 'title' | 'message'
> & { link?: string | null };

export interface IPushRepository {
  upsert(
    userId: string,
    token: string,
    platform: PushPlatform,
  ): Promise<PushToken>;
  deleteForUser(userId: string, token: string): Promise<number>;
  findTokensByUser(userId: string): Promise<string[]>;
  deleteTokens(tokens: string[]): Promise<number>;
}
