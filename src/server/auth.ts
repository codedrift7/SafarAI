import argon2 from "argon2";
import { SignJWT, jwtVerify } from "jose";
import type { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { env } from "./env";

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

export interface AuthTokenPayload {
  sub: string;
  email: string;
  provider: string;
  type: "access" | "refresh";
}

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

export async function getCurrentUserPayload(req?: NextRequest): Promise<AuthTokenPayload | null> {
  const access = req?.cookies.get("safar_access")?.value ?? (await cookies()).get("safar_access")?.value;
  if (!access) return null;
  try {
    return await verifyAccessToken(access);
  } catch {
    return null;
  }
}
