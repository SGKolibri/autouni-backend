import { Injectable } from '@nestjs/common';
import { PushPlatform, PushToken } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { IPushRepository } from '../interfaces/push.interface';

@Injectable()
export class PushRepository implements IPushRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** O token é único: se já existir (outra conta no aparelho), muda de dono. */
  async upsert(
    userId: string,
    token: string,
    platform: PushPlatform,
  ): Promise<PushToken> {
    return this.prisma.pushToken.upsert({
      where: { token },
      create: { userId, token, platform },
      update: { userId, platform },
    });
  }

  async deleteForUser(userId: string, token: string): Promise<number> {
    const result = await this.prisma.pushToken.deleteMany({
      where: { userId, token },
    });
    return result.count;
  }

  async findTokensByUser(userId: string): Promise<string[]> {
    const rows = await this.prisma.pushToken.findMany({
      where: { userId },
      select: { token: true },
    });
    return rows.map((row) => row.token);
  }

  async deleteTokens(tokens: string[]): Promise<number> {
    const result = await this.prisma.pushToken.deleteMany({
      where: { token: { in: tokens } },
    });
    return result.count;
  }
}
