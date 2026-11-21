-- Multi-tenancy: toda entidade de domínio passa a pertencer a uma Organization.
-- Os dados existentes são movidos para a organização "default" (id fixo, para
-- que seed e scripts possam referenciá-la de forma determinística).

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

INSERT INTO "Organization" ("id", "name", "slug", "updatedAt")
VALUES ('00000000-0000-0000-0000-000000000001', 'Organização padrão', 'default', CURRENT_TIMESTAMP);

-- AddColumn (nullable primeiro, backfill, depois NOT NULL)
ALTER TABLE "User" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Building" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Floor" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Room" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Device" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "EnergyReading" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Automation" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "AutomationHistory" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Notification" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Report" ADD COLUMN "organizationId" TEXT;

UPDATE "User" SET "organizationId" = '00000000-0000-0000-0000-000000000001';
UPDATE "Building" SET "organizationId" = '00000000-0000-0000-0000-000000000001';
UPDATE "Floor" SET "organizationId" = '00000000-0000-0000-0000-000000000001';
UPDATE "Room" SET "organizationId" = '00000000-0000-0000-0000-000000000001';
UPDATE "Device" SET "organizationId" = '00000000-0000-0000-0000-000000000001';
UPDATE "EnergyReading" SET "organizationId" = '00000000-0000-0000-0000-000000000001';
UPDATE "Automation" SET "organizationId" = '00000000-0000-0000-0000-000000000001';
UPDATE "AutomationHistory" SET "organizationId" = '00000000-0000-0000-0000-000000000001';
UPDATE "Notification" SET "organizationId" = '00000000-0000-0000-0000-000000000001';
UPDATE "Report" SET "organizationId" = '00000000-0000-0000-0000-000000000001';

ALTER TABLE "User" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Building" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Floor" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Room" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Device" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "EnergyReading" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Automation" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "AutomationHistory" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Notification" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Report" ALTER COLUMN "organizationId" SET NOT NULL;

-- E-mail e CPF passam a ser únicos por organização.
DROP INDEX "public"."User_cpf_key";
DROP INDEX "public"."User_email_key";
CREATE UNIQUE INDEX "User_organizationId_email_key" ON "User"("organizationId", "email");
CREATE UNIQUE INDEX "User_organizationId_cpf_key" ON "User"("organizationId", "cpf");

-- mqttTopic passa a ser único. Falha com mensagem legível se houver duplicatas,
-- em vez de escolher arbitrariamente qual device perde o tópico.
DO $$
DECLARE dup TEXT;
BEGIN
  SELECT string_agg(DISTINCT "mqttTopic", ', ') INTO dup
  FROM "Device" d
  WHERE "mqttTopic" IS NOT NULL
    AND (SELECT COUNT(*) FROM "Device" d2 WHERE d2."mqttTopic" = d."mqttTopic") > 1;
  IF dup IS NOT NULL THEN
    RAISE EXCEPTION 'Device.mqttTopic duplicado: %. Corrija antes de migrar.', dup;
  END IF;
END $$;
CREATE UNIQUE INDEX "Device_mqttTopic_key" ON "Device"("mqttTopic");

-- CreateIndex
CREATE INDEX "Automation_organizationId_idx" ON "Automation"("organizationId");
CREATE INDEX "Building_organizationId_idx" ON "Building"("organizationId");
CREATE INDEX "Device_organizationId_idx" ON "Device"("organizationId");
CREATE INDEX "Floor_organizationId_idx" ON "Floor"("organizationId");
CREATE INDEX "Notification_organizationId_idx" ON "Notification"("organizationId");
CREATE INDEX "Report_organizationId_idx" ON "Report"("organizationId");
CREATE INDEX "Room_organizationId_idx" ON "Room"("organizationId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Building" ADD CONSTRAINT "Building_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Floor" ADD CONSTRAINT "Floor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Room" ADD CONSTRAINT "Room_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Device" ADD CONSTRAINT "Device_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnergyReading" ADD CONSTRAINT "EnergyReading_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AutomationHistory" ADD CONSTRAINT "AutomationHistory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
