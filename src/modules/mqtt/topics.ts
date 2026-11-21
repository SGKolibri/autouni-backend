/**
 * Namespace MQTT por organização.
 *
 *   org/<organizationId>/devices/<slug>/<status|energy|sensor|online|command>
 *   org/<organizationId>/nodes/<mqttUsername>/online
 *
 * `Device.mqttTopic` continua guardando só a parte relativa (`devices/<slug>`),
 * única dentro da organização. O prefixo é aplicado aqui, na borda com o
 * broker, e é ele que diz de qual tenant a mensagem é: a ACL do broker só deixa
 * um nó publicar sob o prefixo da própria organização.
 */
export const ORG_PREFIX = 'org';

export const DEVICE_SUFFIXES = [
  'status',
  'energy',
  'sensor',
  'online',
] as const;
export type DeviceSuffix = (typeof DEVICE_SUFFIXES)[number];

export const orgPrefix = (organizationId: string) =>
  `${ORG_PREFIX}/${organizationId}`;

export const orgTopic = (organizationId: string, relative: string) =>
  `${orgPrefix(organizationId)}/${relative}`;

export const nodeOnlineTopic = (organizationId: string, mqttUsername: string) =>
  orgTopic(organizationId, `nodes/${mqttUsername}/online`);

/** Assinaturas do backend: todas as organizações. */
export const INBOUND_SUBSCRIPTIONS = [
  ...DEVICE_SUFFIXES.map((s) => `${ORG_PREFIX}/+/devices/+/${s}`),
  `${ORG_PREFIX}/+/nodes/+/online`,
];

// Ids de organização são UUIDs; qualquer outra coisa no segundo nível é lixo.
const ORG_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type InboundTopic =
  | {
      kind: 'device';
      organizationId: string;
      mqttTopic: string;
      suffix: DeviceSuffix;
    }
  | { kind: 'node'; organizationId: string; mqttUsername: string };

export function parseInboundTopic(topic: string): InboundTopic | null {
  const parts = topic.split('/');
  if (parts.length !== 5 || parts[0] !== ORG_PREFIX || !ORG_ID.test(parts[1])) {
    return null;
  }
  const [, organizationId, scope, id, suffix] = parts;
  if (
    scope === 'devices' &&
    (DEVICE_SUFFIXES as readonly string[]).includes(suffix)
  ) {
    return {
      kind: 'device',
      organizationId,
      mqttTopic: `devices/${id}`,
      suffix: suffix as DeviceSuffix,
    };
  }
  if (scope === 'nodes' && suffix === 'online') {
    return { kind: 'node', organizationId, mqttUsername: id };
  }
  return null;
}
