import { Inject, Injectable, Logger } from '@nestjs/common';
import { PushRepository } from '../repository/push.repository';
import { RegisterPushTokenDto } from '../dto/push-token.dto';
import { PUSH_SENDER } from '../interfaces/push.interface';
import type {
  PushDispatchResult,
  PushNotification,
  PushSender,
  PushTokenView,
} from '../interfaces/push.interface';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    private readonly pushRepository: PushRepository,
    @Inject(PUSH_SENDER) private readonly sender: PushSender,
  ) {}

  /** Associa o token do aparelho ao usuário (troca de dono, se preciso). */
  async register(
    userId: string,
    dto: RegisterPushTokenDto,
  ): Promise<PushTokenView> {
    const saved = await this.pushRepository.upsert(
      userId,
      dto.token,
      dto.platform,
    );
    return {
      id: saved.id,
      token: saved.token,
      platform: saved.platform,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  /** Remove o token do usuário (logout). Idempotente. */
  async unregister(userId: string, token: string): Promise<void> {
    await this.pushRepository.deleteForUser(userId, token);
  }

  /**
   * Envia a notificação para todos os aparelhos do destinatário. Nunca
   * lança: a notificação já foi gravada e segue visível na central.
   */
  async sendNotification(
    notification: PushNotification,
  ): Promise<PushDispatchResult> {
    const none: PushDispatchResult = { sent: 0, failed: 0, removed: 0 };
    if (!this.sender.enabled) return none;

    const tokens = await this.pushRepository.findTokensByUser(
      notification.userId,
    );
    if (tokens.length === 0) return none;

    try {
      const result = await this.sender.send(tokens, {
        title: notification.title,
        body: notification.message,
        data: {
          notificationId: notification.id,
          type: notification.type,
          ...(notification.link ? { link: notification.link } : {}),
        },
      });
      const removed =
        result.invalidTokens.length > 0
          ? await this.pushRepository.deleteTokens(result.invalidTokens)
          : 0;
      return {
        sent: result.successCount,
        failed: result.failureCount,
        removed,
      };
    } catch (err) {
      this.logger.error(
        `Push failed for notification ${notification.id}`,
        err instanceof Error ? err.stack : String(err),
      );
      return { sent: 0, failed: tokens.length, removed: 0 };
    }
  }
}
