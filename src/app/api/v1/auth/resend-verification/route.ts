import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { jsonError } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { enforceRateLimit } from "@/server/rate-limit";
import { generateToken } from "@/server/tokens";
import { sendVerificationEmail } from "@/server/mailer";
import { env } from "@/server/env";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  // Per-user cap, not per-IP: this is a logged-in action, so the user id is a
  // reliable key and avoids one shared IP (office/NAT) rate-limiting everyone.
  const allowed = await enforceRateLimit(`auth:resend-verification:${auth.payload.sub}`, 3, 3600);
  if (!allowed) {
    return jsonError("You've requested this too many times. Please wait before trying again.", 429);
  }

  const user = await prisma.user.findUnique({ where: { id: auth.payload.sub } });
  if (!user) return jsonError("Unauthorized", 401);

  if (user.emailVerified) {
    return NextResponse.json({ alreadyVerified: true });
  }

  // Invalidate any outstanding unverified tokens before issuing a new one, so an old
  // leaked link can't still be redeemed after the user asks for a fresh one.
  await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id, usedAt: null } });

  const { token, tokenHash } = generateToken();
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  await sendVerificationEmail(user.email, user.name, `${env.APP_URL}/verify-email?token=${token}`);

  return NextResponse.json({ sent: true });
}