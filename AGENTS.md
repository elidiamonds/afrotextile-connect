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

## Pinterest trend inspiration (server-side fetch)
- `artifacts/afrotextile/pinterest-trends-plugin.ts` is a Vite dev-server plugin (registered in `vite.config.ts`) that handles `GET /api/trends?feed=<user/board>`. It fetches `https://www.pinterest.com/<feed>.rss` server-side (no CORS), parses `<item>`s, and returns JSON `{items:[{title,image,link,date}]}`. 10-min in-memory cache.
- Pinterest board RSS pins often have **empty `<title>`** and HTML-entity-encoded `<description>` (quotes are `&quot;`); the parser decodes entities first and falls back to `"Pinterest inspiration"` when the title is blank. Image URL is extracted from the decoded `<img src>`.
- Confirmed working feeds: `pinterest/fashion` (Fashion board), `pinterest/feed` (official user feed). Many board slugs 404 — only valid public boards return data.
- **Nigerian fashion automation**: `feed=nigerian` aggregates 6 curated Nigerian/African fashion boards (`bukkysun/ankara-styles`, `michelleogu4857/nigerian-fashion`, `akosuagabriel/ankara-styles`, `evylina/nigerian-fashion`, `biskhid6/ankara-styles`, `blesseddivas1/ankara-fashion`), deduped by image (~147 pins). The plugin **auto-pulls** these on server startup and every 5 min (`setInterval`) to keep the cache warm, so listings always show current trends. Cache TTL is 5 min.
- Frontend: `src/pages/TrendsPage.tsx` at route `/trends` (nav link "Trends", defaults to Nigerian Fashion, auto-refreshes every 5 min). `src/components/TrendingNow.tsx` shows a live strip on the Shop page. No backend service needed — the Vite dev server itself serves the API.

## Verifying it works
- `curl -sf http://localhost:3000/` returns the HTML with the Vite client injected.
- `curl -sf -H "Host: external-preview.example.com" http://localhost:3000/` also returns the app (Vite `allowedHosts: true`).
- `curl -sf http://localhost:3000/src/main.tsx` returns the transformed source module (confirms live source, not a prebuilt bundle).
