/**
 * Isolamento entre organizações contra Postgres e Mosquitto reais.
 *
 *   npm run test:isolation
 *
 * Precisa de DATABASE_URL apontando para um banco DESCARTÁVEL já migrado
 * (`npx prisma migrate deploy`), JWT_SECRET, e MQTT_URL/MQTT_USERNAME/
 * MQTT_PASSWORD de um broker com o plugin dynamic-security (o docker compose
 * do projeto serve). Sem essas variáveis a suíte é pulada.
 *
 * Duas organizações recebem a mesma estrutura, inclusive o mesmo slug de
 * tópico MQTT, e cada teste confere que nada atravessa a fronteira: HTTP,
 * escopo do Prisma, broker (ACL) e WebSocket.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { connect, MqttClient } from 'mqtt';
import { io, Socket } from 'socket.io-client';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { MqttDynsecService } from '../../src/modules/mqtt/service/mqtt-dynsec.service';
import { hashPassword } from '../../src/utils/password.util';

const enabled =
  !!process.env.DATABASE_URL &&
  !!process.env.MQTT_URL &&
  !!process.env.JWT_SECRET;
const describeIf = enabled ? describe : describe.skip;

const PASSWORD = 'Isolation@123';
const SLUG = 'devices/shared-meter';

interface Tenant {
  orgId: string;
  slug: string;
  email: string;
  token: string;
  roomId: string;
  floorId: string;
  deviceId: string;
  relayId: string;
  node: { username: string; password: string; topicPrefix: string };
  mqtt: MqttClient;
}

async function waitFor<T>(
  fn: () => Promise<T>,
  ok: (v: T) => boolean,
  ms = 6000,
) {
  const end = Date.now() + ms;
  let v = await fn();
  while (!ok(v) && Date.now() < end) {
    await new Promise((r) => setTimeout(r, 150));
    v = await fn();
  }
  return v;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describeIf('tenant isolation (real Postgres + Mosquitto)', () => {
  let app: INestApplication;
  let baseUrl: string;
  const db = new PrismaClient();
  const run = randomBytes(3).toString('hex');
  const tenants: Record<'a' | 'b', Tenant> = {} as any;
  const http = () => request(app.getHttpServer());

  async function seedTenant(key: 'a' | 'b'): Promise<Tenant> {
    const slug = `iso-${key}-${run}`;
    const email = `admin@${slug}.test`;
    const org = await db.organization.create({
      data: { name: `Iso ${key}`, slug },
    });
    await db.user.create({
      data: {
        organizationId: org.id,
        email,
        name: `Admin ${key}`,
        cpf: `${run}${key}`.padEnd(11, '0').slice(0, 11),
        password: await hashPassword(PASSWORD),
        role: 'ADMIN',
      },
    });

    const login = await http()
      .post('/auth/login')
      .send({ email, password: PASSWORD, organization: slug });
    expect([200, 201]).toContain(login.status);
    const token = login.body.accessToken as string;
    const auth = { Authorization: `Bearer ${token}` };

    const building = await http()
      .post('/buildings')
      .set(auth)
      .send({ name: `B ${key}`, location: 'L' });
    const floor = await http()
      .post('/floors')
      .set(auth)
      .send({ buildingId: building.body.id, number: 1 });
    const room = await http()
      .post('/rooms')
      .set(auth)
      .send({ floorId: floor.body.id, name: `R ${key}`, type: 'CLASSROOM' });
    const nodeRes = await http()
      .post('/nodes')
      .set(auth)
      .send({ name: `ESP32 ${key}`, roomId: room.body.id });
    expect(nodeRes.status).toBe(201);

    const mkDevice = (
      name: string,
      type: string,
      channel: string,
      mqttTopic: string,
    ) =>
      http().post('/devices').set(auth).send({
        room: room.body.name,
        roomId: room.body.id,
        name,
        type,
        status: 'OFF',
        mqttTopic,
        nodeId: nodeRes.body.node.id,
        channel,
      });
    // Mesmo slug nas duas organizações: só é possível com o namespace por tenant.
    const meter = await mkDevice('Medidor', 'SENSOR', 'ENERGY_METER', SLUG);
    expect(meter.status).toBe(201);
    const relay = await mkDevice(
      'Luz',
      'LIGHT',
      'RELAY',
      'devices/shared-light',
    );
    expect(relay.status).toBe(201);

    const { username, password, topicPrefix } = nodeRes.body.credentials;
    expect(topicPrefix).toBe(`org/${org.id}`);
    const mqtt = connect(process.env.MQTT_URL!, {
      username,
      password,
      reconnectPeriod: 0,
    });
    await new Promise<void>((resolve, reject) => {
      mqtt.once('connect', () => resolve());
      mqtt.once('error', reject);
    });

    return {
      orgId: org.id,
      slug,
      email,
      token,
      roomId: room.body.id,
      floorId: floor.body.id,
      deviceId: meter.body.id,
      relayId: relay.body.id,
      node: { username, password, topicPrefix },
      mqtt,
    };
  }

  const readings = (deviceId: string) =>
    db.energyReading.count({ where: { deviceId } });
  const publish = (t: Tenant, topic: string, payload: unknown) =>
    new Promise<void>((resolve) =>
      t.mqtt.publish(topic, JSON.stringify(payload), { qos: 1 }, () =>
        resolve(),
      ),
    );

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.listen(0);
    baseUrl = await app.getUrl();
    // Espera o backend conectar e ter o papel no dynamic-security (na primeira
    // subida o broker o derruba uma vez ao conceder o papel).
    const dynsec = app.get(MqttDynsecService);
    await waitFor(
      async () => dynsec.isBackendGranted(),
      (v) => v,
      20000,
    );
    expect(dynsec.isBackendGranted()).toBe(true);
    await sleep(500);
    tenants.a = await seedTenant('a');
    tenants.b = await seedTenant('b');
  }, 60000);

  afterAll(async () => {
    for (const t of Object.values(tenants)) {
      t.mqtt?.end(true);
      await http()
        .delete(`/devices/${t.deviceId}`)
        .set({ Authorization: `Bearer ${t.token}` });
      await http()
        .delete(`/devices/${t.relayId}`)
        .set({ Authorization: `Bearer ${t.token}` });
      const nodes = await db.deviceNode.findMany({
        where: { organizationId: t.orgId },
      });
      for (const n of nodes) {
        await http()
          .delete(`/nodes/${n.id}`)
          .set({ Authorization: `Bearer ${t.token}` });
      }
    }
    await app?.close();
    await db.$disconnect();
  }, 30000);

  describe('HTTP + Prisma scope', () => {
    it('lists only the caller organization devices', async () => {
      const { a, b } = tenants;
      const res = await http()
        .get('/devices')
        .set({ Authorization: `Bearer ${a.token}` })
        .expect(200);
      const ids = (Array.isArray(res.body) ? res.body : res.body.data).map(
        (d: any) => d.id,
      );
      expect(ids).toContain(a.deviceId);
      expect(ids).not.toContain(b.deviceId);
      expect(ids).not.toContain(b.relayId);
    });

    it.each([
      ['GET', (b: Tenant) => `/devices/${b.deviceId}`],
      ['GET', (b: Tenant) => `/rooms/${b.roomId}`],
      ['GET', (b: Tenant) => `/floors/${b.floorId}`],
      ['GET', (b: Tenant) => `/sensors/rooms/${b.roomId}`],
    ])('%s %s of the other tenant is not found', async (_m, path) => {
      const res = await http()
        .get(path(tenants.b))
        .set({ Authorization: `Bearer ${tenants.a.token}` });
      expect([403, 404]).toContain(res.status);
    });

    it('returns no readings for a device of the other tenant', async () => {
      const { a, b } = tenants;
      await db.energyReading.create({
        data: {
          organizationId: b.orgId,
          deviceId: b.deviceId,
          energyWh: 1,
          powerW: 10,
        },
      });
      const res = await http()
        .get(`/energy/devices/${b.deviceId}/readings`)
        .set({ Authorization: `Bearer ${a.token}` });
      // Filtrado pelo escopo: ou não existe (404) ou volta vazio.
      if (res.status === 200) expect(res.body).toEqual([]);
      else expect(res.status).toBe(404);
    });

    it('cannot control, update or delete another tenant device', async () => {
      const { a, b } = tenants;
      const auth = { Authorization: `Bearer ${a.token}` };
      expect(
        (
          await http()
            .post(`/devices/${b.relayId}/control`)
            .set(auth)
            .send({ command: 'on' })
        ).status,
      ).toBe(404);
      expect(
        (
          await http()
            .put(`/devices/${b.relayId}`)
            .set(auth)
            .send({ name: 'pwned' })
        ).status,
      ).toBe(404);
      expect(
        (await http().delete(`/devices/${b.relayId}`).set(auth)).status,
      ).toBe(404);
      const relay = await db.device.findUnique({ where: { id: b.relayId } });
      expect(relay?.name).toBe('Luz');
      expect(relay?.status).toBe('OFF');
    });

    it('cannot attach a record to a parent of another tenant', async () => {
      const res = await http()
        .post('/rooms')
        .set({ Authorization: `Bearer ${tenants.a.token}` })
        .send({
          floorId: tenants.b.floorId,
          name: 'Invasão',
          type: 'CLASSROOM',
        });
      expect(res.status).toBe(400);
      expect(await db.room.count({ where: { name: 'Invasão' } })).toBe(0);
    });

    it('does not let a user log into another organization', async () => {
      const res = await http()
        .post('/auth/login')
        .send({
          email: tenants.a.email,
          password: PASSWORD,
          organization: tenants.b.slug,
        });
      expect(res.status).toBe(401);
    });
  });

  describe('MQTT namespace + broker ACL', () => {
    it('routes the same slug to the publishing tenant only', async () => {
      const { a, b } = tenants;
      const beforeB = await readings(b.deviceId);
      await publish(a, `${a.node.topicPrefix}/${SLUG}/energy`, {
        powerW: 100,
        energyTotalWh: 500,
      });
      expect(
        await waitFor(
          () => readings(a.deviceId),
          (n) => n >= 1,
        ),
      ).toBeGreaterThanOrEqual(1);
      await sleep(500);
      expect(await readings(b.deviceId)).toBe(beforeB);
    });

    it('drops a publish into another organization prefix at the broker', async () => {
      const { a, b } = tenants;
      const beforeB = await readings(b.deviceId);
      await publish(a, `${b.node.topicPrefix}/${SLUG}/energy`, {
        powerW: 999,
        energyTotalWh: 9999,
      });
      await publish(a, `devices/shared-meter/energy`, {
        powerW: 999,
        energyTotalWh: 9999,
      });
      await sleep(1500);
      expect(await readings(b.deviceId)).toBe(beforeB);
    });

    it('refuses a subscription to another tenant command topic', async () => {
      const { a, b } = tenants;
      // SUBACK 0x80: o mqtt.js v5 devolve como erro, versões antigas como qos 128.
      const outcome = await new Promise<number>((resolve) =>
        a.mqtt.subscribe(
          `${b.node.topicPrefix}/devices/shared-light/command`,
          { qos: 1 },
          (err, g) => resolve(err ? 128 : (g?.[0]?.qos ?? -1)),
        ),
      );
      expect(outcome).toBe(128);
    });

    it('delivers a command only to the node of the owning tenant', async () => {
      const { a, b } = tenants;
      const got: Record<string, string[]> = { a: [], b: [] };
      a.mqtt.on('message', (topic) => got.a.push(topic));
      b.mqtt.on('message', (topic) => got.b.push(topic));
      await new Promise((r) =>
        a.mqtt.subscribe(
          `${a.node.topicPrefix}/devices/shared-light/command`,
          { qos: 1 },
          r,
        ),
      );
      await new Promise((r) =>
        b.mqtt.subscribe(
          `${b.node.topicPrefix}/devices/shared-light/command`,
          { qos: 1 },
          r,
        ),
      );

      await http()
        .post(`/devices/${b.relayId}/control`)
        .set({ Authorization: `Bearer ${b.token}` })
        .send({ command: 'on' })
        .expect((r) => expect([200, 201]).toContain(r.status));

      await waitFor(
        async () => got.b.length,
        (n) => n >= 1,
      );
      expect(got.b).toEqual([
        `${b.node.topicPrefix}/devices/shared-light/command`,
      ]);
      expect(got.a).toEqual([]);
    });
  });

  describe('WebSocket rooms', () => {
    it('emits telemetry only to sockets of the same organization', async () => {
      const { a, b } = tenants;
      const open = (t: Tenant) =>
        new Promise<Socket>((resolve, reject) => {
          const s = io(baseUrl, {
            auth: { token: t.token },
            transports: ['websocket'],
          });
          s.once('connect', () => resolve(s));
          s.once('connect_error', reject);
        });
      const sa = await open(a);
      const sb = await open(b);
      const events: Record<string, string[]> = { a: [], b: [] };
      sa.on('energy:update', (e) => events.a.push(e.deviceId));
      sb.on('energy:update', (e) => events.b.push(e.deviceId));
      await sleep(300);

      await publish(a, `${a.node.topicPrefix}/${SLUG}/energy`, {
        powerW: 120,
        energyTotalWh: 501,
      });
      await waitFor(
        async () => events.a.length,
        (n) => n >= 1,
      );
      await sleep(500);
      sa.close();
      sb.close();

      expect(events.a).toEqual([a.deviceId]);
      expect(events.b).toEqual([]);
    });

    it('rejects a socket with a refresh token', async () => {
      const login = await http()
        .post('/auth/login')
        .send({
          email: tenants.a.email,
          password: PASSWORD,
          organization: tenants.a.slug,
        });
      const s = io(baseUrl, {
        auth: { token: login.body.refreshToken },
        transports: ['websocket'],
      });
      const disconnected = await new Promise<boolean>((resolve) => {
        s.once('disconnect', () => resolve(true));
        setTimeout(() => resolve(false), 3000);
      });
      s.close();
      expect(disconnected).toBe(true);
    });
  });
});
