// src/server/trip-service.ts
import { prisma } from "./db";
import { jsonError } from "@/server/http";
import type { NextResponse } from "next/server";

export const tripInclude = {
  owner: true,
  collaborators: { include: { user: true } },
  days: {
    include: {
      region: true,
      activities: {
        include: {
          poi: { include: { region: true } },
        },
      },
    },
  },
} as const;

export async function getTripByIdOrSlug(idOrSlug: string) {
  return prisma.trip.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: tripInclude,
  });
}

export type TripRole = "VIEWER" | "EDITOR" | "OWNER";

const ROLE_RANK: Record<TripRole, number> = { VIEWER: 0, EDITOR: 1, OWNER: 2 };

type TripWithInclude = NonNullable<Awaited<ReturnType<typeof getTripByIdOrSlug>>>;

export type TripAccessResult =
  | { ok: true; trip: TripWithInclude; role: TripRole }
  | { ok: false; response: NextResponse };

function roleOf(trip: TripWithInclude, userId: string): TripRole | null {
  if (trip.ownerId === userId) return "OWNER";
  const membership = trip.collaborators.find((c) => c.userId === userId);
  return (membership?.role as TripRole | undefined) ?? null;
}

/**
 * Gate for any route scoped to a single trip. Fetches the trip and confirms the caller
 * is the owner or a collaborator with at least `minRole`. Missing and inaccessible both
 * return the same 404 — a trip you can't access shouldn't be distinguishable from one
 * that doesn't exist.
 *
 *   const access = await requireTripAccess(id, auth.payload.sub, "EDITOR");
 *   if (!access.ok) return access.response;
 *   // access.trip is fully loaded (tripInclude), access.role is the caller's role on it
 */
export async function requireTripAccess(
  idOrSlug: string,
  userId: string,
  minRole: TripRole = "VIEWER"
): Promise<TripAccessResult> {
  const trip = await getTripByIdOrSlug(idOrSlug);
  const role = trip ? roleOf(trip, userId) : null;

  if (!trip || !role || ROLE_RANK[role] < ROLE_RANK[minRole]) {
    return { ok: false, response: jsonError("Trip not found", 404) };
  }

  return { ok: true, trip, role };
}
