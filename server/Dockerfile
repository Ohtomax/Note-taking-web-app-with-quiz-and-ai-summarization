FROM node:24-bookworm-slim@sha256:873f586f3794f52281bd039bf02c048a0be08fde619338f9941bad1eb6b34530 AS base
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS build
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund
COPY tsconfig.json server.ts ./
COPY config ./config
COPY src ./src
RUN npm run build

FROM base AS production-dependencies
COPY package.json package-lock.json ./
# Prisma CLI/TypeScript are also optional peers; this API only uses Firebase Auth.
# The root postinstall needs the build-only CLI. Generation runs above.
RUN npm ci --omit=dev --omit=peer --omit=optional --ignore-scripts --no-audit --no-fund \
    && npm cache clean --force

# Explicit, operator-invoked migration runner. Never used as the web start command.
FROM build AS migration
ENV NODE_ENV=production
USER node:node
ENTRYPOINT ["node", "node_modules/prisma/build/index.js"]
CMD ["migrate", "deploy"]

FROM base AS runtime
ENV NODE_ENV=production \
    PORT=10000 \
    NODE_OPTIONS="--max-old-space-size=256" \
    UV_THREADPOOL_SIZE=2 \
    MALLOC_ARENA_MAX=2 \
    DB_POOL_MAX=2 \
    AI_GLOBAL_CONCURRENCY=1 \
    AI_ENABLED=false
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
USER node:node
EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health/ready',{signal:AbortSignal.timeout(3000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
