import { prisma } from "@/server/db";
import { hashPassword, setAuthCookies, signAccessToken, signRefreshToken } from "@/server/auth";
import { getClientIp, jsonError, jsonOk } from "@/server/http";
import { parseJson } from "@/server/route-utils";
import { registerSchema } from "@/server/validators";
import { enforceRateLimit } from "@/server/rate-limit";
import { generateToken } from "@/server/tokens";
import { sendVerificationEmail } from "@/server/mailer";
import { env } from "@/server/env";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const allowed = await enforceRateLimit(`auth:register:${ip}`, 20, 60);
  if (!allowed) return jsonError("Too many registration attempts", 429);

  const parsed = await parseJson(request, registerSchema);
  if (!parsed.ok) return parsed.response;

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (existing) return jsonError("Email already registered", 409);

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email.toLowerCase(),
      passwordHash: await hashPassword(parsed.data.password),
      authProvider: "email",
      name: parsed.data.name,
      homeCountry: parsed.data.homeCountry ?? null,
    },
  });

  // Send verification email — wrapped in try/catch so a mailer failure (e.g.
  // Resend API down) doesn't prevent registration from completing.
  try {
    const { token, tokenHash } = generateToken();
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    await sendVerificationEmail(
      user.email,
      user.name,
      `${env.APP_URL}/verify-email?token=${token}`,
    );
  } catch (err) {
    console.error("[register] Failed to send verification email:", err);
  }

  const accessToken = await signAccessToken({ sub: user.id, email: user.email, provider: user.authProvider });
  const refreshToken = await signRefreshToken({ sub: user.id, email: user.email, provider: user.authProvider });
  const response = jsonOk({ id: user.id, email: user.email, name: user.name });
  await setAuthCookies(response, accessToken, refreshToken);
  return response;
}
