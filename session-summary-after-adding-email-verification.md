# Session Summary — SafarAI

## 1. Fixed Groq 413 token-limit error
- Root cause: `candidateSummary()` in `src/lib/ai/planner.ts` serialized up to 80 candidate
  POIs as verbose multi-line blocks (full descriptions, region descriptions, safety/permit
  notes, verified timestamps) — ~150–250 tokens per POI, easily exceeding the request.
- Fix: rewrote `candidateSummary()` to emit one compact, truncated line per POI. Dropped
  duplicated `region.description`/`typicalTripDays` and per-POI "Verified" sentences.
  Cuts candidate-list tokens by roughly 60–70%.
- Diagnosed that the actual ceiling is an **org-wide 8,000 TPM cap shared across every
  Groq model** (`gpt-oss-120b`, `gpt-oss-20b`, `qwen3.6-27b` all show 8K TPM on the
  account's current tier) — so swapping models alone wouldn't have fixed it. `groq/compound`
  showed 70K TPM but wasn't verified to support the app's forced custom tool-calling pattern.
- Decision: revisit later by switching to free NVIDIA models; deferred for now.

## 2. Built email verification + forgot/reset password
**Schema** (`prisma/schema.prisma`):
- `User.emailVerified: DateTime?` (null = unverified; unverified users are **not** blocked
  from login — frontend shows a banner instead)
- New `EmailVerificationToken` and `PasswordResetToken` models — only a `sha256` hash of
  each token is stored, mirroring how `passwordHash` is handled; tokens are single-use
  (`usedAt`) and expire (24h verification, 1h reset)

**New files**:
- `src/server/tokens.ts` — `generateToken()` / `hashToken()`
- `src/server/mailer.ts` — Resend-based `sendVerificationEmail()` / `sendPasswordResetEmail()`
- `src/app/api/v1/auth/verify-email/route.ts`
- `src/app/api/v1/auth/resend-verification/route.ts` (rate-limited 3/hr per user)
- `src/app/api/v1/auth/forgot-password/route.ts` (rate-limited 3/hr per email; always
  returns a generic response to prevent account enumeration; OAuth accounts no-op silently)
- `src/app/api/v1/auth/reset-password/route.ts` (invalidates all outstanding reset tokens
  for the user on redemption)

**Dependency added**: `resend` (^6.24.0) in `package.json`.

**Env vars added** (`src/server/env.ts` + `.env.local`): `RESEND_API_KEY`, `EMAIL_FROM`,
`APP_URL`.

## 3. Infrastructure walkthrough
- Set up Resend account, verified a Namecheap-hosted domain (DNS records: SPF/DKIM/DMARC),
  switched `EMAIL_FROM` from the `onboarding@resend.dev` test address to a real
  domain address.
- Clarified `.env.local` vs `.env` vs `.env.example` vs `.env.vercel-production` and what
  belongs where.
- Generated the Prisma migration safely against a **live Neon production database**:
  used `--create-only` to avoid `migrate dev`'s auto-reset-on-drift behavior, manually
  dropped an unrelated Neon-generated `playing_with_neon` demo table that was causing
  false drift detection, then applied via `prisma migrate deploy` (production-safe,
  no reset risk).
- Final `git add` / commit / push flow, plus a reminder to set the three new env vars in
  Vercel before redeploying (routes will 500 without them).

## Known limitation (flagged, not yet fixed)
Password reset does not invalidate existing sessions — auth is stateless JWT with no
server-side revocation list, so a device already logged in stays logged in for up to
7 days (refresh token lifetime) even after a reset elsewhere. Needs a session table or
`sessionVersion` check to close properly; out of scope for this pass.

## Outstanding TODOs
- Wire signup route to call `sendVerificationEmail()` on account creation (route file
  not yet shared)
- Frontend: `/verify-email`, `/forgot-password`, `/reset-password` pages; "please verify"
  banner; "resend verification" button
- Set Vercel production env vars if not already done
- Address the session-invalidation gap above before real users rely on password reset
