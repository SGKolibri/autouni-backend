import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { MqttService } from './mqtt.service';

const CONTROL_TOPIC = '$CONTROL/dynamic-security/v1';
const RESPONSE_TOPIC = `${CONTROL_TOPIC}/response`;
const TIMEOUT_MS = 5000;

// Papel que dá ao próprio backend permissão de publicar comandos. O cliente
// criado pelo `mosquitto_ctrl dynsec init` só administra o plugin e assina
// tópicos; publicar comandos precisa ser concedido explicitamente.
const BACKEND_ROLE = 'autouni-backend';

export type AclType = 'publishClientSend' | 'subscribePattern';
export interface Acl {
  acltype: AclType;
  topic: string;
}

// O backend só publica comandos; telemetria vem dos nós.
const BACKEND_ACLS: Acl[] = [
  { acltype: 'publishClientSend', topic: 'org/+/devices/+/command' },
];

interface DynsecResponse {
  command: string;
  error?: string;
  data?: any;
  correlationData?: string;
}

/**
 * Cliente do plugin dynamic-security do Mosquitto. É por ele que cada nó
 * (ESP32) recebe usuário, senha e ACL próprios: o broker deixa de aceitar
 * conexão anônima e cada credencial só publica nos tópicos dos devices do seu nó.
 */
@Injectable()
export class MqttDynsecService implements OnModuleInit {
  private readonly logger = new Logger(MqttDynsecService.name);
  private readonly pending = new Map<
    string,
    { resolve: (r: DynsecResponse) => void; timer: NodeJS.Timeout }
  >();

  // Resolve quando a assinatura do tópico de resposta foi confirmada.
  private ready: Promise<void> = Promise.resolve();

  constructor(private readonly mqtt: MqttService) {}

  private readonly readyListeners: Array<() => void> = [];
  // Verdadeiro quando o papel do backend já está no broker nesta conexão.
  private backendGranted = false;

  isBackendGranted(): boolean {
    return this.backendGranted && this.mqtt.isConnected();
  }

  /** Chamado a cada (re)conexão, depois que o broker confirmou a assinatura de respostas. */
  onReady(listener: () => void) {
    this.readyListeners.push(listener);
  }

  onModuleInit() {
    if (!this.enabled()) return;
    this.mqtt.onConnect(() => {
      this.backendGranted = false;
      this.ready = this.mqtt
        .subscribeAndWait(RESPONSE_TOPIC)
        .catch((err) =>
          this.logger.error(
            `Failed to subscribe to ${RESPONSE_TOPIC}: ${err.message}`,
          ),
        );
      this.ready
        .then(() => this.bootstrapBackendRole())
        .catch((err) =>
          this.logger.error(
            `Failed to bootstrap broker ACL for the backend: ${err.message}`,
          ),
        );
      this.ready.then(() =>
        this.readyListeners.forEach((listener) => listener()),
      );
    });
    this.mqtt.onMessage((topic, payload) => {
      if (topic === RESPONSE_TOPIC) this.handleResponse(payload);
    });
  }

  enabled(): boolean {
    return (
      process.env.MQTT_DYNSEC !== 'false' && !!process.env.MQTT_URL?.trim()
    );
  }

  private handleResponse(payload: Buffer) {
    let body: { responses?: DynsecResponse[] };
    try {
      body = JSON.parse(payload.toString());
    } catch {
      return;
    }
    for (const response of body.responses ?? []) {
      const entry =
        response.correlationData && this.pending.get(response.correlationData);
      if (!entry) continue;
      clearTimeout(entry.timer);
      this.pending.delete(response.correlationData!);
      entry.resolve(response);
    }
  }

  private async send(
    command: Record<string, unknown>,
  ): Promise<DynsecResponse> {
    await this.ready;
    return this.sendNow(command);
  }

  private sendNow(command: Record<string, unknown>): Promise<DynsecResponse> {
    if (!this.enabled() || !this.mqtt.isConnected()) {
      return Promise.reject(
        new ServiceUnavailableException(
          'Broker MQTT indisponível: credenciais de nó não podem ser gerenciadas agora',
        ),
      );
    }
    const correlationData = randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(correlationData);
        reject(
          new ServiceUnavailableException(
            'O broker não respondeu ao dynamic-security. Confira se o plugin está carregado.',
          ),
        );
      }, TIMEOUT_MS);
      this.pending.set(correlationData, { resolve, timer });
      this.mqtt.publish(CONTROL_TOPIC, {
        commands: [{ ...command, correlationData }],
      });
    });
  }

  // Erros de "já existe"/"não encontrado" tornam as operações idempotentes.
  private async run(
    command: Record<string, unknown>,
    tolerate: RegExp | null = null,
  ) {
    const response = await this.send(command);
    if (response.error && !(tolerate && tolerate.test(response.error))) {
      throw new Error(`dynsec ${command.command} failed: ${response.error}`);
    }
    return response;
  }

  private async bootstrapBackendRole() {
    const backendUser = process.env.MQTT_USERNAME;
    if (!backendUser) return;
    await this.run(
      {
        command: 'createRole',
        rolename: BACKEND_ROLE,
        acls: BACKEND_ACLS.map((a) => ({ ...a, priority: 0, allow: true })),
      },
      /already exists/i,
    );
    // Papel criado por uma versão anterior (devices/#) é corrigido aqui.
    await this.syncRoleAcls(BACKEND_ROLE, BACKEND_ACLS);

    const client = await this.run({
      command: 'getClient',
      username: backendUser,
    });
    const roles: Array<{ rolename: string }> = client.data?.client?.roles ?? [];
    if (roles.some((r) => r.rolename === BACKEND_ROLE)) {
      this.backendGranted = true;
      this.logger.log(
        `Broker ACL ready: ${backendUser} may publish org/+/devices/+/command`,
      );
      return;
    }

    // O broker derruba a sessão de um cliente cujos papéis mudam; a resposta
    // deste comando se perde e a reconexão volta aqui, já com o papel.
    this.logger.log(
      `Granting ${backendUser} publish access to org/+/devices/+/command (the broker will reconnect us)`,
    );
    await this.send({
      command: 'addClientRole',
      username: backendUser,
      rolename: BACKEND_ROLE,
      priority: 0,
    }).catch(() => undefined);
  }

  async createClient(
    username: string,
    password: string,
    rolename: string,
    acls: Acl[],
  ) {
    await this.run(
      {
        command: 'createRole',
        rolename,
        acls: acls.map((a) => ({ ...a, priority: 0, allow: true })),
      },
      /already exists/i,
    );
    await this.run({
      command: 'createClient',
      username,
      password,
      roles: [{ rolename, priority: 0 }],
    });
  }

  async setPassword(username: string, password: string) {
    await this.run({ command: 'setClientPassword', username, password });
    // Derruba a sessão aberta com a senha antiga.
    await this.run({ command: 'disableClient', username });
    await this.run({ command: 'enableClient', username });
  }

  async deleteClient(username: string, rolename: string) {
    await this.run({ command: 'deleteClient', username }, /not found/i);
    await this.run({ command: 'deleteRole', rolename }, /not found/i);
  }

  /** Faz o papel ter exatamente `desired` como ACLs, sem janela sem permissão. */
  async syncRoleAcls(rolename: string, desired: Acl[]) {
    const current = await this.run({ command: 'getRole', rolename });
    const existing: Acl[] = (current.data?.role?.acls ?? []).map((a: any) => ({
      acltype: a.acltype,
      topic: a.topic,
    }));
    const key = (a: Acl) => `${a.acltype} ${a.topic}`;
    const want = new Set(desired.map(key));
    const have = new Set(existing.map(key));

    for (const acl of desired) {
      if (!have.has(key(acl))) {
        await this.run(
          { command: 'addRoleACL', rolename, ...acl, priority: 0, allow: true },
          /already exists/i,
        );
      }
    }
    for (const acl of existing) {
      if (!want.has(key(acl))) {
        await this.run(
          { command: 'removeRoleACL', rolename, ...acl },
          /not found/i,
        );
      }
    }
  }
}
