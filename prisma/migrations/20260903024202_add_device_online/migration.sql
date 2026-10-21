-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "online" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: antes desta coluna, "online" era derivado de lastSeen por uma janela de
-- 5 minutos. Um device que nunca falou com o broker nunca teve lastSeen preenchido,
-- então tratamos a existência do heartbeat como a melhor evidência disponível.
UPDATE "Device" SET "online" = ("lastSeen" IS NOT NULL);
