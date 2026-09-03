# Afrotextile — Base44 dev environment

## What this is
A pnpm workspace monorepo. The user-facing app is the **frontend** at `artifacts/afrotextile` (React 19 + Vite 7 + Tailwind v3 + react-router-dom). It is a **pure frontend app**: all data is mocked in `src/data/mock.ts` — no backend data calls, no auth, no Supabase. The `artifacts/api-server` (Express) and `lib/db` (Drizzle/Postgres) exist in the workspace but are **not used by the frontend**, so they are not run in the Base44 compose.

## Running it
- `docker compose -f docker-compose.base44.yml up -d` starts the frontend on host port 3000 (container Vite on 5173).
- Vite dev server with live reload serves the cloned source directly — edits appear without rebuilds.
- No external secrets are required. No database is required.

## Required env vars for the frontend (set in compose `environment:`)
- `PORT` — Vite port (must be `5173`, mapped to host `3000`). The vite.config.ts throws if unset.
- `BASE_PATH` — Vite `base` (set to `/`). The vite.config.ts throws if unset.

## Gotchas
- pnpm `--frozen-lockfile` fails here (the `overrides` in `pnpm-workspace.yaml` don't match the committed lockfile). Use `--no-frozen-lockfile`; pnpm reconciles in ~15s.
- `pnpm-workspace.yaml` sets `minimumReleaseAge: 1440` (1-day supply-chain delay). Leave it enabled.
- Do NOT run `pnpm dev` at the workspace root — use `pnpm --filter @workspace/afrotextile run dev`.
- The `@replit/*` vite plugins load only when `REPL_ID` is set; they are not loaded in Base44 (correct).
- Node 24 is required (matches `.replit` `modules = ["nodejs-24"]`). pnpm is activated via corepack (`pnpm@9`).

## Verifying it works
- `curl -sf http://localhost:3000/` returns the HTML with the Vite client injected.
- `curl -sf -H "Host: external-preview.example.com" http://localhost:3000/` also returns the app (Vite `allowedHosts: true`).
- `curl -sf http://localhost:3000/src/main.tsx` returns the transformed source module (confirms live source, not a prebuilt bundle).
