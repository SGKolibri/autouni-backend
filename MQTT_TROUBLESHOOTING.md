# MQTT Connection Troubleshooting

## ❌ Erro: MQTT connection error - ECONNREFUSED

Se você vê este erro nos logs:

```
[Nest] 1  - 11/08/2025, 3:30:06 AM   ERROR [MqttService] MQTT connection error
Error: connect ECONNREFUSED ::1:1883 or 127.0.0.1:1883
```

Significa que a aplicação está tentando conectar em `mqtt://localhost:1883`, mas o broker MQTT não está rodando.

---

## ✅ Solução Rápida

### Opção 1: Usar o script de desenvolvimento (⭐ RECOMENDADO)

```bash
# Inicia apenas o MQTT
./dev.sh mqtt-only

# Ou inicia tudo (MQTT + App)
./dev.sh start
```

### Opção 2: Usar docker-compose diretamente

```bash
# Inicia apenas o MQTT
docker-compose up mqtt -d

# Ou inicia tudo
docker-compose up -d
```

### Opção 3: Verificar se MQTT já está rodando

```bash
# Ver se o container está ativo
docker ps | grep mqtt

# Se estiver parado, iniciar
docker start <container-name>
```

---

## 🔍 Verificar a Conexão MQTT

### Verificar status do container

```bash
docker ps | grep mqtt
```

Esperado: Status `Up`

### Testar a conexão

```bash
# Usando o script
./dev.sh test-mqtt

# Ou manualmente
mosquitto_sub -h localhost -p 1883 -t 'devices/#' -v
```

---

## 📋 Checklist

- [ ] Docker está rodando?
  ```bash
  docker ps
  ```

- [ ] MQTT container está ativo?
  ```bash
  docker-compose ps mqtt
  ```

- [ ] Porta 1883 está acessível?
  ```bash
  netstat -tuln | grep 1883
  # ou
  nc -zv localhost 1883
  ```

- [ ] Variáveis de ambiente estão corretas?
  ```bash
  echo $MQTT_URL
  # Deve retornar: mqtt://localhost:1883
  ```

---

## 🚀 Iniciar Serviços (Ordem Recomendada)

```bash
# 1. Verifique Docker
docker ps

# 2. Inicie o MQTT primeiro
./dev.sh mqtt-only

# 3. Espere alguns segundos e verifique
docker logs -f autoUniMqtt

# 4. Em outro terminal, inicie a aplicação
npm run start:dev

# 5. Observe os logs para ver "✅ Connected to MQTT broker"
```

---

## ⚠️ A Aplicação Funciona sem MQTT?

**Sim!** A aplicação agora é **resiliente** e pode funcionar mesmo sem MQTT. Você verá:

```
⚠️ Max MQTT connection retries (10) reached. 
The application will continue without MQTT support.
```

Mas a aplicação continuará rodando em `http://localhost:3000`.

### Funcionalidades afetadas sem MQTT:

- ❌ Receber dados em tempo real de dispositivos
- ❌ Controlar dispositivos remotamente
- ❌ Recepcionar leituras de energia automáticas
- ✅ API REST continua funcionando
- ✅ WebSocket continua funcionando

---

## 🛠️ Logs Importantes

### ✅ Conectado com sucesso

```
[Nest] 1  - 11/08/2025, 3:30:05 AM   LOG [MqttService] ✅ Connected to MQTT broker at mqtt://localhost:1883
[Nest] 1  - 11/08/2025, 3:30:05 AM   LOG [MqttService] Subscribed to devices/+/status
[Nest] 1  - 11/08/2025, 3:30:05 AM   LOG [MqttService] Subscribed to devices/+/energy
```

### ❌ Falhando em conectar

```
[Nest] 1  - 11/08/2025, 3:30:06 AM   ERROR [MqttService] ❌ MQTT connection error (attempt 1/10): connect ECONNREFUSED
```

### ⚠️ Máximo de tentativas atingido

```
[Nest] 1  - 11/08/2025, 3:30:30 AM   WARN [MqttService] ⚠️ Max MQTT connection retries (10) reached.
```

---

## 📊 Comandos Úteis

| Comando | Descrição |
|---------|-----------|
| `./dev.sh start` | Inicia tudo (MQTT + App) |
| `./dev.sh mqtt-only` | Inicia apenas MQTT |
| `./dev.sh stop` | Para todos os serviços |
| `./dev.sh logs` | Mostra logs de tudo |
| `./dev.sh logs-app` | Mostra apenas logs da app |
| `./dev.sh test-mqtt` | Testa conexão MQTT |
| `docker-compose ps` | Status dos containers |
| `docker logs <container>` | Logs de um container específico |

---

## 🔧 Se Nada Funcionar

### 1. Limpe e reinicie

```bash
./dev.sh clean
docker-compose up -d
```

### 2. Reconstrua os containers

```bash
./dev.sh rebuild-all
```

### 3. Verifique os logs detalhadamente

```bash
docker-compose logs mqtt
docker-compose logs app
```

### 4. Se ainda não funcionar, limpe TUDO

⚠️ **AVISO: Isso vai deletar dados!**

```bash
./dev.sh clean-all
```

---

## 📞 Suporte

Se o problema persistir:

1. Verifique que a porta `1883` não está em uso por outro processo
2. Certifique-se que o Docker tem permissões corretas
3. Verifique a conectividade de rede
4. Consulte os logs: `docker-compose logs`
