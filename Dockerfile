# syntax=docker/dockerfile:1
ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/api-types packages/api-types/
COPY frontend/ frontend/
RUN --mount=type=cache,target=/root/.npm \
    npm ci

WORKDIR /app/frontend
ENV DOCKER_BUILD=1
RUN node -e "console.log('CWD:',process.cwd());console.log('tsconfig:',require('fs').existsSync('./tsconfig.json'));console.log('charts:',require('fs').existsSync('./src/components/charts/index.ts'));console.log('analytics.ts:',require('fs').existsSync('./src/types/analytics.ts'))"
RUN npm run build -- --webpack 2>&1

FROM node:${NODE_VERSION}-alpine AS final
ENV NODE_ENV=production
WORKDIR /app
COPY --chown=node:node --from=build /app/frontend/.next/standalone ./
COPY --chown=node:node --from=build /app/frontend/.next/static ./.next/static
EXPOSE 80
USER node
CMD ["node", "server.js"]
