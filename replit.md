# Afrotextile

A global African fashion marketplace where users can discover and shop bold African prints, luxurious textures, and modern silhouettes from independent African designers.

## Run & Operate

- `pnpm --filter @workspace/afrotextile run dev` — run the frontend (auto-assigned port)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind v3 (postcss) + shadcn/ui
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/afrotextile/` — React + Vite frontend (main app)
- `artifacts/api-server/` — Express API server
- `lib/db/src/schema/` — Drizzle DB schema
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contracts)
- `artifacts/afrotextile/src/index.css` — theme/CSS variables (dark African palette)
- `artifacts/afrotextile/tailwind.config.ts` — Tailwind v3 config with custom colors

## Architecture decisions

- Pure frontend app — no Supabase, no auth, no backend data calls; all data is mocked in `src/data/mock.ts`
- Tailwind v3 with PostCSS (not @tailwindcss/vite) — required because the original Lovable app used Tailwind v3 with `tailwindcss-animate` plugin
- react-router-dom v6 for routing (from the original Lovable app)
- Dark African luxury theme: warm-black background, gold primary, terracotta accent, Playfair Display serif headings

## Product

- Home page with hero, featured collections, vendor highlights
- Shop page with product grid and filtering
- Product detail page
- Cart page with wishlist support
- About and Contact pages
- Vendor profile pages and vendor onboarding flow

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Tailwind v3 uses `postcss.config.js` + `tailwind.config.ts` — do NOT switch to `@tailwindcss/vite` plugin
- The vite.config.ts wires PostCSS plugins inline (tailwindcss + autoprefixer) since @tailwindcss/vite is removed
- Do NOT run `pnpm dev` at workspace root — use `pnpm --filter @workspace/afrotextile run dev` instead

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
