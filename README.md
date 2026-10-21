# AutoUni Backend

Sistema de Gerenciamento Inteligente para Universidades - API REST e WebSocket

[![NestJS](https://img.shields.io/badge/NestJS-11.0-E0234E.svg)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6.svg)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.18-2D3748.svg)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)](https://www.postgresql.org/)
[![MQTT](https://img.shields.io/badge/MQTT-5.14-660066.svg)](https://mqtt.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## 📋 Índice

- [Sobre o Projeto](#-sobre-o-projeto)
- [Funcionalidades](#-funcionalidades)
- [Tecnologias](#-tecnologias)
- [Pré-requisitos](#-pré-requisitos)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Uso](#-uso)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [API Documentation](#-api-documentation)
- [Scripts Disponíveis](#-scripts-disponíveis)
- [Docker](#-docker)
- [Database](#-database)
- [MQTT Integration](#-mqtt-integration)
- [Testes](#-testes)
- [Deploy](#-deploy)
- [Troubleshooting](#-troubleshooting)

---

## 🚀 Sobre o Projeto

O **AutoUni Backend** é uma API REST e WebSocket robusta e escalável para gerenciamento inteligente de ambientes universitários. O sistema integra dispositivos IoT (ESP32), processa dados em tempo real via MQTT, calcula consumo energético, gerencia automações e fornece endpoints completos para controle e monitoramento.

### Características Principais

- 🏗️ **Arquitetura Modular**: Estrutura organizada por domínios (DDD-lite)
- 🔐 **Autenticação JWT**: Login, refresh token e controle de acesso por roles
- 📡 **MQTT Integration**: Comunicação bidirecional com dispositivos IoT
- ⚡ **WebSocket Real-time**: Atualizações instantâneas para o frontend
- 📊 **Monitoramento Energético**: Cálculo e agregação de consumo
- 🤖 **Sistema de Automações**: Agendamentos cron e condições personalizadas
- 📄 **Geração de Relatórios**: PDF, CSV, XLSX com filtros avançados
- 🗃️ **Prisma ORM**: Type-safe database queries
- 🐳 **Docker Ready**: Containerização completa (app + db + mqtt)
- 📚 **Swagger/OpenAPI**: Documentação automática da API
- 🧪 **Testes**: Jest para unit e e2e tests

---

## ✨ Funcionalidades

### Autenticação e Autorização
- ✅ Login/Logout com JWT
- ✅ Refresh token automático
- ✅ Proteção de rotas por role (ADMIN, COORDINATOR, TECHNICIAN, VIEWER)
- ✅ Recuperação de senha via email
- ✅ Gerenciamento de perfil

### Gestão Hierárquica
- ✅ CRUD de Prédios (Buildings)
- ✅ CRUD de Andares (Floors)
- ✅ CRUD de Salas (Rooms)
- ✅ Tipos de sala (CLASSROOM, LAB, OFFICE, AUDITORIUM, LIBRARY)
- ✅ Navegação hierárquica completa

### Controle de Dispositivos
- ✅ CRUD de Dispositivos (Devices)
- ✅ Tipos: LIGHT, AC, PROJECTOR, SPEAKER, LOCK, SENSOR
- ✅ Status: ON, OFF, STANDBY, ERROR
- ✅ Controle individual e em massa
- ✅ Metadata customizada (JSON)
- ✅ Tracking de última conexão (lastSeen)

### Monitoramento Energético
- ✅ Registro de leituras (EnergyReading)
- ✅ Campos: valueWh, voltage, current
- ✅ Agregação por dispositivo, sala, andar, prédio
- ✅ Estatísticas: total, média, máximo, mínimo
- ✅ Filtros por período (data inicial/final)
- ✅ Limpeza automática de dados antigos

### Automações
- ✅ CRUD completo de automações
- ✅ Tipos de gatilho:
  - **SCHEDULE**: Cron expressions (agendamento)
  - **CONDITION**: Condições personalizadas (JSON)
  - **MANUAL**: Execução manual
- ✅ Ações configuráveis (MQTT publish)
- ✅ Ativação/desativação (enabled)
- ✅ Histórico de execuções
- ✅ Logs de sucesso/erro

### Notificações
- ✅ CRUD de notificações
- ✅ Tipos: INFO, WARNING, ERROR, SUCCESS
- ✅ Marcação de lido/não lido
- ✅ Filtros por usuário
- ✅ Links customizados

### Relatórios
- ✅ 4 tipos:
  - **ENERGY_CONSUMPTION**: Consumo energético
  - **DEVICE_STATUS**: Status dos dispositivos
  - **ROOM_USAGE**: Uso das salas
  - **INCIDENTS**: Incidentes e alertas
- ✅ Formatos: PDF, CSV, XLSX
- ✅ Filtros personalizados (JSON)
- ✅ Status: PENDING, PROCESSING, COMPLETED, FAILED
- ✅ URL de download do arquivo gerado

### Real-time (WebSocket)
- ✅ Gateway Socket.io
- ✅ Eventos:
  - `device:status` - Status de dispositivo alterado (MQTT ou rotas de controle)
  - `device:online` - Dispositivo alcançável/inalcançável
  - `energy:update` - Nova leitura energética
  - `mqtt:raw` - Mensagens MQTT sem dispositivo cadastrado
- ✅ Autenticação via JWT token no handshake (`auth: { token }`, `query` também aceito)
- ✅ Rooms por usuário/prédio/sala

### MQTT Integration
- ✅ Client MQTT integrado
- ✅ Reconexão automática
- ✅ Topics suportados:
  - `devices/{id}/status` - Atualizar status
  - `devices/{id}/energy` - Receber leitura
  - `devices/{id}/online` - Status de conexão
- ✅ Publicação de comandos
- ✅ Broadcast via WebSocket

---

## 🛠️ Tecnologias

### Core
- **NestJS 11.0** - Framework Node.js progressivo
- **TypeScript 5.7** - Type safety
- **Node.js 18+** - Runtime JavaScript

### Database
- **PostgreSQL 16** - Banco de dados relacional
- **Prisma 6.18** - ORM type-safe
- **Prisma Client** - Query builder

### Authentication
- **@nestjs/jwt** - JWT tokens
- **bcrypt** - Password hashing

### IoT & Real-time
- **MQTT 5.14** - Client MQTT para IoT
- **Socket.io 4.8** - WebSocket real-time
- **@nestjs/websockets** - Gateway WebSocket

### Validation & Transformation
- **class-validator** - Validação de DTOs
- **class-transformer** - Transformação de objetos

### Scheduling
- **@nestjs/schedule** - Cron jobs
- **cron-parser** - Parser de expressões cron

### Documentation
- **@nestjs/swagger** - OpenAPI/Swagger docs

### DevOps
- **Docker** - Containerização
- **Docker Compose** - Orquestração de containers
- **ESLint** - Linting
- **Prettier** - Formatação
- **Jest** - Testes unitários e e2e

---

## 📋 Pré-requisitos

### Desenvolvimento Local
- Node.js 18+ e npm
- PostgreSQL 16+ (ou Docker)
- Mosquitto MQTT Broker (ou Docker)

### Desenvolvimento com Docker (Recomendado)
- Docker 20+
- Docker Compose 2+

---

## 🔧 Instalação

### Opção 1: Desenvolvimento Local

#### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/autouni.git
cd autouni/backend
```

#### 2. Instale as dependências
```bash
npm install
```

#### 3. Configure as variáveis de ambiente
```bash
cp .env.example .env
```

Edite o arquivo `.env`:
```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5433/autouni?schema=public"

# MQTT
MQTT_URL="mqtt://localhost:1883"

# JWT
JWT_SECRET="your-super-secret-key-change-in-production"
JWT_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"

# Root User (para seed)
ROOT_EMAIL="admin@autouni.edu.br"
ROOT_PASSWORD="Admin@123"

# Email (opcional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@autouni.edu.br"

# App
PORT="3000"
NODE_ENV="development"
```

#### 4. Configure o banco de dados

```bash
# Gerar Prisma Client
npx prisma generate

# Executar migrations
npx prisma migrate deploy

# Seed (popular com dados de exemplo)
npx prisma db seed
```

#### 5. Inicie o servidor
```bash
# Desenvolvimento com hot-reload
npm run start:dev

# Produção
npm run build
npm run start:prod
```

#### 6. Acesse a API
```
http://localhost:3000/api
```

### Opção 2: Docker Compose (Recomendado)

#### 1. Configure as variáveis de ambiente
```bash
cp .env.example .env
# Edite conforme necessário
```

#### 2. Inicie todos os serviços
```bash
# Via script helper
./dev.sh up

# Ou via docker-compose diretamente
docker-compose up --build -d
```

#### 3. Verifique os logs
```bash
# Todos os serviços
docker-compose logs -f

# Apenas a API
docker-compose logs -f app

# Apenas o banco
docker-compose logs -f db

# Apenas MQTT
docker-compose logs -f mqtt
```

#### 4. Acesse os serviços
- API: `http://localhost:3000/api`
- Swagger: `http://localhost:3000/api/docs`
- Prisma Studio: `npx prisma studio`
- PostgreSQL: `localhost:5433`
- MQTT: `localhost:1883`

---

## ⚙️ Configuração

### Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `POSTGRES_USER` | PostgreSQL username | `postgres` |
| `POSTGRES_PASSWORD` | PostgreSQL password | - |
| `POSTGRES_DB` | PostgreSQL database name | `autouni` |
| `POSTGRES_PORT` | PostgreSQL port | `5433` |
| `MQTT_URL` | MQTT broker URL | `mqtt://localhost:1883` |
| `JWT_SECRET` | Secret para assinar JWT | - |
| `JWT_EXPIRATION` | Tempo de expiração do access token | `15m` |
| `JWT_REFRESH_EXPIRATION` | Tempo de expiração do refresh token | `7d` |
| `ROOT_EMAIL` | Email do usuário root (seed) | - |
| `ROOT_PASSWORD` | Senha do usuário root (seed) | - |
| `PORT` | Porta da aplicação | `3000` |
| `NODE_ENV` | Ambiente | `development` |
| `SMTP_HOST` | Servidor SMTP | `smtp.gmail.com` |
| `SMTP_PORT` | Porta SMTP | `587` |
| `SMTP_USER` | Usuário SMTP | - |
| `SMTP_PASS` | Senha SMTP | - |
| `SMTP_FROM` | Email remetente | - |

### Configuração do MQTT

O backend se conecta ao broker MQTT e subscreve aos seguintes topics:

```
devices/+/status      → Atualização de status
devices/+/energy      → Leitura energética
devices/+/online      → Status online/offline
```

Para publicar comandos para dispositivos:
```
devices/{deviceId}/command
```

Veja [MQTT_SETUP.md](./MQTT_SETUP.md) para mais detalhes.

---

## 📖 Uso

### Credenciais Padrão (após seed)

```
Admin:
Email: admin@autouni.edu.br
Senha: Admin@123

Coordenador:
Email: coordenador@autouni.edu.br
Senha: Coord@123

Técnico:
Email: tecnico@autouni.edu.br
Senha: Tech@123

Visualizador:
Email: viewer@autouni.edu.br
Senha: View@123
```

### Fluxo Básico de API

1. **Autenticar**: `POST /api/auth/login`
2. **Obter token**: Receber `accessToken` e `refreshToken`
3. **Usar token**: Header `Authorization: Bearer {accessToken}`
4. **Acessar recursos**: Endpoints protegidos

Veja [USO.md](./USO.md) para exemplos detalhados.

---

## 📁 Estrutura do Projeto

```
backend/
├── prisma/
│   ├── schema.prisma           # Schema do banco de dados
│   ├── seed.ts                 # Script de seed
│   ├── migrations/             # Migrations do Prisma
│   └── seeds/                  # Dados de seed (JSON)
│       ├── users.json
│       ├── buildings.json
│       ├── devices.json
│       └── automations.json
├── src/
│   ├── main.ts                 # Entry point
│   ├── app.module.ts           # Módulo raiz
│   ├── guards/
│   │   └── auth.guard.ts       # Guard de autenticação
│   ├── modules/
│   │   ├── auth/               # Autenticação
│   │   │   ├── controller/
│   │   │   ├── service/
│   │   │   ├── dto/
│   │   │   └── decorators/
│   │   ├── user/               # Usuários
│   │   ├── buildings/          # Prédios
│   │   ├── floors/             # Andares
│   │   ├── rooms/              # Salas
│   │   ├── devices/            # Dispositivos
│   │   ├── energy/             # Energia
│   │   ├── automations/        # Automações
│   │   ├── notifications/      # Notificações
│   │   ├── reports/            # Relatórios
│   │   ├── mqtt/               # MQTT Client
│   │   └── realtime/           # WebSocket Gateway
│   ├── utils/
│   │   └── password.util.ts
│   └── diagrams/
│       └── backend-structure.puml
├── test/                       # Testes e2e
├── docs/
│   └── API_EXAMPLES.md         # Exemplos de API
├── docker-compose.yml          # Docker Compose config
├── Dockerfile                  # Dockerfile da aplicação
├── dev.sh                      # Script helper
└── README.md
```

### Módulos Principais

| Módulo | Descrição | Endpoints |
|--------|-----------|-----------|
| **auth** | Autenticação JWT | `/api/auth/login`, `/api/auth/refresh` |
| **user** | Gerenciamento de usuários | `/api/users` |
| **buildings** | Gerenciamento de prédios | `/api/buildings` |
| **floors** | Gerenciamento de andares | `/api/floors` |
| **rooms** | Gerenciamento de salas | `/api/rooms` |
| **devices** | Gerenciamento de dispositivos | `/api/devices` |
| **energy** | Monitoramento energético | `/api/energy` |
| **automations** | Sistema de automações | `/api/automations` |
| **notifications** | Notificações | `/api/notifications` |
| **reports** | Geração de relatórios | `/api/reports` |
| **mqtt** | Integração MQTT | - (serviço interno) |
| **realtime** | WebSocket Gateway | `ws://localhost:3000` |

---

## 📚 API Documentation

### Swagger/OpenAPI

Acesse a documentação interativa em:
```
http://localhost:3000/api/docs
```

### Endpoints Principais

#### Autenticação
```
POST   /api/auth/login          # Login
POST   /api/auth/logout         # Logout
POST   /api/auth/refresh        # Refresh token
GET    /api/auth/me             # Perfil do usuário
POST   /api/auth/forgot-password # Recuperar senha
```

#### Usuários
```
GET    /api/users               # Listar usuários
POST   /api/users               # Criar usuário
GET    /api/users/:id           # Detalhes do usuário
PUT    /api/users/:id           # Atualizar usuário
DELETE /api/users/:id           # Deletar usuário
```

#### Prédios/Andares/Salas
```
GET    /api/buildings           # Listar prédios
POST   /api/buildings           # Criar prédio
GET    /api/buildings/:id       # Detalhes + andares
GET    /api/floors/:id          # Detalhes + salas
GET    /api/rooms/:id           # Detalhes + dispositivos
```

#### Dispositivos
```
GET    /api/devices             # Listar dispositivos (?status=ON&type=AC)
POST   /api/devices             # Criar dispositivo
PUT    /api/devices/:id         # Atualizar
PUT    /api/devices/:id/status  # Definir status (publica no MQTT)
PUT    /api/devices/:id/online  # Definir alcançabilidade (override)
POST   /api/devices/:id/control # Controlar ({ command: on|off|toggle })
POST   /api/devices/bulk-control # Controle em massa ({ deviceIds, command })
```

#### Energia
```
POST   /api/energy/readings     # Criar leitura
GET    /api/energy/devices/:id/readings # Leituras do dispositivo
GET    /api/energy/devices/:id/stats    # Estatísticas
GET    /api/energy/rooms/:id/stats      # Stats por sala
GET    /api/energy/buildings/:id/stats  # Stats por prédio
```

#### Automações
```
GET    /api/automations         # Listar automações
POST   /api/automations         # Criar automação
PUT    /api/automations/:id     # Atualizar
PATCH  /api/automations/:id/toggle # Ativar/desativar
POST   /api/automations/:id/execute # Executar manualmente
GET    /api/automations/:id/history # Histórico
DELETE /api/automations/:id     # Deletar
```

Veja [docs/API_EXAMPLES.md](./docs/API_EXAMPLES.md) para exemplos completos.

---

## 📜 Scripts Disponíveis

```bash
# Desenvolvimento
npm run start:dev              # Inicia com hot-reload
npm run start:debug            # Inicia em modo debug

# Build
npm run build                  # Build para produção

# Produção
npm run start:prod             # Inicia versão de produção

# Database
npx prisma generate            # Gera Prisma Client
npx prisma migrate dev         # Cria e aplica migration
npx prisma migrate deploy      # Aplica migrations (prod)
npx prisma db seed             # Popula banco com dados
npx prisma studio              # Interface visual do banco

# Testes
npm run test                   # Testes unitários
npm run test:watch             # Testes em watch mode
npm run test:cov               # Cobertura de testes
npm run test:e2e               # Testes end-to-end

# Code Quality
npm run lint                   # ESLint
npm run format                 # Prettier
```

---

## 🐳 Docker

### Scripts Helper (dev.sh)

```bash
# Subir todos os serviços
./dev.sh up

# Reconstruir e subir
./dev.sh rebuild

# Parar todos os serviços
./dev.sh down

# Ver logs
./dev.sh logs

# Limpar tudo (volumes + containers)
./dev.sh clean

# Apenas banco de dados
./dev.sh db-only

# Executar migrations
./dev.sh migrate

# Executar seed
./dev.sh seed

# Prisma Studio
./dev.sh studio
```

### Docker Compose Manual

```bash
# Subir
docker-compose up -d

# Logs
docker-compose logs -f app

# Rebuild
docker-compose up --build -d

# Parar
docker-compose down

# Limpar volumes
docker-compose down -v
```

### Estrutura de Containers

```
┌─────────────────────────────────┐
│         autouni-app             │
│       (NestJS Backend)          │
│         Port 3000               │
└────────┬────────────────────────┘
         │
    ┌────┴─────────┬──────────────┐
    │              │              │
┌───▼────┐   ┌────▼────┐   ┌─────▼─────┐
│   db   │   │  mqtt   │   │ WebSocket │
│  Port  │   │  Port   │   │   WS:     │
│  5433  │   │  1883   │   │   3000    │
└────────┘   └─────────┘   └───────────┘
```

---

## 🗃️ Database

### Schema Overview

O banco de dados utiliza **Prisma ORM** com **PostgreSQL**.

**Principais Entidades:**

- `User` - Usuários do sistema
- `RefreshToken` - Tokens de refresh JWT
- `Building` - Prédios
- `Floor` - Andares
- `Room` - Salas
- `Device` - Dispositivos IoT
- `EnergyReading` - Leituras energéticas
- `Automation` - Automações
- `AutomationHistory` - Histórico de execuções
- `Notification` - Notificações
- `Report` - Relatórios gerados

### Migrations

```bash
# Criar nova migration
npx prisma migrate dev --name nome_da_migration

# Aplicar migrations (produção)
npx prisma migrate deploy

# Resetar banco (desenvolvimento)
npx prisma migrate reset
```

### Seed

O sistema inclui um seed completo com:
- 5 usuários (4 padrão + 1 root via .env)
- 5 prédios com estrutura completa
- 190 salas
- 977 dispositivos
- 7 automações
- 50 leituras energéticas de exemplo

```bash
npx prisma db seed
```

Veja [prisma/seeds/README.md](./prisma/seeds/README.md) para detalhes.

---

## 📡 MQTT Integration

### Conexão

O backend se conecta automaticamente ao broker MQTT configurado em `MQTT_URL`.

### Topics Subscritos

```
devices/+/status      # Status do dispositivo (ON/OFF/STANDBY/ERROR)
devices/+/energy      # Leituras energéticas (valueWh, voltage, current)
devices/+/online      # Status de conexão (online/offline)
```

### Publicação de Comandos

```typescript
// Exemplo: Ligar luz
TOPIC: devices/{deviceId}/command
PAYLOAD: { "state": "ON" }

// Exemplo: Controlar AC
TOPIC: devices/{deviceId}/command
PAYLOAD: { "state": "ON", "temperature": 22 }
```

### Testes MQTT

```bash
# Subscribe
mosquitto_sub -h localhost -p 1883 -t 'devices/#' -v

# Publish teste
mosquitto_pub -h localhost -p 1883 -t 'devices/test/status' -m 'ON'

# Publish leitura
mosquitto_pub -h localhost -p 1883 -t 'devices/test/energy' \
  -m '{"valueWh": 150.5, "voltage": 220, "current": 0.68}'
```

Veja [MQTT_SETUP.md](./MQTT_SETUP.md) para mais detalhes.

---

## 🧪 Testes

```bash
# Testes unitários
npm run test

# Testes em watch mode
npm run test:watch

# Cobertura de testes
npm run test:cov

# Testes e2e
npm run test:e2e
```

### Estrutura de Testes

```
test/
├── app.e2e-spec.ts           # Testes end-to-end
└── jest-e2e.json             # Config do Jest e2e

src/
└── **/*.spec.ts              # Testes unitários
```

---

## 🚀 Deploy

### Variáveis de Ambiente (Produção)

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/autouni
MQTT_URL=mqtt://mqtt-broker:1883
JWT_SECRET=super-secret-change-this
```

### Docker Compose (Produção)

```bash
# Build
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d

# Migrations
docker-compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
```

### Checklist de Deploy

- [ ] Configurar variáveis de ambiente
- [ ] Alterar `JWT_SECRET`
- [ ] Configurar `DATABASE_URL` para banco de produção
- [ ] Configurar MQTT broker de produção
- [ ] Executar migrations
- [ ] (Opcional) Executar seed
- [ ] Configurar SSL/TLS
- [ ] Configurar firewall
- [ ] Configurar backup do banco
- [ ] Monitoramento e logs

---

## 🐛 Troubleshooting

### Erro: ECONNREFUSED ao conectar ao banco

**Causa**: PostgreSQL não está rodando ou URL incorreta

**Solução**:
```bash
# Verificar se DB está rodando
docker ps | grep postgres

# Subir apenas o DB
docker-compose up db -d

# Verificar DATABASE_URL no .env
```

### Erro: MQTT connection failed

**Causa**: Broker MQTT não está rodando

**Solução**:
```bash
# Verificar MQTT
docker ps | grep mosquitto

# Subir MQTT
docker-compose up mqtt -d

# Testar conexão
mosquitto_pub -h localhost -p 1883 -t 'test' -m 'hello'
```

### Erro: Prisma Client não gerado

**Causa**: Prisma Client precisa ser gerado após mudanças no schema

**Solução**:
```bash
npx prisma generate
```

### Porta 3000 já em uso

**Solução**:
```bash
# Alterar PORT no .env
PORT=3001

# Ou matar processo na porta 3000
lsof -ti:3000 | xargs kill -9
```

---

**⭐ Se este projeto foi útil, dê uma estrela!**

---

<div align="center">
[⬆ Voltar ao topo](#autouni-frontend)

</div>
