-- Modelo de telemetria correto: energia (potência x energia do intervalo),
-- leituras de sensor (gás, presença), limites e alarmes, ocupação de sala,
-- nó físico (ESP32) com canais e estado de automações CONDITION.

-- CreateEnum
CREATE TYPE "DeviceChannel" AS ENUM ('RELAY', 'DIMMER', 'IR', 'ENERGY_METER', 'GAS_MQ2', 'GAS_MQ135', 'PIR');

-- CreateEnum
CREATE TYPE "SensorKind" AS ENUM ('GAS_MQ2', 'GAS_MQ135', 'MOTION');

-- CreateEnum
CREATE TYPE "AlarmLevel" AS ENUM ('WARNING', 'CRITICAL');

-- AlterTable
ALTER TABLE "Automation" ADD COLUMN     "conditionState" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "channel" "DeviceChannel",
ADD COLUMN     "nodeId" TEXT;

-- AlterTable
-- `valueWh` tinha semântica ambígua (o schema dizia "Wh or watts"). Ele vira
-- `energyWh` (energia do intervalo), o único campo somado pelas agregações.
-- Leituras históricas são preservadas como estão; as gravadas por firmwares que
-- mandavam potência ou contador acumulado continuam distorcidas e devem ser
-- descartadas com DELETE /energy/readings/cleanup se isso importar.
ALTER TABLE "EnergyReading" RENAME COLUMN "valueWh" TO "energyWh";

ALTER TABLE "EnergyReading" ADD COLUMN     "energyTotalWh" DOUBLE PRECISION,
ADD COLUMN     "frequency" DOUBLE PRECISION,
ADD COLUMN     "powerFactor" DOUBLE PRECISION,
ADD COLUMN     "powerW" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "lastMotionAt" TIMESTAMP(3),
ADD COLUMN     "occupancyChangedAt" TIMESTAMP(3),
ADD COLUMN     "occupied" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vacancyTimeoutSec" INTEGER NOT NULL DEFAULT 600;

-- CreateTable
CREATE TABLE "DeviceNode" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mqttUsername" TEXT NOT NULL,
    "hardwareId" TEXT,
    "firmwareVersion" TEXT,
    "roomId" TEXT,
    "online" BOOLEAN NOT NULL DEFAULT false,
    "lastSeen" TIMESTAMP(3),
    "credentialIssuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SensorReading" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "kind" "SensorKind" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "raw" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SensorReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SensorThreshold" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" "SensorKind" NOT NULL,
    "deviceId" TEXT,
    "warnAt" DOUBLE PRECISION,
    "alarmAt" DOUBLE PRECISION NOT NULL,
    "clearAt" DOUBLE PRECISION,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SensorThreshold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SensorAlarm" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "kind" "SensorKind" NOT NULL,
    "level" "AlarmLevel" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "peakValue" DOUBLE PRECISION NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clearedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedById" TEXT,

    CONSTRAINT "SensorAlarm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeviceNode_mqttUsername_key" ON "DeviceNode"("mqttUsername");

-- CreateIndex
CREATE INDEX "DeviceNode_organizationId_idx" ON "DeviceNode"("organizationId");

-- CreateIndex
CREATE INDEX "SensorReading_deviceId_kind_timestamp_idx" ON "SensorReading"("deviceId", "kind", "timestamp");

-- CreateIndex
CREATE INDEX "SensorReading_organizationId_timestamp_idx" ON "SensorReading"("organizationId", "timestamp");

-- CreateIndex
CREATE INDEX "SensorThreshold_organizationId_kind_idx" ON "SensorThreshold"("organizationId", "kind");

-- CreateIndex
CREATE INDEX "SensorAlarm_organizationId_clearedAt_idx" ON "SensorAlarm"("organizationId", "clearedAt");

-- CreateIndex
CREATE INDEX "SensorAlarm_deviceId_kind_clearedAt_idx" ON "SensorAlarm"("deviceId", "kind", "clearedAt");

-- CreateIndex
CREATE INDEX "EnergyReading_deviceId_timestamp_idx" ON "EnergyReading"("deviceId", "timestamp");

-- CreateIndex
CREATE INDEX "EnergyReading_organizationId_timestamp_idx" ON "EnergyReading"("organizationId", "timestamp");

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "DeviceNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceNode" ADD CONSTRAINT "DeviceNode_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceNode" ADD CONSTRAINT "DeviceNode_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensorReading" ADD CONSTRAINT "SensorReading_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensorReading" ADD CONSTRAINT "SensorReading_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensorThreshold" ADD CONSTRAINT "SensorThreshold_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensorThreshold" ADD CONSTRAINT "SensorThreshold_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensorAlarm" ADD CONSTRAINT "SensorAlarm_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensorAlarm" ADD CONSTRAINT "SensorAlarm_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensorAlarm" ADD CONSTRAINT "SensorAlarm_acknowledgedById_fkey" FOREIGN KEY ("acknowledgedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

