import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

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
    console.log(`Root user already exists: ${rootEmail}`);
    return;
  }

  for (const userData of users) {
    const hashedPassword = await hashPassword(userData.password);

    await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
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
  const existingBuildings = await prisma.building.findMany();
  if (existingBuildings.length > 0) {
    console.log(
      `${existingBuildings.length} buildings already exist. Skipping building seeding.`,
    );
    return;
  }

  for (const buildingData of buildings) {
    // Buscar building existente por nome
    let building = await prisma.building.findFirst({
      where: { name: buildingData.name },
    });

    // Se não existir, criar
    if (!building) {
      building = await prisma.building.create({
        data: {
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
  const existingDevices = await prisma.device.findMany();
  if (existingDevices.length > 0) {
    console.log(
      `${existingDevices.length} devices already exist. Skipping device seeding.`,
    );
    return;
  }

  for (const roomDevice of roomDevices) {
    const room = await prisma.room.findFirst({
      where: { name: roomDevice.roomName },
    });

    if (!room) {
      console.warn(`Room not found: ${roomDevice.roomName}, skipping devices`);
      continue;
    }

    for (const deviceData of roomDevice.devices) {
      // Buscar device existente por mqttTopic
      const existingDevice = await prisma.device.findFirst({
        where: { mqttTopic: deviceData.mqttTopic },
      });

      // Se não existir, criar
      if (!existingDevice) {
        await prisma.device.create({
          data: {
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
  const existingAutomations = await prisma.automation.findMany();
  if (existingAutomations.length > 0) {
    console.log(
      `${existingAutomations.length} automations already exist. Skipping automation seeding.`,
    );
    return;
  }

  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });

  if (!adminUser) {
    console.warn('No admin user found, skipping automations');
    return;
  }

  for (const autoData of automations) {
    // Buscar automation existente por nome
    const existingAuto = await prisma.automation.findFirst({
      where: { name: autoData.name },
    });

    // Se não existir, criar
    if (!existingAuto) {
      await prisma.automation.create({
        data: {
          name: autoData.name,
          description: autoData.description,
          creatorId: adminUser.id,
          triggerType: autoData.triggerType,
          cron: autoData.cron,
          action: JSON.stringify(autoData.action),
          enabled: autoData.enabled,
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

  const devices = await prisma.device.findMany({
    where: {
      type: {
        in: ['LIGHT', 'AC', 'PROJECTOR'],
      },
    },
    take: 50, // Aumentado de 10 para 50 dispositivos
  });

  console.log('Verifying if devices already have energy readings...');
  const existingReadings = await prisma.energyReading.findFirst();
  if (existingReadings) {
    console.log(
      `Energy readings already exist. Skipping sample energy readings seeding.`,
    );
    return;
  }

  if (devices.length === 0) {
    console.warn('No devices found for energy readings');
    return;
  }

  const now = new Date();
  let readingCount = 0;

  for (const device of devices) {
    // Criar 5 leituras para cada dispositivo (últimas 24h)
    for (let i = 0; i < 5; i++) {
      const timestamp = new Date(now.getTime() - i * 4 * 60 * 60 * 1000); // -4h cada
      const baseValue =
        device.type === 'AC' ? 800 : device.type === 'PROJECTOR' ? 200 : 40;
      const randomVariation = Math.random() * 0.2 - 0.1; // ±10%
      const valueWh = baseValue * (1 + randomVariation);

      await prisma.energyReading.create({
        data: {
          deviceId: device.id,
          valueWh: parseFloat(valueWh.toFixed(2)),
          voltage: 220 + Math.random() * 10 - 5,
          current: parseFloat((valueWh / 220).toFixed(2)),
          timestamp,
        },
      });

      readingCount++;
    }
  }

  console.log(`✅ ${readingCount} sample energy readings created`);
}

// Main seed function
async function main() {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   AutoUni Database Seeder');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  try {
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
