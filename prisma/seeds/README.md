# AutoUni Database Seeder

Sistema completo de seed para popular o banco de dados do AutoUni com dados iniciais de demonstração.

## 📁 Estrutura

```
prisma/
├── seed.ts                    # Script principal de seed
└── seeds/                     # Dados em JSON
    ├── users.json             # Usuários do sistema
    ├── buildings.json         # Prédios, andares e salas
    ├── devices.json           # Dispositivos IoT
    └── automations.json       # Automações agendadas
```

## 🚀 Como Executar

### Localmente (desenvolvimento)

```bash
# Executar seed manualmente
npx prisma db seed

# Ou via npm
npm run prisma db seed
```

### Docker (automático)

O seed é executado automaticamente durante o startup do container no `entrypoint.sh`:

```bash
./dev.sh rebuild  # Rebuilda e reinicia o container (seed é executado)
```

## 📊 Dados Incluídos

### 👥 Usuários (users.json)

**4 usuários padrão + 1 usuário root (via .env):**

| Email | Senha | Role | Descrição |
|-------|-------|------|-----------|
| `admin@autouni.edu.br` | `Admin@123` | ADMIN | Administrador do sistema |
| `coordenador@autouni.edu.br` | `Coord@123` | COORDINATOR | Coordenador |
| `tecnico@autouni.edu.br` | `Tech@123` | TECHNICIAN | Técnico |
| `viewer@autouni.edu.br` | `View@123` | VIEWER | Visualizador |
| **${ROOT_EMAIL}** | **${ROOT_PASSWORD}** | ADMIN | Root (via .env) |

> ⚠️ **IMPORTANTE**: Altere essas senhas em produção!

### 🏢 Estrutura de Prédios (buildings.json)

**5 Blocos completos:**

1. **Bloco A - Engenharia** (4 andares, 40 salas)
   - Térreo: A101-A110
   - 1º Andar: A201-A210
   - 2º Andar: A301-A310
   - 3º Andar: A401-A410

2. **Bloco B - Ciências Humanas** (3 andares, 30 salas)
   - Térreo: B101-B110
   - 1º Andar: B201-B210
   - 2º Andar: B301-B310

3. **Bloco C - Administração** (3 andares, 30 salas)
   - Térreo: C101-C110
   - 1º Andar: C201-C210
   - 2º Andar: C301-C310

4. **Bloco D - Ciências Exatas** (5 andares, 50 salas)
   - Térreo: D101-D110
   - 1º Andar: D201-D210
   - 2º Andar: D301-D310
   - 3º Andar: D401-D410
   - 4º Andar: D501-D510

5. **Bloco E - Saúde** (4 andares, 40 salas)
   - Térreo: E101-E110
   - 1º Andar: E201-E210
   - 2º Andar: E301-E310
   - 3º Andar: E401-E410

**Total:** 5 prédios, 19 andares, 190 salas, **977 dispositivos**

**Padrão de Nomenclatura:**
- Formato: `[Letra do Bloco][Andar][Número da Sala]`
- Exemplo: `A201` = Bloco A, 2º andar (casa da centena = 2), sala 01
- Cada andar tem 10 salas numeradas de 01 a 10

### 🔌 Dispositivos IoT (devices.json)

**977 dispositivos distribuídos em 190 salas** com configuração automática baseada no tipo de sala:

#### **Padrão por Tipo de Sala:**

**CLASSROOM (Sala de Aula)** - 5 dispositivos:
- 2× Lâmpadas LED (principal + auxiliar)
- 1× Ar-Condicionado (12.000 BTU)
- 1× Projetor (Full HD)
- 1× Sensor de Presença (PIR)

**LAB (Laboratório)** - 7 dispositivos:
- 3× Lâmpadas LED (principal + 2 bancadas)
- 1× Ar-Condicionado (18.000 BTU)
- 1× Sensor de Temperatura/Umidade
- 1× Sensor de Presença
- 1× Fechadura Inteligente

**OFFICE (Escritório)** - 4 dispositivos:
- 1× Iluminação LED
- 1× Ar-Condicionado (9.000 BTU)
- 1× Sensor de Presença
- 1× Fechadura Inteligente

**AUDITORIUM (Auditório)** - 8 dispositivos:
- 3× Iluminação (principal + palco + plateia)
- 1× Ar-Condicionado Central (36.000 BTU)
- 1× Projetor 4K
- 1× Sistema de Som (5.1)
- 1× Sensor de Ocupação
- 1× Fechadura Inteligente

**LIBRARY (Biblioteca)** - 6 dispositivos:
- 3× Iluminação (geral + estantes + leitura)
- 2× Ar-Condicionado (24.000 BTU cada)
- 1× Sensor de Presença

**OTHER (Outros)** - 3 dispositivos:
- 1× Iluminação LED
- 1× Ar-Condicionado (9.000 BTU)
- 1× Sensor de Presença

#### **Características dos Dispositivos:**

Cada dispositivo possui:
- **Nome único** descritivo com código da sala
- **Tipo** (LIGHT, AC, PROJECTOR, SPEAKER, LOCK, SENSOR)
- **Status inicial** (ON/OFF)
- **MQTT Topic** para comunicação IoT
- **Metadata** com especificações técnicas (potência, marca, modelo, etc.)

#### **Exemplo de MQTT Topics:**
- `devices/light-a101-main` - Lâmpada Principal Sala A101
- `devices/light-a101-aux` - Lâmpada Auxiliar Sala A101
- `devices/ac-a103` - Ar-condicionado Lab A103
- `devices/sensor-temp-a103` - Sensor temperatura Lab A103
- `devices/lock-a103` - Fechadura inteligente Lab A103
- `devices/projector-a109` - Projetor Auditório A109
- `devices/speaker-a109` - Sistema de som Auditório A109

#### **Geração Automática:**

O arquivo `devices.json` é gerado automaticamente pelo script `generate-devices.ts`, que:
1. Lê a estrutura de salas de `buildings.json`
2. Cria dispositivos apropriados para cada tipo de sala
3. Gera MQTT topics únicos e padronizados
4. Adiciona metadata técnica realista

Para regenerar os dispositivos:
```bash
cd prisma/seeds
npx tsx generate-devices.ts
```

### ⚙️ Automações (automations.json)

**7 automações pré-configuradas:**

1. **Desligar luzes à noite** - `0 23 * * *` (23h diariamente)
2. **Ligar luzes manhã** - `0 7 * * 1-5` (7h dias úteis)
3. **Desligar AC fim de expediente** - `0 18 * * 1-5` (18h dias úteis)
4. **Modo econômico fim de semana** - `0 0 * * 6` (sábado 00h)
5. **Verificação de sensores** - `*/30 * * * *` (a cada 30 min)
6. **Shutdown de emergência** - MANUAL (acionamento manual)
7. **Reiniciar auditórios** - `0 0 * * 0` (domingo 00h)

### 📈 Leituras de Energia (gerado automaticamente)

O seed cria **50 leituras de exemplo** (últimas 24h):
- 10 dispositivos selecionados
- 5 leituras por dispositivo
- Intervalos de 4 horas
- Valores realistas com variação ±10%

## 🔧 Personalização

### Adicionar Novos Usuários

Edite `prisma/seeds/users.json`:

```json
{
  "email": "novousuario@autouni.edu.br",
  "name": "Nome Completo",
  "password": "SenhaSegura@123",
  "role": "ADMIN",
  "phone": "+55 11 98765-4321",
  "cpf": "123.456.789-00"
}
```

### Adicionar Novo Prédio

Edite `prisma/seeds/buildings.json`:

```json
{
  "name": "Bloco F - Nome do Bloco",
  "description": "Descrição do prédio",
  "location": "Localização no campus",
  "floors": [
    {
      "number": 1,
      "name": "Térreo",
      "rooms": [
        { "name": "F101", "type": "CLASSROOM" },
        { "name": "F102", "type": "CLASSROOM" },
        { "name": "F103", "type": "LAB" },
        { "name": "F104", "type": "CLASSROOM" },
        { "name": "F105", "type": "CLASSROOM" },
        { "name": "F106", "type": "CLASSROOM" },
        { "name": "F107", "type": "CLASSROOM" },
        { "name": "F108", "type": "CLASSROOM" },
        { "name": "F109", "type": "OFFICE" },
        { "name": "F110", "type": "OTHER" }
      ]
    }
  ]
}
```

**Lembre-se do padrão de nomenclatura:**
- Letra do bloco + andar na casa da centena + número da sala (01-10)
- Exemplo: F201 = Bloco F, 2º andar, sala 01

### Adicionar Dispositivos

⚠️ **IMPORTANTE**: O arquivo `devices.json` é gerado automaticamente pelo script `generate-devices.ts`.

**Para adicionar dispositivos:**

1. **Edite o script gerador** `prisma/seeds/generate-devices.ts`
2. **Modifique a função** `generateDevicesForRoom()` para o tipo de sala desejado
3. **Regenere o arquivo**:
   ```bash
   cd prisma/seeds
   npx tsx generate-devices.ts
   ```

**Ou adicione manualmente** em `devices.json`:

```json
{
  "roomName": "F101",
  "devices": [
    {
      "name": "Dispositivo X F101",
      "type": "LIGHT",
      "status": "OFF",
      "mqttTopic": "devices/device-x-f101",
      "metadata": {
        "power": "50W",
        "brand": "Marca"
      }
    }
  ]
}
```

**Importante:** O `roomName` deve corresponder exatamente ao nome da sala em `buildings.json`.

### Adicionar Automações

Edite `prisma/seeds/automations.json`:

```json
{
  "name": "Nova Automação",
  "description": "Descrição",
  "triggerType": "SCHEDULE",
  "cron": "0 12 * * *",
  "action": {
    "type": "mqtt",
    "topic": "devices/target/command",
    "payload": {
      "state": "ON"
    }
  },
  "enabled": true
}
```

## 🔐 Usuário Root

O usuário root é criado automaticamente usando variáveis de ambiente:

```bash
# .env
ROOT_EMAIL=admin@exemplo.com
ROOT_PASSWORD=SenhaForte@123
```

Se não definido, apenas os 4 usuários padrão serão criados.

## 📝 Logs do Seed

Durante a execução, você verá:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   AutoUni Database Seeder
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌱 Seeding users...
  ✓ User created: admin@autouni.edu.br (ADMIN)
  ✓ User created: coordenador@autouni.edu.br (COORDINATOR)
  ...
✅ 5 users seeded

🌱 Seeding buildings, floors, and rooms...
  ✓ Building: Bloco A - Engenharia
    ✓ Floor 1: Térreo
      ✓ Room: A101 (CLASSROOM)
      ✓ Room: A102 (CLASSROOM)
  ...
✅ Buildings structure seeded

...

📊 Database Statistics:
   Users: 5
   Buildings: 5
   Floors: 19
   Rooms: 190
   Devices: 977
   Automations: 7
   Energy Readings: 250
```

## ⚠️ Observações

1. **Idempotência**: O seed pode ser executado múltiplas vezes sem duplicar dados (usa `findFirst` + `create`)
2. **Senhas**: Todas as senhas são hashadas com bcrypt (10 rounds)
3. **Ordem**: A ordem de execução importa (usuários → prédios → dispositivos → automações → leituras)
4. **Validação**: O Prisma valida todos os dados antes de inserir

## 🧪 Testar Seed Localmente

```bash
# 1. Certifique-se que o banco está rodando
./dev.sh db-only

# 2. Execute migrations
npx prisma migrate dev

# 3. Execute seed
npx prisma db seed

# 4. Verifique dados
npx prisma studio
```

## 🐛 Troubleshooting

### Erro: "User already exists"
O seed detecta usuários existentes. Não duplica.

### Erro: "Room not found"
Verifique se o nome da sala em `devices.json` corresponde exatamente ao nome em `buildings.json`. 

**Padrão correto:** 
- ✅ `"roomName": "A101"` (em devices.json)
- ✅ `"name": "A101"` (em buildings.json)

**Errado:**
- ❌ `"roomName": "Sala A101"`
- ❌ `"roomName": "a101"` (case-sensitive)

### Erro: "No admin user found"
O seed de automações precisa de pelo menos um usuário ADMIN. Execute o seed de usuários primeiro.

### Resetar tudo
```bash
# Apaga TODOS os dados e re-executa migrations
npx prisma migrate reset

# Ou via Docker
./dev.sh clean-all
./dev.sh start
```

## 📚 Recursos

- [Prisma Seeding](https://www.prisma.io/docs/guides/database/seed-database)
- [Cron Expression Generator](https://crontab.guru/)
- [MQTT Topics Best Practices](https://www.hivemq.com/blog/mqtt-essentials-part-5-mqtt-topics-best-practices/)
