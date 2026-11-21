#!/bin/sh
# Na primeira subida cria o dynamic-security.json com o usuário administrador
# (que é o usuário do backend). Nas seguintes só inicia o broker.
set -eu

CONFIG=/mosquitto/data/dynamic-security.json

if [ ! -f "$CONFIG" ]; then
  if [ -z "${MQTT_ADMIN_USERNAME:-}" ] || [ -z "${MQTT_ADMIN_PASSWORD:-}" ]; then
    echo "MQTT_ADMIN_USERNAME e MQTT_ADMIN_PASSWORD são obrigatórios na primeira subida" >&2
    exit 1
  fi
  mosquitto_ctrl dynsec init "$CONFIG" "$MQTT_ADMIN_USERNAME" "$MQTT_ADMIN_PASSWORD"
  chown mosquitto:mosquitto "$CONFIG"
  chmod 600 "$CONFIG"
fi

exec /docker-entrypoint.sh /usr/sbin/mosquitto -c /mosquitto/config/mosquitto.conf
