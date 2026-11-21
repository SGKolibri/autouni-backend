import { Injectable } from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { IAuthRepository, UserWithOrganization } from '../interfaces/auth.interfaces';
import { TenantContext, withTenant } from '../../../common/tenant/tenant-context';

@Injectable()
export class AuthRepository implements IAuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Login acontece antes de existir tenant: busca em todas as organizações e o
  // serviço decide. É o único ponto que lê `password`.
  async findUsersByEmailForLogin(
    email: string,
    organizationSlug?: string,
  ): Promise<UserWithOrganization[]> {
    return TenantContext.runAsSystem(() =>
      this.prisma.user.findMany({
        where: {
          email,
          ...(organizationSlug ? { organization: { slug: organizationSlug } } : {}),
        },
        omit: { password: false },
        include: { organization: { select: { id: true, slug: true, name: true } } },
      }),
    ) as Promise<UserWithOrganization[]>;
  }

  async findUserForRefresh(userId: string, organizationId: string): Promise<User | null> {
    return TenantContext.runAsTenant(organizationId, () =>
      this.prisma.user.findUnique({ where: { id: userId } }),
    );
  }

  // As buscas abaixo rodam dentro da requisição autenticada: o escopo de tenant
  // restringe à organização de quem está cadastrando.
  async findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { email } });
  }

  async findUserByCpf(cpf: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { cpf } });
  }

  async createUser(data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    cpf?: string;
    avatar?: string;
  }): Promise<User> {
    // Cadastro nunca escolhe papel: nasce VIEWER e só um ADMIN promove via /users.
    return this.prisma.user.create({
      data: withTenant({ ...data, role: UserRole.VIEWER }),
    });
  }

  // RefreshToken não tem tenant próprio; pertence ao usuário.
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
