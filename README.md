# SafarAI

**Live demo:** https://safarai.me
> Deployed as a standard Next.js app on Vercel. The custom Express server described below (CSP middleware, long-running process for AI streaming) is used for local dev and self-hosted/Docker deployments.

**An AI trip planner built specifically for how travel actually works in Pakistan** — permits, passes that close for winter, patchy mountain signal, and all.

Most AI trip planners are built for dense European transit, uniform visa rules, and English signage everywhere. SafarAI grounds itinerary generation in a curated, permit-aware, season-aware Pakistan travel database instead, so it can tell you that Khunjerab Pass shuts for winter or that a valley needs a 4x4 — not just string together plausible-sounding places.

> **Product name:** *SafarAI* — "Safar" (Urdu/Persian/Hindi for "journey") + "AI," shortened to **Safar** in the UI. English-only at MVP.

---

## Contents

- [Key features](#key-features)
- [Tech stack](#tech-stack)
- [How itinerary generation works](#how-itinerary-generation-works)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Available scripts](#available-scripts)
- [Database & seed data](#database--seed-data)
- [API surface](#api-surface)
- [Roadmap](#roadmap)
- [Further reading](#further-reading)

---

## Key features

- **Chat-first trip creation** — describe where, when, who's coming, and the vibe; the app kicks off AI generation from there.
- **Grounded itinerary generation, not free-text hallucination.** The model can only place POIs pulled from a real, seeded database (filtered by region, season, and category) into a plan — see [How itinerary generation works](#how-itinerary-generation-works).
- **Permit & seasonal-risk advisories** surfaced inline whenever a trip touches a flagged place — permit requirements, seasonal closures, road conditions, altitude, safety notes, and unverified AI suggestions each get their own advisory type.
- **Hard geographic exclusion.** Balochistan and the former FATA districts are filtered out at the database-query level before the model ever sees candidate POIs — not a prompt instruction that can be talked around.
- **Conversational editing** via tool calls — add, remove, modify, reorder, or swap an activity by describing the change in chat.
- **Manual editing UI** with a distinctive "Karakoram Line" itinerary spine (`src/components/trips/karakoram-line.tsx`).
- **Interactive Mapbox map** of each day's route.
- **PDF export** (Puppeteer, renders the real itinerary view) and **public read-only share links**.
- **Auth**: email/password (argon2-hashed) or Google Sign-In, short-lived JWTs in httpOnly cookies, email verification, and password reset — all via [Resend](https://resend.com).
- **Curated destinations, POI directory, and starter itinerary templates** for content/SEO pages.
- **Free travel tools**: a live visa checker backed by seeded per-nationality data, plus starter packing-list and permit/restricted-area info pages.
- **Trip collaborators** modeled in the schema today (roles, invites) ahead of a Phase 2 collaborative-editing UI.

## Tech stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | Next.js 15 (App Router), run behind a **custom Express server** | `src/server/index.ts` — Express wraps Next so AI streaming isn't bound by serverless execution limits, and sets its own CSP/Helmet/CORS policy |
| UI | React 19, Tailwind CSS, Radix primitives | |
| Client state | Zustand | `src/stores/trip-store.ts` |
| Language | TypeScript everywhere | Path alias `@/*` → `src/*` |
| Database | PostgreSQL (PostGIS-enabled image in Docker) | via Prisma |
| ORM | Prisma | `prisma/schema.prisma` |
| Cache / jobs | Redis + BullMQ, `ioredis` | Also backs a dedicated fail-fast rate limiter for AI endpoints |
| AI | **Groq** — OpenAI-compatible Chat Completions API | `openai` SDK pointed at Groq's base URL (`src/lib/ai/client.ts`); tool-calling models, no bespoke client |
| Weather | [Open-Meteo](https://open-meteo.com) | Free, no API key — used by the gap-filler layer |
| Maps / routing | Mapbox GL JS + Mapbox Directions, with an **OSRM** public-server fallback when no Mapbox token is set | |
| Auth | JWT (`jose`) in httpOnly cookies, `argon2` password hashing, Google Sign-In (ID-token verification) | |
| Email | Resend | Verification, password reset |
| PDF export | Puppeteer | Reuses the existing itinerary UI |
| Validation | Zod | Every env var and Route Handler input |

## How itinerary generation works

Generation is a three-layer pipeline (`src/lib/ai/`), not a single prompt-to-JSON call:

```
Trip brief (destination, dates, party, vibe)
        │
        ▼
1. Candidate POIs (src/server/candidates.ts)
   Query Postgres by region + season + category.
   Balochistan / former FATA excluded at this step, structurally.
        │
        ▼
2. Planner — Layer 1 (src/lib/ai/planner.ts)
   Groq tool call, forced to `generate_itinerary`, selecting only
   from the supplied candidate POIs (or an explicitly-flagged
   custom suggestion). Validated against a Zod schema; one
   corrective retry on a schema mismatch.
        │
        ▼
3. Gap filler — Layer 2 (src/lib/ai/gap-filler.ts)
   Detects schedule gaps, checks Open-Meteo weather for that
   time/location, and fills gaps with nearby, season-appropriate
   POIs. Never throws — falls back to the ungapped plan.
        │
        ▼
4. Routing — Layer 3 (src/lib/ai/routing.ts)
   Inserts real TRANSPORT legs between stops using Mapbox
   Directions drive times (OSRM fallback), shifting later
   activities when a drive overruns its scheduled gap — capped
   so a bad combination surfaces as a visible conflict instead
   of silently producing a 1 a.m. itinerary.
        │
        ▼
5. Persist + stream to the client; any POI with `requiresPermit`
   or a seasonal-risk flag triggers an inline advisory banner.
```

Conversational edits reuse the same guardrails through five scoped tools: `add_activity`, `remove_activity`, `modify_activity`, `reorder_activities`, and `swap_activity` (`src/lib/ai/schemas.ts`).

`ai_itinerary_generation_workflow.png` in the repo root sketches the original high-level version of this flow from the initial design pass — it predates the current three-layer pipeline and names NVIDIA NIM as the model provider, which the implementation has since switched out for Groq. The description above reflects what's actually running today.

## Project structure

```
prisma/                   Schema, migrations, seed script, seed data loader
src/
  app/                     Next.js App Router
    api/v1/                Route Handlers — the REST API (see API surface)
    trips/, destinations/, templates/, tools/, blog/, pois/, ...   Pages
    login/, register/, forgot-password/, reset-password/, verify-email/
  components/              UI, grouped by feature (trips, pois, tools, marketing, ...)
  lib/
    ai/                    Groq client, planner, gap-filler, routing, schemas, weather
    api/                   Typed client-side fetch wrappers for the API
    domain/                Shared types, advisory logic, season logic
    mock-data/             Seed source data (regions, POIs, templates, users, visas)
  server/                  Custom server entry, auth, db, env validation, rate limiting,
                           mailer, queue, trip service — everything Route Handlers import
  stores/                  Zustand stores
design.md                  Full product & technical specification (source of truth for scope)
docker-compose.yml          Local Postgres (PostGIS) + Redis
```

## Getting started

### Prerequisites

- Node.js 20 LTS or newer
- Docker (for local Postgres + Redis), or your own instances of each
- A [Groq](https://console.groq.com) API key
- A Google OAuth **client ID** (for Google Sign-In)
- A [Resend](https://resend.com) API key (free tier works for local testing)
- Optionally, a [Mapbox](https://mapbox.com) access token — routing and the map fall back to public OSRM / no map without one

### Setup

```bash
git clone https://github.com/codedrift7/SafarAI.git
cd SafarAI

# 1. Start Postgres (with PostGIS) and Redis
docker compose up -d       # or: docker-compose up -d

# 2. Install dependencies (this also runs `prisma generate` via postinstall)
npm install

# 3. Configure environment
cp .env.example .env.local
# then fill in the values — see Environment variables below

# 4. Apply migrations
npx prisma migrate deploy

# 5. Seed regions, POIs, templates, and demo data
npm run prisma:seed

# 6. Start the dev server (custom Express + Next, via tsx)
npm run dev
```

Visit **http://localhost:3000**.

> **Heads up:** `src/server/env.ts` requires `RESEND_API_KEY`, `EMAIL_FROM`, and `APP_URL` at startup (including at build time), but `.env.example` doesn't list them yet. Add all three to `.env.local` or the app will fail to boot — see the table below for what they do.

## Environment variables

Loaded via `.env.local` (and `.env.{NODE_ENV}.local`), following Next.js's own precedence — see `src/server/env.ts`.

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | No | `development` | `development` \| `test` \| `production` |
| `PORT` | No | `3000` | |
| `DATABASE_URL` | **Yes** | — | Matches the `postgres` service in `docker-compose.yml` |
| `REDIS_URL` | No | `redis://localhost:6379` | |
| `JWT_ACCESS_SECRET` | **Yes** | — | ≥16 characters, must differ from the refresh secret (enforced) |
| `JWT_REFRESH_SECRET` | **Yes** | — | ≥16 characters, must differ from the access secret (enforced) |
| `CLIENT_URL` | No | `http://localhost:3000` | Used for CORS + the app's CSP |
| `GOOGLE_CLIENT_ID` | **Yes** | — | Verifies Google Sign-In ID tokens |
| `GROQ_API_KEY` | **Yes** | — | |
| `GROQ_API_BASE_URL` | No | `https://api.groq.com/openai/v1` | |
| `GROQ_MODEL_GENERATION` | No | `openai/gpt-oss-120b` | Used for itinerary generation tool calls |
| `GROQ_MODEL_CHAT` | No | `openai/gpt-oss-20b` | Used for conversational edits |
| `RESEND_API_KEY` | **Yes** | — | Not yet in `.env.example` — see note above |
| `EMAIL_FROM` | **Yes** | — | Must be on a domain verified in Resend, or sending silently fails in production |
| `APP_URL` | **Yes** | — | Used to build links inside emails |
| `MAPBOX_ACCESS_TOKEN` | No | — | Enables Mapbox Directions + the map UI; falls back to OSRM/no map when unset |
| `OSRM_BASE_URL` | No | `https://router.project-osrm.org` | Public demo instance; consider self-hosting for production |
| `OSRM_TIMEOUT_MS` | No | `5000` | |

## Available scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Runs the custom server (`src/server/index.ts`) with `tsx`, wrapping Next.js in dev mode |
| `npm run build` | `next build`, then compiles the server (`build:server`) |
| `npm start` | Runs the compiled production server (`dist-server/server/index.js`) |
| `npm run lint` | `eslint .` |
| `npm test` | Runs the AI-routing unit tests (`src/lib/ai/__tests__`) with Node's built-in test runner |
| `npm run prisma:generate` | Regenerates the Prisma client |
| `npm run prisma:migrate` | Applies pending migrations (`prisma migrate deploy`) |
| `npm run prisma:seed` | Seeds the database from `src/lib/mock-data` |

## Database & seed data

The seed script (`prisma/seed.ts`) loads data from `src/lib/mock-data/` into Postgres:

- **11 regions** — Hunza, Skardu, Lahore, Swat Valley, Islamabad, Naran & Kaghan, Peshawar, Chitral & Kalash, Fairy Meadows & Nanga Parbat, Multan, Karachi
- **78 curated POIs**, each carrying category, best seasons, permit/road/altitude metadata, and (where relevant) a permit authority link with a `lastVerifiedAt` timestamp
- **8 starter itinerary templates**
- Per-nationality visa guide records, a demo user, and a sample trip with chat history

Candidate-POI retrieval for generation (`src/server/candidates.ts`) always excludes Balochistan and the former FATA districts at the query layer, regardless of what the model is asked to do.

## API surface

REST endpoints live under `src/app/api/v1/` as Next.js Route Handlers:

- **Auth** — `register`, `login` (email/password or Google), `logout`, `refresh`, `me`, `verify-email`, `resend-verification`, `forgot-password`, `reset-password`
- **Trips** — CRUD, `generate` (kicks off the AI pipeline), `chat` + `chat/history` (conversational edits), `days/:dayId/reorder`, `export/pdf`, `invite`, `shared/:shareToken` (public read-only)
- **Activities** — CRUD, `vote`
- **Catalog** — `pois`, `regions` / `regions/:slug`, `templates` / `templates/:id`, `templates/:id/use`
- **Tools** — `tools/visa-checker`
- **Maps** — `maps/token` (short-lived Mapbox token for the client)

## Roadmap

`design.md` lays out the full phased plan; broadly:

- **Phase 1 (in progress / mostly built):** the vertical slice above — chat creation, grounded generation, map, editing, advisories, auth, templates, PDF/share export.
- **Phase 2:** group collaboration UI (voting, live presence — the data model already supports collaborators), an AI-generated packing list (today it's a static rule-based starter list), weather-aware replanning nudges, POI reviews/ratings.
- **Phase 3:** booking affiliate integrations, an offline-capable PWA mode for low-connectivity northern travel, a verified local-guide marketplace, a premium tier, native apps, and festival-aware suggestions.

## Further reading

- **`design.md`** — the full product vision, domain research (visas, permits, seasonality, transport, culture), original data model, and phased roadmap this project was built from. Treat the source code as the current source of truth where the two disagree (see the AI-provider note above, for example).
