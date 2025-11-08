# MQTT Setup Guide

## Para Desenvolvimento Local

### Opção 1: Usar container MQTT existente
Se você já tem o container `happy_tu` rodando:

```bash
# Verificar se está rodando
docker ps | grep mosquitto

# Se não estiver rodando, iniciar
docker start happy_tu
```

### Opção 2: Rodar apenas MQTT via Docker Compose
```bash
# Subir apenas o serviço MQTT
docker-compose up mqtt -d

# Verificar logs
docker-compose logs -f mqtt
```

### Opção 3: Rodar tudo via Docker Compose
```bash
# Parar containers antigos standalone
docker stop happy_tu musing_curie 2>/dev/null

# Limpar container da app que está em loop
docker stop autoUniApi && docker rm autoUniApi

# Subir todos os serviços
docker-compose up --build -d

# Ver logs
docker-compose logs -f
```

## Para Produção (Docker Compose Completo)

```bash
# Build e deploy
docker-compose up --build -d

# Ver logs de todos os serviços
docker-compose logs -f

# Ver logs apenas da API
docker-compose logs -f app

# Ver logs apenas do MQTT
docker-compose logs -f mqtt
```

## Testar MQTT

### Usando mosquitto_pub/sub (se instalado localmente)

```bash
# Terminal 1 - Subscribe
mosquitto_sub -h localhost -p 1883 -t 'devices/#' -v

# Terminal 2 - Publish test message
mosquitto_pub -h localhost -p 1883 -t 'devices/test-device/status' -m 'ON'

# Terminal 2 - Publish energy reading
mosquitto_pub -h localhost -p 1883 -t 'devices/test-device/energy' -m '{"valueWh": 150.5, "voltage": 220, "current": 0.68}'
```

### Usando Docker

```bash
# Subscribe
docker run --rm -it --network autouni-network eclipse-mosquitto mosquitto_sub -h mqtt -t 'devices/#' -v

# Publish
docker run --rm -it --network autouni-network eclipse-mosquitto mosquitto_pub -h mqtt -t 'devices/test-device/status' -m 'ON'
```

## Variáveis de Ambiente

### Desenvolvimento (.env)
```env
MQTT_URL="mqtt://localhost:1883"
```

### Produção (docker-compose.yml)
```env
MQTT_URL="mqtt://mqtt:1883"
```

## Portas

- **1883**: MQTT Protocol (TCP)
- **9001**: MQTT WebSocket (opcional)

## Troubleshooting

### ECONNREFUSED / ECONNRESET

**Causa**: Broker MQTT não está rodando ou não está acessível

**Solução**:
```bash
# Verificar se MQTT está rodando
docker ps | grep mosquitto

# Se não estiver, subir
docker-compose up mqtt -d

# Verificar logs
docker-compose logs mqtt
```

### Container autoUniApi em loop de restart

**Causa**: Erro na aplicação ou banco de dados não pronto

**Solução**:
```bash
# Ver logs da app
docker-compose logs app

# Rebuild e restart
docker-compose up --build -d app
```

## Limpeza

```bash
# Parar todos os serviços
docker-compose down

# Parar e remover volumes (CUIDADO: remove dados)
docker-compose down -v

# Remover containers standalone antigos
docker stop happy_tu musing_curie
docker rm happy_tu musing_curie
```

## Estrutura dos Serviços

```
┌─────────────────┐
│   autoUniApi    │  Port 3000
│   (NestJS)      │
└────────┬────────┘
         │
    ┌────┴─────┬──────────┐
    │          │          │
┌───▼───┐  ┌──▼──┐  ┌────▼────┐
│  db   │  │mqtt │  │WebSocket│
│Port   │  │Port │  │  WS:    │
│5433   │  │1883 │  │  3000   │
└───────┘  └─────┘  └─────────┘
```

## Próximos Passos

1. ✅ MQTT integrado ao docker-compose
2. ✅ Variáveis de ambiente configuradas
3. ✅ Auto-reconnect implementado
4. ⏳ Criar configuração personalizada do Mosquitto (opcional)
5. ⏳ Adicionar autenticação MQTT (opcional)
6. ⏳ Configurar SSL/TLS (produção)
