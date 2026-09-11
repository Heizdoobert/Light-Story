# Unified single-container image: postgres + gateway (wrangler) + frontend (Next standalone)

FROM node:22-slim AS gateway-build
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/api-types packages/api-types/
COPY workers/ workers/

RUN --mount=type=cache,target=/root/.npm \
    rm -f package-lock.json && \
    npm install --legacy-peer-deps --workspace workers/kv-worker --prefer-offline

FROM node:22-slim AS frontend-build
WORKDIR /app
ENV DOCKER_BUILD=1
ARG NEXT_PUBLIC_GATEWAY_URL
ENV NEXT_PUBLIC_GATEWAY_URL=$NEXT_PUBLIC_GATEWAY_URL
ARG NEXT_PUBLIC_GATEWAY_URL_PRODUCTION
ENV NEXT_PUBLIC_GATEWAY_URL_PRODUCTION=$NEXT_PUBLIC_GATEWAY_URL_PRODUCTION
ARG NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_ENC_KEY
ENV NEXT_PUBLIC_ENC_KEY=$NEXT_PUBLIC_ENC_KEY

COPY package.json package-lock.json ./
COPY packages/api-types packages/api-types/
COPY frontend/ frontend/

RUN --mount=type=cache,target=/root/.npm \
    rm -f package-lock.json frontend/package-lock.json && \
    npm install --legacy-peer-deps --prefer-offline && \
    rm -f node_modules/light-story-workspace frontend/node_modules/light-story-workspace

WORKDIR /app/frontend
RUN npm run build

FROM node:22-slim
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV WRANGLER_SEND_METRICS=false
ENV HOSTNAME=0.0.0.0

RUN apt-get update && apt-get install -y --no-install-recommends postgresql-15 ca-certificates \
    && (pg_dropcluster 15 main || true) \
    && rm -rf /var/lib/postgresql/15 /var/lib/apt/lists/*

COPY --from=gateway-build /app /gateway-app
COPY --from=frontend-build /app/frontend/.next/standalone /app
COPY --from=frontend-build /app/frontend/.next/static /app/frontend/.next/static
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000 8787
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
