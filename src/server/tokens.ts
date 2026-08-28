// src/server/tokens.ts
//
// Shared helper for one-time link tokens (email verification, password reset).
// The raw token goes in the emailed URL and is never persisted; only its hash is
// stored, so a DB read alone can never be used to mint a valid link — same principle
// as passwordHash in auth.ts.
import { randomBytes, createHash } from "crypto";

export function generateToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}