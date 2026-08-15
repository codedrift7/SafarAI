import { prisma } from "@/server/db";
import { jsonError, jsonOk } from "@/server/http";
import { setAuthCookies, signAccessToken, signRefreshToken, verifyRefreshToken } from "@/server/auth";

export async function POST(request: Request) {
  const refresh = request.headers.get("cookie")
    ?.split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith("safar_refresh="))
    ?.split("=")[1];

  if (!refresh) return jsonError("Missing refresh token", 401);

  try {
    const payload = await verifyRefreshToken(refresh);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return jsonError("User not found", 401);

    const accessToken = await signAccessToken({ sub: user.id, email: user.email, provider: user.authProvider });
    const refreshToken = await signRefreshToken({ sub: user.id, email: user.email, provider: user.authProvider });
    const response = jsonOk({ ok: true });
    await setAuthCookies(response, accessToken, refreshToken);
    return response;
  } catch {
    return jsonError("Invalid refresh token", 401);
  }
}
