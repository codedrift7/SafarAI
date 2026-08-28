import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { jsonError } from "@/server/http";
import { parseJson } from "@/server/route-utils";
import { hashToken } from "@/server/tokens";
import { hashPassword } from "@/server/auth";

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: Request) {
  const parsed = await parseJson(request, resetPasswordSchema);
  if (!parsed.ok) return parsed.response;

  const tokenHash = hashToken(parsed.data.token);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return jsonError("This reset link is invalid or has expired.", 400);
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    // Mark every outstanding token for this user used, not just the one redeemed —
    // a second unused reset link (e.g. from an earlier request) shouldn't still work
    // after the password has already changed.
    prisma.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  // NOTE: existing refresh tokens are NOT invalidated here — see "Known limitation"
  // in handoff.md. Sessions issued before this reset remain valid until they expire
  // (up to 7 days) since there's no server-side session store to revoke against yet.

  return NextResponse.json({ reset: true });
}