import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantContext } from '../src/common/tenant/tenant-context';

// Modelos que pertencem a uma organização. Toda operação neles recebe o filtro
// `organizationId` do contexto; sem contexto, a operação é recusada.
export const TENANT_MODELS = new Set<string>([
  'User',
  'Building',
  'Floor',
  'Room',
  'Device',
  'DeviceNode',
  'EnergyReading',
  'SensorReading',
  'SensorThreshold',
  'SensorAlarm',
  'Automation',
  'AutomationHistory',
  'Notification',
  'Report',
]);

type ParentRef = { fk: string; relation: string; delegate: string };

// Chaves estrangeiras para outros modelos com tenant. Ao criar ou alterar um
// registro, o pai referenciado precisa ser da mesma organização: sem isto, um
// tenant poderia pendurar um andar no prédio de outro.
const PARENTS: Record<string, ParentRef[]> = {
  Floor: [{ fk: 'buildingId', relation: 'building', delegate: 'building' }],
  Room: [{ fk: 'floorId', relation: 'floor', delegate: 'floor' }],
  Device: [
    { fk: 'roomId', relation: 'room', delegate: 'room' },
    { fk: 'nodeId', relation: 'node', delegate: 'deviceNode' },
  ],
  DeviceNode: [{ fk: 'roomId', relation: 'room', delegate: 'room' }],
  EnergyReading: [{ fk: 'deviceId', relation: 'device', delegate: 'device' }],
  SensorReading: [{ fk: 'deviceId', relation: 'device', delegate: 'device' }],
  SensorThreshold: [{ fk: 'deviceId', relation: 'device', delegate: 'device' }],
  SensorAlarm: [
    { fk: 'deviceId', relation: 'device', delegate: 'device' },
    { fk: 'acknowledgedById', relation: 'acknowledgedBy', delegate: 'user' },
  ],
  Automation: [{ fk: 'creatorId', relation: 'creator', delegate: 'user' }],
  AutomationHistory: [
    { fk: 'automationId', relation: 'automation', delegate: 'automation' },
  ],
  Notification: [{ fk: 'userId', relation: 'user', delegate: 'user' }],
  Report: [{ fk: 'createdById', relation: 'createdBy', delegate: 'user' }],
};

const WHERE_OPERATIONS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'update',
  'updateMany',
  'updateManyAndReturn',
  'delete',
  'deleteMany',
  'upsert',
]);

function referencedIds(model: string, data: Record<string, any> | undefined) {
  const refs: Array<{ parent: ParentRef; id: string }> = [];
  if (!data) return refs;
  for (const parent of PARENTS[model] ?? []) {
    const scalar = data[parent.fk];
    if (typeof scalar === 'string') refs.push({ parent, id: scalar });
    const connectId = data[parent.relation]?.connect?.id;
    if (typeof connectId === 'string') refs.push({ parent, id: connectId });
  }
  return refs;
}

export function tenantScopeExtension(baseClient: any) {
  async function assertParentsInTenant(
    model: string,
    data: Record<string, any> | undefined,
    organizationId: string,
  ) {
    for (const { parent, id } of referencedIds(model, data)) {
      const count = await baseClient[parent.delegate].count({
        where: { id, organizationId },
      });
      if (count === 0) {
        throw new BadRequestException(`${parent.fk} não encontrado: ${id}`);
      }
    }
  }

  return Prisma.defineExtension({
    name: 'tenant-scope',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!TENANT_MODELS.has(model)) return query(args);

          const store = TenantContext.current();
          if (store?.system) return query(args);

          const organizationId = store?.organizationId;
          if (!organizationId) {
            throw new Error(
              `Tenant context missing for ${model}.${operation}. ` +
                'Use TenantContext.runAsTenant/runAsSystem outside HTTP requests.',
            );
          }

          const a: any = args ?? {};

          if (WHERE_OPERATIONS.has(operation)) {
            a.where = { ...(a.where ?? {}), organizationId };
          }

          if (operation === 'create') {
            await assertParentsInTenant(model, a.data, organizationId);
            a.data = { ...a.data, organizationId };
          } else if (
            operation === 'createMany' ||
            operation === 'createManyAndReturn'
          ) {
            const rows = Array.isArray(a.data) ? a.data : [a.data];
            for (const row of rows)
              await assertParentsInTenant(model, row, organizationId);
            a.data = rows.map((row: any) => ({ ...row, organizationId }));
          } else if (
            operation === 'update' ||
            operation === 'updateMany' ||
            operation === 'updateManyAndReturn'
          ) {
            await assertParentsInTenant(model, a.data, organizationId);
            if (a.data && 'organizationId' in a.data)
              delete a.data.organizationId;
          } else if (operation === 'upsert') {
            await assertParentsInTenant(model, a.create, organizationId);
            await assertParentsInTenant(model, a.update, organizationId);
            a.create = { ...a.create, organizationId };
            if (a.update && 'organizationId' in a.update)
              delete a.update.organizationId;
          }

          return query(a);
        },
      },
    },
  });
}
