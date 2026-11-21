import { DeviceChannel } from '@prisma/client';
import { Acl } from '../mqtt/service/mqtt-dynsec.service';
import { nodeOnlineTopic, orgTopic } from '../mqtt/topics';
import {
  channelAccepts,
  COMMANDABLE_CHANNELS,
} from '../telemetry/channel-capabilities';

export const nodeRoleName = (mqttUsername: string) => `role-${mqttUsername}`;

/**
 * Menor permissão que o nó precisa, sempre sob `org/<organizationId>/`:
 * publicar o próprio LWT e, para cada
 * device, só os sufixos que o canal produz; assinar `/command` só nos canais
 * que recebem comando. Device sem canal recebe tudo (cadastro legado).
 */
export function aclsForNode(
  organizationId: string,
  mqttUsername: string,
  devices: Array<{ mqttTopic: string | null; channel: DeviceChannel | null }>,
): Acl[] {
  const acls: Acl[] = [
    {
      acltype: 'publishClientSend',
      topic: nodeOnlineTopic(organizationId, mqttUsername),
    },
  ];

  for (const { mqttTopic, channel } of devices) {
    if (!mqttTopic) continue;
    const base = orgTopic(organizationId, mqttTopic);
    const send = (suffix: string) =>
      acls.push({
        acltype: 'publishClientSend',
        topic: `${base}/${suffix}`,
      });

    send('status');
    send('online');
    if (channelAccepts(channel, 'ENERGY')) send('energy');
    if (!channel || ['GAS_MQ2', 'GAS_MQ135', 'PIR'].includes(channel))
      send('sensor');
    if (!channel || COMMANDABLE_CHANNELS.includes(channel)) {
      acls.push({ acltype: 'subscribePattern', topic: `${base}/command` });
    }
  }
  return acls;
}
