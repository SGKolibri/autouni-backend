# Push (FCM)

Toda notificação criada (`POST /notifications` ou qualquer chamada a
`NotificationsService.create`) também é enviada como push para os aparelhos
registrados do destinatário. O envio escuta o evento `notification.created`
(`src/modules/push/listeners/notification-push.listener.ts`) e nunca afeta a
criação da notificação: se o FCM falhar, ela continua gravada e visível na
central.

## Configuração

Sem credenciais o módulo sobe normalmente, com o push **desligado** (aviso no
log no boot). Para ligar, use **uma** das opções:

```bash
# 1) JSON da conta de serviço (Console do Firebase → Configurações do projeto →
#    Contas de serviço → Gerar nova chave privada), em uma linha:
FIREBASE_SERVICE_ACCOUNT_JSON='{"project_id":"...","client_email":"...","private_key":"-----BEGIN PRIVATE KEY-----\n..."}'

# 2) Ou os três campos separados (a chave pode vir com \n escapado):
FIREBASE_PROJECT_ID=autouni
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@autouni.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Nunca versione a chave: ela vai só no `.env` local e nas variáveis do Render.

## Banco

Migração `20261021120000_add_push_tokens`: tabela `PushToken` (token único,
`userId` com `ON DELETE CASCADE`, `platform` ANDROID/IOS/WEB).

```bash
npx prisma migrate deploy   # ou migrate dev em desenvolvimento
```

## Rotas (JWT obrigatório)

### `POST /push/tokens` → 200

Registra o token do aparelho para o usuário do JWT. Idempotente: registrar de
novo só atualiza a plataforma; um token que estava com outra conta (troca de
usuário no mesmo aparelho) muda de dono.

```json
// corpo
{ "token": "dGVzdC10b2tlbi1mY20...", "platform": "ANDROID" }

// resposta
{
  "id": "uuid",
  "token": "dGVzdC10b2tlbi1mY20...",
  "platform": "ANDROID",
  "createdAt": "2026-10-21T12:00:00.000Z",
  "updatedAt": "2026-10-21T12:00:00.000Z"
}
```

`400` para plataforma desconhecida, token ausente ou campos extras (o dono vem
só do JWT, nunca do corpo).

### `DELETE /push/tokens` → 204

Remove o token do usuário do JWT (logout). Idempotente.

```json
{ "token": "dGVzdC10b2tlbi1mY20..." }
```

## Mensagem enviada

```json
{
  "notification": { "title": "<title>", "body": "<message>" },
  "data": {
    "notificationId": "<id>",
    "type": "INFO | WARNING | ERROR | SUCCESS",
    "link": "/devices/<id>"   // só quando a notificação tem link
  },
  "android": { "priority": "high", "notification": { "channelId": "autouni_alerts" } },
  "apns": { "payload": { "aps": { "sound": "default" } } }
}
```

O app (S6-T1) deve criar o canal Android `autouni_alerts` e usar `data.link`
para o deep link (S6-T2). Tokens que o FCM declara inválidos
(`registration-token-not-registered`, `invalid-registration-token`,
`invalid-argument`) são apagados automaticamente após cada envio. O envio é em
lotes de 500 tokens (limite do multicast do FCM).
