# Production vs Preview Rule

- **main (production) branch**: only files required for production runtime should be present. No AI‑generated files, experiment scripts, or internal tooling should be committed here.
- **preview (development) branch**: contains all other files – AI agent artifacts, temporary scripts, documentation, experimental code, etc.
- Enforce via CI checks and code‑reviews to prevent accidental inclusion of non‑production files in `main`.

*Added per user request on 2026‑10‑31.*