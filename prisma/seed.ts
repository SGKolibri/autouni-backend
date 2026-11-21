import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Organização criada pela migração 20261117120000_add_organizations. O seed
// popula só ela; outras organizações nascem por `npm run org:create`.
const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';
const organizationId = DEFAULT_ORG_ID;

async function seedOrganization() {
  await prisma.organization.upsert({
    where: { id: DEFAULT_ORG_ID },
    update: {},
    create: { id: DEFAULT_ORG_ID, name: 'Organização padrão', slug: 'default' },
  });
}

// Interfaces para tipagem dos dados do seed
interface SeedUser {
  email: string;
  name: string;
  password: string;
  role: 'ADMIN' | 'COORDINATOR' | 'TECHNICIAN' | 'VIEWER';
  phone?: string;
  cpf?: string;
}

interface SeedRoom {
  name: string;
  type: 'CLASSROOM' | 'LAB' | 'OFFICE' | 'AUDITORIUM' | 'LIBRARY' | 'OTHER';
}

interface SeedFloor {
  number: number;
  name: string;
  rooms: SeedRoom[];
}

interface SeedBuilding {
  name: string;
  description: string;
  location: string;
  floors: SeedFloor[];
}

interface SeedDevice {
  name: string;
  type: 'LIGHT' | 'AC' | 'PROJECTOR' | 'SPEAKER' | 'LOCK' | 'SENSOR' | 'OTHER';
  status: 'ON' | 'OFF' | 'STANDBY' | 'ERROR';
  mqttTopic: string;
  metadata?: Record<string, any>;
}

interface SeedRoomDevice {
  roomName: string;
  devices: SeedDevice[];
}

interface SeedAutomation {
  name: string;
  description: string;
  triggerType: 'SCHEDULE' | 'CONDITION' | 'MANUAL';
  cron?: string;
  action: Record<string, any>;
  enabled: boolean;
}

// Utility: Carregar JSON
function loadJSON<T>(filename: string): T {
  // Quando compilado, o arquivo estará em dist/prisma/seed.js
  // Mas os JSONs estão em prisma/seeds/
  const isCompiled = __filename.endsWith('.js');
  const basePath = isCompiled
    ? path.join(__dirname, '../../prisma/seeds') // dist/prisma -> prisma/seeds
    : path.join(__dirname, 'seeds'); // prisma -> prisma/seeds

  const filePath = path.join(basePath, filename);
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(fileContent);
}

// Utility: Hash de senha
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

// Seed: Usuários
async function seedUsers() {
  console.log('🌱 Seeding users...');

  const users = loadJSON<SeedUser[]>('users.json');

  // Adicionar usuário root das variáveis de ambiente (se existir)
  const rootEmail = process.env.ROOT_EMAIL;
  const rootPassword = process.env.ROOT_PASSWORD;

  if (rootEmail && rootPassword) {
    const rootExists = users.find((u) => u.email === rootEmail);
    if (!rootExists) {
      users.unshift({
        email: rootEmail,
        name: 'Root Administrator',
        password: rootPassword,
        role: 'ADMIN',
        phone: undefined,
        cpf: undefined,
      });
    }
  }

  for (const userData of users) {
    const hashedPassword = await hashPassword(userData.password);

    await prisma.user.upsert({
      where: { organizationId_email: { organizationId, email: userData.email } },
      update: {},
      create: {
        organizationId,
        email: userData.email,
        name: userData.name,
        password: hashedPassword,
        role: userData.role,
        phone: userData.phone,
        cpf: userData.cpf,
      },
    });

    console.log(`  ✓ User created: ${userData.email} (${userData.role})`);
  }

  console.log(`✅ ${users.length} users seeded`);
}

// Seed: Buildings, Floors, Rooms
async function seedBuildings() {
  console.log('🌱 Seeding buildings, floors, and rooms...');

  const buildings = loadJSON<SeedBuilding[]>('buildings.json');

  console.log('Verifying if buildings exist or need to be created...');
  const existingBuildings = await prisma.building.findMany({ where: { organizationId } });
  if (existingBuildings.length > 0) {
    console.log(
      `${existingBuildings.length} buildings already exist. Skipping building seeding.`,
    );
    return;
  }

  for (const buildingData of buildings) {
    // Buscar building existente por nome
    let building = await prisma.building.findFirst({
      where: { organizationId, name: buildingData.name },
    });

    // Se não existir, criar
    if (!building) {
      building = await prisma.building.create({
        data: {
          organizationId,
          name: buildingData.name,
          description: buildingData.description,
          location: buildingData.location,
        },
      });
    }

    console.log(`  ✓ Building: ${building.name}`);

    for (const floorData of buildingData.floors) {
      // Buscar floor existente
      let floor = await prisma.floor.findFirst({
        where: {
          buildingId: building.id,
          number: floorData.number,
        },
      });

      // Se não existir, criar
      if (!floor) {
        floor = await prisma.floor.create({
          data: {
            organizationId,
            buildingId: building.id,
            number: floorData.number,
            name: floorData.name,
          },
        });
      }

      console.log(`    ✓ Floor ${floor.number}: ${floor.name}`);

      for (const roomData of floorData.rooms) {
        // Buscar room existente
        const existingRoom = await prisma.room.findFirst({
          where: {
            floorId: floor.id,
            name: roomData.name,
          },
        });

        // Se não existir, criar
        if (!existingRoom) {
          await prisma.room.create({
            data: {
              organizationId,
              floorId: floor.id,
              name: roomData.name,
              type: roomData.type,
            },
          });
        }

        console.log(`      ✓ Room: ${roomData.name} (${roomData.type})`);
      }
    }
  }

  console.log(`✅ Buildings structure seeded`);
}

// Seed: Devices
async function seedDevices() {
  console.log('🌱 Seeding devices...');

  const roomDevices = loadJSON<SeedRoomDevice[]>('devices.json');

  console.log('Verifying if devices exist or need to be created...');
  const existingDevices = await prisma.device.findMany({ where: { organizationId } });
  if (existingDevices.length > 0) {
    console.log(
      `${existingDevices.length} devices already exist. Skipping device seeding.`,
    );
    return;
  }

  for (const roomDevice of roomDevices) {
    const room = await prisma.room.findFirst({
      where: { organizationId, name: roomDevice.roomName },
    });

    if (!room) {
      console.warn(`Room not found: ${roomDevice.roomName}, skipping devices`);
      continue;
    }

    for (const deviceData of roomDevice.devices) {
      // Buscar device existente por mqttTopic
      const existingDevice = await prisma.device.findFirst({
        where: { organizationId, mqttTopic: deviceData.mqttTopic },
      });

      // Se não existir, criar
      if (!existingDevice) {
        await prisma.device.create({
          data: {
            organizationId,
            name: deviceData.name,
            roomId: room.id,
            type: deviceData.type,
            status: deviceData.status,
            mqttTopic: deviceData.mqttTopic,
            metadata: deviceData.metadata || {},
          },
        });
      }

      console.log(`  ✓ Device: ${deviceData.name} in ${roomDevice.roomName}`);
    }
  }

  console.log(`✅ Devices seeded`);
}

// Seed: Automations
async function seedAutomations() {
  console.log('🌱 Seeding automations...');

  const automations = loadJSON<SeedAutomation[]>('automations.json');

  console.log('Verifying if automations exist or need to be created...');
  const existingAutomations = await prisma.automation.findMany({ where: { organizationId } });
  if (existingAutomations.length > 0) {
    console.log(
      `${existingAutomations.length} automations already exist. Skipping automation seeding.`,
    );
    return;
  }

  const adminUser = await prisma.user.findFirst({
    where: { organizationId, role: 'ADMIN' },
  });

  if (!adminUser) {
    console.warn('No admin user found, skipping automations');
    return;
  }

  for (const autoData of automations) {
    // Buscar automation existente por nome
    const existingAuto = await prisma.automation.findFirst({
      where: { organizationId, name: autoData.name },
    });

    // Se não existir, criar
    // As ações de exemplo publicam em tópicos de grupo (devices/lights/all/...)
    // que nenhum device assina, e o backend só aceita comando para um device da
    // organização. Elas entram desativadas até serem apontadas para devices reais.
    const topic: unknown = autoData.action?.topic;
    const actionIsValid =
      typeof autoData.action?.deviceId === 'string' ||
      (typeof topic === 'string' && /^devices\/[A-Za-z0-9_-]+\/command$/.test(topic));

    if (!existingAuto) {
      await prisma.automation.create({
        data: {
          organizationId,
          name: autoData.name,
          description: actionIsValid
            ? autoData.description
            : `${autoData.description} (desativada: aponte a ação para um dispositivo)`,
          creatorId: adminUser.id,
          triggerType: autoData.triggerType,
          cron: autoData.cron,
          action: JSON.stringify(autoData.action),
          enabled: autoData.enabled && actionIsValid,
        },
      });
    }

    console.log(`  ✓ Automation: ${autoData.name} (${autoData.triggerType})`);
  }

  console.log(`✅ ${automations.length} automations seeded`);
}

// Seed: Sample Energy Readings (opcional - para demonstração)
async function seedSampleEnergyReadings() {
  console.log('🌱 Seeding sample energy readings...');

  console.log('Verifying if devices already have energy readings...');
  const existingReadings = await prisma.energyReading.findFirst({ where: { organizationId } });
  if (existingReadings) {
    console.log(
      `Energy readings already exist. Skipping sample energy readings seeding.`,
    );
    return;
  }

  const devices = await prisma.device.findMany({
    where: {
      organizationId,
      type: { in: ['LIGHT', 'AC', 'PROJECTOR'] },
      status: 'ON',
    },
  });

  if (devices.length === 0) {
    console.warn('No ON devices of type LIGHT/AC/PROJECTOR found for energy readings');
    return;
  }

  const now = new Date();
  // Midnight of today (local server time) — all readings will fall within today's window
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0, 0, 0, 0,
  );
  const elapsedMs = now.getTime() - todayStart.getTime();

  const READINGS_PER_DEVICE = 5;
  let readingCount = 0;

  // Cada leitura cobre o intervalo desde a anterior: energyWh = potência x
  // duração do intervalo, que é exatamente o que as agregações somam.
  const intervalHours = elapsedMs / (READINGS_PER_DEVICE + 1) / 3_600_000;

  for (const device of devices) {
    const basePowerW =
      device.type === 'AC' ? 800 : device.type === 'PROJECTOR' ? 200 : 40;

    for (let i = 0; i < READINGS_PER_DEVICE; i++) {
      const fraction = (i + 1) / (READINGS_PER_DEVICE + 1);
      const timestamp = new Date(todayStart.getTime() + fraction * elapsedMs);
      const jitter = 1 + (Math.random() * 0.2 - 0.1); // ±10%
      const powerW = parseFloat((basePowerW * jitter).toFixed(1));
      const voltage = parseFloat((215 + Math.random() * 10).toFixed(1));

      await prisma.energyReading.create({
        data: {
          organizationId,
          deviceId: device.id,
          powerW,
          energyWh: parseFloat((powerW * intervalHours).toFixed(3)),
          voltage,
          current: parseFloat((powerW / voltage).toFixed(3)),
          frequency: 60,
          powerFactor: 0.95,
          timestamp,
        },
      });

      readingCount++;
    }
  }

  console.log(
    `✅ ${readingCount} energy readings created (${devices.length} devices × ${READINGS_PER_DEVICE}, all within today)`,
  );
}

// Seed: limites padrão de gás (leitura bruta do ADC de 12 bits do ESP32).
// Valores de partida; calibrar depois do burn-in de 24-48 h dos sensores.
async function seedSensorThresholds() {
  console.log('🌱 Seeding default gas thresholds...');
  const defaults = [
    { kind: 'GAS_MQ2' as const, warnAt: 1500, alarmAt: 1800, clearAt: 1300 },
    { kind: 'GAS_MQ135' as const, warnAt: 1500, alarmAt: 1800, clearAt: 1300 },
  ];
  for (const t of defaults) {
    const existing = await prisma.sensorThreshold.findFirst({
      where: { organizationId, kind: t.kind, deviceId: null },
    });
    if (!existing) {
      await prisma.sensorThreshold.create({ data: { organizationId, ...t } });
    }
  }
  console.log('✅ Gas thresholds seeded');
}

// Main seed function
async function main() {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   AutoUni Database Seeder');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  try {
    await seedOrganization();
    await seedUsers();
    console.log('');

    await seedBuildings();
    console.log('');

    await seedDevices();
    console.log('');

    await seedAutomations();
    console.log('');

    await seedSampleEnergyReadings();
    console.log('');

    await seedSensorThresholds();
    console.log('');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ All seed data created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    // Estatísticas finais
    const stats = await Promise.all([
      prisma.user.count(),
      prisma.building.count(),
      prisma.floor.count(),
      prisma.room.count(),
      prisma.device.count(),
      prisma.automation.count(),
      prisma.energyReading.count(),
    ]);

    console.log('📊 Database Statistics:');
    console.log(`   Users: ${stats[0]}`);
    console.log(`   Buildings: ${stats[1]}`);
    console.log(`   Floors: ${stats[2]}`);
    console.log(`   Rooms: ${stats[3]}`);
    console.log(`   Devices: ${stats[4]}`);
    console.log(`   Automations: ${stats[5]}`);
    console.log(`   Energy Readings: ${stats[6]}`);
    console.log('');
  } catch (error) {
    console.error('');
    console.error('❌ Error seeding database:', error);
    console.error('');
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
