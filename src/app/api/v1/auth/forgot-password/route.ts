import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { jsonError } from "@/server/http";
import { parseJson } from "@/server/route-utils";
import { enforceRateLimit } from "@/server/rate-limit";
import { generateToken } from "@/server/tokens";
import { sendPasswordResetEmail } from "@/server/mailer";
import { env } from "@/server/env";

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const GENERIC_MESSAGE = "If an account exists for that email, we've sent a password reset link.";

export async function POST(request: Request) {
  const parsed = await parseJson(request, forgotPasswordSchema);
  if (!parsed.ok) return parsed.response;

  const email = parsed.data.email.toLowerCase().trim();

  // Keyed by email, not just caller IP — otherwise one address can be repeatedly
  // reset-spammed by different requesters (or the same one rotating IPs).
  const allowed = await enforceRateLimit(`auth:forgot-password:${email}`, 3, 3600);
  if (!allowed) {
    return jsonError("Too many requests. Please wait before trying again.", 429);
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Only email/password accounts have a passwordHash to reset — OAuth-provisioned
  // accounts (authProvider !== "email") silently no-op here rather than erroring,
  // to avoid leaking which provider an email is registered under.
  if (user && user.authProvider === "email") {
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });

    const { token, tokenHash } = generateToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await sendPasswordResetEmail(user.email, user.name, `${env.APP_URL}/reset-password?token=${token}`);
  }

  // Same response whether or not the account exists — never let this endpoint be
  // used to enumerate registered emails.
  return NextResponse.json({ message: GENERIC_MESSAGE });
}