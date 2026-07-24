# syntax=docker/dockerfile:1
ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/api-types packages/api-types/
COPY frontend/ frontend/
RUN --mount=type=cache,target=/root/.npm \
    rm -f package-lock.json frontend/package-lock.json && \
    npm install --legacy-peer-deps

WORKDIR /app/frontend
ENV DOCKER_BUILD=1

ARG NEXT_PUBLIC_GATEWAY_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

ENV NEXT_PUBLIC_GATEWAY_URL=$NEXT_PUBLIC_GATEWAY_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

RUN npm run build 2>&1

FROM node:${NODE_VERSION}-alpine AS final
ENV NODE_ENV=production
WORKDIR /app
COPY --chown=node:node --from=build /app/frontend/.next/standalone ./
COPY --chown=node:node --from=build /app/frontend/.next/static ./frontend/.next/static
EXPOSE 3000
USER node
CMD ["node", "frontend/server.js"]
