# 🚀 Deploy no Render - Guia Completo

Este guia explica como fazer o deploy da API AutoUni no Render.

## 📋 Pré-requisitos

- ✅ Conta no GitHub
- ✅ Conta no Render (gratuita): [render.com](https://render.com)
- ✅ Banco de dados PostgreSQL já criado no Render
- ✅ Repositório GitHub atualizado

---

## 🔧 Passo 1: Preparar o Repositório

### 1.1. Commit e Push das Alterações

```bash
git add .
git commit -m "feat: Configure Render deployment with MQTT optional"
git push origin main
```

### 1.2. Verificar Arquivos Importantes

Certifique-se que estes arquivos existem:
- ✅ `Dockerfile`
- ✅ `entrypoint.sh`
- ✅ `render.yaml`
- ✅ `package.json`
- ✅ `prisma/schema.prisma`

---

## 🌐 Passo 2: Criar Web Service no Render

### 2.1. Acessar Dashboard

1. Acesse [dashboard.render.com](https://dashboard.render.com)
2. Faça login com sua conta
3. Clique em **"New +"** → **"Web Service"**

### 2.2. Conectar Repositório

1. Clique em **"Build and deploy from a Git repository"**
2. Conecte sua conta GitHub (se ainda não conectou)
3. Selecione o repositório: `SGKolibri/autouni-backend`
4. Clique em **"Connect"**

### 2.3. Configurar Web Service

Preencha os campos com os seguintes valores:

| Campo | Valor |
|-------|-------|
| **Name** | `autouni-api` |
| **Region** | `Oregon (US West)` |
| **Branch** | `main` |
| **Root Directory** | (deixe em branco) |
| **Environment** | `Docker` |
| **Instance Type** | `Free` ou `Starter` |

**NÃO CLIQUE EM "Create Web Service" AINDA!**

---

## 🔐 Passo 3: Configurar Variáveis de Ambiente

Role a página até **"Environment Variables"** e adicione as seguintes variáveis:

### Variáveis Obrigatórias:

```env
NODE_ENV=production

DATABASE_URL=postgresql://autouni_api_db_user:LsnPiTytnaCo4Ed2ntFYk7R24qCHIM5L@dpg-d46i8o7gi27c73aroj0g-a.oregon-postgres.render.com/autouni_api_db

JWT_SECRET=eyJhbGciOiJIUzI1NiJ9.eyJSb2xlIjoiQWRtaW4iLCJJc3N1ZXIiOiJJc3N1ZXIiLCJVc2VybmFtZSI6IkphdmFJblVzZSIsImV4cCI6MTc2MDY0MzAxMSwiaWF0IjoxNzYwNjQzMDExfQ.5zsawq52QQZm_sWsO2nVHnMh-9GUAs0uTi1DQQMpoVQ

ROOT_EMAIL=samuelcustodioes@gmail.com
ROOT_PASSWORD=Fahrenheit451

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=samuelcustodioes@gmail.com
SMTP_PASS=zzda ifba glci rehu
SMTP_FROM=samuelcustodioes@gmail.com

PORT=3000
```

### ⚠️ Importante sobre MQTT:

**NÃO adicione** a variável `MQTT_URL` por enquanto. Sem ela, o sistema funcionará normalmente, mas sem os recursos MQTT (IoT devices). 

Para habilitar MQTT em produção, veja a seção [Configurar MQTT em Produção](#-opcional-configurar-mqtt-em-produção).

---

## 🎯 Passo 4: Configurações Avançadas

### 4.1. Docker Command (Opcional)

O Render detectará automaticamente o Dockerfile, mas você pode especificar:

- **Docker Command**: (deixe em branco, o `CMD` do Dockerfile será usado)

### 4.2. Health Check Path

- **Health Check Path**: `/api/health`

### 4.3. Auto-Deploy

- ✅ Marque **"Auto-Deploy"** para deployar automaticamente quando houver push no branch `main`

---

## 🚀 Passo 5: Iniciar Deploy

1. Revise todas as configurações
2. Clique em **"Create Web Service"**
3. O Render começará o build automaticamente

### O que acontece durante o deploy:

```
✅ 1. Clonando repositório
✅ 2. Building Docker image
   - Instalando dependências (npm ci)
   - Gerando Prisma Client
   - Compilando TypeScript (npm run build)
✅ 3. Executando entrypoint.sh
   - Aguardando banco de dados
   - Executando migrations (prisma migrate deploy)
   - Executando seed (se necessário)
   - Iniciando aplicação
✅ 4. Deploy concluído!
```

---

## 📊 Passo 6: Verificar Deploy

### 6.1. Acompanhar Logs

No dashboard do Render, clique na aba **"Logs"** para ver o progresso em tempo real.

### 6.2. Logs Esperados (Sucesso):

```
🔄 Waiting for database to be ready...
✅ Database is up - executing migrations
🌱 Running seed
⚠️  MQTT_URL not configured or using localhost. MQTT features will be disabled.
🚀 Starting application...
[Nest] LOG [NestApplication] Nest application successfully started
🚀 AutoUni Backend is running!
```

### 6.3. Acessar a API

Após o deploy, sua API estará disponível em:

```
https://autouni-api.onrender.com
```

Para ver a documentação Swagger:

```
https://autouni-api.onrender.com/docs
```

Para testar o health check:

```bash
curl https://autouni-api.onrender.com/api/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-08T03:30:00.000Z",
  "uptime": 123.45,
  "environment": "production"
}
```

---

## 🔍 Troubleshooting

### ❌ Problema: Build Falha

**Erro:** `npm ci failed`

**Solução:**
```bash
# Localmente, teste:
npm ci
npm run build

# Se funcionar, faça commit e push
git add .
git commit -m "fix: Update dependencies"
git push origin main
```

---

### ❌ Problema: App Crasheia ao Iniciar

**Erro:** `Application failed to respond`

**Solução:**
1. Verifique os logs no Render
2. Certifique-se que a variável `DATABASE_URL` está correta
3. Teste a conexão com o banco:

```bash
# Localmente
DATABASE_URL="sua-url-do-render" npx prisma db push
```

---

### ❌ Problema: Timeout do Banco de Dados

**Erro:** `Failed to connect to database after 10 attempts`

**Solução:**
Aumente o `MAX_RETRIES` no `entrypoint.sh`:

```bash
MAX_RETRIES=20  # ao invés de 10
```

---

### ❌ Problema: Migrations Falhando

**Erro:** `Prisma migrate deploy failed`

**Solução:**
```bash
# Execute manualmente via Render Shell:
1. No dashboard, clique em "Shell"
2. Execute:
   npx prisma migrate deploy
   npx prisma db seed
```

---

## 🔄 Atualizações Futuras

### Deploy Automático

Com **Auto-Deploy** ativado, sempre que você fizer push no branch `main`, o Render fará deploy automaticamente:

```bash
git add .
git commit -m "feat: Nova funcionalidade"
git push origin main

# Render detecta o push e inicia novo deploy automaticamente
```

### Deploy Manual

Para fazer deploy manual:
1. Acesse o dashboard do Render
2. Clique no serviço `autouni-api`
3. Clique em **"Manual Deploy"** → **"Deploy latest commit"**

---

## 📈 Monitoramento

### Métricas Disponíveis

No dashboard do Render você pode ver:
- 📊 **CPU Usage**
- 💾 **Memory Usage**
- 🌐 **Request Rate**
- ⏱️ **Response Time**
- 🔄 **Deploy History**

### Logs em Tempo Real

```bash
# Via Dashboard
1. Acesse o serviço
2. Clique em "Logs"
3. Logs são atualizados em tempo real

# Via API (avançado)
curl https://api.render.com/v1/services/{service-id}/logs \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## 🎛️ (Opcional) Configurar MQTT em Produção

Para habilitar recursos IoT/MQTT em produção, você precisa de um broker MQTT externo.

### Opção 1: CloudMQTT (Grátis)

1. Acesse [cloudmqtt.com](https://www.cloudmqtt.com)
2. Crie uma instância gratuita
3. Copie a URL de conexão
4. No Render, adicione variável de ambiente:

```env
MQTT_URL=mqtt://usuario:senha@servidor.cloudmqtt.com:12345
```

### Opção 2: HiveMQ Cloud (Grátis)

1. Acesse [hivemq.com/cloud](https://www.hivemq.com/cloud/)
2. Crie cluster gratuito
3. Configure credenciais
4. No Render, adicione:

```env
MQTT_URL=mqtt://usuario:senha@seu-cluster.hivemq.cloud:1883
MQTT_USERNAME=seu-usuario
MQTT_PASSWORD=sua-senha
```

### Opção 3: Eclipse Mosquitto na AWS/Digital Ocean

Se você tem experiência com servidores, pode rodar seu próprio Mosquitto:

```bash
# Exemplo: Digital Ocean Droplet
# 1. Criar Droplet Ubuntu
# 2. Instalar Mosquitto
sudo apt-get update
sudo apt-get install -y mosquitto mosquitto-clients
sudo systemctl enable mosquitto

# 3. Configurar firewall
sudo ufw allow 1883/tcp

# 4. No Render, adicionar:
MQTT_URL=mqtt://seu-ip-publico:1883
```

---

## 🎉 Deploy Concluído!

Sua API está no ar! 🚀

- 🌐 **API**: https://autouni-api.onrender.com
- 📚 **Docs**: https://autouni-api.onrender.com/docs
- 💚 **Health**: https://autouni-api.onrender.com/api/health

### Próximos Passos:

- [ ] Configurar domínio customizado
- [ ] Adicionar monitoramento (Sentry)
- [ ] Configurar backup automático do banco
- [ ] Habilitar MQTT para IoT devices
- [ ] Configurar CI/CD com testes automatizados

---

## 📞 Suporte

- 📖 Documentação Render: [render.com/docs](https://render.com/docs)
- 🐛 Issues GitHub: [github.com/SGKolibri/autouni-backend/issues](https://github.com/SGKolibri/autouni-backend/issues)

---

**Desenvolvido com ❤️ por Samuel Custódio**
