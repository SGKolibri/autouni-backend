-- Lembrete de alarme aberto: intervalo por organização (0 = desativado) e
-- momento do último aviso de cada alarme.
ALTER TABLE "Organization" ADD COLUMN "alarmReminderMinutes" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "SensorAlarm" ADD COLUMN "lastNotifiedAt" TIMESTAMP(3);
