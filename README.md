# Light-Story Workspace

## Development Checklist

> This README is intended for developers to quickly verify that the repository is set up correctly and that the core CI steps run without errors.

### 1️⃣ Install dependencies (run from the repository root)
```bash
npm install
```

### 2️⃣ Verify the code base
- **Lint**
```bash
npm run lint
```
- **Type‑check**
```bash
npm run typecheck
```
- **Run tests** (all packages)
```bash
npm --prefix packages/sdk test
npm --prefix packages/ui test
npm --prefix frontend run test:run
```

### 3️⃣ Build the frontend
```bash
npm run build
```

### 4️⃣ Local development server
```bash
npm run dev   # runs the Next.js dev server (App Router)
```
*(If `npm run dev` is not defined, use `npm run start` or `next dev` manually.)*

### 5️⃣ CI / CD sanity check
- List recent production workflow runs:
```bash
gh run list --workflow production.yml --branch main
```
- Manually trigger a run (optional):
```bash
gh workflow run production.yml
```

### 6️⃣ Environment variables (required for Local dev & CI)
Create a `.env.local` (or export) with the following keys:
```text
NEXT_PUBLIC_SITE_URL=https://lightstory.app
NEXT_PUBLIC_GATEWAY_URL_PRODUCTION=https://kv-worker.hhhuygiau.workers.dev
CLOUDFLARE_API_TOKEN=<your-token>   # required for the Deploy job
SUPABASE_ACCESS_TOKEN=<optional-token>
```

### 7️⃣ Quick sanity test
After a successful build, hit the API endpoint to confirm the worker is reachable:
```bash
curl -sf "https://kv-worker.hhhuygiau.workers.dev/api/stories?page=1&pageSize=5" && echo "✅ API reachable"
```

### 8️⃣ Packages & Architecture Documentation
- **Core SDK (`@light-story/sdk`)**: Zero‑dependency isomorphic library for Gateway APIs, R2 media storage, offline reader state, and formatting helpers.
  - [SDK Documentation Guide](packages/sdk/docs/index.md)
  - [Domain Clients Guide](packages/sdk/docs/gateway-clients.md)
  - [Storage Manager Guide](packages/sdk/docs/storage.md)
  - [Reader State & Offline Progress](packages/sdk/docs/reader-state.md)
  - [Localization & Formatters](packages/sdk/docs/formatters.md)
- **UI System (`@light-story/ui`)**: Ant Design v5 components scoped strictly to `(admin)` routes.
- **Support Utility (`@light-story/support-utility`)**: In‑process issue tracking, diagnosis, and support helpers.

---

## Agent System Integration

The repository now includes the **Agent System** (`Agent_update_smart_working`) as an editable Python package. It provides a powerful cognitive‑agent framework that can be used from the command line or as a library.

### Quick start
```bash
# Install dependencies (editable)
pip install -e ./Agent_update_smart_working

# Verify the CLI is available
python3 -m agent_system --version
```

### NPM scripts
Two new npm scripts have been added to `package.json`:
- `npm run agent:cli` – runs the Agent System CLI (`python3 -m agent_system`).
- `npm run agent:mcp` – starts the Model Context Protocol (MCP) server for integration with Claude Desktop, Cursor, etc.

You can invoke them directly:
```bash
npm run agent:cli -- --help
npm run agent:mcp
```

### CI
A GitHub Actions workflow (`.github/workflows/agent-system.yml`) automatically runs the Agent System test suite on any push or pull request affecting the `Agent_update_smart_working` directory.

### MCP configuration example
Create a `mcp.json` (or `claude_desktop_config.json`) in the project root to enable the MCP server for Claude Desktop:
```json
{
  "mcpServers": {
    "agent-system": {
      "command": "python3",
      "args": ["-m", "agent_system.cli.main", "mcp", "--root", "."]
    }
  }
}
```
Now Claude Desktop can communicate with the Agent System via the MCP protocol.

---

### 9️⃣ Packages & Architecture Documentation (continued)
- **Agent System (`Agent_update_smart_working`)**: Provides reasoning, planning, reflection, and semantic memory utilities. See its own README for usage details.

---

*All commands are meant to be run from the repository root. Adjust paths if you are inside a sub‑package.*
