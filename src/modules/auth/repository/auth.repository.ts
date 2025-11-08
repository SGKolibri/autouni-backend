import { Injectable } from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { IAuthRepository } from '../interfaces/auth.interfaces';

@Injectable()
export class AuthRepository implements IAuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findUserByCpf(cpf: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { cpf },
    });
  }

  async createUser(data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    cpf?: string;
    role?: UserRole;
    avatar?: string;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        ...data,
        role: data.role || UserRole.VIEWER,
      },
    });
  }

  async createRefreshToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.refreshToken.create({
      data,
    });
  }

  async findRefreshTokensByUserId(userId: string): Promise<
    Array<{
      id: string;
      tokenHash: string;
      expiresAt: Date;
    }>
  > {
    return this.prisma.refreshToken.findMany({
      where: {
        userId,
        expiresAt: {
          gte: new Date(),
        },
      },
      select: {
        id: true,
        tokenHash: true,
        expiresAt: true,
      },
    });
  }

  async deleteRefreshTokensByUserId(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  async deleteExpiredRefreshTokens(): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }
}