-- Namespace MQTT por organização: o tópico no broker passa a ser
-- org/<organizationId>/devices/<slug>/..., então o slug (Device.mqttTopic)
-- só precisa ser único dentro da organização.
DROP INDEX IF EXISTS "Device_mqttTopic_key";

CREATE UNIQUE INDEX "Device_organizationId_mqttTopic_key" ON "Device"("organizationId", "mqttTopic");
