import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { jsonError } from "@/server/http";
import { parseJson } from "@/server/route-utils";
import { hashToken } from "@/server/tokens";

const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = await parseJson(request, verifyEmailSchema);
  if (!parsed.ok) return parsed.response;

  const tokenHash = hashToken(parsed.data.token);
  const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });

  // Not-found, expired, and already-used all get the same generic message —
  // the response shape shouldn't tell an attacker which case they hit.
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return jsonError("This verification link is invalid or has expired.", 400);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date() },
    }),
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ verified: true });
}