import { prisma } from "@/server/db";
import { setAuthCookies, signAccessToken, signRefreshToken, verifyPassword } from "@/server/auth";
import { getClientIp, jsonError, jsonOk } from "@/server/http";
import { parseJson } from "@/server/route-utils";
import { loginSchema } from "@/server/validators";
import { enforceRateLimit } from "@/server/rate-limit";

async function verifyGoogleIdToken(idToken: string): Promise<{ email: string; name: string } | null> {
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!response.ok) return null;
  const payload = await response.json() as { email?: string; name?: string };
  if (!payload.email) return null;
  return { email: payload.email, name: payload.name || payload.email.split("@")[0] || "Traveler" };
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const allowed = await enforceRateLimit(`auth:login:${ip}`, 30, 60);
  if (!allowed) return jsonError("Too many login attempts", 429);

  const parsed = await parseJson(request, loginSchema);
  if (!parsed.ok) return parsed.response;

  let email = parsed.data.email.toLowerCase();
  let name = parsed.data.name ?? "Traveler";

  if (parsed.data.provider === "google") {
    if (!parsed.data.idToken) return jsonError("Google idToken is required", 422);
    const google = await verifyGoogleIdToken(parsed.data.idToken);
    if (!google) return jsonError("Invalid Google token", 401);
    email = google.email.toLowerCase();
    name = google.name;
  }

  let user = await prisma.user.findUnique({ where: { email } });

  if (parsed.data.provider === "email") {
    if (!user || !user.passwordHash) return jsonError("Invalid email or password", 401);
    if (!parsed.data.password) return jsonError("Password is required", 422);
    const valid = await verifyPassword(user.passwordHash, parsed.data.password);
    if (!valid) return jsonError("Invalid email or password", 401);
  } else {
    if (!user) {
      user = await prisma.user.create({
        data: { email, name, authProvider: "google", passwordHash: null },
      });
    }
  }

  if (!user) return jsonError("Authentication failed", 401);

  const accessToken = await signAccessToken({ sub: user.id, email: user.email, provider: user.authProvider });
  const refreshToken = await signRefreshToken({ sub: user.id, email: user.email, provider: user.authProvider });
  const response = jsonOk({ id: user.id, email: user.email, name: user.name, authProvider: user.authProvider });
  await setAuthCookies(response, accessToken, refreshToken);
  return response;
}
