/*
  Warnings:

  - You are about to drop the column `actions` on the `Automation` table. All the data in the column will be lost.
  - You are about to drop the column `createdById` on the `Automation` table. All the data in the column will be lost.
  - You are about to drop the column `lastRun` on the `Automation` table. All the data in the column will be lost.
  - You are about to drop the column `trigger` on the `Automation` table. All the data in the column will be lost.
  - You are about to drop the column `intensity` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `online` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `powerRating` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `temperature` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `energy` on the `EnergyReading` table. All the data in the column will be lost.
  - You are about to drop the column `power` on the `EnergyReading` table. All the data in the column will be lost.
  - You are about to drop the column `powerFactor` on the `EnergyReading` table. All the data in the column will be lost.
  - You are about to drop the column `activeDevices` on the `Floor` table. All the data in the column will be lost.
  - You are about to drop the column `totalEnergy` on the `Floor` table. All the data in the column will be lost.
  - You are about to drop the column `capacity` on the `Room` table. All the data in the column will be lost.
  - You are about to drop the column `number` on the `Room` table. All the data in the column will be lost.
  - You are about to drop the column `occupied` on the `Room` table. All the data in the column will be lost.
  - You are about to drop the column `totalEnergy` on the `Room` table. All the data in the column will be lost.
  - Added the required column `action` to the `Automation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `valueWh` to the `EnergyReading` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Automation" DROP CONSTRAINT "Automation_createdById_fkey";

-- DropIndex
DROP INDEX "public"."EnergyReading_deviceId_timestamp_idx";

-- AlterTable
ALTER TABLE "Automation" DROP COLUMN "actions",
DROP COLUMN "createdById",
DROP COLUMN "lastRun",
DROP COLUMN "trigger",
ADD COLUMN     "action" TEXT NOT NULL,
ADD COLUMN     "condition" TEXT,
ADD COLUMN     "creatorId" TEXT,
ADD COLUMN     "cron" TEXT,
ADD COLUMN     "lastRunAt" TIMESTAMP(3),
ALTER COLUMN "triggerType" SET DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "Device" DROP COLUMN "intensity",
DROP COLUMN "online",
DROP COLUMN "powerRating",
DROP COLUMN "temperature",
ADD COLUMN     "metadata" JSONB,
ALTER COLUMN "type" SET DEFAULT 'OTHER',
ALTER COLUMN "status" SET DEFAULT 'OFF',
ALTER COLUMN "mqttTopic" DROP NOT NULL;

-- AlterTable
ALTER TABLE "EnergyReading" DROP COLUMN "energy",
DROP COLUMN "power",
DROP COLUMN "powerFactor",
ADD COLUMN     "valueWh" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "timestamp" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "voltage" DROP NOT NULL,
ALTER COLUMN "current" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Floor" DROP COLUMN "activeDevices",
DROP COLUMN "totalEnergy",
ALTER COLUMN "name" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Room" DROP COLUMN "capacity",
DROP COLUMN "number",
DROP COLUMN "occupied",
DROP COLUMN "totalEnergy",
ALTER COLUMN "type" SET DEFAULT 'OTHER';

-- CreateTable
CREATE TABLE "AutomationHistory" (
    "id" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL,
    "logs" TEXT,

    CONSTRAINT "AutomationHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationHistory" ADD CONSTRAINT "AutomationHistory_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
