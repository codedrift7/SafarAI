# Build prompt — Session 2: backend, AI, and auth

## Read first

`design.md` is the full product and technical spec — read it before writing code. `prompt.md` is the Session 1 prompt that produced the current codebase — read it too, so you understand what's already built and, critically, **what contract you must not break**.

For this session, the load-bearing sections of `design.md` are §8 (stack), §9 (architecture + the itinerary generation flow), §10 (Prisma schema — implement it verbatim), §11 (API surface), §12 (AI system design — this is the core of this session), §15 (env vars), §16 (non-functional requirements). §6 (Pakistan domain rules) governs what the AI is and isn't allowed to generate — re-read it before touching the system prompt in §12.3.

## Where Session 1 left off

The frontend is a working, clickable Next.js app running entirely on mock data. Every page calls typed functions in `src/lib/api/` (one per §11 endpoint), which currently read from `src/lib/mock-data/` and resolve as `Promise`s with a simulated delay. **Pages and components never touch mock data directly** — that seam is the whole point of this session.

## Your task this session

Wire up the real backend: PostgreSQL + PostGIS + Prisma, real NVIDIA NIM calls per §12, real auth, Redis + BullMQ, and PDF export. **The target: only files under `src/lib/api/`, `src/lib/ai/`, `src/server/`, `prisma/`, and the Route Handlers themselves should change.** If you find yourself editing a page or component to make real data work, stop — the Session 1 seam wasn't respected, and the fix belongs in the data layer, not the page.

Do not build Phase 2 features (group collaboration/Socket.io, packing-list generator, visa/permit-checker tools, weather nudges, reviews). Stay inside Phase 1 per §5.

## Build in this order

### 1. Database
- Implement `prisma/schema.prisma` exactly as specified in §10. Enable the PostGIS extension via a raw migration (Prisma doesn't manage PostGIS natively — add it in an initial `migration.sql`).
- Run the initial migration against a local Postgres (Docker Compose is the easiest path — include a `docker-compose.yml` with `postgres:15` + PostGIS and `redis:7`).
- Write `prisma/seed.ts` that transforms Session 1's `src/lib/mock-data/` into real rows — regions, POIs (keep the `requiresPermit: true` examples), templates, and the one fully-built sample trip. This is your first real end-to-end proof the schema holds together. Expanding toward the §18 target of ~150–300 seeded POIs across all MVP regions is good if time allows, but a correctly-shaped seed of the existing mock set is the priority — don't sacrifice schema correctness for volume.
- Add the `@@index([regionId, category])` from §10 and a geo index on `POI(latitude, longitude)` (or a PostGIS `geography` column, if you want real radius/distance queries for the candidate-POI retrieval step in §9) — confirm which approach with the founder if it's not obvious from §10, per the "confirm with founder" norm in design.md §0.

### 2. Auth
- Real JWT auth per §8/§16: short-lived access token + refresh token, both in httpOnly cookies, rotation on refresh.
- `argon2` for password hashing on the `email` provider.
- Google OAuth for the `google` provider (`authProvider` field already in the `User` model).
- Implement `/api/v1/auth/register`, `/login`, `/logout`, `/refresh`, `/me` for real.
- Rate-limit auth endpoints against credential stuffing.

### 3. NVIDIA NIM integration (§12 — the core of this session)
- `src/lib/ai/client.ts`: thin wrapper around the NVIDIA NIM OpenAI-compatible endpoint (`https://integrate.api.nvidia.com/v1`), reading `NVIDIA_API_KEY` and model IDs from env vars per §12.1. Nothing outside this file should know it's talking to NIM specifically — that's what lets a future model swap or paid-tier fallback touch one file.
- Before wiring in a model ID, check its model card at `build.nvidia.com/models` for confirmed tool-calling support (§12.1) — don't assume.
- Implement the candidate-POI retrieval step from §9 step 2: query Postgres/PostGIS for POIs filtered by region, season-appropriateness for the trip's dates, and category mix. **This retrieval is the grounding step and has to happen before every generation or `swap_activity` call** — it's what makes §12.4's anti-hallucination architecture real rather than aspirational.
- Structurally exclude Balochistan and former-FATA regions at the query level (§3, §12.3) — not just via a system-prompt instruction. The system prompt instruction is a second layer, not the only layer.
- Implement `generate_itinerary` as a forced tool call per the schema in §12.2. Validate the returned arguments with Zod against that same schema; on failure, send one corrective follow-up before falling back to a manual-edit prompt for the user (§12.2).
- Implement the five conversational-edit tools from §12.5 (`add_activity`, `remove_activity`, `modify_activity`, `reorder_activities`, `swap_activity`), each backed by real Postgres writes.
- Wire `POST /api/v1/trips/:id/generate` and `POST /api/v1/trips/:id/chat` as real SSE endpoints, streaming day-by-day / message-by-message as results come back from the model — replacing Session 1's simulated-interval streaming with the real thing, behind the same client-facing shape so `src/lib/api/generateItinerary` and `sendChatMessage` don't change their signatures.
- Any activity whose resolved POI has `requiresPermit: true`, or that's seasonally risky for the trip's actual dates, must trigger the advisory data Session 1's UI already knows how to render (§6.3) — confirm the field names match what the frontend expects rather than re-deriving the advisory logic in the client.

### 4. Redis, jobs, PDF export
- Redis for session/cache; BullMQ for background jobs.
- `GET /api/v1/trips/:id/export/pdf`: Puppeteer renders the existing itinerary view server-side (reuse the UI, per §8's rationale — don't build a second templating system) and returns a PDF. Queue this as a BullMQ job rather than blocking the request.
- Cache region/POI reads in Redis — they're mostly static (§16).

### 5. Everything else in §11
- Fill in the remaining Route Handlers: trip CRUD, the public `shareToken` view, activity CRUD, drag-reorder, POI/region/template reads, `templates/:id/use` cloning.
- Zod validation on every Route Handler body (§16).
- Helmet + CORS on the custom Node server (§8's custom-server rationale — keep the server as a persistent Node process, not serverless functions, even though Socket.io itself is Phase 2).
- Rate-limit the AI endpoints specifically (`/generate`, `/chat`) — cost control against abuse (§16).

### 6. Wire the data layer
- Go through every function in `src/lib/api/` and replace the mock-data read with a real call to the Route Handler (or, if you're calling Prisma directly from Route Handlers rather than a separate service layer, make sure the client-side functions now hit `fetch('/api/v1/...')` instead of importing from `mock-data`).
- Delete or clearly quarantine `src/lib/mock-data/` (e.g. move it under a `__mock__` or `dev-fixtures` path) once `prisma/seed.ts` supersedes it as the source of realistic data — but don't delete it if `seed.ts` still imports from it.

## Hard constraints

- Every §10 model must exist and match field-for-field — don't quietly rename or drop fields because they're unused yet (e.g. `VisaGuide` isn't wired to a UI this session, but the table and a small seed set should still exist).
- The anti-hallucination architecture (§12.4) is non-negotiable: no code path may write an `Activity` with a `poiId` that didn't come from the candidate set, unless `poiId` is `null` and it's explicitly flagged as an AI suggestion.
- Keep every NVIDIA model ID in an env var, never hardcoded (§12.1).
- If a `design.md` detail is ambiguous, make the most reasonable call, leave `// TODO(design.md §X): confirm`, and keep moving — same norm as Session 1.

## Definition of done

- `docker-compose up` brings up Postgres+PostGIS and Redis; `npx prisma migrate deploy && npx prisma db seed` populates real data; `npm run dev` (now the custom server) runs clean.
- Full flow works against real services, no mocks: register/login → create a trip → watch a real NVIDIA NIM call stream a grounded itinerary day-by-day → make a conversational edit that resolves to a real tool call and a real Postgres write → see a real permit/seasonal advisory driven by real seeded data → export a real PDF.
- A forced-bad model response (temporarily point at a non-tool-calling model, or mock a malformed tool-call arg) demonstrably triggers the Zod-validation retry path rather than crashing or silently writing bad data.
- No page or component file changed to make this work — only the data layer, server, and backend directories did.

## After this session

Session 3 (not this prompt) is Phase 2: group collaboration over Socket.io, the free-tool SEO wedges (packing list, visa/permit checkers), saved places, weather-aware nudges, and reviews.

# Note
Before building src/lib/ai/client.ts: use Groq's OpenAI-compatible endpoint instead of NVIDIA NIM. Read GROQ_API_KEY and GROQ_API_BASE_URL (https://api.groq.com/openai/v1) from env instead of NVIDIA_API_KEY/NVIDIA_API_BASE_URL. Use GROQ_MODEL_GENERATION (llama-3.3-70b-versatile) for the generate_itinerary forced tool call, and GROQ_MODEL_CHAT (llama-3.1-8b-instant) for the five conversational-edit tools in §12.5. Everything else in §12 — forced tool call, Zod validation with one retry on schema failure, candidate-POI grounding before every call — stays exactly as specified; only the provider changes.