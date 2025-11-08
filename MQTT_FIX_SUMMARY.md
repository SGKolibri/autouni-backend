# 🚨 Solução: MQTT Connection Error

## O Problema

Você vê este erro nos logs:

```
[Nest] 1  - 11/08/2025, 3:30:06 AM   ERROR [MqttService] MQTT connection error
Error: connect ECONNREFUSED ::1:1883 or 127.0.0.1:1883
```

## ✅ Solução Imediata (30 segundos)

### Para Desenvolvedores

Abra um **novo terminal** e execute:

```bash
# Inicie o MQTT
./dev.sh mqtt-only
```

Pronto! O erro deve desaparecer dos logs.

### Ou use o Quick Start

```bash
./quick-start.sh
```

Isso faz tudo automaticamente:
1. Verifica Docker
2. Inicia MQTT
3. Instala dependências
4. Inicia a aplicação

---

## 🎯 O que Fizemos

### 1. **Melhorias no Serviço MQTT**

Atualizamos `src/modules/mqtt/service/mqtt.service.ts` para ser mais resiliente:

- ✅ Melhor rastreamento de tentativas de conexão
- ✅ Mensagens de erro mais descritivas
- ✅ Aplicação continua funcionando sem MQTT (modo degradado)
- ✅ Aviso claro quando MQTT não está disponível

### 2. **Novos Arquivos de Documentação**

- `MQTT_TROUBLESHOOTING.md` - Guia completo de resolução de problemas
- `quick-start.sh` - Script para iniciar tudo automaticamente

---

## 📊 Status da Aplicação com/sem MQTT

### ✅ Com MQTT Conectado

```
✅ Connected to MQTT broker at mqtt://localhost:1883
Subscribed to devices/+/status
Subscribed to devices/+/energy
Subscribed to devices/+/reading
Subscribed to devices/+/online
```

**Funcionalidades disponíveis:**
- 📡 Comunicação bidirecional com dispositivos
- ⚡ Leituras de energia em tempo real
- 🔄 Automações com MQTT
- 🌐 WebSocket com dados de dispositivos

### ⚠️ Sem MQTT (Modo Degradado)

```
⚠️ Max MQTT connection retries (10) reached.
The application will continue without MQTT support.
```

**API funciona normalmente:**
- ✅ Todos os endpoints REST disponíveis
- ✅ Autenticação JWT
- ✅ Gerenciamento de usuários, prédios, salas
- ✅ WebSocket conecta (sem dados de MQTT)

**O que não funciona:**
- ❌ Receber dados de dispositivos em tempo real
- ❌ Controlar dispositivos remotamente
- ❌ Leituras automáticas de energia

---

## 🔍 Verificar o Status

```bash
# Ver se MQTT está rodando
docker-compose ps mqtt

# Ver logs do MQTT
docker-compose logs mqtt

# Testar conexão
./dev.sh test-mqtt
```

---

## 📋 Próximas Etapas

### Para Desenvolvimento Local

1. **Sempre inicie o MQTT primeiro:**
   ```bash
   ./dev.sh mqtt-only
   ```

2. **Em outro terminal, inicie a app:**
   ```bash
   npm run start:dev
   ```

3. **Ou faça tudo em uma comando:**
   ```bash
   ./quick-start.sh
   ```

### Para Deploy no Render

O Dockerfile já está otimizado. Consulte `RENDER_DEPLOY.md` para instruções completas.

---

## 🐳 Docker Compose Referência

```bash
# Inicia MQTT e App
docker-compose up -d

# Inicia apenas MQTT
docker-compose up mqtt -d

# Para tudo
docker-compose down

# Ver logs
docker-compose logs -f

# Ver status
docker-compose ps
```

---

## 💡 Dicas

- Use `./dev.sh` para comando interativos
- Use `docker-compose` para controle manual
- Sempre verifique os logs: `docker-compose logs`
- A porta MQTT é `1883`
- A porta da API é `3000`

---

## ❓ Perguntas Frequentes

**P: A aplicação quebra sem MQTT?**
R: Não. Ela funciona em modo degradado (sem comunicação com dispositivos IoT).

**P: Como faço para deixar MQTT rodando o tempo todo?**
R: Use `docker-compose up -d` que inicia em background.

**P: Preciso de MQTT para testes de API?**
R: Não. A API REST funciona sem MQTT. Apenas automações e comunicação com dispositivos dependem dele.

**P: Como reconecto MQTT se ele cair?**
R: Automático! O serviço tenta reconectar a cada 5 segundos.

---

## 📞 Suporte

Consulte `MQTT_TROUBLESHOOTING.md` para mais detalhes ou execute:

```bash
./dev.sh help
```
