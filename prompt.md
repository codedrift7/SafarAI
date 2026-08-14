# Build prompt — Session 1: frontend

## Read first

`design.md` (same directory) is the full product and technical spec — read it before writing code. For this session, the load-bearing sections are §5 (features), §6 (Pakistan domain rules — you'll need these for mock data), §7 (sitemap), §8–9 (stack/architecture), §10 (schema — data shapes), §11 (API surface — what to mock), §12 (AI system — what the mocked calls stand in for), §13–14 (visual design + screens). Product and architecture decisions are already made there — implement them, don't re-derive them.

## Your task this session

Build the **frontend only** of SafarAI as a working, clickable Next.js app: every MVP screen from §14, populated with realistic mock Pakistan travel data, matching the visual system in §13 exactly. No real database, no real NVIDIA NIM calls, no real auth. That's Session 2.

The single most important architectural decision in this prompt is the data layer below — get it right and Session 2 wires in the real backend by editing one folder, not by touching every page.

## Setup

- Next.js 14+, App Router, TypeScript, Tailwind, `npm` as the package manager.
- Add shadcn/ui. Load fonts via `next/font`/Google Fonts per §13: Fraunces, General Sans (fall back to Inter if unavailable), JetBrains Mono.
- Configure the Tailwind theme with §13's exact color tokens (hex values) as named colors — don't approximate with stock Tailwind palette colors.
- Icons: Lucide, restyled to a single stroke weight per §13.
- Follow §9's folder structure under `src/app` and `src/components`. Skip `prisma/`, `src/server`, and any backend-only piece of `src/lib` — Session 2's job.

## Data layer — build this before any page

Create `src/lib/api/`: one typed function per endpoint in §11 (`getTrip`, `listTrips`, `generateItinerary`, `sendChatMessage`, `listPOIs`, `listRegions`, `listTemplates`, `getVisaInfo`, etc.), typed against the Prisma models in §10. Every function reads from `src/lib/mock-data/` and returns a `Promise` (simulate latency with a short delay) instead of hitting a real API. **Pages and components only ever call these functions — never mock data directly.** That's the seam Session 2 uses to swap in real `fetch` calls without touching a page.

For `generateItinerary` and `sendChatMessage` specifically: simulate the streaming feel — reveal one day or message at a time on an interval — so the chat-driven generation flow in §14 is fully demonstrable, not a static result dropped in all at once.

Use Zustand (already the target client-state library per §8) to hold mock session/user state and in-progress trip state for this build. Don't build real auth or reach for browser storage — that's Session 2.

## Mock data

Under `src/lib/mock-data/`, write realistic content, not lorem ipsum:
- 3 regions: Hunza, Skardu, Lahore
- 6–10 POIs per region shaped like the `POI` model in §10 — real names (Attabad Lake, Baltit Fort, Khunjerab Pass, Badshahi Mosque, Deosai Plains…), with `category`, `roadCondition`, `bestSeasons` filled in plausibly, and **at least 2–3 POIs with `requiresPermit: true`** so the advisory UI in §6.3 has something real to flag
- 2–3 sample trip templates (§5's "curated escapes")
- 1 fully-built sample trip (4–5 days, Hunza) with day-by-day activities, so the itinerary view has real content on first load rather than an empty state

## Build in this order

Ship each page functional end-to-end against mock data before starting the next — don't half-build all seven in parallel.

1. **Design tokens + layout shell** (nav, footer, theme) — everything else depends on this being right first.
2. **Landing page** — hero, curated destination grid; sets the visual tone.
3. **Trip creation** (`/trips/new`) — chat-first input, calls the mocked `generateItinerary`.
4. **Itinerary view** (`/trips/[id]`) — the Karakoram Line spine (§13), map panel (Mapbox; render a static styled placeholder if no token is configured, don't crash), day tabs, persistent chat panel for edits. This is the product's money screen — spend the most care here.
5. **POI detail page.**
6. **Templates gallery.**
7. **Dashboard** (`/trips`) **and public share view** (`/share/[token]`).

## Hard constraints

- Follow §13's palette, type, and the Karakoram Line signature element exactly — it's the product's visual identity, not optional polish. Don't fall back to a generic shadcn/Tailwind look.
- Every screen needs a working mobile layout — most of this product's northern-Pakistan usage will be on patchy mobile connections (§6.7).
- Any mock activity with `requiresPermit: true` or a seasonal mismatch must actually render the advisory treatment described in §6.3 — this is core product behavior, not a nice-to-have.
- Keep components in `src/components/` typed and reusable so Session 2 can drop real data into the same props unchanged.
- Basic accessibility as you go: semantic HTML, alt text, sufficient contrast, visible focus states. Don't defer this to a later cleanup pass.
- If a design.md detail is ambiguous, make the most reasonable call, leave `// TODO(design.md §X): confirm`, and keep moving — don't stop and wait for input.

## Definition of done

- `npm run dev` runs clean; every route in §7's sitemap (marketing + app) renders.
- Full mock flow works end-to-end: land on the homepage → start a trip → watch it "generate" → view/edit the itinerary → see at least one permit or seasonal advisory → export/share.
- Nothing is hardcoded to look like real backend output — every piece of dynamic content traces back to `src/lib/mock-data/` through `src/lib/api/`.

## After this session

Session 2 (separate prompt, not this one) wires up PostgreSQL/Prisma, real NVIDIA NIM calls per §12, and real auth. At that point only `src/lib/api/*` should need to change — if you find yourself editing a page component to make real data work, the data layer wasn't built right in this session.
