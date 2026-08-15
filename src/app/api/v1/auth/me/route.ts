import { prisma } from "@/server/db";
import { getCurrentUserPayload } from "@/server/auth";
import { jsonError, jsonOk } from "@/server/http";

export async function GET() {
  const auth = await getCurrentUserPayload();
  if (!auth) return jsonError("Unauthorized", 401);
  const user = await prisma.user.findUnique({ where: { id: auth.sub } });
  if (!user) return jsonError("Unauthorized", 401);
  return jsonOk({
    id: user.id,
    email: user.email,
    name: user.name,
    authProvider: user.authProvider,
    homeCountry: user.homeCountry,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  });
}
