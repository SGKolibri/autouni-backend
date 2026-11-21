import { aclsForNode } from './node-acl';

const ORG = '11111111-2222-3333-4444-555555555555';
const P = `org/${ORG}`;

describe('aclsForNode', () => {
  it('grants only what each channel produces or consumes', () => {
    const acls = aclsForNode(ORG, 'node-ab12', [
      { mqttTopic: 'devices/pzem-a206', channel: 'ENERGY_METER' },
      { mqttTopic: 'devices/mq2-a206', channel: 'GAS_MQ2' },
      { mqttTopic: 'devices/relay1-a206', channel: 'RELAY' },
    ]);
    const topics = acls.map((a) => `${a.acltype} ${a.topic}`);

    expect(topics).toContain(`publishClientSend ${P}/nodes/node-ab12/online`);
    expect(topics).toContain(`publishClientSend ${P}/devices/pzem-a206/energy`);
    expect(topics).not.toContain(
      `publishClientSend ${P}/devices/pzem-a206/sensor`,
    );
    expect(topics).not.toContain(
      `subscribePattern ${P}/devices/pzem-a206/command`,
    );
    expect(topics).toContain(`publishClientSend ${P}/devices/mq2-a206/sensor`);
    expect(topics).not.toContain(
      `publishClientSend ${P}/devices/mq2-a206/energy`,
    );
    expect(topics).toContain(
      `subscribePattern ${P}/devices/relay1-a206/command`,
    );
    expect(topics).toContain(
      `publishClientSend ${P}/devices/relay1-a206/energy`,
    );
  });

  it('never grants a topic outside the node organization', () => {
    const acls = aclsForNode(ORG, 'n', [
      { mqttTopic: 'devices/x', channel: null },
    ]);
    for (const acl of acls) expect(acl.topic.startsWith(`${P}/`)).toBe(true);
  });

  it('skips devices without a topic and grants everything to legacy devices without a channel', () => {
    const acls = aclsForNode(ORG, 'n', [
      { mqttTopic: null, channel: 'RELAY' },
      { mqttTopic: 'devices/x', channel: null },
    ]);
    expect(acls.map((a) => a.topic)).toEqual([
      `${P}/nodes/n/online`,
      `${P}/devices/x/status`,
      `${P}/devices/x/online`,
      `${P}/devices/x/energy`,
      `${P}/devices/x/sensor`,
      `${P}/devices/x/command`,
    ]);
  });
});
