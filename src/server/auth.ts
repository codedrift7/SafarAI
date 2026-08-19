// src/server/auth.ts
import argon2 from "argon2";
import { SignJWT, jwtVerify } from "jose";
import type { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
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
  return result.payload as unknown as AuthTokenPayload;
}

export async function verifyRefreshToken(token: string): Promise<AuthTokenPayload> {
  const result = await jwtVerify(token, refreshSecret);
  return result.payload as unknown as AuthTokenPayload;
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

  const refresh =
    req?.cookies.get("safar_refresh")?.value ??
    cookieStore.get("safar_refresh")?.value;

  // 1. Try the normal access token first.
  if (access) {
    try {
      return await verifyAccessToken(access);
    } catch {
      // Access token expired/invalid.
      // Continue to refresh-token fallback.
    }
  }

  // 2. Fall back to the refresh token.
  if (!refresh) return null;

  try {
    return await verifyRefreshToken(refresh);
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
