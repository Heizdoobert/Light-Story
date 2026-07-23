# syntax=docker/dockerfile:1
ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/api-types packages/api-types/
COPY frontend/ frontend/
RUN --mount=type=cache,target=/root/.npm \
    npm install

WORKDIR /app/frontend
ENV DOCKER_BUILD=1

ARG NEXT_PUBLIC_GATEWAY_URL=https://unified-gateway.truyen3new.workers.dev
ARG NEXT_PUBLIC_SUPABASE_URL=https://xgtlrztskoomimvfpdoy.supabase.co
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhndGxyenRza29vbWltdmZwZG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDAzOTUsImV4cCI6MjA5NDUxNjM5NX0.wLQjtFsLuXmCbvKMFdukK3fk3brft-mjZb4dz1QUH2Q

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
