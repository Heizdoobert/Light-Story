# syntax=docker/dockerfile:1

ARG NODE_VERSION=20

################################################################################
# Base stage
FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /app

################################################################################
# Install production dependencies
FROM base AS deps
COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

################################################################################
# Build stage (standalone output for minimal runtime image)
FROM base AS build
COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY frontend/ ./
ENV DOCKER_BUILD=1
RUN npm run build

################################################################################
# Final runtime image
FROM base AS final
ENV NODE_ENV=production

# Run as non-root user
USER node

COPY --chown=node:node --from=build /app/public ./public
COPY --chown=node:node --from=build /app/.next/standalone ./
COPY --chown=node:node --from=build /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
