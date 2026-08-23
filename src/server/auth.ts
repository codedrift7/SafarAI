// src/server/auth.ts
import argon2 from "argon2";
import { SignJWT, jwtVerify } from "jose";
import type { NextRequest, NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { env } from "./env";
import { jsonError } from "@/server/http";

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

export interface AuthTokenPayload {
  sub: string;
  email: string;
  provider: string;
  type: "access" | "refresh";
}

export type AuthResult =
  | { ok: true; payload: AuthTokenPayload }
  | { ok: false; response: NextResponse };

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

export async function signAccessToken(payload: Omit<AuthTokenPayload, "type">): Promise<string> {
  return new SignJWT({ ...payload, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(accessSecret);
}

export async function signRefreshToken(payload: Omit<AuthTokenPayload, "type">): Promise<string> {
  return new SignJWT({ ...payload, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(refreshSecret);
}

export async function verifyAccessToken(token: string): Promise<AuthTokenPayload> {
  const result = await jwtVerify(token, accessSecret);
  const payload = result.payload as unknown as AuthTokenPayload;
  if (payload.type !== "access") throw new Error("Expected an access token");
  return payload;
}

export async function verifyRefreshToken(token: string): Promise<AuthTokenPayload> {
  const result = await jwtVerify(token, refreshSecret);
  const payload = result.payload as unknown as AuthTokenPayload;
  if (payload.type !== "refresh") throw new Error("Expected a refresh token");
  return payload;
}

export async function setAuthCookies(response: NextResponse, accessToken: string, refreshToken: string): Promise<void> {
  response.cookies.set("safar_access", accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 15,
  });
  response.cookies.set("safar_refresh", refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set("safar_access", "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  response.cookies.set("safar_refresh", "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
}

export async function getCurrentUserPayload(
  req?: NextRequest,
): Promise<AuthTokenPayload | null> {
  const cookieStore = await cookies();

  const access =
    req?.cookies.get("safar_access")?.value ??
    cookieStore.get("safar_access")?.value;

  if (!access) return null;

  // Only the short-lived access token authenticates a request. An expired access token
  // means the client has to spend its refresh token on POST /api/v1/auth/refresh, which
  // is the single place allowed to trade it for a new session.
  try {
    return await verifyAccessToken(access);
  } catch {
    return null;
  }
}

/**
 * Gate for Route Handlers. Resolves the current session, or returns a ready-to-return
 * 401 Response if there isn't one — so callers never have to fall back to a default user.
 *
 *   const auth = await requireAuth();
 *   if (!auth.ok) return auth.response;
 *   // auth.payload.sub is the authenticated user's id
 */
export async function requireAuth(req?: NextRequest): Promise<AuthResult> {
  const payload = await getCurrentUserPayload(req);
  if (!payload) {
    return { ok: false, response: jsonError("Unauthorized", 401) };
  }
  return { ok: true, payload };
}

// ---------------------------------------------------------------------------
// Render token — A1 (PDF export auth)
//
// A short-lived, narrowly-scoped credential that lets the Puppeteer worker fetch
// a trip page as if it were the owner who triggered the export. It is ONLY accepted
// by requireAuthOrRenderToken(), which also checks that the token's tripId matches
// the specific trip being requested.  It must NOT be used as a generic bearer token
// for any other route.
// ---------------------------------------------------------------------------

interface RenderTokenPayload {
  sub: string;
  tripId: string;
  type: "render";
}

/**
 * Mint a render token for a specific trip. Expires in 2 minutes — enough time for
 * Puppeteer to render the page but too short to be useful if captured.
 */
export async function signRenderToken(tripId: string, userId: string): Promise<string> {
  return new SignJWT({ sub: userId, tripId, type: "render" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2m")
    .sign(accessSecret);
}

/**
 * Verify a render token. Throws if the signature is invalid, the token is expired,
 * or the `type` claim is not "render".
 */
export async function verifyRenderToken(token: string): Promise<RenderTokenPayload> {
  const result = await jwtVerify(token, accessSecret);
  const payload = result.payload as unknown as RenderTokenPayload;
  if (payload.type !== "render") throw new Error("Expected a render token");
  return payload;
}

/**
 * Auth gate for the two routes that Puppeteer needs to access (GET /trips/[id] and
 * GET /trips/[id]/chat/history). Tries cookie-based auth first; if that fails, reads
 * the Authorization header and attempts a render-token verification, checking that the
 * token's tripId matches the specific tripId param of this route.
 *
 * Do NOT apply this to any other route — the render token is scoped to these two only.
 */
export async function requireAuthOrRenderToken(
  tripId: string,
  req?: NextRequest,
): Promise<AuthResult> {
  // 1. Try normal cookie auth first (regular browser session).
  const cookiePayload = await getCurrentUserPayload(req);
  if (cookiePayload) {
    return { ok: true, payload: cookiePayload };
  }

  // 2. Fall back to Authorization header (render token from Puppeteer).
  let authHeader: string | null | undefined;
  if (req) {
    authHeader = req.headers.get("authorization");
  } else {
    try {
      const headerStore = await headers();
      authHeader = headerStore.get("authorization");
    } catch {
      authHeader = null;
    }
  }

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const renderPayload = await verifyRenderToken(token);

      // Scope check: the render token must be for this exact trip.
      if (renderPayload.tripId !== tripId) {
        return { ok: false, response: jsonError("Unauthorized", 401) };
      }

      // Synthesise a minimal AuthTokenPayload so downstream code that reads
      // auth.payload.sub works without change.
      return {
        ok: true,
        payload: {
          sub: renderPayload.sub,
          email: "",
          provider: "render",
          type: "access",
        },
      };
    } catch {
      // Invalid/expired render token — fall through to 401.
    }
  }

  return { ok: false, response: jsonError("Unauthorized", 401) };
}
