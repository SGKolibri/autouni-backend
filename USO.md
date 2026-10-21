# AutoUni Backend - Exemplos de Uso

Este documento contém exemplos práticos e detalhados de como usar a API do AutoUni Backend.

---

## 📋 Índice

- [Autenticação](#autenticação)
- [Usuários](#usuários)
- [Navegação Hierárquica](#navegação-hierárquica)
- [Dispositivos](#dispositivos)
- [Monitoramento Energético](#monitoramento-energético)
- [Automações](#automações)
- [Notificações](#notificações)
- [Relatórios](#relatórios)
- [WebSocket Real-time](#websocket-real-time)
- [MQTT Integration](#mqtt-integration)
- [Casos de Uso Completos](#casos-de-uso-completos)

---

## 🔐 Autenticação

### Login

```bash
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "admin@autouni.edu.br",
  "password": "Admin@123"
}
```

**Resposta:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-123",
    "email": "admin@autouni.edu.br",
    "name": "Administrador",
    "role": "ADMIN"
  }
}
```

### Usar Token nas Requisições

```bash
GET http://localhost:3000/api/users
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Refresh Token

```bash
POST http://localhost:3000/api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Resposta:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Obter Perfil do Usuário Logado

```bash
GET http://localhost:3000/api/auth/me
Authorization: Bearer {accessToken}
```

**Resposta:**
```json
{
  "id": "uuid-123",
  "email": "admin@autouni.edu.br",
  "name": "Administrador",
  "role": "ADMIN",
  "phone": "+55 11 98765-4321",
  "avatar": null,
  "createdAt": "2024-11-05T10:00:00.000Z"
}
```

### Logout

```bash
POST http://localhost:3000/api/auth/logout
Authorization: Bearer {accessToken}
```

### Recuperar Senha

```bash
POST http://localhost:3000/api/auth/forgot-password
Content-Type: application/json

{
  "email": "admin@autouni.edu.br"
}
```

---

## 👥 Usuários

### Listar Todos os Usuários

```bash
GET http://localhost:3000/api/users
Authorization: Bearer {accessToken}
```

**Resposta:**
```json
[
  {
    "id": "uuid-1",
    "email": "admin@autouni.edu.br",
    "name": "Administrador",
    "role": "ADMIN",
    "phone": "+55 11 98765-4321",
    "createdAt": "2024-11-05T10:00:00.000Z"
  },
  {
    "id": "uuid-2",
    "email": "coordenador@autouni.edu.br",
    "name": "Coordenador",
    "role": "COORDINATOR",
    "createdAt": "2024-11-05T10:00:00.000Z"
  }
]
```

### Criar Novo Usuário

```bash
POST http://localhost:3000/api/users
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "email": "novo.usuario@autouni.edu.br",
  "name": "Novo Usuário",
  "password": "SenhaForte@123",
  "role": "VIEWER",
  "phone": "+55 11 91234-5678",
  "cpf": "123.456.789-00"
}
```

**Resposta:**
```json
{
  "id": "uuid-new",
  "email": "novo.usuario@autouni.edu.br",
  "name": "Novo Usuário",
  "role": "VIEWER",
  "phone": "+55 11 91234-5678",
  "cpf": "123.456.789-00",
  "createdAt": "2024-11-05T15:30:00.000Z"
}
```

### Obter Detalhes de um Usuário

```bash
GET http://localhost:3000/api/users/{userId}
Authorization: Bearer {accessToken}
```

### Atualizar Usuário

```bash
PUT http://localhost:3000/api/users/{userId}
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Nome Atualizado",
  "phone": "+55 11 99999-9999",
  "role": "TECHNICIAN"
}
```

### Deletar Usuário

```bash
DELETE http://localhost:3000/api/users/{userId}
Authorization: Bearer {accessToken}
```

---

## 🏢 Navegação Hierárquica

### Listar Todos os Prédios

```bash
GET http://localhost:3000/api/buildings
Authorization: Bearer {accessToken}
```

**Resposta:**
```json
[
  {
    "id": "building-1",
    "name": "Bloco A - Engenharia",
    "description": "Prédio principal de Engenharia",
    "location": "Campus Central",
    "totalEnergy": 15420.5,
    "activeDevices": 85,
    "createdAt": "2024-11-05T10:00:00.000Z"
  }
]
```

### Obter Detalhes de um Prédio (com Andares)

```bash
GET http://localhost:3000/api/buildings/{buildingId}
Authorization: Bearer {accessToken}
```

**Resposta:**
```json
{
  "id": "building-1",
  "name": "Bloco A - Engenharia",
  "description": "Prédio principal de Engenharia",
  "location": "Campus Central",
  "totalEnergy": 15420.5,
  "activeDevices": 85,
  "floors": [
    {
      "id": "floor-1",
      "number": 0,
      "name": "Térreo",
      "roomCount": 10
    },
    {
      "id": "floor-2",
      "number": 1,
      "name": "1º Andar",
      "roomCount": 10
    }
  ]
}
```

### Obter Detalhes de um Andar (com Salas)

```bash
GET http://localhost:3000/api/floors/{floorId}
Authorization: Bearer {accessToken}
```

**Resposta:**
```json
{
  "id": "floor-1",
  "number": 0,
  "name": "Térreo",
  "building": {
    "id": "building-1",
    "name": "Bloco A - Engenharia"
  },
  "rooms": [
    {
      "id": "room-1",
      "name": "A101",
      "type": "CLASSROOM",
      "deviceCount": 5,
      "activeDevices": 3
    },
    {
      "id": "room-2",
      "name": "A102",
      "type": "LAB",
      "deviceCount": 7,
      "activeDevices": 5
    }
  ]
}
```

### Obter Detalhes de uma Sala (com Dispositivos)

```bash
GET http://localhost:3000/api/rooms/{roomId}
Authorization: Bearer {accessToken}
```

**Resposta:**
```json
{
  "id": "room-1",
  "name": "A101",
  "type": "CLASSROOM",
  "floor": {
    "id": "floor-1",
    "number": 0,
    "building": {
      "id": "building-1",
      "name": "Bloco A - Engenharia"
    }
  },
  "devices": [
    {
      "id": "device-1",
      "name": "Lâmpada Principal - A101",
      "type": "LIGHT",
      "status": "ON",
      "lastSeen": "2024-11-05T15:30:00.000Z"
    },
    {
      "id": "device-2",
      "name": "Ar-Condicionado - A101",
      "type": "AC",
      "status": "OFF",
      "metadata": {
        "brand": "LG",
        "model": "Inverter 12000 BTU",
        "powerW": 1200
      }
    }
  ]
}
```

### Criar Novo Prédio

```bash
POST http://localhost:3000/api/buildings
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Bloco F - Biblioteca",
  "description": "Nova biblioteca central",
  "location": "Campus Central"
}
```

### Criar Novo Andar

```bash
POST http://localhost:3000/api/floors
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "buildingId": "building-1",
  "number": 5,
  "name": "5º Andar"
}
```

### Criar Nova Sala

```bash
POST http://localhost:3000/api/rooms
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "floorId": "floor-1",
  "name": "A115",
  "type": "LAB"
}
```

---

## 🔌 Dispositivos

### Listar Todos os Dispositivos

```bash
GET http://localhost:3000/devices
Authorization: Bearer {accessToken}
```

**Query Parameters** (opcionais e combináveis; sem nenhum, retorna todos):
- `?type=LIGHT` - Filtrar por tipo (`LIGHT`, `AC`, `PROJECTOR`, `SPEAKER`, `LOCK`, `SENSOR`, `OTHER`)
- `?status=ON` - Filtrar por status (`ON`, `OFF`, `STANDBY`, `ERROR`)

```bash
GET http://localhost:3000/devices?status=ON&type=AC
```

Valores fora do enum retornam `400`, não são ignorados:

```json
{
  "message": ["status must be one of the following values: ON, OFF, STANDBY, ERROR"],
  "error": "Bad Request",
  "statusCode": 400
}
```

> Para filtrar por sala use a rota dedicada `GET /devices/room/{roomId}` — `?roomId=` não é
> um filtro suportado nesta rota.

**Resposta:**
```json
[
  {
    "id": "device-1",
    "name": "Lâmpada Principal - A101",
    "type": "LIGHT",
    "status": "ON",
    "online": true,
    "roomId": "room-1",
    "mqttTopic": "devices/light-a101-main",
    "metadata": {
      "brand": "Philips",
      "model": "LED 20W",
      "powerW": 20
    },
    "lastSeen": "2026-09-03T03:01:04.882Z"
  }
]
```

**`status` x `online` — são coisas diferentes:**

| Campo | Significado | Quem escreve |
|-------|-------------|--------------|
| `status` | Estado lógico do aparelho (`ON`/`OFF`/`STANDBY`/`ERROR`) | Rotas de controle HTTP e confirmação via MQTT |
| `online` | O aparelho é alcançável (falou com o broker) | Exclusivamente o caminho MQTT, ou o override `PUT /devices/:id/online` |
| `lastSeen` | Timestamp da última mensagem MQTT recebida do device | Exclusivamente o caminho MQTT |

Um dispositivo pode estar `ON` e `online: false` — ligado, porém incomunicável. Escrita vinda
de HTTP **nunca** altera `lastSeen`: comandar pela UI não é evidência de que o aparelho está vivo.

### Criar Novo Dispositivo

```bash
POST http://localhost:3000/api/devices
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Projetor - A101",
  "roomId": "room-1",
  "type": "PROJECTOR",
  "status": "OFF",
  "mqttTopic": "devices/projector-a101",
  "metadata": {
    "brand": "Epson",
    "model": "PowerLite X49",
    "resolution": "1024x768",
    "powerW": 300
  }
}
```

### Atualizar Dispositivo

```bash
PUT http://localhost:3000/api/devices/{deviceId}
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Projetor Full HD - A101",
  "metadata": {
    "brand": "Epson",
    "model": "PowerLite X49",
    "resolution": "1920x1080",
    "powerW": 350
  }
}
```

### Controlar Dispositivo Individual

```bash
POST http://localhost:3000/devices/{deviceId}/control
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "command": "toggle"
}
```

O campo obrigatório é **`command`**, não `status`. Valores aceitos: `on`, `off`, `toggle`.

`toggle` é resolvido a partir do status atual **no banco** — qualquer estado diferente de
`ON` (inclusive `STANDBY` e `ERROR`) alterna para `ON`.

**Com parâmetros adicionais (AC):**
```json
{
  "command": "on",
  "temperature": 22
}
```

**Com dimmer (intensidade de luz):**
```json
{
  "command": "on",
  "intensity": 75
}
```

**Resposta:**
```json
{
  "id": "e497d85a-b9c7-4c7f-9e9c-0aecb6e2a025",
  "name": "Ar Condicionado A101",
  "type": "AC",
  "status": "ON",
  "online": false,
  "mqttTopic": "devices/ac-a101",
  "lastSeen": null,
  "pending": true
}
```

O que acontece por baixo:

1. o comando é publicado em `{mqttTopic}/command` com payload `{ "state": "ON" }`
   (mais `temperature`/`intensity` quando enviados);
2. o status alvo é gravado **otimisticamente** no banco;
3. o evento `device:status` é emitido no WebSocket.

**`pending: true`** significa "comando entregue ao broker, aguardando confirmação do
hardware". Vem `false` quando o dispositivo não tem `mqttTopic` ou o backend está
desconectado do broker — nesse caso o estado gravado é tudo o que existe.

Quando o hardware responde em `devices/{id}/status`, o backend sobrescreve o status com a
confirmação real e aí sim atualiza `lastSeen` e `online`.

> `value` também é aceito no body por compatibilidade com clientes antigos, mas é tratado
> apenas como *hint*: `command` sempre vence.

### Controle em Massa (Bulk Control)

```bash
POST http://localhost:3000/devices/bulk-control
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "deviceIds": ["uuid-device-1", "uuid-device-2", "uuid-device-3"],
  "command": "off"
}
```

**Resposta:**
```json
{
  "message": "Command 'off' applied to 3 of 4 device(s)",
  "successCount": 3,
  "failedCount": 1,
  "failedDevices": ["uuid-device-4"]
}
```

Uma falha individual (device inexistente, por exemplo) **não aborta o lote**: os demais são
processados e os IDs que falharam voltam em `failedDevices`. A rota responde `200` mesmo com
falhas parciais — confira `failedCount`.

### Deletar Dispositivo

```bash
DELETE http://localhost:3000/api/devices/{deviceId}
Authorization: Bearer {accessToken}
```

---

## ⚡ Monitoramento Energético

### Criar Leitura Energética

```bash
POST http://localhost:3000/api/energy/readings
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "deviceId": "device-1",
  "valueWh": 150.5,
  "voltage": 220,
  "current": 0.68
}
```

**Resposta:**
```json
{
  "id": "reading-1",
  "deviceId": "device-1",
  "valueWh": 150.5,
  "voltage": 220,
  "current": 0.68,
  "timestamp": "2024-11-05T15:30:00.000Z"
}
```

### Obter Leituras de um Dispositivo

```bash
GET http://localhost:3000/api/energy/devices/{deviceId}/readings?from=2024-11-01T00:00:00Z&to=2024-11-05T23:59:59Z&limit=100
Authorization: Bearer {accessToken}
```

**Query Parameters:**
- `from` - Data inicial (ISO 8601)
- `to` - Data final (ISO 8601)
- `limit` - Limite de resultados (padrão: 100)

**Resposta:**
```json
[
  {
    "id": "reading-1",
    "deviceId": "device-1",
    "valueWh": 150.5,
    "voltage": 220,
    "current": 0.68,
    "timestamp": "2024-11-05T15:30:00.000Z"
  },
  {
    "id": "reading-2",
    "deviceId": "device-1",
    "valueWh": 145.2,
    "voltage": 220,
    "current": 0.66,
    "timestamp": "2024-11-05T15:00:00.000Z"
  }
]
```

### Estatísticas Energéticas de um Dispositivo

```bash
GET http://localhost:3000/api/energy/devices/{deviceId}/stats?from=2024-11-01T00:00:00Z&to=2024-11-05T23:59:59Z
Authorization: Bearer {accessToken}
```

**Resposta:**
```json
{
  "deviceId": "device-1",
  "period": {
    "from": "2024-11-01T00:00:00.000Z",
    "to": "2024-11-05T23:59:59.000Z"
  },
  "totalKwh": 125.5,
  "count": 1500,
  "avgWh": 83.67,
  "maxWh": 250.0,
  "minWh": 10.5,
  "estimatedCost": 62.75
}
```

### Estatísticas Energéticas de uma Sala

```bash
GET http://localhost:3000/api/energy/rooms/{roomId}/stats?from=2024-11-01T00:00:00Z
Authorization: Bearer {accessToken}
```

**Resposta:**
```json
{
  "roomId": "room-1",
  "roomName": "A101",
  "period": {
    "from": "2024-11-01T00:00:00.000Z",
    "to": "2024-11-05T23:59:59.000Z"
  },
  "totalKwh": 450.8,
  "deviceCount": 5,
  "byDeviceType": {
    "LIGHT": 120.5,
    "AC": 280.3,
    "PROJECTOR": 50.0
  },
  "estimatedCost": 225.40
}
```

### Estatísticas Energéticas de um Andar

```bash
GET http://localhost:3000/api/energy/floors/{floorId}/stats?from=2024-11-01T00:00:00Z
Authorization: Bearer {accessToken}
```

### Estatísticas Energéticas de um Prédio

```bash
GET http://localhost:3000/api/energy/buildings/{buildingId}/stats?from=2024-11-01T00:00:00Z
Authorization: Bearer {accessToken}
```

**Resposta:**
```json
{
  "buildingId": "building-1",
  "buildingName": "Bloco A - Engenharia",
  "period": {
    "from": "2024-11-01T00:00:00.000Z",
    "to": "2024-11-05T23:59:59.000Z"
  },
  "totalKwh": 5420.8,
  "floorCount": 4,
  "roomCount": 40,
  "deviceCount": 200,
  "byFloor": [
    {
      "floorId": "floor-1",
      "floorName": "Térreo",
      "totalKwh": 1200.5
    },
    {
      "floorId": "floor-2",
      "floorName": "1º Andar",
      "totalKwh": 1350.2
    }
  ],
  "estimatedCost": 2710.40
}
```

### Estatísticas Gerais (Todo o Sistema)

```bash
GET http://localhost:3000/api/energy/stats?from=2024-11-01T00:00:00Z&to=2024-11-05T23:59:59Z
Authorization: Bearer {accessToken}
```

**Resposta:**
```json
{
  "period": {
    "from": "2024-11-01T00:00:00.000Z",
    "to": "2024-11-05T23:59:59.000Z"
  },
  "totalKwh": 25840.5,
  "buildingCount": 5,
  "deviceCount": 977,
  "activeDevices": 523,
  "byBuilding": [
    {
      "buildingId": "building-1",
      "buildingName": "Bloco A - Engenharia",
      "totalKwh": 5420.8,
      "percentage": 20.98
    }
  ],
  "byDeviceType": {
    "LIGHT": 8520.3,
    "AC": 15200.5,
    "PROJECTOR": 1420.2,
    "SENSOR": 699.5
  },
  "estimatedCost": 12920.25
}
```

### Limpar Leituras Antigas

```bash
DELETE http://localhost:3000/api/energy/readings/cleanup
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "daysToKeep": 90
}
```

**Resposta:**
```json
{
  "message": "Old readings cleaned up successfully",
  "deletedCount": 15420,
  "cutoffDate": "2024-08-05T00:00:00.000Z"
}
```

---

## 🤖 Automações

### Listar Todas as Automações

```bash
GET http://localhost:3000/api/automations
Authorization: Bearer {accessToken}
```

**Resposta:**
```json
[
  {
    "id": "automation-1",
    "name": "Desligar luzes à noite",
    "description": "Desliga todas as luzes às 23h",
    "triggerType": "SCHEDULE",
    "cron": "0 23 * * *",
    "enabled": true,
    "lastRunAt": "2024-11-04T23:00:00.000Z",
    "createdAt": "2024-11-01T10:00:00.000Z"
  }
]
```

### Criar Automação de Agendamento (Schedule)

```bash
POST http://localhost:3000/api/automations
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Ligar luzes pela manhã",
  "description": "Liga todas as luzes das salas de aula às 7h em dias úteis",
  "triggerType": "SCHEDULE",
  "cron": "0 7 * * 1-5",
  "action": {
    "type": "mqtt",
    "topic": "devices/lights/classrooms/command",
    "payload": {
      "state": "ON"
    }
  },
  "enabled": true
}
```

**Exemplos de Cron:**
- `0 23 * * *` - Todo dia às 23h
- `0 7 * * 1-5` - Dias úteis às 7h
- `*/15 * * * *` - A cada 15 minutos
- `0 0 * * 0` - Todo domingo à meia-noite
- `0 12 1 * *` - Primeiro dia do mês ao meio-dia

### Criar Automação com Condição

```bash
POST http://localhost:3000/api/automations
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Ligar AC quando temperatura alta",
  "description": "Liga o ar-condicionado quando temperatura > 28°C",
  "triggerType": "CONDITION",
  "condition": {
    "field": "temperature",
    "operator": ">",
    "value": 28
  },
  "action": {
    "type": "mqtt",
    "topic": "devices/ac-a101/command",
    "payload": {
      "state": "ON",
      "temperature": 22
    }
  },
  "enabled": true
}
```

### Criar Automação Manual

```bash
POST http://localhost:3000/api/automations
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Shutdown de emergência",
  "description": "Desliga todos os dispositivos em caso de emergência",
  "triggerType": "MANUAL",
  "action": {
    "type": "mqtt",
    "topic": "devices/all/command",
    "payload": {
      "state": "OFF",
      "emergency": true
    }
  },
  "enabled": true
}
```

### Obter Detalhes de uma Automação

```bash
GET http://localhost:3000/api/automations/{automationId}
Authorization: Bearer {accessToken}
```

### Atualizar Automação

```bash
PUT http://localhost:3000/api/automations/{automationId}
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Desligar luzes às 22h",
  "cron": "0 22 * * *",
  "enabled": true
}
```

### Ativar/Desativar Automação

```bash
PATCH http://localhost:3000/api/automations/{automationId}/toggle
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "enabled": false
}
```

### Executar Automação Manualmente

```bash
POST http://localhost:3000/api/automations/{automationId}/execute
Authorization: Bearer {accessToken}
```

**Resposta:**
```json
{
  "message": "Automation executed successfully",
  "automationId": "automation-1",
  "executedAt": "2024-11-05T15:30:00.000Z",
  "success": true
}
```

### Obter Histórico de Execuções

```bash
GET http://localhost:3000/api/automations/{automationId}/history?limit=50
Authorization: Bearer {accessToken}
```

**Resposta:**
```json
[
  {
    "id": "history-1",
    "automationId": "automation-1",
    "runAt": "2024-11-04T23:00:00.000Z",
    "success": true,
    "logs": "Automation executed successfully. 45 devices turned off."
  },
  {
    "id": "history-2",
    "automationId": "automation-1",
    "runAt": "2024-11-03T23:00:00.000Z",
    "success": false,
    "logs": "Error: MQTT broker connection timeout"
  }
]
```

### Estatísticas de Automações

```bash
GET http://localhost:3000/api/automations/stats
Authorization: Bearer {accessToken}
```

**Resposta:**
```json
{
  "total": 15,
  "enabled": 12,
  "disabled": 3,
  "byTriggerType": {
    "SCHEDULE": 8,
    "CONDITION": 4,
    "MANUAL": 3
  },
  "lastExecutions": [
    {
      "automationId": "automation-1",
      "name": "Desligar luzes à noite",
      "lastRunAt": "2024-11-04T23:00:00.000Z",
      "success": true
    }
  ]
}
```

### Deletar Automação

```bash
DELETE http://localhost:3000/api/automations/{automationId}
Authorization: Bearer {accessToken}
```

---

## 🔔 Notificações

### Listar Notificações do Usuário

```bash
GET http://localhost:3000/api/notifications
Authorization: Bearer {accessToken}
```

**Query Parameters:**
- `?read=false` - Apenas não lidas
- `?type=WARNING` - Filtrar por tipo
- `?limit=20` - Limite de resultados

**Resposta:**
```json
[
  {
    "id": "notif-1",
    "type": "WARNING",
    "title": "Consumo energético alto",
    "message": "O Bloco A ultrapassou 80% da meta mensal",
    "read": false,
    "link": "/energy/buildings/building-1",
    "createdAt": "2024-11-05T15:00:00.000Z"
  },
  {
    "id": "notif-2",
    "type": "INFO",
    "title": "Automação executada",
    "message": "Luzes desligadas às 23h conforme programado",
    "read": true,
    "createdAt": "2024-11-04T23:00:00.000Z"
  }
]
```

### Criar Notificação

```bash
POST http://localhost:3000/api/notifications
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "userId": "user-1",
  "type": "WARNING",
  "title": "Dispositivo offline",
  "message": "O sensor de temperatura da sala A103 está offline há 2 horas",
  "link": "/devices/device-123"
}
```

### Marcar como Lida

```bash
PATCH http://localhost:3000/api/notifications/{notificationId}/read
Authorization: Bearer {accessToken}
```

### Marcar Todas como Lidas

```bash
PATCH http://localhost:3000/api/notifications/mark-all-read
Authorization: Bearer {accessToken}
```

### Deletar Notificação

```bash
DELETE http://localhost:3000/api/notifications/{notificationId}
Authorization: Bearer {accessToken}
```

---

## 📄 Relatórios

### Listar Relatórios

```bash
GET http://localhost:3000/api/reports
Authorization: Bearer {accessToken}
```

**Resposta:**
```json
[
  {
    "id": "report-1",
    "type": "ENERGY_CONSUMPTION",
    "title": "Consumo Mensal - Outubro 2024",
    "format": "PDF",
    "status": "COMPLETED",
    "fileUrl": "https://storage.autouni.com/reports/report-1.pdf",
    "createdAt": "2024-11-01T10:00:00.000Z",
    "createdBy": {
      "id": "user-1",
      "name": "Administrador"
    }
  }
]
```

### Gerar Relatório de Consumo Energético

```bash
POST http://localhost:3000/api/reports
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "type": "ENERGY_CONSUMPTION",
  "title": "Consumo Mensal - Novembro 2024",
  "format": "PDF",
  "filters": {
    "period": {
      "from": "2024-11-01T00:00:00Z",
      "to": "2024-11-30T23:59:59Z"
    },
    "buildingId": "building-1",
    "includeGraphs": true,
    "groupBy": "day"
  }
}
```

### Gerar Relatório de Status de Dispositivos

```bash
POST http://localhost:3000/api/reports
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "type": "DEVICE_STATUS",
  "title": "Status Geral dos Dispositivos",
  "format": "CSV",
  "filters": {
    "buildingId": "building-1",
    "includeOffline": true,
    "includeMetadata": true
  }
}
```

### Gerar Relatório de Uso de Salas

```bash
POST http://localhost:3000/api/reports
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "type": "ROOM_USAGE",
  "title": "Ocupação de Salas - Semana 45",
  "format": "XLSX",
  "filters": {
    "period": {
      "from": "2024-11-04T00:00:00Z",
      "to": "2024-11-10T23:59:59Z"
    },
    "buildingId": "building-1"
  }
}
```

### Gerar Relatório de Incidentes

```bash
POST http://localhost:3000/api/reports
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "type": "INCIDENTS",
  "title": "Incidentes e Alertas - Outubro 2024",
  "format": "PDF",
  "filters": {
    "period": {
      "from": "2024-10-01T00:00:00Z",
      "to": "2024-10-31T23:59:59Z"
    },
    "severity": ["HIGH", "CRITICAL"],
    "includeResolved": false
  }
}
```

### Verificar Status do Relatório

```bash
GET http://localhost:3000/api/reports/{reportId}
Authorization: Bearer {accessToken}
```

### Download do Relatório

```bash
GET http://localhost:3000/api/reports/{reportId}/download
Authorization: Bearer {accessToken}
```

### Deletar Relatório

```bash
DELETE http://localhost:3000/api/reports/{reportId}
Authorization: Bearer {accessToken}
```

---

## 🔄 WebSocket Real-time

### Conectar ao WebSocket (JavaScript)

```javascript
import io from 'socket.io-client';

// Conectar com autenticação JWT
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-access-token'
  }
});

// `query: { token }` também é aceito pelo servidor (clientes antigos).
// Sem token, o servidor derruba a conexão logo após o handshake.

// Evento de conexão
socket.on('connect', () => {
  console.log('Conectado ao WebSocket:', socket.id);
});

// Evento de desconexão
socket.on('disconnect', () => {
  console.log('Desconectado do WebSocket');
});
```

### Eventos Recebidos do Servidor

> Todos os nomes usam **dois-pontos** (`device:status`), não ponto. A convenção antiga
> (`device.status`, `energy.reading`, `mqtt.raw`) foi removida e não é mais emitida.

#### device:status - Status de dispositivo alterado

Emitido tanto pelo caminho MQTT (confirmação do hardware) quanto pelas rotas HTTP de
controle (`POST /devices/:id/control`, `POST /devices/bulk-control`, `PUT /devices/:id/status`),
para que a UI de outros usuários acompanhe a mudança.

```javascript
socket.on('device:status', (data) => {
  console.log('Status do dispositivo alterado:', data);
  // {
  //   deviceId: 'e497d85a-b9c7-4c7f-9e9c-0aecb6e2a025',
  //   status: 'ON',
  //   timestamp: '2026-09-03T03:01:03.046Z'
  // }
});
```

#### device:online - Dispositivo alcançável ou não

`online` é independente de `status`: um dispositivo pode estar `ON` e offline.

```javascript
socket.on('device:online', (data) => {
  console.log('Alcançabilidade do dispositivo:', data);
  // {
  //   deviceId: 'e497d85a-b9c7-4c7f-9e9c-0aecb6e2a025',
  //   online: true,
  //   timestamp: '2026-09-03T03:01:03.850Z'
  // }
});
```

#### energy:update - Nova leitura energética

```javascript
socket.on('energy:update', (data) => {
  console.log('Nova leitura energética:', data);
  // {
  //   deviceId: 'e497d85a-b9c7-4c7f-9e9c-0aecb6e2a025',
  //   power: 150.5,
  //   energy: 150.5,
  //   voltage: 220,
  //   current: 0.68,
  //   reading: { id, deviceId, valueWh, voltage, current, timestamp },
  //   timestamp: '2026-09-03T03:01:04.449Z'
  // }
});
```

`power` e `energy` carregam o mesmo `valueWh` — o schema define o campo como
"Wh (or watts at moment depending source)", então o que o device manda é a leitura
instantânea. O registro completo continua disponível em `reading`.

#### mqtt:raw - Mensagens MQTT sem dispositivo cadastrado

```javascript
socket.on('mqtt:raw', (data) => {
  console.log('Mensagem MQTT:', data);
  // {
  //   topic: 'devices/nao-cadastrado/status',
  //   payload: 'ON'
  // }
});
```

Útil para descobrir dispositivos que estão publicando mas ainda não têm `mqttTopic`
cadastrado. Quando o device é conhecido mas o sufixo do tópico não é tratado, o payload
inclui também `deviceId`.

### Juntar-se a uma Sala (Room)

```javascript
// Juntar-se à sala de um prédio específico
socket.emit('join', { buildingId: 'building-1' });

// Juntar-se à sala de uma sala específica
socket.emit('join', { roomId: 'room-1' });

// Deixar uma sala
socket.emit('leave', { buildingId: 'building-1' });
```

### Emitir Eventos para o Servidor

```javascript
// Controlar dispositivo via WebSocket
socket.emit('device.control', {
  deviceId: 'device-1',
  status: 'ON'
});

// Resposta do servidor
socket.on('device.control.response', (data) => {
  console.log('Resposta do controle:', data);
  // { success: true, deviceId: 'device-1' }
});
```

---

## 📡 MQTT Integration

### Publicar Status de Dispositivo (via MQTT Client)

```bash
# Ligar dispositivo
mosquitto_pub -h localhost -p 1883 \
  -t 'devices/device-1/status' \
  -m 'ON'

# Desligar dispositivo
mosquitto_pub -h localhost -p 1883 \
  -t 'devices/device-1/status' \
  -m 'OFF'

# Com JSON
mosquitto_pub -h localhost -p 1883 \
  -t 'devices/device-1/status' \
  -m '{"status":"ON","intensity":75}'
```

### Publicar Leitura Energética (via MQTT)

```bash
mosquitto_pub -h localhost -p 1883 \
  -t 'devices/device-1/energy' \
  -m '{"valueWh":150.5,"voltage":220,"current":0.68}'
```

### Publicar Status Online (via MQTT)

```bash
# Dispositivo online
mosquitto_pub -h localhost -p 1883 \
  -t 'devices/device-1/online' \
  -m 'true'

# Dispositivo offline
mosquitto_pub -h localhost -p 1883 \
  -t 'devices/device-1/online' \
  -m 'false'
```

### Subscrever a Comandos (ESP32)

```bash
# Subscribe para receber comandos
mosquitto_sub -h localhost -p 1883 \
  -t 'devices/device-1/command' \
  -v
```

**O backend publica comandos neste formato:**
```json
{
  "state": "ON",
  "temperature": 22,
  "mode": "cool"
}
```

### Exemplo ESP32 (Arduino/PlatformIO)

```cpp
#include <WiFi.h>
#include <PubSubClient.h>

const char* ssid = "your-wifi-ssid";
const char* password = "your-wifi-password";
const char* mqtt_server = "mqtt-broker-ip";
const char* deviceId = "device-1";

WiFiClient espClient;
PubSubClient client(espClient);

void callback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  // Parse comando
  if (message == "ON") {
    digitalWrite(LED_PIN, HIGH);
    // Publicar confirmação
    client.publish("devices/device-1/status", "ON");
  } else if (message == "OFF") {
    digitalWrite(LED_PIN, LOW);
    client.publish("devices/device-1/status", "OFF");
  }
}

void setup() {
  WiFi.begin(ssid, password);
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
  
  // Subscribe ao topic de comando
  client.subscribe("devices/device-1/command");
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();
  
  // Publicar leitura energética a cada 30s
  static unsigned long lastPublish = 0;
  if (millis() - lastPublish > 30000) {
    float voltage = readVoltage();
    float current = readCurrent();
    float power = voltage * current;
    
    String payload = "{\"valueWh\":" + String(power) + 
                     ",\"voltage\":" + String(voltage) + 
                     ",\"current\":" + String(current) + "}";
    
    client.publish("devices/device-1/energy", payload.c_str());
    lastPublish = millis();
  }
}
```

---

## 💡 Casos de Uso Completos

### Caso 1: Criar Estrutura Completa de um Novo Prédio

```bash
# 1. Criar prédio
POST /api/buildings
{
  "name": "Bloco G - Inovação",
  "description": "Centro de Inovação e Tecnologia",
  "location": "Campus Central"
}
# Resposta: { id: "building-g" }

# 2. Criar andares
POST /api/floors
{
  "buildingId": "building-g",
  "number": 0,
  "name": "Térreo"
}
# Resposta: { id: "floor-g0" }

POST /api/floors
{
  "buildingId": "building-g",
  "number": 1,
  "name": "1º Andar"
}
# Resposta: { id: "floor-g1" }

# 3. Criar salas
POST /api/rooms
{
  "floorId": "floor-g0",
  "name": "G101",
  "type": "LAB"
}
# Resposta: { id: "room-g101" }

# 4. Criar dispositivos
POST /api/devices
{
  "name": "Lâmpada Principal - G101",
  "roomId": "room-g101",
  "type": "LIGHT",
  "status": "OFF",
  "mqttTopic": "devices/light-g101-main",
  "metadata": {
    "brand": "Philips",
    "model": "LED 20W",
    "powerW": 20
  }
}
```

### Caso 2: Dashboard de Monitoramento em Tempo Real

```javascript
// Frontend conecta ao WebSocket
const socket = io('http://localhost:3000', {
  query: { token: accessToken }
});

// Busca dados iniciais
const response = await fetch('http://localhost:3000/api/energy/stats', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
const initialStats = await response.json();

// Atualiza em tempo real
socket.on('energy:update', (data) => {
  // Atualiza gráfico com nova leitura
  updateEnergyChart(data);
});

socket.on('device:status', (data) => {
  // Atualiza status do dispositivo na UI
  updateDeviceStatus(data.deviceId, data.status);
});
```

### Caso 3: Automação Complexa - Modo Econômico Noturno

```bash
POST /api/automations
{
  "name": "Modo econômico noturno",
  "description": "Às 23h: desliga todas as luzes, ACs e projetores",
  "triggerType": "SCHEDULE",
  "cron": "0 23 * * *",
  "action": {
    "steps": [
      {
        "type": "mqtt",
        "topic": "devices/lights/all/command",
        "payload": { "state": "OFF" }
      },
      {
        "type": "mqtt",
        "topic": "devices/ac/all/command",
        "payload": { "state": "OFF" }
      },
      {
        "type": "mqtt",
        "topic": "devices/projector/all/command",
        "payload": { "state": "OFF" }
      },
      {
        "type": "notification",
        "payload": {
          "title": "Modo econômico ativado",
          "message": "Todos os dispositivos foram desligados às 23h",
          "type": "INFO"
        }
      }
    ]
  },
  "enabled": true
}
```

### Caso 4: Relatório Mensal Completo

```bash
# 1. Gerar relatório
POST /api/reports
{
  "type": "ENERGY_CONSUMPTION",
  "title": "Relatório Mensal - Novembro 2024",
  "format": "PDF",
  "filters": {
    "period": {
      "from": "2024-11-01T00:00:00Z",
      "to": "2024-11-30T23:59:59Z"
    },
    "includeGraphs": true,
    "includeComparison": true,
    "groupBy": "day"
  }
}
# Resposta: { id: "report-123", status: "PENDING" }

# 2. Verificar status (polling ou webhook)
GET /api/reports/report-123
# Resposta: { status: "PROCESSING" }

# 3. Aguardar conclusão
GET /api/reports/report-123
# Resposta: { status: "COMPLETED", fileUrl: "..." }

# 4. Download
GET /api/reports/report-123/download
# Retorna arquivo PDF
```

---

## 🎯 Dicas e Boas Práticas

### 1. Sempre Usar HTTPS em Produção

```bash
# Desenvolvimento
http://localhost:3000/api

# Produção
https://api.autouni.edu.br/api
```

### 2. Implementar Retry Logic para MQTT

```javascript
const publishWithRetry = async (topic, payload, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      await mqttClient.publish(topic, JSON.stringify(payload));
      return true;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

### 3. Usar Paginação para Grandes Datasets

```bash
GET /api/devices?page=1&limit=50
GET /api/energy/readings?offset=0&limit=100
```

### 4. Validar Dados Antes de Enviar

```javascript
// Validação de leitura energética
const validateReading = (reading) => {
  if (reading.valueWh < 0) throw new Error('valueWh must be positive');
  if (reading.voltage < 0) throw new Error('voltage must be positive');
  if (reading.current < 0) throw new Error('current must be positive');
  return true;
};
```

### 5. Implementar Tratamento de Erros

```javascript
try {
  const response = await fetch('/api/devices', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      // Refresh token
      await refreshToken();
      // Retry request
    } else if (response.status === 404) {
      // Handle not found
    }
  }
  
  const data = await response.json();
} catch (error) {
  console.error('Request failed:', error);
}
```

---

## 📚 Referências

- **API Docs**: http://localhost:3000/api/docs
- **Prisma Schema**: `/backend/prisma/schema.prisma`
- **MQTT Setup**: `/backend/MQTT_SETUP.md`
- **Seed Data**: `/backend/prisma/seeds/README.md`

---

**Precisa de mais exemplos?** Consulte a [documentação completa](./README.md) ou abra uma [issue no GitHub](https://github.com/seu-usuario/autouni/issues)!
