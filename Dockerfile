# --- build stage ---
FROM node:20-bullseye AS builder
WORKDIR /usr/src/app

# Build args para Prisma (não sensível, apenas para geração do client)
ARG DATABASE_URL="postgresql://postgres:postgres@localhost:5432/autouni?schema=public"

# Copia package.json e package-lock (se houver) primeiro para cache de instalação
COPY package*.json ./
# Instala dependências (inclui devDependencies para build)
RUN npm ci --ignore-scripts

# Copia o restante do código
COPY . .

# Gera o client do Prisma (precisa do node_modules)
RUN DATABASE_URL=${DATABASE_URL} npx prisma generate

# Build da aplicação Nest (assume que existe script "build")
RUN npm run build && npm prune --production

# --- production stage ---
FROM node:20-slim AS runner
WORKDIR /usr/src/app

# Instala OpenSSL (necessário para Prisma)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Cria usuário não-root
RUN addgroup --system app && adduser --system --ingroup app app

# Copia arquivos necessários do builder
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma

# Copia entrypoint
COPY entrypoint.sh ./

# Define permissões corretas antes de trocar para usuário app
RUN chmod +x ./entrypoint.sh && \
    chown -R app:app /usr/src/app

# Usa usuário sem privilégios
USER app

ENV NODE_ENV=production
EXPOSE 3000

# entrypoint irá rodar migrações e em seguida start
CMD ["./entrypoint.sh"]