# syntax=docker/dockerfile:1
# Imagen de producción del Catálogo Fersautos (Next.js 16 en modo standalone).
# Etapas:
#   deps         -> instala TODAS las dependencias (npm ci)
#   herramientas -> código + dependencias completas: migraciones, semilla y scripts (tsx, drizzle-kit)
#   builder      -> compila la app (next build)
#   runner       -> imagen final, mínima: solo el servidor standalone

FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS herramientas
COPY . .
CMD ["npm", "run", "db:migrate"]

FROM herramientas AS builder
# Valores falsos SOLO para compilar (no quedan en la imagen final).
# Los reales llegan en tiempo de ejecución desde .env.production.
RUN BETTER_AUTH_SECRET=solo-para-compilar-no-se-usa-en-produccion \
    BETTER_AUTH_URL=http://localhost:3000 \
    DATABASE_URL=postgres://build:build@localhost:5432/build \
    npm run build

FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    TZ=America/Bogota
RUN mkdir -p /app/almacenamiento && chown node:node /app/almacenamiento
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/plantillas ./plantillas
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/ingresar').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
