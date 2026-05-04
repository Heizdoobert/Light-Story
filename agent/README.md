# MAS Orchestrator — Agent Workspace

This folder contains the MAS (Multi-Agent Software) Orchestrator workspace used by repository automation.

Contents
- `config.yaml` — orchestrator settings (auto-PR, CI flags, include paths).
- `MEMORY.md` — long-term decisions and conventions.
- `SESSION.md` — current session state.
- `TASKS.md` — task backlog for the orchestrator.
- `OUTPUTS/` — BA, PM, TechLead, Code diffs, Test and CrossCheck reports.

Quick start
1. Edit `agent/config.yaml` to adjust `auto_pr`, `ci_smoke_tests_on_pr`, and `include_backend_supabase`.
2. To run a session, use the orchestrator command (manual steps currently):
   - Create or update `agent/SESSION.md` with the request.
   - Run Grapuco analysis if needed and populate `agent/OUTPUTS/`.

Example prompts (for the agent orchestrator):
- `execute agent workflow` — run full MAS workflow (BA → PM → TechLead → Dev → Test → CrossCheck).
- `run grapuco analysis for admin pages` — produce `agent/OUTPUTS/BA_analysis.md`.
- `create migration plan for backend-supabase` — PMAgent should populate `agent/OUTPUTS/PM_plan.md`.

Notes
- Keep `agent/` in `.gitignore` for privacy; changes can be force-added when necessary.
- Technical content (configs, diffs, reports) should remain in English.

If you want, I can add CI scripts or a simple CLI entrypoint to automate steps. Reply `yes` to proceed.
