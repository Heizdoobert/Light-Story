# Docker Deployment Guide

Light Story ships a **unified single-container image**: PostgreSQL (local), the API Gateway Worker (wrangler), and the Next.js standalone frontend all run in one container. A frontend-only image (`Dockerfile.frontend`) is also published to Docker Hub.

## Prerequisites

- Docker Desktop
- `docker-local.env` at the repo root (copy from `.env.example`; the compose file reads it via `--env-file docker-local.env`)

## Quick Start

```powershell
npm run docker:up
```

- Frontend: `http://localhost:3000`
- API Gateway: `http://localhost:8787`
- Health check: `http://localhost:8787/api/health`

## Commands

| Command | What it does |
|---------|--------------|
| `npm run docker:up` | Build (if needed) and start the stack |
| `npm run docker:build` | Teardown → prune all images/volumes → rebuild from scratch → start |
| `npm run docker:rebuild` | Alias of `docker:build` |
| `npm run docker:local` | Local environment bootstrap via `docker-local.ps1` |
| `npm run docker:local:emulator` | Local bootstrap with `-Local` flag |
| `npm run docker:local:fast` | Local bootstrap with `-Fast` flag |

> ⚠️ **`docker:build` is destructive**: it runs `docker compose down --rmi all --volumes` and `docker system prune -af --volumes` first. Use `docker:up` for iterative runs.

## Compose Configuration (`docker-compose.yml`)

- Project: `light-story`, single service `light-story`
- Ports: `3000:3000` (frontend), `8787:8787` (gateway)
- Healthcheck: `http://127.0.0.1:8787/api/health`
- Env file: `docker-local.env`
- Mounts: `./workers/kv-worker/.env` (worker secrets), named volume `pgdata` (PostgreSQL data)

## Manual Build

```powershell
docker system prune -a --volumes -f
docker build --no-cache --pull -t light-story .
docker build -f Dockerfile.frontend -t heizdoobert/light-story-frontend .
```

## Publishing to a Registry (manual)

`docker-publish.yml` is a `workflow_dispatch`-only workflow that builds and pushes `heizdoobert/light-story-frontend` to Docker Hub when `DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN` secrets exist. `latest` tag is pushed only from `main`.

For cloud providers on a different CPU architecture (e.g. Mac M1 → amd64), build with `--platform=linux/amd64`.
