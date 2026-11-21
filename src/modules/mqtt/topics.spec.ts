import { orgTopic, parseInboundTopic } from './topics';

const ORG = '00000000-0000-0000-0000-000000000001';

describe('parseInboundTopic', () => {
  it('extracts tenant, device and suffix', () => {
    expect(parseInboundTopic(`org/${ORG}/devices/pzem-a206/energy`)).toEqual({
      kind: 'device',
      organizationId: ORG,
      mqttTopic: 'devices/pzem-a206',
      suffix: 'energy',
    });
    expect(parseInboundTopic(`org/${ORG}/nodes/node-ab12/online`)).toEqual({
      kind: 'node',
      organizationId: ORG,
      mqttUsername: 'node-ab12',
    });
  });

  it('rejects the legacy namespace, bad org ids and unknown suffixes', () => {
    expect(parseInboundTopic('devices/x/energy')).toBeNull();
    expect(parseInboundTopic('org/not-a-uuid/devices/x/energy')).toBeNull();
    expect(parseInboundTopic(`org/${ORG}/devices/x/command`)).toBeNull();
    expect(parseInboundTopic(`org/${ORG}/devices/x/energy/extra`)).toBeNull();
    expect(parseInboundTopic(`org/${ORG}/nodes/n/status`)).toBeNull();
  });

  it('builds outbound topics under the organization prefix', () => {
    expect(orgTopic(ORG, 'devices/x/command')).toBe(
      `org/${ORG}/devices/x/command`,
    );
  });
});
