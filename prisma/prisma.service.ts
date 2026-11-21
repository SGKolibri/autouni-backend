import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { tenantScopeExtension } from './tenant-scope.extension';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // Hash de senha nunca sai do banco por padrão; quem precisa (login, troca
    // de senha) pede explicitamente com `omit: { password: false }`.
    super({ omit: { user: { password: true } } });
    // O Nest recebe o client estendido: todo módulo que injeta PrismaService
    // passa a ter o escopo de tenant, sem depender de cada repositório lembrar.
    return this.$extends(tenantScopeExtension(this)) as unknown as PrismaService;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
