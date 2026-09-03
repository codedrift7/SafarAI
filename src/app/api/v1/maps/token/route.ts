import { NextResponse } from "next/server";
import { env } from "@/server/env";

/**
 * Mapbox GL runs in the browser and therefore needs a public (`pk.`) token.
 * The token is deliberately read from the existing routing configuration so
 * there is one Mapbox configuration value for the entire application.
 */
export async function GET() {
  const token = env.MAPBOX_ACCESS_TOKEN;
  const publicToken = token?.startsWith("pk.") ? token : null;

  return NextResponse.json(
    { token: publicToken },
    { headers: { "Cache-Control": "private, max-age=300" } },
  );
}
