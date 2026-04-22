# AutoUni Backend - Roadmap de Desenvolvimento

**Projeto:** AutoUni - Sistema de Gerenciamento Inteligente para Universidades (Backend)  
**Início:** Novembro 2024  
**Status Atual:** Fase 4 - Testes e Qualidade (0% completo)  
**Última Atualização:** Abril 2026

---

## Visão Geral do Progresso

```
Fase 1: ████████████████████ 100% [CONCLUÍDA]
Fase 2: ████████████████████ 100% [CONCLUÍDA]
Fase 3: ████████████████████ 100% [CONCLUÍDA]
Fase 4: ░░░░░░░░░░░░░░░░░░░░   0% [PLANEJADA]
Fase 5: ░░░░░░░░░░░░░░░░░░░░   0% [PLANEJADA]

Progresso Geral: ████████████████████ 60% (3/5 fases concluídas)
```

---

## Fases de Desenvolvimento

### Fase 1: Fundação e Infraestrutura (100% Concluída)

**Período:** Novembro - Dezembro 2024  
**Objetivo:** Estabelecer base técnica, arquitetura e ferramentas essenciais

#### 1.1 Configuração Inicial
- [x] Inicialização do projeto com NestJS CLI
- [x] Configuração do TypeScript (strict mode)
- [x] Setup de ESLint e Prettier
- [x] Estrutura de pastas modular (DDD-lite)
- [x] Configuração de variáveis de ambiente (@nestjs/config)
- [x] Setup do Git e repositório GitHub
- [x] Documentação inicial (README.md)

#### 1.2 Database e ORM
- [x] Configuração do PostgreSQL
- [x] Setup do Prisma ORM
- [x] Criação do schema inicial
- [x] Configuração de migrations
- [x] Script de seed com dados de exemplo
- [x] Prisma Client generation
- [x] PrismaService module

#### 1.3 Containerização
- [x] Dockerfile para aplicação
- [x] docker-compose.yml (app + db + mqtt)
- [x] Configuração de volumes persistentes
- [x] Networking entre containers
- [x] Script helper (dev.sh)
- [x] Environment variables management

#### 1.4 Arquitetura Base
- [x] Estrutura modular por domínio
- [x] Separation of concerns (controller/service/repository)
- [x] DTOs com class-validator
- [x] Exception filters
- [x] Logging básico
- [x] Health check endpoint

**Entregas:** Infraestrutura completa, banco configurado, Docker funcionando

---

### Fase 2: Features Core e CRUD (100% Concluída)

**Período:** Janeiro - Março 2025  
**Objetivo:** Implementar funcionalidades principais e CRUDs completos

#### 2.1 Autenticação e Autorização
- [x] AuthModule com JWT strategy
- [x] Login endpoint com bcrypt
- [x] Registro de usuários
- [x] Refresh token com rotação
- [x] AuthGuard customizado
- [x] Role-based access control (RBAC)
- [x] Decorators customizados (@CurrentUser, @Roles)
- [x] Password hashing com bcrypt
- [x] JWT expiration e renovação automática
- [x] Logout com invalidação de token

#### 2.2 Gestão de Usuários
- [x] UserModule completo
- [x] CRUD de usuários
- [x] 4 roles: ADMIN, COORDINATOR, TECHNICIAN, VIEWER
- [x] Validação de email único
- [x] Validação de CPF
- [x] Perfil do usuário (/me)
- [x] Atualização de senha
- [x] Soft delete consideration

#### 2.3 Hierarquia de Localização
- [x] BuildingsModule (CRUD completo)
- [x] FloorsModule (CRUD completo)
- [x] RoomsModule (CRUD completo)
- [x] 5 tipos de sala (CLASSROOM, LAB, OFFICE, AUDITORIUM, LIBRARY)
- [x] Navegação hierárquica (building → floors → rooms)
- [x] Endpoints de detalhes com relations
- [x] Estatísticas agregadas por nível
- [x] Cascade delete nas relações

#### 2.4 Controle de Dispositivos
- [x] DevicesModule (CRUD completo)
- [x] 6 tipos de dispositivo (LIGHT, AC, PROJECTOR, SPEAKER, LOCK, SENSOR)
- [x] 4 status (ON, OFF, STANDBY, ERROR)
- [x] Metadata customizada (JSON)
- [x] Status update endpoint
- [x] Bulk control endpoint
- [x] Tracking de lastSeen
- [x] MQTT topic association

#### 2.5 Monitoramento Energético
- [x] EnergyModule completo
- [x] Registro de leituras (valueWh, voltage, current)
- [x] Estatísticas por dispositivo
- [x] Estatísticas por sala
- [x] Estatísticas por andar
- [x] Estatísticas por prédio
- [x] Agregação temporal (dia, semana, mês)
- [x] Filtros por período
- [x] Cleanup de dados antigos

**Entregas:** API REST completa com todos os CRUDs, autenticação segura, hierarquia funcional

---

### Fase 3: Integração e Features Avançadas (100% Concluída)

**Período:** Abril 2025 - Abril 2026  
**Objetivo:** MQTT, WebSocket, automações, relatórios e documentação

#### 3.1 MQTT Integration [CONCLUÍDA] (100%)
- [x] MqttModule com mqtt library
- [x] Conexão com broker Mosquitto
- [x] Subscribe aos topics principais
- [x] `devices/{id}/status` - Update de status
- [x] `devices/{id}/energy` - Leituras energéticas
- [x] `devices/{id}/online` - Status de conexão
- [x] Publish de comandos
- [x] Reconexão automática
- [x] Error handling e logging
- [x] MQTT opcional para deploy sem broker
- [x] Integração com RealtimeGateway (broadcast)

#### 3.2 Real-time WebSocket [CONCLUÍDA] (100%)
- [x] RealtimeGateway com Socket.io
- [x] Autenticação via JWT token
- [x] Rooms dinâmicas (user, building, room)
- [x] Eventos:
  - [x] `device.status` - Mudança de status
  - [x] `device.online` - Online/offline
  - [x] `energy.reading` - Nova leitura
  - [x] `mqtt.raw` - Mensagens MQTT brutas
- [x] Broadcast seletivo por room
- [x] Disconnect handling
- [x] CORS configuration

#### 3.3 Sistema de Automações [CONCLUÍDA] (100%)
- [x] AutomationsModule completo
- [x] CRUD de automações
- [x] 3 tipos de gatilho:
  - [x] SCHEDULE (cron expressions)
  - [x] CONDITION (condições customizadas)
  - [x] MANUAL (execução manual)
- [x] Scheduler com @nestjs/schedule
- [x] Cron parser para validação
- [x] Execução automática de agendamentos
- [x] Histórico de execuções
- [x] Logs de sucesso/erro
- [x] Ativação/desativação (enabled)
- [x] Execução manual via endpoint
- [x] Estatísticas de automações

#### 3.4 Notificações [CONCLUÍDA] (100%)
- [x] NotificationsModule completo
- [x] CRUD de notificações
- [x] 4 tipos: INFO, WARNING, ERROR, SUCCESS
- [x] Marcação de lido/não lido
- [x] Filtros por usuário
- [x] Filtros por tipo
- [x] Marcar todas como lidas
- [x] Links customizados
- [x] Ordenação por data (mais recentes primeiro)
- [x] Paginação

#### 3.5 Geração de Relatórios [CONCLUÍDA] (100%)
- [x] ReportsModule completo
- [x] CRUD de relatórios
- [x] 4 tipos:
  - [x] ENERGY_CONSUMPTION
  - [x] DEVICE_STATUS
  - [x] ROOM_USAGE
  - [x] INCIDENTS
- [x] 3 formatos: PDF, CSV, XLSX
- [x] Filtros customizados (JSON)
- [x] Status tracking (PENDING, PROCESSING, COMPLETED, FAILED)
- [x] File URL após conclusão
- [x] Geração assíncrona com EventEmitter2 (sem overhead de Redis/Bull)
- [x] Templates PDF com pdfkit (layout landscape, tabelas, cabeçalho)
- [x] Envio por email com nodemailer (SMTP Gmail configurado)
- [x] Endpoint GET /reports/:id/download para streaming do arquivo

#### 3.6 Documentação da API [CONCLUÍDA] (100%)
- [x] Swagger/OpenAPI setup (@nestjs/swagger)
- [x] DTOs documentados
- [x] Endpoints documentados
- [x] Tags por módulo
- [x] Authentication schema
- [x] API_ROUTES_RESPONSES.txt completo
- [x] Swagger decorators aprimorados (Auth, User, Devices, Energy, Automations)
- [x] Swagger decorators aprimorados (Buildings, Notifications)
- [x] Swagger decorators completos para Floors (com schema examples)
- [x] Swagger decorators completos para Rooms (com schema examples)
- [x] Swagger decorators completos para Reports (com schema examples + download)
- [x] Exemplos de response em todos os endpoints

#### 3.7 Validação e Segurança [CONCLUÍDA] (100%)
- [x] class-validator em todos os DTOs
- [x] class-transformer para serialização
- [x] ValidationPipe global
- [x] Password strength validation
- [x] Email format validation
- [x] UUID validation
- [x] Enum validation
- [x] CORS configuration (origins explícitas via env ALLOWED_ORIGINS)
- [x] Helmet para headers seguros (X-XSS-Protection, CSP, HSTS, etc.)
- [x] Rate limiting com @nestjs/throttler (60 req/min global, 10 req/min em auth)
- [x] SQL injection prevention (Prisma nativo — queries parametrizadas)
- [x] XSS protection (Helmet headers + ValidationPipe whitelist)
- [x] CSRF: não necessário (API stateless JWT — browsers não enviam Authorization header automaticamente)
- [x] ScheduleModule.forRoot() corrigido no AppModule (bug: automações @Interval não disparavam)

**Entregas:** Sistema completo com MQTT, WebSocket, automações, relatórios com geração real de arquivos, documentação Swagger 100% e segurança com Helmet + rate limiting

---

### Fase 4: Testes e Qualidade (Planejada)

**Período:** Janeiro - Março 2026  
**Objetivo:** Garantir qualidade e confiabilidade através de testes abrangentes

#### 4.1 Testes Unitários
- [ ] Setup do Jest (já configurado)
- [ ] Testes de services (70%+ coverage)
- [ ] Testes de controllers
- [ ] Testes de guards
- [ ] Testes de utils
- [ ] Mocking de PrismaService
- [ ] Mocking de MQTT
- [ ] Mocking de WebSocket

#### 4.2 Testes de Integração
- [ ] Testes de endpoints com Supertest
- [ ] Testes de autenticação flow
- [ ] Testes de CRUD completo
- [ ] Testes de relações Prisma
- [ ] Testes de validação de DTOs
- [ ] Testes de error handling

#### 4.3 Testes E2E
- [ ] Setup de banco de testes
- [ ] Testes de fluxos completos
- [ ] Testes de autenticação + autorização
- [ ] Testes de navegação hierárquica
- [ ] Testes de automações agendadas
- [ ] Testes de WebSocket events
- [ ] Testes de MQTT integration

#### 4.4 Performance e Load Testing
- [ ] Benchmarks de endpoints
- [ ] Testes de carga (1000+ dispositivos)
- [ ] Testes de stress
- [ ] Profiling de queries Prisma
- [ ] Otimização de N+1 queries
- [ ] Indexação adequada do banco
- [ ] Caching strategies (Redis)

#### 4.5 Code Quality
- [ ] Coverage mínimo de 80%
- [ ] ESLint sem erros
- [ ] Prettier formatação
- [ ] Documentação de código (JSDoc)
- [ ] Code review guidelines
- [ ] SOLID principles audit
- [ ] Security audit (npm audit)

**Entregas:** Suite de testes completa, coverage > 80%, performance otimizada

---

### Fase 5: Otimização e Deploy em Produção (Planejada)

**Período:** Abril - Junho 2026  
**Objetivo:** Preparar para produção, otimizar e adicionar features finais

#### 5.1 Performance e Otimização
- [ ] Query optimization (Prisma)
- [ ] Indexação estratégica do banco
- [ ] Connection pooling
- [ ] Caching com Redis
- [ ] Compressão de responses (gzip)
- [ ] Rate limiting por IP
- [ ] Request/response logging
- [ ] APM integration (New Relic/DataDog)

#### 5.2 Segurança Avançada
- [ ] Helmet.js para headers seguros
- [ ] Rate limiting robusto
- [ ] CSRF protection
- [ ] XSS sanitization
- [ ] SQL injection prevention audit
- [ ] Secrets management (Vault)
- [ ] SSL/TLS certificates
- [ ] Security headers (HSTS, CSP)

#### 5.3 Observabilidade
- [ ] Structured logging (Winston/Pino)
- [ ] Log aggregation (ELK Stack)
- [ ] Metrics collection (Prometheus)
- [ ] Distributed tracing (Jaeger)
- [ ] Error tracking (Sentry)
- [ ] Health checks avançados
- [ ] Status page

#### 5.4 CI/CD Pipeline
- [ ] GitHub Actions workflows
- [ ] Testes automatizados no CI
- [ ] Build e push de Docker images
- [ ] Deploy automático staging
- [ ] Deploy aprovado produção
- [ ] Rollback strategy
- [ ] Blue-green deployment
- [ ] Database migrations automáticas

#### 5.5 Deploy em Produção
- [ ] Configuração Render.com (principal)
- [ ] Configuração AWS/GCP (backup)
- [ ] PostgreSQL gerenciado
- [ ] MQTT broker gerenciado (CloudMQTT)
- [ ] CDN para assets estáticos
- [ ] Backup automático do banco
- [ ] Disaster recovery plan
- [ ] Monitoring e alertas

#### 5.6 Features Adicionais
- [ ] Recuperação de senha via email
- [ ] Email notifications (SMTP)
- [ ] Export de dados (CSV, JSON)
- [ ] Import de dados em massa
- [ ] Auditoria de ações (AuditLog)
- [ ] Versionamento de API (v1, v2)
- [ ] GraphQL endpoint (opcional)
- [ ] API rate limits por role

#### 5.7 Documentação Final
- [ ] OpenAPI/Swagger completo
- [ ] Postman collection
- [ ] Guia de deploy
- [ ] Troubleshooting guide
- [ ] API changelog
- [ ] Contributing guidelines
- [ ] Architecture decision records (ADRs)
- [ ] Video tutorials

**Entregas:** Sistema em produção, monitorado, seguro e documentado

---

## Objetivos por Trimestre

### Q1 2026 (Janeiro - Março)
- [META] Completar Fase 3 (Swagger e segurança)
- [META] Completar Fase 4 (Testes - 80%+ coverage)
- [META] Preparar para beta release

### Q2 2026 (Abril - Junho)
- [META] Completar Fase 5 (Otimização e deploy)
- [META] Deploy em produção (Render.com)
- [META] Release 1.0.0

### Q3 2026 (Julho - Setembro)
- [META] Monitoramento e ajustes pós-lançamento
- [META] Features adicionais baseadas em feedback
- [META] Integração completa com hardware ESP32

---

## Métricas de Sucesso

### Qualidade de Código
- [OK] TypeScript strict mode: 100%
- [OK] ESLint errors: 0
- [META] Test coverage: > 80%
- [META] Swagger completeness: 100%

### Performance
- [OK] Response time: < 200ms (média)
- [META] Database queries: < 50ms (p95)
- [META] Concurrent users: 1000+
- [META] Uptime: 99.9%

### Funcionalidades
- [OK] Autenticação e RBAC: 100%
- [OK] CRUD hierárquico: 100%
- [OK] Controle de dispositivos: 100%
- [OK] MQTT integration: 100%
- [OK] WebSocket real-time: 100%
- [OK] Automações: 100%
- [OK] Notificações: 100%
- [OK] Relatórios: 100% (geração assíncrona, PDF/CSV/XLSX, email, download)
- [OK] Swagger docs: 100% (todos os módulos com schema examples)
- [OK] Segurança: 100% (Helmet, rate limiting, CORS explícito)
- [PLANEJADA] Testes: 0%
- [PLANEJADA] Deploy produção: 0%

---

## Bloqueadores e Riscos

### Bloqueadores Atuais
1. **Geração Assíncrona de Relatórios**
   - Status: Implementação básica concluída
   - Impacto: Médio
   - Solução: Adicionar workers (Bull/BullMQ) ou lambdas
   - ETA: Janeiro 2026

2. **Testes Automatizados**
   - Status: Não iniciado (0% coverage)
   - Impacto: Alto (qualidade e confiança)
   - Solução: Priorizar na Fase 4
   - ETA: Fevereiro 2026

3. **Documentação Swagger Incompleta**
   - Status: 90% completo (faltam Floors, Rooms, Reports)
   - Impacto: Baixo (funcional, falta polimento)
   - Solução: Finalizar decorators nos próximos commits
   - ETA: Dezembro 2025

### Riscos Identificados
1. **Performance com Milhares de Dispositivos**
   - Risco: Lentidão em queries complexas
   - Mitigação: Indexação, caching, paginação
   - Probabilidade: Média

2. **MQTT Broker Stability**
   - Risco: Broker externo pode falhar
   - Mitigação: Reconexão automática, fallback, monitoramento
   - Probabilidade: Baixa

3. **WebSocket Scalability**
   - Risco: Conexões simultâneas podem sobrecarregar
   - Mitigação: Load balancing, Redis adapter, clustering
   - Probabilidade: Média

4. **Database Migrations em Produção**
   - Risco: Downtime durante migrations
   - Mitigação: Blue-green deploy, backup automático
   - Probabilidade: Baixa

---

## Aprendizados e Melhorias

### O que Funcionou Bem
- [OK] Arquitetura modular (fácil manutenção)
- [OK] Prisma ORM (type-safe, migrations suaves)
- [OK] NestJS (estrutura robusta, DI nativo)
- [OK] Docker Compose (ambiente consistente)
- [OK] MQTT optional (flexibilidade de deploy)
- [OK] Swagger + OpenAPI (documentação viva)

### O que Pode Melhorar
- [PENDENTE] Testes (cobertura ainda 0%)
- [PENDENTE] Logging estruturado (usar Winston/Pino)
- [PENDENTE] Observabilidade (métricas e traces)
- [PENDENTE] Geração de relatórios (implementar workers)
- [PENDENTE] Segurança (helmet, rate limit, CSRF)

### Próximas Melhorias Planejadas
- [TODO] Implementar suite de testes completa
- [TODO] Adicionar Redis para caching
- [TODO] Implementar Bull para jobs assíncronos
- [TODO] Melhorar error handling e logging
- [TODO] Adicionar health checks avançados
- [TODO] Configurar CI/CD completo

---

## Notas de Versão

### v0.9.0 (Atual - Abril 2026) — Fase 3 Concluída
- [OK] Geração assíncrona de relatórios (EventEmitter2 + pdfkit + xlsx + nodemailer)
- [OK] Endpoint GET /reports/:id/download (streaming de arquivo)
- [OK] Email de notificação ao completar relatório (SMTP Gmail)
- [OK] Helmet.js para headers seguros
- [OK] Rate limiting com @nestjs/throttler (global 60 req/min, auth 10 req/min)
- [OK] CORS explícito com ALLOWED_ORIGINS
- [OK] ScheduleModule.forRoot() registrado (bug fix: automações @Interval não disparavam)
- [OK] Swagger 100% completo (Floors, Rooms, Reports com schema examples)

### v0.8.5 (Dezembro 2025)
- [OK] MQTT opcional para deploy sem broker
- [OK] Documentação Swagger aprimorada (Auth, User, Devices, Energy, Automations, Buildings, Notifications)
- [OK] API_ROUTES_RESPONSES.txt completo (914 linhas)

### v0.8.0 (Novembro 2025)
- [OK] Relatórios funcionais (CRUD completo)
- [OK] Notificações completas
- [OK] Swagger básico implementado

### v0.7.0 (Outubro 2025)
- [OK] Automações completas com scheduler
- [OK] Histórico de execuções
- [OK] Estatísticas de automações

### v0.6.0 (Setembro 2025)
- [OK] WebSocket real-time com Socket.io
- [OK] MQTT integration completa
- [OK] Broadcast de eventos

### v0.5.0 (Agosto 2025)
- [OK] Monitoramento energético completo
- [OK] Estatísticas agregadas
- [OK] Cleanup de dados antigos

### v0.4.0 (Julho 2025)
- [OK] Controle de dispositivos completo
- [OK] Bulk actions
- [OK] Status tracking

### v0.3.0 (Junho 2025)
- [OK] Hierarquia completa (Buildings/Floors/Rooms)
- [OK] Navegação fluida
- [OK] Cascade delete

### v0.2.0 (Maio 2025)
- [OK] Autenticação JWT completa
- [OK] Refresh token rotation
- [OK] RBAC (4 roles)

### v0.1.0 (Março 2025)
- [OK] Setup inicial NestJS + Prisma
- [OK] Docker Compose funcional
- [OK] Database schema

---

## Compatibilidade com Frontend

O backend está **100% pronto nas Fases 1-3** e **totalmente compatível** com o frontend atual (v0.7.0).

### Endpoints Disponíveis para Frontend
- ✅ Autenticação (login, logout, refresh, me)
- ✅ Usuários (CRUD completo)
- ✅ Prédios/Andares/Salas (navegação hierárquica)
- ✅ Dispositivos (CRUD + controle + stats)
- ✅ Energia (leituras + estatísticas)
- ✅ Automações (CRUD + execução + histórico)
- ✅ Notificações (CRUD + marcação)
- ✅ Relatórios (CRUD + geração)
- ✅ WebSocket real-time (status, energy, mqtt)

### Alinhamento de Roadmaps

| Fase | Backend | Frontend | Status |
|------|---------|----------|--------|
| Fundação | ✅ 100% | ✅ 100% | Alinhado |
| Features Core | ✅ 100% | ✅ 100% | Alinhado |
| Integração | ✅ 100% | 🔄 70% | Backend à frente |
| Testes | ⏳ 0% | ⏳ 0% | Alinhado |
| Deploy | ⏳ 0% | ⏳ 0% | Alinhado |

---

## Como Contribuir

Veja o roadmap e escolha uma tarefa:

1. **Para Iniciantes**: Issues marcadas com `good-first-issue`
2. **Features em Andamento**: Fase 3 - Completar Swagger, relatórios assíncronos
3. **Futuro Próximo**: Fase 4 - Implementar testes

### Áreas que Precisam de Atenção
- 🔴 **Testes** (coverage 0%) - Prioridade ALTA
- 🟡 **Swagger docs** (90%) - Prioridade MÉDIA
- 🟡 **Relatórios assíncronos** (worker jobs) - Prioridade MÉDIA
- 🟢 **Segurança** (helmet, rate limit) - Prioridade BAIXA

---

## Referências e Documentação

- [README.md](./README.md) - Documentação principal
- [API_ROUTES_RESPONSES.txt](./API_ROUTES_RESPONSES.txt) - Documentação completa de rotas
- [USO.md](./USO.md) - Guia de uso e exemplos
- [Swagger Docs](http://localhost:3000/api/docs) - Documentação interativa
- [Prisma Schema](./prisma/schema.prisma) - Schema do banco de dados

---

## Contato e Suporte

- **GitHub Issues**: Para bugs e feature requests
- **Email**: samuel@autouni.com
- **Repositório**: https://github.com/SGKolibri/autouni-backend

---

<div align="center">

**AutoUni Backend - API robusta e escalável para gestão universitária inteligente**

[Voltar ao topo](#autouni-backend---roadmap-de-desenvolvimento)

</div>
