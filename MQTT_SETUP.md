# MQTT Setup — AutoUni Backend

Guia de configuração e integração MQTT do AutoUni. Descreve o broker, os tópicos, os formatos de payload aceitos e como um dispositivo (ESP32 ou similar) se integra ao backend.

> Fonte da verdade: `src/modules/mqtt/` (serviço, repositório e interfaces), `docker-compose.yml` e `prisma/schema.prisma`.
> Onde a implementação atual diverge do que o `README.md` / `USO.md` descrevem, isso está sinalizado em [Limitações conhecidas](#-limitações-conhecidas).

---

## 📋 Índice

- [Arquitetura](#-arquitetura)
- [O broker](#-o-broker)
- [Endereços de conexão](#-endereços-de-conexão)
- [Variáveis de ambiente](#-variáveis-de-ambiente)
- [Tópicos subscritos](#-tópicos-subscritos)
- [Como um tópico vira um dispositivo](#-como-um-tópico-vira-um-dispositivo)
- [Formatos de payload](#-formatos-de-payload)
- [Publicação do backend para dispositivos](#-publicação-do-backend-para-dispositivos)
- [Eventos WebSocket correspondentes](#-eventos-websocket-correspondentes)
- [Testando com mosquitto_pub / mosquitto_sub](#-testando-com-mosquitto_pub--mosquitto_sub)
- [Exemplo ESP32](#-exemplo-esp32)
- [Troubleshooting](#-troubleshooting)
- [Limitações conhecidas](#-limitações-conhecidas)

---

## 🏗 Arquitetura

```
┌──────────────┐   devices/+/status           ┌──────────────────┐
│              │   devices/+/energy           │                  │
│  Dispositivo │ ───────────────────────────► │   Broker MQTT    │
│  (ESP32)     │   devices/+/reading          │  (mosquitto)     │
│              │   devices/+/online           │                  │
└──────────────┘                              └────────┬─────────┘
       ▲                                               │ subscribe
       │  publish (automações)                         ▼
       │                                      ┌──────────────────┐
       └───────────────────────────────────── │   MqttService    │
                                              │   (NestJS)       │
                                              └────────┬─────────┘
                                                       │
                                    ┌──────────────────┴──────────────────┐
                                    ▼                                     ▼
                            ┌───────────────┐                   ┌──────────────────┐
                            │ MqttRepository│                   │ RealtimeGateway  │
                            │  (Prisma)     │                   │  (Socket.IO)     │
                            └───────┬───────┘                   └────────┬─────────┘
                                    ▼                                    ▼
                            Device.status                        device.status
                            Device.lastSeen                      device.online
                            EnergyReading                        energy.reading
                                                                 mqtt.raw
```

O `MqttModule` é `@Global()` (`src/modules/mqtt/mqtt.module.ts`), então `MqttService` e `MqttRepository` ficam disponíveis em toda a aplicação sem import explícito.

O ciclo de vida da conexão está em `MqttService`:

- **`onModuleInit`** — conecta apenas se `MQTT_URL` estiver definida e não vazia. Caso contrário loga `MQTT_URL not configured. MQTT features disabled.` e a aplicação sobe normalmente, sem MQTT.
- **`connect()`** — cliente `mqtt@^5` com `reconnectPeriod: 5000` e `connectTimeout: 30000`. A reconexão é automática.
- **`onModuleDestroy`** — encerra o cliente.

---

## 🐳 O broker

Definido em `docker-compose.yml`:

```yaml
mqtt:
  image: eclipse-mosquitto:latest
  container_name: autoUniMqtt
  restart: unless-stopped
  ports:
    - '1883:1883'
    - '9001:9001'
  volumes:
    - mqtt-data:/mosquitto/data
    - mqtt-logs:/mosquitto/log
  networks:
    - autouni-network
  command: mosquitto -c /mosquitto-no-auth.conf
```

Subir apenas o broker:

```bash
docker compose up -d mqtt
docker compose logs -f mqtt
```

### ⚠️ O broker roda sem autenticação

O `/mosquitto-no-auth.conf` que vem na imagem oficial contém:

```conf
listener 1883
allow_anonymous true

listener 9883
protocol http_api
http_dir /usr/share/mosquitto/dashboard
```

Consequências práticas:

| Ponto | Situação |
|-------|----------|
| Autenticação | **Nenhuma.** Qualquer cliente publica e assina qualquer tópico. |
| Porta 1883 | Publicada em `0.0.0.0` no host — acessível por toda a LAN. |
| Porta 9001 | **Publicada mas morta.** O broker não abre listener em 9001; não há WebSocket configurado. |
| Porta 9883 | Listener HTTP API/dashboard existe no container, mas **não** está publicada no host. |
| ACLs | Nenhuma. Não há separação por dispositivo. |

Para uso em rede confiável (laboratório, LAN isolada) isso é aceitável. Para qualquer coisa exposta, veja [Endurecendo o broker](#endurecendo-o-broker).

### Habilitando WebSocket (opcional)

Se o front-end precisar falar MQTT direto do navegador, o mapeamento `9001:9001` só passa a servir para algo depois de criar um config próprio:

```conf
# mosquitto/config/mosquitto.conf
listener 1883
protocol mqtt
allow_anonymous true

listener 9001
protocol websockets
allow_anonymous true
```

E ajustar o serviço:

```yaml
mqtt:
  volumes:
    - ./mosquitto/config:/mosquitto/config
    - mqtt-data:/mosquitto/data
    - mqtt-logs:/mosquitto/log
  command: mosquitto -c /mosquitto/config/mosquitto.conf
```

Note que o backend usa o transporte TCP (`mqtt://`), não WebSocket — essa mudança serve só a clientes de browser.

---

## 🌐 Endereços de conexão

O broker não tem IP próprio na LAN: ele roda em bridge no Docker e a porta 1883 é publicada no host.

| Cliente | URL |
|---------|-----|
| Serviço `app` (dentro do compose) | `mqtt://mqtt:1883` — hostname do serviço |
| Ferramenta rodando no host | `mqtt://localhost:1883` |
| ESP32 / celular / outra máquina na LAN | `mqtt://<IP-do-host>:1883` |

Descobrir o IP do host na LAN:

```bash
ip -4 addr show scope global | grep inet
# ex.: inet 192.168.77.34/24 ... wlp194s0
```

O IP costuma vir de DHCP e muda em reboot do roteador. Para dispositivos embarcados, reserve o IP no DHCP do roteador ou use mDNS em vez de gravar o endereço no firmware.

---

## ⚙️ Variáveis de ambiente

Lidas diretamente de `process.env` em `MqttService`:

| Variável | Obrigatória | Padrão | Descrição |
|----------|-------------|--------|-----------|
| `MQTT_URL` | Sim (para habilitar MQTT) | — | URL do broker. Vazia ou ausente ⇒ MQTT desligado, app sobe sem erro. |
| `MQTT_USERNAME` | Não | `undefined` | Repassada ao `connect()`. |
| `MQTT_PASSWORD` | Não | `undefined` | Repassada ao `connect()`. |

No `docker-compose.yml`, o serviço `app` recebe:

```yaml
MQTT_URL: ${MQTT_URL:-mqtt://mqtt:1883}
```

> ⚠️ `MQTT_USERNAME` e `MQTT_PASSWORD` **não** estão na lista de `environment` do serviço `app`. Defini-las no `.env` não as faz chegar ao container. Se ativar autenticação no broker, adicione as duas ao bloco `environment` do `app`.

`.env` para desenvolvimento local (backend fora do Docker, broker no Docker):

```env
MQTT_URL=mqtt://localhost:1883
```

---

## 📥 Tópicos subscritos

Assinados automaticamente em `subscribeToDefaultTopics()`, com **QoS 0**, logo após o evento `connect`:

```
devices/+/status     → atualiza Device.status e Device.lastSeen
devices/+/energy     → cria EnergyReading
devices/+/reading    → cria EnergyReading (alias de /energy)
devices/+/online     → atualiza Device.lastSeen
```

O curinga `+` casa **exatamente um** segmento. Ou seja, o tópico publicado precisa ter exatamente três níveis: `devices/<identificador>/<sufixo>`. Um tópico como `devices/predio-a/sala-101/status` **não** é recebido.

QoS 0 significa entrega no máximo uma vez, sem confirmação: mensagens publicadas enquanto o backend está reiniciando são perdidas. Sensores devem republicar periodicamente em vez de depender de um único envio.

---

## 🔗 Como um tópico vira um dispositivo

Este é o ponto que mais gera confusão. Ao receber uma mensagem, `MqttRepository.findDeviceByTopic()` resolve o dispositivo em duas tentativas:

1. **Match exato** — procura `Device.mqttTopic == 'devices/light-101/status'`.
2. **Match pela base** — se falhar, remove o último segmento e procura `Device.mqttTopic == 'devices/light-101'`.

Como todos os sufixos (`/status`, `/energy`, `/reading`, `/online`) precisam apontar para o mesmo dispositivo, a convenção correta é gravar o **tópico base** no cadastro:

```json
{
  "name": "Luz Principal - Sala 101",
  "roomId": "uuid-da-sala",
  "type": "LIGHT",
  "mqttTopic": "devices/light-101"
}
```

Com isso, as quatro mensagens abaixo resolvem para o mesmo `Device`:

```
devices/light-101/status
devices/light-101/energy
devices/light-101/reading
devices/light-101/online
```

Regras importantes:

- `Device.mqttTopic` é `String?` **sem constraint de unicidade** (`prisma/schema.prisma`). Se dois dispositivos tiverem o mesmo `mqttTopic`, o `findFirst` resolve para um deles de forma não determinística. Trate `mqttTopic` como único por convenção.
- Dispositivo sem `mqttTopic` cadastrado nunca é resolvido — as mensagens caem no caminho "não identificado".
- Quando nenhum dispositivo casa, o backend loga `No device found for topic <topic>` e emite o evento WebSocket `mqtt.raw` com o payload bruto, **sem persistir nada**. Isso é útil para descobrir dispositivos novos ainda não cadastrados.

---

## 📦 Formatos de payload

Todo payload é tentado como JSON; se o parse falhar, o valor é tratado como string crua.

### `devices/<id>/status`

Atualiza `Device.status` e `Device.lastSeen`.

```bash
# string crua
ON

# ou JSON
{"status":"ON"}
```

O valor precisa ser um membro do enum `DeviceStatus` do Prisma:

| Valor | Significado |
|-------|-------------|
| `ON` | Ligado |
| `OFF` | Desligado |
| `STANDBY` | Em espera |
| `ERROR` | Falha |

> Valores fora do enum (`on`, `ligado`, `1`) fazem o `prisma.device.update` lançar. O erro é capturado e logado como `Error handling MQTT message`, o status **não** é atualizado e nenhum evento WebSocket é emitido. O dispositivo não recebe nenhum retorno — falha silenciosa do ponto de vista do firmware.

Campos extras no JSON (`intensity`, `mode`, …) são ignorados: só `status` é lido.

### `devices/<id>/energy` e `devices/<id>/reading`

Cria um registro em `EnergyReading`. Os dois tópicos são tratados de forma idêntica.

```json
{ "valueWh": 150.5, "voltage": 220, "current": 0.68 }
```

| Campo | Aceito como | Tipo no banco | Observação |
|-------|-------------|---------------|------------|
| `valueWh` | `valueWh` ⇒ `power` ⇒ `watts` ⇒ `value` | `Float` (obrigatório) | Primeiro presente vence; nenhum deles ⇒ grava `0`. |
| `voltage` | `voltage` | `Float?` | Opcional. |
| `current` | `current` | `Float?` | Opcional. |

Os aliases existem para acomodar firmwares diferentes — estes quatro payloads gravam o mesmo `valueWh`:

```json
{"valueWh": 150.5}
{"power": 150.5}
{"watts": 150.5}
{"value": 150.5}
```

> ⚠️ **`voltage` ou `current` iguais a `0` são gravados como `null`.** A conversão usa um teste de veracidade (`voltage ? Number(voltage) : null`), então zero é descartado junto com `null` e `undefined`. Um sensor reportando corrente zero (dispositivo desligado) grava `current: null`, não `0`. Considere isso ao agregar leituras.

> `timestamp` é sempre gerado pelo servidor (`@default(now())`). Um `timestamp` enviado no payload é ignorado — não há como fazer backfill de leituras antigas por MQTT; use `POST /energy/readings`.

### `devices/<id>/online`

```bash
# JSON
{"online":true}

# ou string
true
```

Interpretação: se o payload for objeto, lê `payload.online`; se for string, considera online apenas se for exatamente `'true'` ou `'1'`.

> **O estado online não é persistido.** O schema Prisma não tem coluna `online` — `updateDeviceOnlineStatus()` apenas atualiza `Device.lastSeen`. O valor booleano vai só para o evento WebSocket `device.online`. Para saber se um dispositivo está online, compare `lastSeen` com o intervalo de heartbeat esperado.

---

## 📤 Publicação do backend para dispositivos

O `MqttService` expõe uma API pública:

```typescript
publish(topic: string, payload: any, options?: { qos?: 0 | 1 | 2; retain?: boolean }): void
subscribe(topic: string | string[], qos?: 0 | 1 | 2): void
unsubscribe(topic: string | string[]): void
isConnected(): boolean
```

Comportamento de `publish()`:

- Payload string é enviado como está; qualquer outro valor passa por `JSON.stringify`.
- Padrões: `qos: 0`, `retain: false`.
- **Se o cliente não estiver conectado, a chamada é descartada** com um warn (`Cannot publish: MQTT client not connected`). Não há fila nem exceção — quem chama não percebe a perda. Use `isConnected()` antes de operações críticas.

### Único produtor hoje: automações

`AutomationsService.executeAutomation()` (`src/modules/automations/service/automations.service.ts:178`) é o único lugar que publica. O campo `Automation.action` é um JSON; se contiver `topic`, ele é publicado:

```json
{
  "topic": "devices/light-101/command",
  "payload": { "state": "ON" }
}
```

O tópico vem inteiro do cadastro da automação — o backend não deriva nada do `Device.mqttTopic`. O sufixo `/command` é convenção, não regra: qualquer tópico funciona.

Execuções são registradas em `AutomationHistory` (`success`, `logs`, `runAt`). Como `publish()` com QoS 0 não confirma entrega, uma automação registrada como `success: true` significa apenas "chamada feita", não "dispositivo recebeu".

### Convenção de comando

Firmwares devem assinar:

```
devices/<id>/command
```

Formato de payload sugerido pela documentação do projeto:

```json
{ "state": "ON", "temperature": 22, "mode": "cool" }
```

> ⚠️ Ver [Limitações conhecidas](#-limitações-conhecidas): os endpoints REST de controle de dispositivo **não** publicam nesse tópico hoje.

---

## 🔄 Eventos WebSocket correspondentes

Cada mensagem MQTT processada gera um broadcast Socket.IO via `RealtimeGateway`:

| Tópico MQTT | Evento WebSocket | Payload |
|-------------|------------------|---------|
| `devices/+/status` | `device.status` | `{ deviceId, status, timestamp }` |
| `devices/+/online` | `device.online` | `{ deviceId, online, timestamp }` |
| `devices/+/energy` \| `/reading` | `energy.reading` | `{ deviceId, reading, timestamp }` |
| tópico sem dispositivo cadastrado | `mqtt.raw` | `{ topic, payload }` |
| tópico conhecido, sufixo não tratado | `mqtt.raw` | `{ topic, payload, deviceId }` |

A emissão usa optional chaining (`this.realtime.server?.emit`): se o gateway ainda não inicializou, o evento é silenciosamente descartado, mas a escrita no banco já aconteceu.

Consumo no front-end:

```javascript
const socket = io('http://localhost:3000', { query: { token: accessToken } });

socket.on('device.status', ({ deviceId, status }) => { /* ... */ });
socket.on('energy.reading', ({ deviceId, reading }) => { /* ... */ });
```

---

## 🧪 Testando com mosquitto_pub / mosquitto_sub

Instalar o cliente:

```bash
# Fedora
sudo dnf install mosquitto

# Debian/Ubuntu
sudo apt install mosquitto-clients
```

Ou usar o cliente que já está dentro do container:

```bash
docker exec -it autoUniMqtt mosquitto_sub -t 'devices/#' -v
```

### Observar todo o tráfego

```bash
mosquitto_sub -h localhost -p 1883 -t 'devices/#' -v
```

### Simular um dispositivo

Assumindo um `Device` cadastrado com `mqttTopic: "devices/light-101"`:

```bash
# status
mosquitto_pub -h localhost -p 1883 -t 'devices/light-101/status' -m 'ON'
mosquitto_pub -h localhost -p 1883 -t 'devices/light-101/status' -m '{"status":"STANDBY"}'

# leitura energética
mosquitto_pub -h localhost -p 1883 -t 'devices/light-101/energy' \
  -m '{"valueWh":150.5,"voltage":220,"current":0.68}'

# heartbeat
mosquitto_pub -h localhost -p 1883 -t 'devices/light-101/online' -m 'true'
```

### Verificar o efeito

```bash
# logs do backend (nível debug mostra cada mensagem processada)
docker compose logs -f app | grep -i mqtt

# estado no banco
docker exec -it autoUniDb psql -U postgres -d autounidb \
  -c 'SELECT id, name, status, "lastSeen" FROM "Device" ORDER BY "lastSeen" DESC NULLS LAST LIMIT 5;'

docker exec -it autoUniDb psql -U postgres -d autounidb \
  -c 'SELECT "deviceId", "valueWh", voltage, current, timestamp FROM "EnergyReading" ORDER BY timestamp DESC LIMIT 5;'
```

### Simular um comando indo para o dispositivo

```bash
# terminal 1 — no papel do ESP32
mosquitto_sub -h localhost -p 1883 -t 'devices/light-101/command' -v

# terminal 2 — no papel do backend
mosquitto_pub -h localhost -p 1883 -t 'devices/light-101/command' -m '{"state":"ON"}'
```

---

## 🔌 Exemplo ESP32

Firmware mínimo cobrindo comando, status e telemetria. Requer `PubSubClient`.

```cpp
#include <WiFi.h>
#include <PubSubClient.h>

const char* WIFI_SSID     = "sua-rede";
const char* WIFI_PASSWORD = "sua-senha";

// IP do host onde o docker compose está rodando
const char* MQTT_HOST = "192.168.77.34";
const int   MQTT_PORT = 1883;

// Precisa bater com Device.mqttTopic cadastrado no backend
const char* DEVICE_TOPIC = "devices/light-101";

const int RELAY_PIN = 2;

WiFiClient espClient;
PubSubClient client(espClient);

String topicFor(const char* suffix) {
  return String(DEVICE_TOPIC) + "/" + suffix;
}

void publishStatus(const char* status) {
  client.publish(topicFor("status").c_str(), status, true); // retain
}

void callback(char* topic, byte* payload, unsigned int length) {
  String message;
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  // Aceita tanto "ON" quanto {"state":"ON"}
  bool turnOn = message.indexOf("ON") >= 0 && message.indexOf("OFF") < 0;

  digitalWrite(RELAY_PIN, turnOn ? HIGH : LOW);
  publishStatus(turnOn ? "ON" : "OFF");   // confirma o estado real
}

void reconnect() {
  while (!client.connected()) {
    String clientId = String("esp32-") + String((uint32_t)ESP.getEfuseMac(), HEX);

    // Last Will: o broker publica offline se o ESP cair sem avisar
    if (client.connect(clientId.c_str(), nullptr, nullptr,
                       topicFor("online").c_str(), 1, true, "false")) {
      client.publish(topicFor("online").c_str(), "true", true);
      client.subscribe(topicFor("command").c_str());
      publishStatus(digitalRead(RELAY_PIN) ? "ON" : "OFF");
    } else {
      delay(5000);
    }
  }
}

void setup() {
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) delay(500);

  client.setServer(MQTT_HOST, MQTT_PORT);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  // Telemetria a cada 30s
  static unsigned long lastPublish = 0;
  if (millis() - lastPublish > 30000) {
    lastPublish = millis();

    float voltage = readVoltage();
    float current = readCurrent();
    float power   = voltage * current;

    char payload[96];
    snprintf(payload, sizeof(payload),
             "{\"valueWh\":%.2f,\"voltage\":%.2f,\"current\":%.3f}",
             power, voltage, current);

    client.publish(topicFor("energy").c_str(), payload);
  }
}
```

Pontos de atenção no firmware:

- **Last Will and Testament** — configurado no `connect()`, faz o broker publicar `false` em `devices/<id>/online` se o ESP32 cair sem desconectar. Sem LWT o backend só descobre a queda pelo `lastSeen` envelhecendo.
- **`retain: true` no status** — garante que um backend reiniciando receba o estado atual imediatamente, em vez de esperar o próximo evento.
- **`clientId` único** — dois clientes com o mesmo ID fazem o broker desconectar um deles em loop.
- **Confirme o estado real, não o comando recebido** — publique o status depois de acionar o relé, refletindo o hardware.
- **`valueWh` vs. potência instantânea** — o exemplo publica watts no campo `valueWh`, seguindo o comentário do schema (`"Wh (or watts at moment depending source)"`). Mantenha a unidade consistente entre dispositivos, senão as agregações de `/energy/stats` misturam grandezas.

---

## 🐛 Troubleshooting

### `MQTT_URL not configured. MQTT features disabled.`

`MQTT_URL` ausente ou vazia. Não é erro fatal — a aplicação sobe sem MQTT. Rodando local, defina no `.env`:

```env
MQTT_URL=mqtt://localhost:1883
```

O serviço loga o valor lido na inicialização (`MQTT_URL value: "..."`), o que ajuda a confirmar se o `.env` chegou ao processo.

### `ECONNREFUSED` / `MQTT connection error`

```bash
# broker está de pé?
docker compose ps mqtt

# a porta responde?
docker exec autoUniMqtt netstat -tln | grep 1883

# de dentro do container do app, o hostname resolve?
docker exec autoUniApi getent hosts mqtt
```

Causa comum: usar `mqtt://localhost:1883` no `MQTT_URL` do container `app`. Dentro do compose, `localhost` é o próprio container. Use `mqtt://mqtt:1883`.

O cliente reconecta sozinho a cada 5s, então o backend se recupera quando o broker voltar — sem restart.

### `No device found for topic devices/xxx/status`

O `Device.mqttTopic` não casa. Confira o cadastro:

```bash
docker exec -it autoUniDb psql -U postgres -d autounidb \
  -c 'SELECT id, name, "mqttTopic" FROM "Device" WHERE "mqttTopic" IS NOT NULL;'
```

Grave o **tópico base** (`devices/light-101`), sem o sufixo. Ver [Como um tópico vira um dispositivo](#-como-um-tópico-vira-um-dispositivo).

Enquanto não casar, a mensagem ainda aparece no WebSocket como `mqtt.raw` — útil para ler o identificador que o dispositivo está usando de fato.

### Mensagem chega, mas o status não muda

Quase sempre é valor fora do enum `DeviceStatus`. Procure `Error handling MQTT message` nos logs do `app`. Aceitos: `ON`, `OFF`, `STANDBY`, `ERROR` — maiúsculas, exatamente.

### Leitura gravada com `voltage`/`current` nulos

Comportamento esperado quando o valor enviado é `0` (ver [Formatos de payload](#-formatos-de-payload)). Não é perda de dados no transporte.

### Nada acontece ao conectar na porta 9001

Não há listener em 9001 — o mapeamento no compose é herança de um config que não existe. Ver [Habilitando WebSocket](#habilitando-websocket-opcional).

### Um dispositivo desconecta em loop

Dois clientes com o mesmo `clientId`. O broker mantém apenas a conexão mais recente e derruba a anterior, que reconecta e derruba a nova, indefinidamente. Gere o `clientId` a partir do MAC.

---

## 🔒 Endurecendo o broker

Para qualquer ambiente que não seja LAN isolada:

**1. Desligar acesso anônimo**

```conf
# mosquitto/config/mosquitto.conf
listener 1883
allow_anonymous false
password_file /mosquitto/config/passwd
```

```bash
docker exec -it autoUniMqtt mosquitto_passwd -c /mosquitto/config/passwd autouni
docker compose restart mqtt
```

Depois adicione ao serviço `app` no `docker-compose.yml` (elas não estão lá hoje):

```yaml
MQTT_USERNAME: ${MQTT_USERNAME}
MQTT_PASSWORD: ${MQTT_PASSWORD}
```

**2. Não publicar a porta externamente**

Se apenas o backend fala com o broker, remova o bloco `ports:` do serviço `mqtt` — a rede `autouni-network` já permite o acesso interno via hostname `mqtt`. Dispositivos na LAN continuam precisando da porta publicada.

**3. ACLs por dispositivo**

```conf
acl_file /mosquitto/config/acl
```

```
user esp32-light-101
topic write devices/light-101/#
topic read devices/light-101/command
```

**4. TLS (`mqtts://`)**

Configure `cafile` / `certfile` / `keyfile` no listener 8883 e use `MQTT_URL=mqtts://...`. Note que o `PubSubClient` do ESP32 exige `WiFiClientSecure` e o certificado embarcado.

---

## ⚠️ Limitações conhecidas

Divergências entre a implementação atual e o que `README.md` / `USO.md` descrevem — todas verificadas no código:

| Item | Documentado | Implementação atual |
|------|-------------|---------------------|
| Controle de dispositivo via REST | `PUT /devices/:id/status` liga/desliga o dispositivo | `DevicesService.updateStatus()` apenas grava no banco. **Não publica em `devices/<id>/command`.** O dispositivo físico não é acionado. |
| Bulk control | `POST /devices/bulk-control` | Endpoint não existe no `DevicesController`. |
| Tópico `/command` | Publicado pelo backend | Publicado **somente** por automações, e apenas com o tópico literal gravado em `Automation.action`. |
| Estado online | Persistido no dispositivo | Não há coluna `online` no schema. Só `lastSeen` é atualizado; o booleano vive apenas no evento WebSocket. |
| Tópico `devices/+/reading` | Não mencionado | Subscrito e tratado como alias de `/energy`. |
| Porta 9001 | Exposta para WebSocket | Publicada no host, mas sem listener no broker. |

Outras limitações estruturais:

- **Sem QoS acima de 0 nas assinaturas padrão.** Mensagens publicadas durante um restart do backend são perdidas.
- **Sem sessão persistente.** O cliente conecta com sessão limpa; nada é enfileirado no broker enquanto o backend está fora.
- **`Device.mqttTopic` não é `@unique`.** Duplicatas resolvem de forma não determinística via `findFirst`.
- **Erros de processamento são engolidos.** O `try/catch` de `handleMessage` loga e segue; não há dead-letter nem retry.
- **`publish()` falha em silêncio** quando desconectado — retorna `void`, sem exceção nem fila.

Para fechar a lacuna mais relevante (REST → MQTT), o caminho é injetar `MqttService` em `DevicesService` e publicar em `${device.mqttTopic}/command` dentro de `updateStatus()`, tratando `mqttTopic` nulo.

---

## 📚 Referências

- [README.md](./README.md) — visão geral do projeto
- [USO.md](./USO.md) — exemplos de uso da API
- [ROADMAP.md](./ROADMAP.md) — evolução planejada
- [Eclipse Mosquitto](https://mosquitto.org/documentation/)
- [MQTT 5 (mqtt.js)](https://github.com/mqttjs/MQTT.js)
- [PubSubClient (Arduino)](https://github.com/knolleary/pubsubclient)
