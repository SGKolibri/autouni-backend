import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../../../prisma/prisma.service';
import { MqttDynsecService } from '../../mqtt/service/mqtt-dynsec.service';
import {
  TenantContext,
  withTenant,
} from '../../../common/tenant/tenant-context';
import { CreateNodeDto, UpdateNodeDto } from '../dto/nodes.dto';
import { aclsForNode, nodeRoleName } from '../node-acl';
import { nodeOnlineTopic, orgPrefix } from '../../mqtt/topics';

export interface NodeCredentials {
  username: string;
  // Só aparece na criação e na rotação: o backend não guarda a senha.
  password: string;
  brokerUrl: string | null;
  // Prefixo de todos os tópicos do nó: `org/<organizationId>`.
  topicPrefix: string;
  lastWillTopic: string;
}

@Injectable()
export class NodesService implements OnModuleInit {
  private readonly logger = new Logger(NodesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dynsec: MqttDynsecService,
  ) {}

  // Ao (re)conectar no broker, reconcilia as ACLs de todos os nós: corrige
  // qualquer mudança de device feita enquanto o broker estava fora.
  onModuleInit() {
    if (!this.dynsec.enabled()) return;
    this.dynsec.onReady(() => {
      this.reconcileAll().catch((err) =>
        this.logger.error(`ACL reconcile failed: ${err.message}`),
      );
    });
  }

  private async reconcileAll() {
    const nodes = await TenantContext.runAsSystem(() =>
      this.prisma.deviceNode.findMany({
        select: { id: true, organizationId: true },
      }),
    );
    for (const node of nodes) {
      await TenantContext.runAsTenant(node.organizationId, () =>
        this.syncAcl(node.id),
      );
    }
    if (nodes.length)
      this.logger.log(`Broker ACLs reconciled for ${nodes.length} node(s)`);
  }

  private credentials(
    organizationId: string,
    username: string,
    password: string,
  ): NodeCredentials {
    return {
      username,
      password,
      brokerUrl: process.env.MQTT_PUBLIC_URL ?? null,
      topicPrefix: orgPrefix(organizationId),
      lastWillTopic: nodeOnlineTopic(organizationId, username),
    };
  }

  async create(dto: CreateNodeDto) {
    const username = `node-${randomBytes(4).toString('hex')}`;
    const password = randomBytes(18).toString('base64url');

    const node = await this.prisma.deviceNode.create({
      data: withTenant({
        ...dto,
        mqttUsername: username,
        credentialIssuedAt: new Date(),
      }),
    });

    try {
      await this.dynsec.createClient(
        username,
        password,
        nodeRoleName(username),
        aclsForNode(node.organizationId, username, []),
      );
    } catch (err) {
      // Sem credencial no broker o nó não serve para nada: desfaz o cadastro.
      await this.prisma.deviceNode.delete({ where: { id: node.id } });
      throw err;
    }

    return {
      node,
      credentials: this.credentials(node.organizationId, username, password),
    };
  }

  findAll() {
    return this.prisma.deviceNode.findMany({
      orderBy: { name: 'asc' },
      include: {
        devices: {
          select: {
            id: true,
            name: true,
            channel: true,
            mqttTopic: true,
            online: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const node = await this.prisma.deviceNode.findUnique({
      where: { id },
      include: {
        room: { select: { id: true, name: true } },
        devices: {
          select: {
            id: true,
            name: true,
            type: true,
            channel: true,
            mqttTopic: true,
            online: true,
            status: true,
          },
        },
      },
    });
    if (!node) throw new NotFoundException(`Node with ID ${id} not found`);
    return node;
  }

  async update(id: string, dto: UpdateNodeDto) {
    await this.findOne(id);
    return this.prisma.deviceNode.update({ where: { id }, data: dto });
  }

  async rotateCredentials(id: string) {
    const node = await this.findOne(id);
    const password = randomBytes(18).toString('base64url');
    await this.dynsec.setPassword(node.mqttUsername, password);
    await this.prisma.deviceNode.update({
      where: { id },
      data: { credentialIssuedAt: new Date() },
    });
    return {
      node,
      credentials: this.credentials(
        node.organizationId,
        node.mqttUsername,
        password,
      ),
    };
  }

  async remove(id: string) {
    const node = await this.findOne(id);
    await this.dynsec.deleteClient(
      node.mqttUsername,
      nodeRoleName(node.mqttUsername),
    );
    return this.prisma.deviceNode.delete({ where: { id } });
  }

  /** Recalcula a ACL do nó a partir dos devices atribuídos a ele. */
  async syncAcl(id: string) {
    const node = await this.prisma.deviceNode.findUnique({
      where: { id },
      include: { devices: { select: { mqttTopic: true, channel: true } } },
    });
    if (!node) throw new NotFoundException(`Node with ID ${id} not found`);
    const acls = aclsForNode(
      node.organizationId,
      node.mqttUsername,
      node.devices,
    );
    await this.dynsec.syncRoleAcls(nodeRoleName(node.mqttUsername), acls);
    return { nodeId: id, acls };
  }

  /**
   * Chamado depois de criar/alterar/remover um device. Falha do broker não
   * desfaz a alteração do device: a reconciliação na reconexão corrige, e
   * POST /nodes/:id/sync-acl força na hora.
   */
  async syncAclSafely(...nodeIds: Array<string | null | undefined>) {
    if (!this.dynsec.enabled()) return;
    for (const id of new Set(nodeIds.filter((v): v is string => !!v))) {
      try {
        await this.syncAcl(id);
      } catch (err) {
        this.logger.error(
          `ACL sync failed for node ${id}: ${(err as Error).message}`,
        );
      }
    }
  }
}
