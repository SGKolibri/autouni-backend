# API Examples - AutoUni Backend

## Automations API

### Create Automation (Schedule)

```bash
POST /automations
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Turn off all lights at night",
  "description": "Automatically turn off all classroom lights at 11 PM",
  "triggerType": "SCHEDULE",
  "cron": "0 23 * * *",
  "action": {
    "topic": "devices/lights/command",
    "payload": {
      "state": "OFF"
    }
  },
  "enabled": true
}
```

**Cron Expression Examples:**
- `0 23 * * *` - Every day at 11:00 PM
- `0 8 * * 1-5` - Every weekday at 8:00 AM
- `*/15 * * * *` - Every 15 minutes
- `0 0 * * 0` - Every Sunday at midnight
- `0 12 1 * *` - First day of every month at noon

### Create Automation (Manual)

```bash
POST /automations
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Emergency shutdown",
  "description": "Manually triggered shutdown of all devices",
  "triggerType": "MANUAL",
  "action": {
    "topic": "devices/all/command",
    "payload": {
      "state": "OFF",
      "emergency": true
    }
  }
}
```

### Get All Automations

```bash
GET /automations
Authorization: Bearer <token>
```

### Get Automation by ID

```bash
GET /automations/{id}
Authorization: Bearer <token>
```

### Get Automation History

```bash
GET /automations/{id}/history?limit=50
Authorization: Bearer <token>
```

### Update Automation

```bash
PUT /automations/{id}
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Updated automation name",
  "cron": "0 22 * * *",
  "enabled": true
}
```

### Toggle Automation

```bash
PATCH /automations/{id}/toggle
Content-Type: application/json
Authorization: Bearer <token>

{
  "enabled": false
}
```

### Execute Automation Manually

```bash
POST /automations/{id}/execute
Authorization: Bearer <token>
```

### Delete Automation

```bash
DELETE /automations/{id}
Authorization: Bearer <token>
```

### Get Automation Statistics

```bash
GET /automations/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "total": 15,
  "enabled": 12,
  "disabled": 3,
  "byTriggerType": {
    "schedule": 8,
    "condition": 4,
    "manual": 3
  }
}
```

---

## Energy API

### Create Energy Reading

```bash
POST /energy/readings
Content-Type: application/json
Authorization: Bearer <token>

{
  "deviceId": "uuid-device-123",
  "valueWh": 150.5,
  "voltage": 220,
  "current": 0.68
}
```

### Get Device Readings

```bash
GET /energy/devices/{deviceId}/readings?from=2024-01-01T00:00:00Z&to=2024-12-31T23:59:59Z&limit=100
Authorization: Bearer <token>
```

**Query Parameters:**
- `from` (optional): Start date (ISO 8601)
- `to` (optional): End date (ISO 8601)
- `limit` (optional): Max results (default: 100)

### Get Device Energy Statistics

```bash
GET /energy/devices/{deviceId}/stats?from=2024-01-01T00:00:00Z&to=2024-12-31T23:59:59Z
Authorization: Bearer <token>
```

**Response:**
```json
{
  "totalKwh": 125.5,
  "count": 1500,
  "avgWh": 83.67,
  "maxWh": 250.0,
  "minWh": 10.5
}
```

### Get Room Readings

```bash
GET /energy/rooms/{roomId}/readings?limit=200
Authorization: Bearer <token>
```

### Get Room Energy Statistics

```bash
GET /energy/rooms/{roomId}/stats?from=2024-01-01T00:00:00Z
Authorization: Bearer <token>
```

### Get Floor Energy Statistics

```bash
GET /energy/floors/{floorId}/stats?from=2024-01-01T00:00:00Z&to=2024-12-31T23:59:59Z
Authorization: Bearer <token>
```

### Get Building Energy Statistics

```bash
GET /energy/buildings/{buildingId}/stats
Authorization: Bearer <token>
```

### Cleanup Old Readings

```bash
DELETE /energy/readings/cleanup
Content-Type: application/json
Authorization: Bearer <token>

{
  "daysToKeep": 90
}
```

**Response:**
```json
{
  "message": "Old readings cleaned up successfully",
  "deletedCount": 15420
}
```

---

## MQTT Integration Examples

### Device Status Update (MQTT Topic)

**Topic:** `devices/{deviceId}/status`

**Payload:**
```json
{
  "status": "ON"
}
```

or simply: `"ON"`, `"OFF"`, `"STANDBY"`, `"ERROR"`

### Energy Reading (MQTT Topic)

**Topic:** `devices/{deviceId}/energy`

**Payload:**
```json
{
  "valueWh": 150.5,
  "voltage": 220,
  "current": 0.68
}
```

Alternative fields supported: `power`, `watts`, `value`

### Device Online Status (MQTT Topic)

**Topic:** `devices/{deviceId}/online`

**Payload:**
```json
{
  "online": true
}
```

or: `"true"`, `"false"`, `"1"`, `"0"`

---

## WebSocket Events (Realtime)

### Connection

```javascript
const socket = io('http://localhost:3000', {
  query: {
    token: 'your-jwt-token'
  }
});
```

### Events Emitted by Server

#### device.status
```javascript
socket.on('device.status', (data) => {
  console.log(data);
  // { deviceId: 'uuid', status: 'ON', timestamp: '2024-...' }
});
```

#### device.online
```javascript
socket.on('device.online', (data) => {
  console.log(data);
  // { deviceId: 'uuid', online: true, timestamp: '2024-...' }
});
```

#### energy.reading
```javascript
socket.on('energy.reading', (data) => {
  console.log(data);
  // { deviceId: 'uuid', reading: {...}, timestamp: '2024-...' }
});
```

#### mqtt.raw
```javascript
socket.on('mqtt.raw', (data) => {
  console.log(data);
  // { topic: 'devices/xyz/custom', payload: {...} }
});
```

---

## Common Response Codes

- `200 OK` - Successful GET/PUT/PATCH
- `201 Created` - Successful POST
- `204 No Content` - Successful DELETE
- `400 Bad Request` - Invalid data or parameters
- `401 Unauthorized` - Missing or invalid authentication
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Validation Rules

### Automation
- `name`: Required, string
- `triggerType`: Required, enum (SCHEDULE, CONDITION, MANUAL)
- `cron`: Required for SCHEDULE type, valid cron expression
- `action`: Required, JSON string or object with `topic` and `payload`

### Energy Reading
- `deviceId`: Required, UUID
- `valueWh`: Required, positive number
- `voltage`: Optional, number >= 0
- `current`: Optional, number >= 0

### Date Ranges
- All dates must be in ISO 8601 format
- `from` must be before `to` if both provided
