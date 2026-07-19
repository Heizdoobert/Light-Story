# Multi-stage Dockerfile for Monorepo Next.js Frontend
FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy root lock files and workspace packages
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY packages/api-types/package*.json ./packages/api-types/
COPY backend-supabase/package*.json ./backend-supabase/
COPY workers/unified-gateway/package*.json ./workers/unified-gateway/

# Install dependencies for all workspaces
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules
COPY --from=deps /app/packages/api-types/node_modules ./packages/api-types/node_modules
COPY . .

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Generate local package types first, then build
RUN npm run generate:types
RUN npm --prefix frontend run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built artifacts and dependencies
COPY --from=builder /app/frontend/public ./frontend/public
COPY --from=builder /app/frontend/.next ./frontend/.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/frontend/node_modules ./frontend/node_modules
COPY --from=builder /app/packages/api-types ./packages/api-types
COPY --from=builder /app/frontend/package.json ./frontend/package.json
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

# Run the Next.js start command
CMD ["npm", "--prefix", "frontend", "run", "start"]
