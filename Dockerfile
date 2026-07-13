# ── Etapa 1: dependencias ────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts evita descargar el binario de la CLI de supabase (dev dep)
RUN npm ci --ignore-scripts

# ── Etapa 2: build ───────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# prisma.config.ts exige estas vars al evaluar la config; prisma generate no
# se conecta a la base, así que un valor dummy es suficiente para el build.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    DIRECT_URL="postgresql://build:build@localhost:5432/build"
RUN npm run build

# ── Etapa 3: runtime ─────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
