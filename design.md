# SafarAI — AI Trip Planner for Pakistan
### Full-stack build specification for autonomous development

> **Product name:** *SafarAI* — "Safar" (a common Urdu/Persian/Hindi word for "journey") paired with "AI" for the AI-generated itineraries at the product's core, shortened to **Safar** in UI copy. English-only product at MVP — see §6.9.

---

## 0. How to use this document

This is a build spec for an AI coding agent (Codex) to scaffold and build a production-leaning MVP, not a slide deck. A few operating notes:

- **Build a vertical slice first.** Get `sign up → create trip → AI generates a day-by-day itinerary → view/edit it` working end-to-end against real seeded data before fanning out to every screen. The AI-generation pipeline (§12) is the core product risk — de-risk it early.
- **Don't hallucinate places.** The single most important architectural rule in this doc is in §12.4: the model must only place real, verified POIs (or clearly-flagged custom suggestions) into an itinerary. This is non-negotiable — both reference apps below learned this the hard way.
- **Decisions marked "confirm with founder" in §19 are not yours to make silently.** Everything else — library choices, folder layout, exact copy — use your judgment from the guidance given.
- **Data that changes (visa fees, permit rules, festival dates) is modeled as *advisory, timestamped, and linked to the official source* — never hardcoded as ground truth.** See §6.4.

---

## 1. Vision & problem

Pakistan's inbound tourism has grown sharply in the last few years — industry reporting points to well over a million international arrivals in 2026, with the north (Hunza, Skardu, Swat, Gilgit) increasingly cited as safer and more accessible than a decade ago. Demand is real and growing, both from international travelers and from the much larger pool of domestic travelers and diaspora Pakistanis visiting family.

But planning a trip inside Pakistan is still fragmented: WhatsApp groups with tour operators, scattered Facebook travel communities, blog posts with stale road-condition info, and no single tool that combines *AI-speed itinerary generation* with the *ground truth Pakistan actually requires* — which valleys need a permit, which roads need a 4x4, which passes close for the winter, what to wear at a shrine, why your Skardu flight might get cancelled.

Global AI trip planners are built for a different travel pattern: dense transit, uniform visa rules, no altitude, no permits, English signage everywhere. They don't know that Attabad Lake is a turquoise miracle from a 2010 landslide, that Khunjerab Pass shuts for winter, or that Ramadan changes every restaurant's hours nationwide.

**Vision:** the AI trip-planning layer built specifically for how Pakistan actually works — the conversational speed of the best global tools, grounded in a curated, permit-aware, season-aware Pakistan travel database.

---

## 2. Competitive inspiration

Both reference apps were reviewed directly (layla.ai, monkeytravel.app). Neither targets Pakistan; both have mechanics worth borrowing deliberately.

| Dimension | Layla.ai | MonkeyTravel | What SafarAI takes |
|---|---|---|---|
| Core mechanic | Chat: "tell me your style and budget" → itinerary + live flight/hotel/activity pricing via partners (Skyscanner, Booking.com, Viator, GetYourGuide) | Chat: drop a destination → full day-by-day plan in ~30 seconds | Chat-first creation (Layla's prompt style) generating an **hour-by-hour** plan (MonkeyTravel's specificity), grounded in a Pakistan POI database instead of live global inventory |
| Editing UX | Refine with the assistant or hand off to a human travel expert | Natural-language edits ("swap the museum for something outdoors") update the plan live | MonkeyTravel's conversational-edit pattern — see tool list in §12.5 |
| Group planning | Not a focus (solo/couple/family framed as AI output, not collaborative editing) | Core differentiator: up to 8 collaborators, one-link invite, voting, real-time sync | Modeled into the schema from day one (§9); a classic Pakistani travel unit is a friend group or extended family, so this matters more here than it does for a solo city-break planner |
| Trust / data quality | Curated "hidden gems" + partner inventory | Explicit anti-hallucination pitch: "verified places... real Google ratings... no restaurants that closed in 2019" | Directly adopted as a hard requirement — but MonkeyTravel can lean entirely on dense Google Places coverage in Paris or Tokyo. Pakistan's remote valleys don't have that density, so SafarAI needs a **hybrid**: Google Places/verified data in cities, a manually curated POI table for places like Fairy Meadows or Basho Valley (§9, §12.4). |
| Business model | Free tier + $49/year premium, human-expert upsell | 100% free core product, no paywall, referral-unlocked premium later | Free core (MonkeyTravel model) — a still-growing, price-sensitive market benefits more from an adoption wedge than a hard paywall; see assumption in §3 |
| Content/SEO | Country and destination landing pages, blog, curated "Where to go next" trip templates | Destination pages, blog, curated "Escapes," free tools (packing list generator, visa checker) as SEO wedges | Same content-marketing shape (§7 sitemap), plus Pakistan-specific free tools (visa checker, permit checker, packing list) as acquisition wedges |

**Where SafarAI deliberately diverges**, because the reference apps don't have to solve these problems:

- **Permits and seasonality are first-class data**, not an afterthought (§6.2–6.3). No European city-break planner needs a `requiresPermit` field.
- **Connectivity-aware.** Northern valleys have patchy signal; the app should degrade gracefully to a read-only offline itinerary (§14, phase 3).
- **A hybrid trust model for POI data** rather than pure reliance on one data source, because Google Places density varies wildly between Lahore and Basho Valley.

---

## 3. Scope, audience & key assumptions

To keep this spec buildable, the following calls were made. Flag anything you'd choose differently — they're all easy to change before Phase 1 starts.

- **Dual audience:** international inbound tourists *and* domestic/diaspora Pakistani travelers, from day one. This is why personas (§4) include both a first-time foreign visitor and a domestic friend group.
- **Free core, optional premium later** (MonkeyTravel's model, not Layla's paywall) — prioritizes adoption in a market still building trust in digital travel tools.
- **Group collaboration is in the data model at MVP, in the UI at Phase 2.** Cheap to model now, expensive to retrofit later.
- **No human-expert-in-the-loop at MVP** (Layla's differentiator, but ops-heavy). Deferred to Phase 3 as a *verified local-guide marketplace* instead — a better fit for Pakistan's existing network of northern-area guides and licensed tour operators than a call-center model.
- **Geographic scope for AI-generated itineraries at MVP: Punjab, Sindh, Islamabad Capital Territory, KPK's open tourist circuit (Swat, Chitral, Kalash), Gilgit-Baltistan's open circuit, and Azad Kashmir.** Balochistan and the former FATA tribal districts are **excluded from AI itinerary generation entirely** at MVP — not filtered softly, structurally excluded — given the permit complexity and safety profile in §6.3. This can be revisited later behind an explicit, dismissible advisory gate, not by default.

---

## 4. User personas

| Persona | Who | Needs |
|---|---|---|
| **The Diaspora Visit** | Pakistani-origin traveler based abroad (UK/US/Gulf), visiting family, wants to show relatives or kids the north | Mix of nostalgia stops and new destinations; mid-range budget |
| **The First-Timer** | International tourist, first visit to Pakistan | Heavy hand-holding: visa steps, permit flags, safety context, altitude prep, what to pack, connectivity expectations |
| **The Road-Trip Crew** | Domestic Pakistani friend group or family, e.g. Lahore → Hunza | Group voting, budget-conscious, already knows the terrain — needs speed and coordination more than hand-holding (closest to MonkeyTravel's core user) |
| **The Pilgrim / Heritage Traveler** | Visiting Sufi shrines, Sikh pilgrimage sites (Nankana Sahib, Panja Sahib), or Buddhist Gandhara heritage (Taxila) | A distinct POI category and itinerary logic, not a distinct app — model as a `RELIGIOUS` traveler type and POI category rather than a separate flow at MVP |

---

## 5. Feature set by phase

### Phase 1 — MVP
1. **Conversational trip creation** — chat-first onboarding ("Where, when, who's coming, what's your vibe?"), Layla-style.
2. **AI-generated day-by-day itinerary**, hour-by-hour timing, grounded against the curated POI database (§12.4) — not free-text generation.
3. **Interactive map** of each day's route (Mapbox).
4. **Conversational editing** — "swap day 3's fort for something more outdoors" (§12.5).
5. **Manual editing** — drag to reorder, retime, delete, add a stop.
6. **Automatic permit & seasonal-risk advisories** surfaced inline whenever a generated itinerary touches a flagged POI (§6.2–6.3).
7. **Auth + saved trips dashboard.**
8. **Export to PDF / shareable read-only link.**
9. **8–10 curated starter itineraries** for top regions (Hunza, Skardu, Swat, Lahore, Islamabad, Karachi, Naran-Kaghan, Azad Kashmir) — MonkeyTravel's "Curated Escapes" pattern.

### Phase 2
- Group collaboration: invite link, voting, real-time sync, multi-editor presence.
- Free tools as SEO/acquisition wedges: AI packing list generator, visa requirements checker, permit checker.
- Saved places / wishlist (independent of an active trip).
- Weather-aware replanning nudges (e.g., flag a likely Skardu flight delay and suggest a buffer day).
- Reviews & ratings on POIs.

### Phase 3
- Booking affiliate integrations (flights, hotels, tours) — Layla's model, once trust and traffic justify partner integration work.
- Offline-capable PWA mode for low-connectivity northern travel.
- Verified local-guide marketplace (the Phase-3 answer to Layla's human-expert layer).
- Premium subscription tier.
- Native mobile apps.
- Festival-aware suggestions (Shandur Polo, Kalash seasonal festivals, Eid travel surges) — dates fetched from a maintained events source, never hardcoded (many are lunar-calendar-dependent).

---

## 6. Pakistan-specific domain requirements

This section is the actual differentiator versus a fork of either reference app — treat it as load-bearing, not supplementary.

### 6.1 Regions & seasonality

Pakistan does not have one travel season — the north and south are roughly inverted.

| Region | Best months | Notes |
|---|---|---|
| Hunza, Gilgit, Skardu, Karakoram | May – Oct (peak Jun–Sep) | High passes typically close with snow in winter (Khunjerab Pass roughly Dec–Apr) — verify current status per season |
| Swat, Kaghan, Naran, Murree | Apr – Oct | Naran–Kaghan road largely closes in deep winter |
| Chitral, Kalash Valleys | May – Sep | Lowari Tunnel has largely resolved the historic winter pass-closure problem — verify current operational status |
| Deosai Plains | Jun – Sep only | Snowbound and inaccessible the rest of the year |
| Lahore, Islamabad, Punjab plains | Oct – Mar | Summer (May–Aug) runs 40°C+ and humid ahead of monsoon |
| Karachi & Sindh coast | Nov – Feb | Hot/humid summer; monsoon Jul–Aug |
| Azad Kashmir (Neelum, Rawalakot) | Mar – Oct | Some areas sit close to the Line of Control — check current advisories |

**Product implication:** when a user gives flexible dates, the AI must reason about *which half of the country* those dates favor, and say so rather than silently defaulting to the north.

### 6.2 Visa

- Official route: the **Pakistan Online Visa System (POVS)**, `visa.nadra.gov.pk` — the only legitimate application channel.
- Tourist e-Visa: roughly **$5–50 depending on nationality**, 30–90 day validity, single or multi-entry options, typically **7–20 business days** to process (recommend applicants apply 4–6 weeks ahead).
- Notable exceptions: Chinese nationals get visa-free entry for up to 30 days; several nationalities (e.g., Malaysia, UAE, Saudi Arabia) are fee-exempt but still apply through POVS.
- **These figures move.** Rules were actively changing as recently as this research (a related free-visa program was suspended in early 2026). Treat any in-app visa content as advisory only.

### 6.3 Permits & restricted areas (NOC)

- Since a 2019 policy change, most of the popular circuit — **Hunza, Skardu, Shigar, Deosai, the Karakoram Highway, Chitral, Azad Kashmir** — requires **no special permit** for foreigners holding a valid visa.
- Specific exceptions still require a **No-Objection Certificate (NOC)**, typically arranged by a licensed operator: high-altitude expedition routes (K2 Base Camp, Concordia, Nanga Parbat approaches — via the Alpine Club of Pakistan), valleys near the Line of Control, and areas near the Afghan border.
- **Balochistan and the former FATA tribal districts are effectively off-limits to independent foreign travel** and are excluded from itinerary generation entirely at MVP (§3).
- **Data model implication:** every `POI` carries `requiresPermit`, `permitAuthority`, and `permitNotes`. Any itinerary touching a flagged POI must render a dismissible advisory — never silently include it.

### 6.4 Handling volatile facts responsibly

Visa fees, permit rules, and festival dates all change. Model every such field with a `lastVerifiedAt` timestamp and an `officialLink` out to the authoritative source (NADRA POVS for visas; a licensed-operator/Alpine-Club reference for permits). The in-app tools (visa checker, permit checker) should read as *"here's your starting point, confirm at the official source"* — never as the system of record. This is a product-safety requirement, not just a legal nicety: bad visa info costs someone a flight.

### 6.5 Currency, cost & payments

- PKR is the primary currency; show approximate USD/GBP/EUR/AED conversions for international users.
- **Stripe has historically not supported Pakistan-domiciled merchants directly** — verify current status before building billing, but plan for a local gateway (e.g., Safepay, PayFast Pakistan, or a bank payment gateway) alongside or instead of Stripe if monetizing domestically.

### 6.6 Transport reality

- 4x4 is genuinely required for specific valleys (e.g., parts of the route to Basho Valley from Skardu) — encode this per-POI via `roadCondition`.
- Domestic flights to Gilgit/Skardu are notoriously weather-dependent and get cancelled often — the AI should default to suggesting a 1–2 day buffer around any itinerary that depends on one.
- Ride-hailing (Careem, InDrive) is reliable in major cities only; intercity coach operators cover plains routes; the north is mostly private car/jeep/van.

### 6.7 Connectivity

Mobile signal is patchy above most valley floors. This is *why* an offline-capable read-only itinerary view is a real Phase 3 requirement, not a nice-to-have — and why the MVP should keep payloads light and cache aggressively even before a full offline mode exists.

### 6.8 Culture, etiquette & health

- Modest dress expected at religious sites and in conservative rural areas; note this contextually on relevant POIs rather than as a blanket lecture.
- Ramadan shifts restaurant hours nationwide; Friday prayer affects early-afternoon plans in most cities.
- Photography sensitivities: avoid photographing people (especially women) without consent, and never military/government installations.
- Altitude: flag acclimatization guidance for Deosai and other high-altitude stops; encourage travel insurance given limited medical infrastructure in remote valleys.

### 6.9 Language

English-only at MVP and for the foreseeable roadmap — no Urdu localization, no `nameUrdu`/`descriptionUrdu` fields, no RTL layout. Simpler schema, simpler UI, one type system to design for. Revisit only if there's a clear product reason to add it later; it is not scoped anywhere in this document.

---

## 7. Information architecture (sitemap)

```
/                          Landing (marketing, SSR)
/destinations              Region index (SEO)
/destinations/[slug]       Region detail (SEO)
/templates                 Curated starter itineraries (SEO)
/templates/[id]            Template detail → "Use this template"
/blog, /blog/[slug]        Content marketing (SEO)
/tools/packing-list        Free tool (Phase 2)
/tools/visa-checker        Free tool (Phase 2)
/tools/permit-checker      Free tool (Phase 2) — Pakistan-specific addition
/auth/login, /auth/register
/trips                     Dashboard (auth'd)
/trips/new                 Chat-first trip creation
/trips/[tripId]            Itinerary view (map + day-by-day + chat panel)
/trips/[tripId]/invite     Collaborator invite (Phase 2)
/saved                     Saved places / wishlist (Phase 2)
/settings                  Profile, currency
/share/[shareToken]        Public read-only itinerary (no auth)
```

---

## 8. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript everywhere | One type system across client, server, and shared schema/tool definitions |
| Framework | **Next.js 14+ (App Router), run as a custom Node.js server** (`next start` behind a persistent process — Docker on Render/Railway/similar), not deployed as pure serverless functions | Satisfies "full-stack Node.js" as a single codebase; SSR/SSG for the SEO-critical marketing pages (§7) that both reference apps clearly invest in; Route Handlers double as the REST/SSE API layer. A **custom server** (not pure serverless) is the deliberate choice here specifically so a Socket.io instance can attach to the same HTTP server for realtime collaboration (§5, Phase 2) and so AI streaming responses aren't constrained by serverless execution-time limits. |
| UI | React 18, Tailwind CSS, shadcn/ui primitives | Fast to build, easy for an agent to extend consistently |
| Client state | TanStack Query (server cache) + Zustand (local/UI state) | Standard, low-ceremony pairing |
| Backend runtime | Node.js 20+ LTS | Matches the ask; LTS for stability |
| Database | PostgreSQL 15+ with the **PostGIS** extension | Native geo queries — "POIs near this route," distance-aware sequencing |
| ORM | Prisma | Schema-first, type-safe, easy for an agent to extend (§10) |
| Cache / jobs | Redis + BullMQ | Session/cache plus background jobs (PDF export, weather refresh) |
| AI | **NVIDIA NIM** — free hosted model catalog at `build.nvidia.com`, OpenAI-compatible API | See §12 for model routing and structured-output approach |
| Realtime | Socket.io | Trip-room presence, live voting, live edits (Phase 2) |
| Maps | Mapbox GL JS, OpenStreetMap data as fallback | Custom styling, generous free tier; Google Maps is a viable but costlier alternative |
| Auth | JWT (short-lived access + refresh) in httpOnly cookies, argon2 password hashing, Google OAuth | Standard, framework-agnostic |
| PDF export | Puppeteer (headless render of the itinerary view) | Reuses the existing itinerary UI instead of a second templating system |
| i18n | Not needed at MVP | English-only product (§6.9) — no localization library required |

---

## 9. System architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser                                                          │
│  Next.js client components — marketing pages, trip planner, chat  │
└───────────────────────┬───────────────────────┬───────────────────┘
                         │ HTTPS (REST + SSE)     │ WebSocket
┌────────────────────────▼───────────────────────▼───────────────────┐
│  Next.js custom Node server (single process)                       │
│  App Router pages + Route Handlers (REST/SSE) + Socket.io server   │
└───────┬─────────────────┬─────────────────┬──────────────┬─────────┘
        │                 │                 │              │
┌───────▼──────┐  ┌───────▼───────┐  ┌──────▼──────┐ ┌─────▼─────────┐
│ PostgreSQL   │  │ Redis          │  │ NVIDIA NIM  │ │ Mapbox /       │
│ + PostGIS    │  │ (cache/queue)  │  │ (free tier) │ │ Google Places /│
│ via Prisma   │  │                │  │             │ │ Weather API    │
└──────────────┘  └────────────────┘  └─────────────┘ └────────────────┘
```

**Itinerary generation flow** (the core loop — build and validate this first):

1. User submits a trip brief via chat (destination(s), dates, party size/type, budget, vibe).
2. Server queries Postgres for candidate POIs: filtered by region, season-appropriateness for the given dates, and category mix. **This is the grounding step** — it's what prevents hallucinated places.
3. Server calls the NVIDIA NIM model with a system prompt (persona + Pakistan domain rules from §6 + safety rules) plus the candidate POI set as context, requesting a **tool call** matching the `TripDay`/`Activity` shape (§12.2).
4. Server validates the returned tool-call arguments against that same schema (retrying once on failure — §12.2) to get a schema-valid day-by-day plan that references only the supplied POI IDs, or explicitly flags a custom (non-DB) suggestion.
5. Server persists the result and streams it to the client day-by-day via SSE as it completes.
6. Any activity whose POI has `requiresPermit: true` or is seasonally risky for the trip's dates triggers a client-side advisory banner (§6.3).

---

## 10. Database schema (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum TravelerType {
  SOLO
  COUPLE
  FAMILY
  FRIENDS
  RELIGIOUS
  BUSINESS
}

enum BudgetTier {
  BUDGET
  MID_RANGE
  LUXURY
}

enum TripStatus {
  DRAFT
  PLANNING
  CONFIRMED
  COMPLETED
  ARCHIVED
}

enum CollaboratorRole {
  OWNER
  EDITOR
  VIEWER
}

enum POICategory {
  MOUNTAIN
  LAKE
  FORT
  MOSQUE
  SHRINE
  MUSEUM
  BAZAAR
  WATERFALL
  NATIONAL_PARK
  HILL_STATION
  VALLEY
  GLACIER
  ARCHAEOLOGICAL_SITE
  CITY_LANDMARK
  RESTAURANT
  VIEWPOINT
}

enum RoadCondition {
  PAVED
  UNPAVED
  FOUR_WD_REQUIRED
  SEASONAL_CLOSURE
}

enum Season {
  SPRING
  SUMMER
  AUTUMN
  WINTER
}

enum ActivityCategory {
  SIGHTSEEING
  FOOD
  TRANSPORT
  LODGING
  REST
  ADVENTURE
  SHOPPING
  RELIGIOUS
}

model User {
  id                String             @id @default(cuid())
  email             String             @unique
  passwordHash      String?
  authProvider      String             @default("email") // email | google
  name              String
  homeCountry       String?
  avatarUrl         String?
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt

  trips             Trip[]
  collaborations    TripCollaborator[]
  savedPlaces       SavedPlace[]
  votes             ActivityVote[]
}

model Trip {
  id            String             @id @default(cuid())
  ownerId       String
  owner         User               @relation(fields: [ownerId], references: [id])
  title         String
  slug          String             @unique
  startDate     DateTime
  endDate       DateTime
  travelerType  TravelerType
  budgetTier    BudgetTier?
  pace          String             @default("balanced") // relaxed | balanced | packed
  status        TripStatus         @default(DRAFT)
  coverImageUrl String?
  isPublic      Boolean            @default(false)
  shareToken    String?            @unique
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt

  days          TripDay[]
  collaborators TripCollaborator[]
  chatMessages  ChatMessage[]
}

model TripCollaborator {
  id           String           @id @default(cuid())
  tripId       String
  trip         Trip             @relation(fields: [tripId], references: [id], onDelete: Cascade)
  userId       String?
  user         User?            @relation(fields: [userId], references: [id])
  invitedEmail String?
  role         CollaboratorRole @default(EDITOR)
  joinedAt     DateTime?
  createdAt    DateTime         @default(now())

  @@unique([tripId, userId])
}

model TripDay {
  id        String     @id @default(cuid())
  tripId    String
  trip      Trip       @relation(fields: [tripId], references: [id], onDelete: Cascade)
  dayNumber Int
  date      DateTime
  regionId  String?
  region    Region?    @relation(fields: [regionId], references: [id])
  notes     String?

  activities Activity[]

  @@unique([tripId, dayNumber])
}

model Activity {
  id            String           @id @default(cuid())
  tripDayId     String
  tripDay       TripDay          @relation(fields: [tripDayId], references: [id], onDelete: Cascade)
  poiId         String?
  poi           POI?             @relation(fields: [poiId], references: [id])
  customTitle   String?
  category      ActivityCategory
  startTime     String?          // "08:30"
  endTime       String?
  orderIndex    Int
  notes         String?
  estimatedCost Float?
  costCurrency  String           @default("PKR")
  addedByUserId String?

  votes ActivityVote[]
}

model ActivityVote {
  id         String   @id @default(cuid())
  activityId String
  activity   Activity @relation(fields: [activityId], references: [id], onDelete: Cascade)
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  createdAt  DateTime @default(now())

  @@unique([activityId, userId])
}

model Region {
  id              String     @id @default(cuid())
  name            String
  province        String
  slug            String     @unique
  description     String?
  heroImageUrl    String?
  bestSeasons     Season[]
  typicalTripDays Int?

  pois      POI[]
  tripDays  TripDay[]
  templates TripTemplate[]
}

model POI {
  id              String        @id @default(cuid())
  name            String
  slug            String        @unique
  regionId        String
  region          Region        @relation(fields: [regionId], references: [id])
  category        POICategory
  latitude        Float
  longitude       Float
  description     String?
  bestSeasons     Season[]
  altitudeMeters  Int?
  requiresPermit  Boolean       @default(false)
  permitAuthority String?
  permitNotes     String?
  roadCondition   RoadCondition @default(PAVED)
  avgVisitHours   Float?
  entryFeePkr     Float?
  safetyNotes     String?
  googlePlaceId   String?
  photos          String[]
  source          String?       // "curated" | "google_places"
  verifiedAt      DateTime?

  activities Activity[]
  savedBy    SavedPlace[]

  @@index([regionId, category])
}

model TripTemplate {
  id            String      @id @default(cuid())
  title         String
  regionId      String
  region        Region      @relation(fields: [regionId], references: [id])
  durationDays  Int
  tags          String[]
  priceTier     BudgetTier?
  coverImageUrl String?
  description   String
  itineraryJson Json
  usageCount    Int         @default(0)
}

model SavedPlace {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  poiId     String
  poi       POI      @relation(fields: [poiId], references: [id])
  notes     String?
  createdAt DateTime @default(now())

  @@unique([userId, poiId])
}

model ChatMessage {
  id        String   @id @default(cuid())
  tripId    String
  trip      Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)
  role      String   // user | assistant | system
  content   String
  toolCalls Json?
  createdAt DateTime @default(now())
}

model VisaGuide {
  id                String   @id @default(cuid())
  nationalityCode   String   @unique // ISO 3166-1 alpha-2
  evisaAvailable    Boolean
  visaFreeStay      Boolean  @default(false)
  feeUsdMin         Float?
  feeUsdMax         Float?
  processingDaysMin Int?
  processingDaysMax Int?
  notes             String?
  officialLink      String   @default("https://visa.nadra.gov.pk")
  lastVerifiedAt    DateTime
}
```

---

## 11. API surface (Route Handlers, `/api/v1`)

| Method | Path | Purpose | Streaming? |
|---|---|---|---|
| POST | `/api/v1/auth/register`, `/login`, `/logout`, `/refresh` | Auth | – |
| GET | `/api/v1/auth/me` | Current user | – |
| GET / POST | `/api/v1/trips` | List / create trips | – |
| GET / PATCH / DELETE | `/api/v1/trips/:id` | Trip CRUD | – |
| GET | `/api/v1/trips/shared/:shareToken` | Public read-only view | – |
| POST | `/api/v1/trips/:id/invite` | Create collaborator invite (Phase 2) | – |
| POST | `/api/v1/trips/:id/generate` | Kick off AI itinerary generation | **SSE** |
| POST | `/api/v1/trips/:id/chat` | Conversational edit message | **SSE** |
| GET | `/api/v1/trips/:id/chat/history` | Past messages | – |
| POST / PATCH / DELETE | `/api/v1/activities/:id` | Manual activity edits | – |
| POST | `/api/v1/activities/:id/vote` | Group voting (Phase 2) | – |
| PUT | `/api/v1/trips/:id/days/:dayId/reorder` | Drag-drop reorder | – |
| GET | `/api/v1/pois?region=&category=&season=` | POI search | – |
| GET | `/api/v1/regions`, `/api/v1/regions/:slug` | Region data | – |
| GET | `/api/v1/templates?region=&tag=` | Curated templates | – |
| POST | `/api/v1/templates/:id/use` | Clone template into user's trips | – |
| POST | `/api/v1/tools/packing-list` | AI packing list (Phase 2) | – |
| GET | `/api/v1/tools/visa-checker?nationality=` | Visa advisory (Phase 2, §6.4) | – |
| GET | `/api/v1/trips/:id/export/pdf` | PDF export | – |

---

## 12. AI system design

### 12.1 Model provider & routing — NVIDIA NIM

Provider: **NVIDIA NIM**, the hosted model catalog at `build.nvidia.com`. Free for development via the NVIDIA Developer Program (email signup, no card required). It exposes an **OpenAI-compatible** Chat Completions API (`base_url: https://integrate.api.nvidia.com/v1`), so any OpenAI-SDK code works by swapping the base URL, API key, and model string — no bespoke client needed.

| Task | Model (starting point) | Why |
|---|---|---|
| Itinerary generation, multi-city/multi-region trips | A 70B-class instruct model with **confirmed tool-calling support** — e.g. `meta/llama-3.1-70b-instruct`, or a current NVIDIA Nemotron instruct model | Strongest reasoning available in the free catalog for structured, multi-step planning |
| Conversational single-activity edits, quick chat replies | A smaller instruct model in the same family, e.g. `meta/llama-3.1-8b-instruct` | Lower latency for narrow, well-scoped edits |
| AI packing list generation | Same smaller model | Simple, bounded output |

> **Two things to design around, not just note:** (1) Tool/function calling on NIM is supported *per model*, not catalog-wide — confirm the specific model's tool-calling support on its model card at `build.nvidia.com/models` before wiring it in. (2) The free catalog moves fast — models get added and deprecated with as little as a few days' notice, and free-tier rate limits (observed in the tens of requests/minute range) can change. Keep every model ID in an environment variable, and put the NVIDIA client behind a thin wrapper (`lib/ai/client.ts`) so swapping models — or adding a paid/self-hosted NIM fallback later — touches one file, not the whole codebase. Treat the free tier as the right choice for building and validating the product; revisit before a hard production/scale commitment.

### 12.2 Structured output: tool calling + a validation safety net

Request a **tool call** (OpenAI-compatible `tools`/`tool_choice`, forced to the `generate_itinerary` tool) rather than parsing free-form text — this is what makes the anti-hallucination architecture in §12.4 enforceable. Open-model adherence to a schema is generally less consistent than a frontier hosted provider's dedicated structured-output guarantees, so add a **validation-and-retry layer server-side**: parse the returned tool-call arguments, validate against the same schema with Zod, and on failure send one corrective follow-up ("your last response didn't match the schema — here's what was wrong — try again") before falling back to a manual-edit prompt for the user. That defense-in-depth is what makes a free/open-model backend reliable enough to ship on. Trimmed schema for the `generate_itinerary` tool's parameters:

```json
{
  "type": "object",
  "properties": {
    "days": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "dayNumber": { "type": "integer" },
          "regionSlug": { "type": "string" },
          "activities": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "poiId": {
                  "type": ["string", "null"],
                  "description": "Must be an ID from the candidate POI list supplied in context, or null for an explicitly custom suggestion"
                },
                "customTitle": { "type": ["string", "null"] },
                "category": {
                  "type": "string",
                  "enum": ["SIGHTSEEING", "FOOD", "TRANSPORT", "LODGING", "REST", "ADVENTURE", "SHOPPING", "RELIGIOUS"]
                },
                "startTime": { "type": "string", "pattern": "^([01]\\d|2[0-3]):[0-5]\\d$" },
                "endTime": { "type": "string", "pattern": "^([01]\\d|2[0-3]):[0-5]\\d$" },
                "note": { "type": "string" }
              },
              "required": ["category", "startTime", "endTime"]
            }
          }
        },
        "required": ["dayNumber", "activities"]
      }
    }
  },
  "required": ["days"]
}
```

### 12.3 System prompt — required context injections

Every generation/edit call should inject:
- The persona and tone (helpful, direct, not salesy).
- The relevant slice of §6's domain rules (season/region-appropriate only — don't dump the whole doc into every call).
- Today's date, so the model can reason about which regions are seasonally sensible for the trip's dates.
- The candidate POI set retrieved from Postgres (§9, step 2) — the model selects and sequences from this set; it does not invent POIs.
- An explicit instruction never to include a Balochistan/FATA-region POI, and to flag (not silently include) any `requiresPermit: true` POI.

### 12.4 Anti-hallucination architecture

This is the load-bearing design decision the whole AI pipeline exists to support:

1. **Retrieve, then generate.** The candidate-POI-retrieval step (§9) means the model is sequencing and narrating real places, not inventing them — the same problem MonkeyTravel explicitly markets against, but solved structurally here rather than by prompting alone.
2. **Hybrid data sourcing**, because Google Places density is not uniform across Pakistan: dense cities (Lahore, Karachi, Islamabad) can lean on Google Places data; remote valleys need the manually curated `POI` table (`source: "curated"`) seeded and periodically verified by a human (`verifiedAt`).
3. **Custom suggestions are allowed but labeled.** If the model proposes something outside the candidate set, `poiId` is `null` and the client visibly marks it "AI suggestion, unverified" rather than presenting it with the same trust weight as a verified POI.

### 12.5 Conversational editing — tool definitions

| Tool | Params | Effect |
|---|---|---|
| `add_activity` | `tripDayId, poiId \| customTitle, category, startTime, endTime, afterActivityId?` | Inserts a new stop |
| `remove_activity` | `activityId` | Removes a stop |
| `modify_activity` | `activityId, fields…` | Edits time/notes/category |
| `reorder_activities` | `tripDayId, orderedActivityIds[]` | Applies a new sequence |
| `swap_activity` | `activityId, replacementCriteria` | Server re-queries candidate POIs matching the criteria + region + season, then replaces |

These map directly to the MonkeyTravel-style edit UX in §5 (Phase 1, item 4) — "swap the museum for something outdoors" resolves to a `swap_activity` call with `replacementCriteria: "outdoors"`.

---

## 13. Visual design direction

Not a generic SaaS template — grounded in Pakistan's own visual vernacular (truck art's maximalist color, Karakoram Highway geography, Mughal-era geometric lattice work) rather than borrowed defaults.

**Color** (dark surface as the primary expression; light mode uses the sandstone neutral below)

| Token | Hex | Use |
|---|---|---|
| Karakoram Ink | `#12232B` | Primary dark background / primary text on light surfaces |
| Attabad Turquoise | `#1C8299` | Brand color — CTAs, links, active states (named for the lake) |
| Truck-Art Marigold | `#F2A93B` | Highlights, badges, seasonal tags |
| Rickshaw Magenta | `#D6336C` | Sparing emphasis — favorites, standout badges |
| Meadow | `#3E7C58` | Success states, "open/accessible" status |
| Sandstone Mist | `#F1ECDF` | Light-mode surface background |
| Alert Red | `#C0392B` | Hard warnings only (permit/safety advisories) — kept visually distinct from the Magenta brand accent so warnings never blend in |

**Type**
- Display (English headlines): **Fraunces** — a warm, soft-contrast serif with real character, used with restraint at large sizes only.
- UI/body (English): **General Sans** (or Inter as a safe fallback) for legibility in data-dense itinerary cards.
- Data/mono: **JetBrains Mono** for prices, times, coordinates.

**Layout — the signature element: "The Karakoram Line."** The itinerary view's spine is a hand-drawn-feeling route line threading down the page, one waypoint per activity, echoing the Karakoram Highway itself — the actual road most northern itineraries follow. Each day is a distinct leg of the line. This is a genuine sequence (a day's real order of stops), so a waypoint/numbering device here is earning its place rather than decorating.

**Motion:** the line draws itself (stroke animation) as each day streams in from generation; activity cards fade/slide in along it. Respect `prefers-reduced-motion` — fall back to instant appearance, no path-drawing.

**Iconography:** simple stroke-based category icons (peak, fort, dome-and-minaret, lake, waterfall, bazaar stall) — a consistent base set (e.g. Lucide/Phosphor) restyled to a single stroke weight, not literal truck-art illustration (which risks reading as pastiche rather than product design).

---

## 14. Key screens

| Screen | Purpose |
|---|---|
| Landing | SSR marketing page — hero prompt input (Layla-style), curated destination grid, trust signals |
| Trip creation (`/trips/new`) | Chat-first: destination(s), dates, party, vibe/budget → kicks off §9's generation flow |
| Itinerary view (`/trips/[id]`) | Karakoram Line spine + day tabs, map panel, persistent AI chat panel for edits |
| POI detail | Photos, description, best season, permit/safety notes, nearby activities |
| Group/collaboration (Phase 2) | Invite link, voting UI, live-presence indicators |
| Templates gallery | MonkeyTravel-style curated escapes, filterable by region/tag/duration |
| Packing list / visa checker / permit checker (Phase 2) | Free tools, SEO wedges (§2, §7) |
| Saved/dashboard | Past and draft trips, saved places |
| Public share view | Read-only itinerary, no auth, PDF export CTA |

---

## 15. Environment variables

```bash
# App
NODE_ENV=
PORT=3000
CLIENT_URL=

# Database
DATABASE_URL=postgresql://...

# Cache/queue
REDIS_URL=

# Auth
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=

# AI
NVIDIA_API_KEY=
NVIDIA_API_BASE_URL=https://integrate.api.nvidia.com/v1

# Maps / places / weather
MAPBOX_ACCESS_TOKEN=
GOOGLE_PLACES_API_KEY=
WEATHER_API_KEY=

# Email (invites, Phase 2)
EMAIL_PROVIDER_API_KEY=

# Payments (Phase 3 — confirm provider per §6.5 before wiring)
PAYMENTS_PROVIDER_KEY=
```

---

## 16. Non-functional requirements

- **Performance:** stream the first day of a generated itinerary within ~2s of the request; don't block the whole response on the full trip finishing.
- **Security:** short-lived JWT access tokens + refresh rotation, rate-limit AI endpoints (cost control against abuse), Helmet + CORS, input validation with Zod on every Route Handler.
- **Accessibility:** WCAG 2.1 AA, full keyboard navigation, visible focus states, `prefers-reduced-motion` respected (§13).
- **i18n:** English-only at MVP (§6.9) — PKR as the default currency with secondary conversions for international users.
- **Low-connectivity resilience:** light payloads, aggressive caching of region/POI data (mostly static), image lazy-loading — laying the groundwork for the Phase 3 offline PWA mode (§5, §6.7).
- **Scalability:** stateless app servers behind a load balancer once beyond a single instance; Postgres read replicas and Redis-cached POI/region data before that becomes a bottleneck.

---

## 17. Third-party services

| Service | Purpose | Note |
|---|---|---|
| NVIDIA NIM (build.nvidia.com) | Itinerary generation, conversational edits — free hosted model catalog | §12 |
| Mapbox | Interactive maps, custom styling | OSM data fallback |
| Google Places API | Verified place data in dense urban areas | Supplement, not sole source (§12.4) |
| Weather API (e.g. OpenWeatherMap) | Trip-date weather context, replanning nudges | Phase 2 |
| Redis | Cache + BullMQ background jobs | PDF export, weather refresh |
| Email provider (Resend/SendGrid) | Collaborator invites | Phase 2 |
| Payments | Premium tier | Confirm provider per §6.5 |

---

## 18. Roadmap & success metrics

**Phase 1 (MVP, suggested 6–8 weeks):** auth, chat-first trip creation, grounded AI itinerary generation, map view, manual + conversational editing, permit/season advisories, PDF/share export, 8–10 curated templates, English only, single-editor trips, ~150–300 seeded POIs across major regions.

**Phase 2 (4–6 weeks):** group collaboration + voting, free tools (packing list, visa/permit checkers), saved places, weather-aware nudges, reviews.

**Phase 3:** booking affiliate integrations, offline PWA, local-guide marketplace, premium tier, native apps, festival-aware suggestions.

**Success metrics to track from Phase 1:** time-to-first-itinerary; share of generated activities kept unedited (a quality proxy for §12.4's grounding); trips created per user; collaborators per trip (once Phase 2 ships).

---

## 19. Open questions / confirm with founder before Phase 1

- Domestic-first or inbound-international-first positioning for initial marketing push? (Affects which persona in §4 gets designed for first.)
- Final call on payments provider for Pakistan-domiciled billing (§6.5).
- Is a human-verified-guide marketplace (Phase 3) actually wanted, or should Layla's human-expert layer be pulled forward earlier?
