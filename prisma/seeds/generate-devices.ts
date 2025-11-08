/**
 * Script para gerar devices.json com dispositivos para todas as 190 salas
 * 
 * Padrão por tipo de sala:
 * - CLASSROOM: 5 dispositivos (2 luzes, 1 AC, 1 projetor, 1 sensor)
 * - LAB: 7 dispositivos (3 luzes, 1 AC, 1 sensor temp, 1 sensor presença, 1 fechadura)
 * - OFFICE: 4 dispositivos (1 luz, 1 AC, 1 sensor presença, 1 fechadura)
 * - AUDITORIUM: 8 dispositivos (3 luzes, 1 AC, 1 projetor, 1 sistema som, 1 sensor, 1 fechadura)
 * - LIBRARY: 6 dispositivos (3 luzes, 2 AC, 1 sensor presença)
 * - OTHER: 3 dispositivos (1 luz, 1 AC, 1 sensor)
 */

import * as fs from 'fs';
import * as path from 'path';

type RoomType = 'CLASSROOM' | 'LAB' | 'OFFICE' | 'AUDITORIUM' | 'LIBRARY' | 'OTHER';
type DeviceType = 'LIGHT' | 'AC' | 'PROJECTOR' | 'SPEAKER' | 'LOCK' | 'SENSOR' | 'OTHER';

interface Device {
  name: string;
  type: DeviceType;
  status: 'ON' | 'OFF';
  mqttTopic: string;
  metadata?: Record<string, any>;
}

interface RoomDevices {
  roomName: string;
  devices: Device[];
}

interface Room {
  name: string;
  type: RoomType;
}

interface Floor {
  number: number;
  name: string;
  rooms: Room[];
}

interface Building {
  name: string;
  description: string;
  location: string;
  floors: Floor[];
}

// Carregar buildings.json
const buildingsPath = path.join(__dirname, 'buildings.json');
const buildings: Building[] = JSON.parse(fs.readFileSync(buildingsPath, 'utf-8'));

// Função para gerar dispositivos baseado no tipo de sala
function generateDevicesForRoom(roomName: string, roomType: RoomType): Device[] {
  const devices: Device[] = [];
  const roomLower = roomName.toLowerCase();

  switch (roomType) {
    case 'CLASSROOM':
      devices.push(
        {
          name: `Lâmpada LED Principal ${roomName}`,
          type: 'LIGHT',
          status: 'OFF',
          mqttTopic: `devices/light-${roomLower}-main`,
          metadata: { power: '40W', brand: 'Philips' }
        },
        {
          name: `Lâmpada LED Auxiliar ${roomName}`,
          type: 'LIGHT',
          status: 'OFF',
          mqttTopic: `devices/light-${roomLower}-aux`,
          metadata: { power: '20W', brand: 'Philips' }
        },
        {
          name: `Ar Condicionado ${roomName}`,
          type: 'AC',
          status: 'OFF',
          mqttTopic: `devices/ac-${roomLower}`,
          metadata: { power: '12000 BTU', brand: 'LG' }
        },
        {
          name: `Projetor ${roomName}`,
          type: 'PROJECTOR',
          status: 'OFF',
          mqttTopic: `devices/projector-${roomLower}`,
          metadata: { resolution: '1920x1080', brand: 'Epson' }
        },
        {
          name: `Sensor Presença ${roomName}`,
          type: 'SENSOR',
          status: 'ON',
          mqttTopic: `devices/sensor-presence-${roomLower}`,
          metadata: { type: 'PIR', range: '8m' }
        }
      );
      break;

    case 'LAB':
      devices.push(
        {
          name: `Lâmpada LED Principal ${roomName}`,
          type: 'LIGHT',
          status: 'OFF',
          mqttTopic: `devices/light-${roomLower}-main`,
          metadata: { power: '60W', brand: 'Philips' }
        },
        {
          name: `Lâmpada LED Bancada 1 ${roomName}`,
          type: 'LIGHT',
          status: 'OFF',
          mqttTopic: `devices/light-${roomLower}-bench1`,
          metadata: { power: '40W', brand: 'Philips' }
        },
        {
          name: `Lâmpada LED Bancada 2 ${roomName}`,
          type: 'LIGHT',
          status: 'OFF',
          mqttTopic: `devices/light-${roomLower}-bench2`,
          metadata: { power: '40W', brand: 'Philips' }
        },
        {
          name: `Ar Condicionado ${roomName}`,
          type: 'AC',
          status: 'OFF',
          mqttTopic: `devices/ac-${roomLower}`,
          metadata: { power: '18000 BTU', brand: 'Samsung' }
        },
        {
          name: `Sensor Temperatura ${roomName}`,
          type: 'SENSOR',
          status: 'ON',
          mqttTopic: `devices/sensor-temp-${roomLower}`,
          metadata: { type: 'Temperature/Humidity', range: '-10°C to 50°C' }
        },
        {
          name: `Sensor Presença ${roomName}`,
          type: 'SENSOR',
          status: 'ON',
          mqttTopic: `devices/sensor-presence-${roomLower}`,
          metadata: { type: 'PIR', range: '10m' }
        },
        {
          name: `Fechadura Inteligente ${roomName}`,
          type: 'LOCK',
          status: 'OFF',
          mqttTopic: `devices/lock-${roomLower}`,
          metadata: { type: 'Smart Lock', brand: 'Yale' }
        }
      );
      break;

    case 'OFFICE':
      devices.push(
        {
          name: `Iluminação ${roomName}`,
          type: 'LIGHT',
          status: 'OFF',
          mqttTopic: `devices/light-${roomLower}`,
          metadata: { power: '30W', brand: 'Philips' }
        },
        {
          name: `Ar Condicionado ${roomName}`,
          type: 'AC',
          status: 'OFF',
          mqttTopic: `devices/ac-${roomLower}`,
          metadata: { power: '9000 BTU', brand: 'LG' }
        },
        {
          name: `Sensor Presença ${roomName}`,
          type: 'SENSOR',
          status: 'ON',
          mqttTopic: `devices/sensor-presence-${roomLower}`,
          metadata: { type: 'PIR', range: '6m' }
        },
        {
          name: `Fechadura Inteligente ${roomName}`,
          type: 'LOCK',
          status: 'OFF',
          mqttTopic: `devices/lock-${roomLower}`,
          metadata: { type: 'Smart Lock', brand: 'Yale' }
        }
      );
      break;

    case 'AUDITORIUM':
      devices.push(
        {
          name: `Iluminação Principal ${roomName}`,
          type: 'LIGHT',
          status: 'OFF',
          mqttTopic: `devices/light-${roomLower}-main`,
          metadata: { power: '100W', brand: 'Philips' }
        },
        {
          name: `Iluminação Palco ${roomName}`,
          type: 'LIGHT',
          status: 'OFF',
          mqttTopic: `devices/light-${roomLower}-stage`,
          metadata: { power: '200W', brand: 'Philips Stage' }
        },
        {
          name: `Iluminação Plateia ${roomName}`,
          type: 'LIGHT',
          status: 'OFF',
          mqttTopic: `devices/light-${roomLower}-audience`,
          metadata: { power: '80W', brand: 'Philips' }
        },
        {
          name: `Ar Condicionado Central ${roomName}`,
          type: 'AC',
          status: 'OFF',
          mqttTopic: `devices/ac-${roomLower}`,
          metadata: { power: '36000 BTU', brand: 'Carrier' }
        },
        {
          name: `Projetor 4K ${roomName}`,
          type: 'PROJECTOR',
          status: 'OFF',
          mqttTopic: `devices/projector-${roomLower}`,
          metadata: { resolution: '4K', brand: 'Sony', lumens: 5000 }
        },
        {
          name: `Sistema de Som ${roomName}`,
          type: 'SPEAKER',
          status: 'OFF',
          mqttTopic: `devices/speaker-${roomLower}`,
          metadata: { power: '500W', channels: '5.1' }
        },
        {
          name: `Sensor Ocupação ${roomName}`,
          type: 'SENSOR',
          status: 'ON',
          mqttTopic: `devices/sensor-occupancy-${roomLower}`,
          metadata: { type: 'Occupancy', capacity: 200 }
        },
        {
          name: `Fechadura Inteligente ${roomName}`,
          type: 'LOCK',
          status: 'OFF',
          mqttTopic: `devices/lock-${roomLower}`,
          metadata: { type: 'Smart Lock', brand: 'Yale Commercial' }
        }
      );
      break;

    case 'LIBRARY':
      devices.push(
        {
          name: `Iluminação Geral ${roomName}`,
          type: 'LIGHT',
          status: 'ON',
          mqttTopic: `devices/light-${roomLower}-main`,
          metadata: { power: '60W', brand: 'Philips' }
        },
        {
          name: `Iluminação Estantes ${roomName}`,
          type: 'LIGHT',
          status: 'ON',
          mqttTopic: `devices/light-${roomLower}-shelves`,
          metadata: { power: '40W', brand: 'Philips' }
        },
        {
          name: `Iluminação Leitura ${roomName}`,
          type: 'LIGHT',
          status: 'ON',
          mqttTopic: `devices/light-${roomLower}-reading`,
          metadata: { power: '30W', brand: 'Philips' }
        },
        {
          name: `Ar Condicionado 1 ${roomName}`,
          type: 'AC',
          status: 'ON',
          mqttTopic: `devices/ac-${roomLower}-1`,
          metadata: { power: '24000 BTU', brand: 'LG' }
        },
        {
          name: `Ar Condicionado 2 ${roomName}`,
          type: 'AC',
          status: 'ON',
          mqttTopic: `devices/ac-${roomLower}-2`,
          metadata: { power: '24000 BTU', brand: 'LG' }
        },
        {
          name: `Sensor Presença ${roomName}`,
          type: 'SENSOR',
          status: 'ON',
          mqttTopic: `devices/sensor-presence-${roomLower}`,
          metadata: { type: 'PIR', range: '12m' }
        }
      );
      break;

    case 'OTHER':
      devices.push(
        {
          name: `Iluminação ${roomName}`,
          type: 'LIGHT',
          status: 'OFF',
          mqttTopic: `devices/light-${roomLower}`,
          metadata: { power: '30W', brand: 'Philips' }
        },
        {
          name: `Ar Condicionado ${roomName}`,
          type: 'AC',
          status: 'OFF',
          mqttTopic: `devices/ac-${roomLower}`,
          metadata: { power: '9000 BTU', brand: 'LG' }
        },
        {
          name: `Sensor Presença ${roomName}`,
          type: 'SENSOR',
          status: 'ON',
          mqttTopic: `devices/sensor-presence-${roomLower}`,
          metadata: { type: 'PIR', range: '8m' }
        }
      );
      break;
  }

  return devices;
}

// Gerar todos os dispositivos
const allRoomDevices: RoomDevices[] = [];

buildings.forEach(building => {
  building.floors.forEach(floor => {
    floor.rooms.forEach(room => {
      const devices = generateDevicesForRoom(room.name, room.type);
      allRoomDevices.push({
        roomName: room.name,
        devices
      });
    });
  });
});

// Salvar em devices.json
const outputPath = path.join(__dirname, 'devices.json');
fs.writeFileSync(outputPath, JSON.stringify(allRoomDevices, null, 2));

console.log(`✅ Generated devices for ${allRoomDevices.length} rooms`);
console.log(`📊 Total devices: ${allRoomDevices.reduce((acc, rd) => acc + rd.devices.length, 0)}`);
console.log(`💾 Saved to: ${outputPath}`);
