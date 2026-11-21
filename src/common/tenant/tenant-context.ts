import { AsyncLocalStorage } from 'node:async_hooks';
import { UserRole } from '@prisma/client';

export interface TenantStore {
  organizationId?: string;
  userId?: string;
  role?: UserRole;
  // Acesso sem escopo de tenant. Só para caminhos que precisam enxergar todas as
  // organizações para então se restringir a uma (login, ingestão MQTT, jobs).
  system?: boolean;
}

const storage = new AsyncLocalStorage<TenantStore>();

export const TenantContext = {
  run<T>(store: TenantStore, fn: () => T): T {
    return storage.run(store, fn);
  },

  // Consultas do Prisma são preguiçosas: só executam quando aguardadas. O
  // `await` precisa acontecer dentro do contexto, senão a consulta roda com o
  // contexto de fora (e o escopo de tenant recusa ou aplica o tenant errado).
  runAsTenant<T>(
    organizationId: string,
    fn: () => T | PromiseLike<T>,
  ): Promise<T> {
    return storage.run({ organizationId }, async () => await fn());
  },

  runAsSystem<T>(fn: () => T | PromiseLike<T>): Promise<T> {
    return storage.run({ system: true }, async () => await fn());
  },

  current(): TenantStore | undefined {
    return storage.getStore();
  },

  organizationId(): string | undefined {
    return storage.getStore()?.organizationId;
  },

  requireOrganizationId(): string {
    const organizationId = storage.getStore()?.organizationId;
    if (!organizationId) {
      throw new Error(
        'Tenant context missing: no organizationId for this operation',
      );
    }
    return organizationId;
  },

  // Preenche o store aberto pelo middleware da requisição (o guard de auth roda
  // depois do middleware, dentro do mesmo contexto assíncrono).
  assign(values: Partial<TenantStore>): void {
    const store = storage.getStore();
    if (store) Object.assign(store, values);
  },
};

/**
 * Anexa a organização do contexto aos dados de um `create`. O escopo do
 * PrismaService também a injeta (e recusa a operação sem contexto); isto
 * existe para os tipos do Prisma, que exigem o campo.
 */
export function withTenant<T extends object>(
  data: T,
): T & { organizationId: string } {
  return { ...data, organizationId: TenantContext.organizationId() as string };
}
