# MQTT Setup — AutoUni Backend

Contrato MQTT do AutoUni: o broker, a autenticação por nó, os tópicos, os payloads aceitos e o que o backend faz com cada mensagem. É o documento que o firmware do ESP32 segue.

> Fonte da verdade: `src/modules/mqtt/`, `src/modules/telemetry/payload-parsing.ts`, `src/modules/nodes/node-acl.ts`, `mosquitto/config/mosquitto.conf` e `prisma/schema.prisma`.

---

## Índice

- [Arquitetura](#arquitetura)
- [O broker e a autenticação](#o-broker-e-a-autenticação)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Nós físicos e credenciais](#nós-físicos-e-credenciais)
- [Tópicos](#tópicos)
- [Payloads](#payloads)
- [Comandos do backend para o nó](#comandos-do-backend-para-o-nó)
- [Eventos WebSocket](#eventos-websocket)
- [Testando com mosquitto_pub / mosquitto_sub](#testando-com-mosquitto_pub--mosquitto_sub)
- [Troubleshooting](#troubleshooting)
- [Limitações conhecidas](#limitações-conhecidas)

---

## Arquitetura

```
┌──────────────┐  org/<org>/devices/<slug>/energy|sensor|…     ┌──────────────┐
│  Nó ESP32    │ ───────────────────────────────────────────▶ │  Mosquitto   │
│ (credencial  │  org/<org>/nodes/<usuário>/online (LWT)      │ dynamic-     │
│  própria)    │ ◀─────────────────────────────────────────── │ security     │
└──────────────┘  org/<org>/devices/<slug>/command             └──────┬───────┘
                                                                      │ assina org/+/devices/+/…
                                                                      ▼
                                                              ┌──────────────┐
                                                              │   Backend    │──▶ Postgres
                                                              │   NestJS     │──▶ WebSocket (sala da organização)
                                                              └──────────────┘
```

- Um **nó** é um ESP32. Ele tem um usuário e uma senha MQTT próprios.
- Cada **device** é um canal do nó (relé, dimmer, IR, medidor PZEM, MQ-2, MQ-135, PIR) e tem um slug `devices/<slug>` (campo `Device.mqttTopic`).
- **Todo tópico tem o namespace da organização**: `org/<organizationId>/devices/<slug>/<sufixo>`. O `<organizationId>` é o UUID da organização e vem pronto no campo `topicPrefix` das credenciais do nó.
- O broker só deixa o nó publicar nos tópicos dos devices dele, sob o prefixo da própria organização, e só nos sufixos que cada canal produz. É o prefixo que diz ao backend de qual organização a mensagem é.

Neste documento, `<P>` abrevia `org/<organizationId>`.

---

## O broker e a autenticação

O broker roda com o plugin **dynamic-security** do Mosquitto (`mosquitto/config/mosquitto.conf`):

- `allow_anonymous false`: sem usuário e senha, a conexão é recusada (`not authorised`).
- Usuários, senhas (com hash) e ACLs ficam em `/mosquitto/data/dynamic-security.json`, no volume `mqtt-data`.
- Na primeira subida, `mosquitto/init.sh` cria esse arquivo com o administrador `MQTT_USERNAME` / `MQTT_PASSWORD`.

O backend se conecta com esse administrador e:

1. Garante para si o papel `autouni-backend`, com permissão de publicar apenas em `org/+/devices/+/command` (o administrador criado pelo `dynsec init` só assina).
2. Cria, altera e remove as credenciais dos nós pelo tópico `$CONTROL/dynamic-security/v1`.
3. A cada reconexão, reconcilia a ACL de todos os nós com o banco.

> O Mosquitto derruba a sessão de um cliente quando os papéis dele mudam. Na primeira subida, o backend reconecta uma vez logo depois de ganhar o papel `autouni-backend`. Mudanças na ACL de um nó também podem derrubar a sessão dele; o firmware precisa reconectar sozinho.

A imagem é fixada em `eclipse-mosquitto:2.0.20`, porque o caminho do plugin faz parte do contrato.

### Endereços

| Cliente | URL |
|---------|-----|
| Serviço `app` (dentro do compose) | `mqtt://mqtt:1883` |
| Ferramenta no host | `mqtt://localhost:1883` |
| ESP32 na LAN | `mqtt://<IP-do-host>:1883` (informe em `MQTT_PUBLIC_URL`) |

---

## Variáveis de ambiente

| Variável | Onde | Descrição |
|----------|------|-----------|
| `MQTT_URL` | backend | URL do broker. Vazia: MQTT desligado (a API sobe mesmo assim). |
| `MQTT_USERNAME` / `MQTT_PASSWORD` | backend e broker | Administrador do broker e identidade do backend. **Obrigatórias** no `.env` do compose. |
| `MQTT_PUBLIC_URL` | backend | Endereço que os ESP32 usam. Vai na resposta de `POST /nodes`. |
| `MQTT_DYNSEC` | backend | `false` desliga a gestão de credenciais (broker legado). Padrão: ligado sempre que `MQTT_URL` existe. |

`.env` mínimo para o compose:

```env
MQTT_USERNAME=autouni-backend
MQTT_PASSWORD=<senha longa e aleatória>
MQTT_PUBLIC_URL=mqtt://192.168.0.10:1883
```

> Trocar `MQTT_PASSWORD` depois da primeira subida não muda a senha no broker, que já está gravada no volume. Troque com `mosquitto_ctrl dynsec setClientPassword` ou recrie o volume `mqtt-data`.

---

## Nós físicos e credenciais

Fluxo de instalação de um ESP32 (perfis ADMIN ou TECHNICIAN):

1. **Cadastrar o nó**: `POST /nodes` com `{ "name": "ESP32 Sala A206", "roomId": "…" }`. A resposta traz as credenciais:
   ```json
   {
     "node": { "id": "…", "mqttUsername": "node-67f06fc2", … },
     "credentials": {
       "username": "node-67f06fc2",
       "password": "…",
       "brokerUrl": "mqtt://192.168.0.10:1883",
       "topicPrefix": "org/00000000-0000-0000-0000-000000000001",
       "lastWillTopic": "org/00000000-0000-0000-0000-000000000001/nodes/node-67f06fc2/online"
     }
   }
   ```
   **A senha aparece só aqui.** O backend não a guarda; o broker guarda só o hash.
2. **Atribuir os devices ao nó**: `POST /devices` ou `PUT /devices/:id` com `nodeId` e `channel`. Device em nó sem `channel` é recusado.
3. A ACL do nó é recalculada automaticamente a cada criação, alteração ou remoção de device.

| Ação | Rota |
|------|------|
| Gerar nova senha (derruba a sessão antiga) | `POST /nodes/:id/rotate-credentials` |
| Reaplicar a ACL no broker | `POST /nodes/:id/sync-acl` |
| Remover o nó e revogar a credencial | `DELETE /nodes/:id` |

### O que cada canal pode fazer (ACL)

| `channel` | Publica | Assina |
|-----------|---------|--------|
| `ENERGY_METER` | `status`, `online`, `energy` | — |
| `RELAY`, `DIMMER` | `status`, `online`, `energy` | `command` |
| `IR` | `status`, `online` | `command` |
| `GAS_MQ2`, `GAS_MQ135`, `PIR` | `status`, `online`, `sensor` | — |
| sem canal (cadastro antigo) | tudo | `command` |

Todas as permissões ficam sob `<P>/`. Todo nó também publica `<P>/nodes/<usuário>/online`. A matriz está em `src/modules/nodes/node-acl.ts`. A mesma regra é aplicada pelo backend ao receber a mensagem (`channel-capabilities.ts`): uma leitura de energia vinda de um canal de gás é rejeitada mesmo que chegue.

---

## Tópicos

O backend assina, com QoS 1:

| Tópico | Efeito |
|--------|--------|
| `org/+/devices/+/status` | `Device.status` e heartbeat |
| `org/+/devices/+/energy` | Cria `EnergyReading` e heartbeat |
| `org/+/devices/+/sensor` | Cria `SensorReading` e avalia alarme ou ocupação; heartbeat |
| `org/+/devices/+/online` | `Device.online` |
| `org/+/nodes/+/online` | `DeviceNode.online` e `online` de **todos** os devices do nó (é o LWT do ESP32) |

### Como um tópico vira um device

`org/<organizationId>/devices/<slug>/<sufixo>` é resolvido em duas partes:

- O **segundo nível** é a organização. Todo o processamento (busca do device, gravação, alarmes, eventos de WebSocket) roda no escopo dela. Um slug que só existe em outra organização simplesmente não é encontrado.
- `devices/<slug>` é comparado com `Device.mqttTopic`. **Exatamente um nível** depois de `devices/`: `…/devices/predio/sala/x/status` nunca é recebido, e o cadastro de device recusa esse formato.
- `mqttTopic` é **único dentro da organização**. Duas organizações podem ter `devices/ac-a101`. Duplicata na mesma organização retorna `409`.
- Tópicos fora do namespace (`devices/x/status`, sem `org/<id>/`) não são assinados pelo backend e a ACL dos nós não os permite.

Tópico sem device cadastrado é descartado com log `No device registered for …`.

Mensagens de um mesmo device são processadas **em ordem**, porque a energia do intervalo depende da leitura anterior.

O alias `devices/+/reading` foi removido.

---

## Payloads

Tudo que não cumpre o contrato é **rejeitado** com log `Rejected MQTT message on <tópico>: <motivo>`. Nada é gravado com valor inventado.

### `<P>/devices/<slug>/status`

```
ON
{"status":"OFF"}
```

Precisa ser um de `ON`, `OFF`, `STANDBY` ou `ERROR` (maiúsculas ou minúsculas). É o **estado real** do aparelho, confirmado pelo hardware. **Não** use `status` para alarme de gás: gás vai em `/sensor`.

### `<P>/devices/<slug>/online` e `<P>/nodes/<usuário>/online`

```
true | false | 1 | 0
{"online":true}
```

Qualquer outro valor é rejeitado. O LWT do nó deve ser `<P>/nodes/<usuário>/online` com payload `false` e `retain: true`.

### `<P>/devices/<slug>/energy`

```json
{
  "powerW": 152.4,
  "energyTotalWh": 123456.7,
  "voltage": 220.1,
  "current": 0.69,
  "frequency": 60.0,
  "powerFactor": 0.95
}
```

| Campo | Unidade | Faixa | Observação |
|-------|---------|-------|------------|
| `powerW` | W | ≥ 0 | Potência instantânea. Nunca é somada. |
| `energyTotalWh` | Wh | ≥ 0 | Contador acumulado do medidor (PZEM: `energy()` em kWh × 1000). **Preferido.** |
| `energyWh` | Wh | ≥ 0 | Energia do intervalo, se o firmware já calcular. |
| `voltage` | V | 0–500 | |
| `current` | A | 0–200 | `0` é gravado como `0`, não como nulo. |
| `frequency` | Hz | 0–100 | |
| `powerFactor` (ou `pf`) | — | 0–1 | |

Pelo menos um entre `energyWh`, `energyTotalWh` e `powerW` é obrigatório.

O backend grava em `EnergyReading.energyWh` a **energia do intervalo desde a leitura anterior**, que é o único valor somado nas estatísticas (`SUM(energyWh)` = energia do período):

1. Com `energyWh`: usa o valor como veio.
2. Com `energyTotalWh`: grava a diferença para o contador anterior. A primeira leitura só estabelece a base (0 Wh). Um contador menor que o anterior é tratado como medidor zerado e conta o que acumulou desde o zero.
3. Só com `powerW`: integra a potência no tempo (média com a leitura anterior × intervalo). Uma lacuna acima de 5 minutos conta 0.

> **Payload legado rejeitado.** `{"valueWh": …}` (e os aliases `power`, `watts`, `value`) não são mais aceitos. Era ambíguo: o firmware mandava kWh acumulado, a documentação dizia potência, e a soma inflava os kWh.

O carimbo de tempo é sempre o do servidor. Para backfill, use `POST /energy/readings` com `timestamp`.

### `<P>/devices/<slug>/sensor`

```json
{ "kind": "GAS_MQ2", "value": 812, "unit": "adc", "raw": 812 }
{ "readings": [ { "kind": "GAS_MQ2", "value": 812 }, { "kind": "GAS_MQ135", "value": 640 } ] }
{ "motion": true }
```

| Campo | Observação |
|-------|------------|
| `kind` | `GAS_MQ2`, `GAS_MQ135` ou `MOTION`. Pode ser omitido quando o `channel` do device o determina. |
| `value` | Gás: número ≥ 0 (hoje a leitura bruta do ADC, 0–4095). Movimento: booleano ou 0/1. |
| `unit`, `raw` | Opcionais. |

O que acontece depois de gravar:

- **Gás**: o valor é comparado ao limite (`SensorThreshold`) do device ou, sem ele, ao padrão da organização.
  - `≥ warnAt` abre um alarme `WARNING`; `≥ alarmAt` abre ou escala para `CRITICAL`.
  - O alarme só fecha abaixo de `clearAt` (histerese), para não abrir e fechar a cada oscilação.
  - Abrir, escalar e fechar geram notificação (e push) para ADMIN, COORDINATOR e TECHNICIAN.
  - O seed cria limites iniciais de 1500/1800/1300 (ADC bruto). Calibre depois do burn-in de 24–48 h dos sensores.
- **Movimento** (`1`): a sala fica `occupied: true` e `lastMotionAt` é atualizado.
  - "Sem movimento" (`0`) não esvazia a sala. Ela só fica vazia depois de `Room.vacancyTimeoutSec` (padrão 600 s) sem movimento, porque o HC-SR501 oscila.
  - A varredura de vacância roda a cada 15 s.
- Leituras de sensor e mudanças de ocupação reavaliam as automações `CONDITION` da organização.

---

## Comandos do backend para o nó

`POST /devices/:id/control`, `PUT /devices/:id/status`, `POST /devices/bulk-control` e as automações publicam em `<P>/<mqttTopic>/command`:

```json
{ "state": "ON", "intensity": 75, "temperature": 22 }
```

`intensity` (0–100, dimmer) e `temperature` (°C, IR) aparecem só quando enviados.

- Comando para um canal que não recebe comando (medidor, gás, PIR) é recusado com `400`.
- O estado é gravado de forma otimista. O firmware deve **confirmar** publicando o estado real em `<P>/devices/<slug>/status`; essa confirmação sobrescreve o estado gravado.

### Automações

O campo `action` aceita:

```json
{ "deviceId": "<uuid>", "command": "on|off|toggle", "intensity": 50 }
{ "topic": "devices/<slug>/command", "payload": { "state": "OFF" } }
```

O `topic` da automação continua relativo: o backend aplica o prefixo da organização da automação ao publicar.

O alvo precisa ser um device da mesma organização. Isso é validado ao salvar e de novo ao executar.

Automações `CONDITION` usam `condition` em JSON e disparam só na transição de falso para verdadeiro:

```json
{ "type": "occupancy", "roomId": "<uuid>", "occupied": false, "forSeconds": 600 }
{ "type": "sensor", "deviceId": "<uuid>", "kind": "GAS_MQ2", "op": "gte", "value": 1800, "maxAgeSeconds": 300 }
```

---

## Eventos WebSocket

Todos vão **só para a sala da organização** do device; um socket de outra organização não os recebe.

| Origem | Evento | Payload |
|--------|--------|---------|
| `/status` ou rotas de controle | `device:status` | `{ deviceId, status, timestamp }` |
| `/online`, LWT do nó ou `PUT /devices/:id/online` | `device:online` | `{ deviceId, online, timestamp }` |
| `org/+/nodes/+/online` | `node:online` | `{ nodeId, online, timestamp }` |
| `/energy` | `energy:update` | `{ deviceId, power, energy, energyTotalWh, voltage, current, frequency, powerFactor, reading, timestamp }` |
| `/sensor` | `sensor:update` | `{ deviceId, roomId, kind, value, unit, raw, timestamp }` |
| alarme de gás | `sensor:alarm` | `{ state: opened\|escalated\|cleared\|acknowledged, alarm, deviceId, roomId }` |
| ocupação | `room:occupancy` | `{ roomId, occupied, timestamp }` |

Em `energy:update`, `power` é a potência instantânea (W) e `energy` é a energia do intervalo (Wh). O evento `mqtt:raw` foi removido.

Conexão: `io(url, { auth: { token: <accessToken> } })`. Refresh token ou token sem organização é desconectado.

---

## Testando com mosquitto_pub / mosquitto_sub

Com um nó cadastrado (`node-67f06fc2`, senha da resposta de `POST /nodes`) e devices `devices/pzem-a206` (`ENERGY_METER`), `devices/mq2-a206` (`GAS_MQ2`) e `devices/relay1-a206` (`RELAY`) atribuídos a ele:

```bash
U=node-67f06fc2; P='<senha>'; PFX=org/00000000-0000-0000-0000-000000000001   # topicPrefix

# presença do nó
mosquitto_pub -h localhost -u $U -P "$P" -t $PFX/nodes/$U/online -m true -r

# energia (contador acumulado do PZEM, em Wh)
mosquitto_pub -h localhost -u $U -P "$P" -t $PFX/devices/pzem-a206/energy \
  -m '{"powerW":152.4,"energyTotalWh":123456.7,"voltage":220.1,"current":0.69,"frequency":60,"powerFactor":0.95}'

# gás
mosquitto_pub -h localhost -u $U -P "$P" -t $PFX/devices/mq2-a206/sensor -m '{"value":812,"unit":"adc"}'

# receber comandos do relé
mosquitto_sub -h localhost -u $U -P "$P" -t $PFX/devices/relay1-a206/command -v
```

Observar o tráfego como backend (o administrador pode assinar tudo):

```bash
mosquitto_sub -h localhost -u "$MQTT_USERNAME" -P "$MQTT_PASSWORD" -t 'org/#' -v
```

Um publish fora da ACL (outro device, outra organização, tópico sem `org/<id>/`, ou sufixo que o canal não produz) é descartado pelo broker em silêncio: não aparece no `mosquitto_sub` acima.

---

## Troubleshooting

**`Connection Refused: not authorised`**
: Usuário ou senha errados, ou cliente anônimo. Para um nó, gere nova senha com `POST /nodes/:id/rotate-credentials`.

**`O broker não respondeu ao dynamic-security`**
: O plugin não carregou. Confira `docker logs autoUniMqtt` (deve aparecer `Loading plugin: /usr/lib/mosquitto_dynamic_security.so`) e se a imagem é `2.0.20`.

**`/mosquitto/init.sh: Permission denied`**
: Em hosts com SELinux (Fedora), as montagens precisam do sufixo `:z`, que o compose já usa.

**Publish chega ao broker, mas nada é gravado**
: Veja nos logs do backend:
  - `Rejected MQTT message …`: o payload não cumpre o contrato, e o motivo vem na mensagem.
  - `No device registered for org … devices/…`: o slug não corresponde a nenhum `Device.mqttTopic` **daquela organização**.
  - Nenhum log: o broker barrou pela ACL. Confira o `nodeId` e o `channel` do device, ou force `POST /nodes/:id/sync-acl`.

**Nó desconecta logo depois de uma alteração de device**
: Comportamento do dynamic-security ao mudar a ACL. O firmware deve reconectar.

---

## Limitações conhecidas

- **Sem TLS.** Senhas trafegam em claro na LAN. Para rede não isolada, configure um listener 8883 com certificado e use `mqtts://`.
- **Sem timeout de `online` por inatividade.** A queda é detectada pelo LWT do nó. Sem LWT, `lastSeen` envelhece, mas `online` não muda.
- **Comando sem confirmação garantida.** `pending: true` significa "saiu do backend". A confirmação real é o `/status` do firmware.
