import type {
  Activity,
  Advisory,
  CreateActivityInput,
  CreateTripInput,
  Trip,
  TripCollaborator,
  TripDay,
  TripExport,
  TripFilters,
  UpdateActivityInput,
  UpdateTripInput,
} from "@/lib/domain/types";
import { getTripAdvisories as deriveTripAdvisories } from "./advisories";
import {
  getRawPoi,
  getRawRegion,
  getRawTrip,
  getStore,
  hydrateActivity,
  hydrateTrip,
  nextMockId,
} from "./store";
import { asDateOnlyIso, clone, delay, slugify } from "./utils";

function findRegionForTrip(input: Pick<CreateTripInput, "regionSlug" | "destination">) {
  if (input.regionSlug) return getRawRegion(input.regionSlug);
  const candidate = input.destination?.trim().toLowerCase();
  if (!candidate) return undefined;
  return getStore().regions.find(
    (region) =>
      region.slug === slugify(candidate) ||
      region.name.toLowerCase() === candidate ||
      candidate.includes(region.slug),
  );
}

function uniqueTripSlug(base: string): string {
  const normalized = slugify(base) || "safar-trip";
  const existing = new Set(getStore().trips.map((trip) => trip.slug));
  if (!existing.has(normalized)) return normalized;
  let suffix = 2;
  while (existing.has(`${normalized}-${suffix}`)) suffix += 1;
  return `${normalized}-${suffix}`;
}

function now(): string {
  return new Date().toISOString();
}

function getRequiredRawTrip(tripId: string): Trip {
  const trip = getRawTrip(tripId);
  if (!trip) throw new Error(`Trip '${tripId}' was not found.`);
  return trip;
}

function findActivity(activityId: string): { trip: Trip; day: TripDay; activity: Activity } | null {
  for (const trip of getStore().trips) {
    for (const day of trip.days) {
      const activity = day.activities.find((candidate) => candidate.id === activityId);
      if (activity) return { trip, day, activity };
    }
  }
  return null;
}

/**
 * The itinerary view only ever has a day's id in hand (not its parent
 * trip's id) when it asks to reorder — see trip-itinerary.tsx's
 * `reorderActivities(activeDay.id, ids)` call. Resolve the owning trip from
 * the day id instead of requiring the caller to pass both.
 */
function findTripDay(dayId: string): { trip: Trip; day: TripDay } | null {
  for (const trip of getStore().trips) {
    const day = trip.days.find((candidate) => candidate.id === dayId);
    if (day) return { trip, day };
  }
  return null;
}

export async function listTrips(filters: TripFilters = {}): Promise<Trip[]> {
  await delay();
  return getStore()
    .trips.filter((trip) => {
      if (filters.ownerId && trip.ownerId !== filters.ownerId) return false;
      if (filters.status && trip.status !== filters.status) return false;
      if (!filters.includeArchived && trip.status === "ARCHIVED") return false;
      return true;
    })
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map(hydrateTrip);
}

export async function getTrip(idOrSlug: string): Promise<Trip | null> {
  await delay();
  const trip = getRawTrip(idOrSlug);
  return trip ? hydrateTrip(trip) : null;
}

export async function createTrip(input: CreateTripInput): Promise<Trip> {
  await delay();
  const startDate = asDateOnlyIso(input.startDate);
  const endDate = asDateOnlyIso(input.endDate);
  if (new Date(endDate) < new Date(startDate)) {
    throw new Error("A trip's end date cannot be before its start date.");
  }

  const region = findRegionForTrip(input);
  const title =
    input.title?.trim() ||
    (region ? `${region.name}, your way` : "A new Safar");
  const createdAt = now();
  const trip: Trip = {
    id: nextMockId("trip"),
    ownerId: "user-sana-khan",
    title,
    slug: uniqueTripSlug(`${title}-${startDate.slice(0, 10)}`),
    startDate,
    endDate,
    travelerType: input.travelerType,
    budgetTier: input.budgetTier ?? "MID_RANGE",
    pace: input.pace ?? "balanced",
    status: "DRAFT",
    coverImageUrl: input.coverImageUrl ?? region?.heroImageUrl ?? null,
    isPublic: false,
    shareToken: null,
    partySize: input.partySize ?? 2,
    vibe: input.vibe ?? "A thoughtful, locally grounded route.",
    createdAt,
    updatedAt: createdAt,
    days: [],
    collaborators: [
      {
        id: nextMockId("collaborator"),
        tripId: "",
        userId: "user-sana-khan",
        role: "OWNER",
        joinedAt: createdAt,
        createdAt,
      },
    ],
  };
  trip.collaborators![0].tripId = trip.id;
  getStore().trips.unshift(trip);
  return hydrateTrip(trip);
}

export async function updateTrip(id: string, input: UpdateTripInput): Promise<Trip> {
  await delay();
  const trip = getRequiredRawTrip(id);
  if (input.startDate) trip.startDate = asDateOnlyIso(input.startDate);
  if (input.endDate) trip.endDate = asDateOnlyIso(input.endDate);
  if (new Date(trip.endDate) < new Date(trip.startDate)) {
    throw new Error("A trip's end date cannot be before its start date.");
  }

  Object.assign(trip, {
    ...(input.title !== undefined ? { title: input.title.trim() } : {}),
    ...(input.travelerType !== undefined ? { travelerType: input.travelerType } : {}),
    ...(input.budgetTier !== undefined ? { budgetTier: input.budgetTier } : {}),
    ...(input.pace !== undefined ? { pace: input.pace } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.coverImageUrl !== undefined ? { coverImageUrl: input.coverImageUrl } : {}),
    ...(input.partySize !== undefined ? { partySize: input.partySize } : {}),
    ...(input.vibe !== undefined ? { vibe: input.vibe } : {}),
  });

  if (input.isPublic !== undefined) {
    trip.isPublic = input.isPublic;
    if (input.isPublic && !trip.shareToken) {
      trip.shareToken = `${slugify(trip.title)}-${trip.id.slice(-4)}`;
    }
    if (!input.isPublic) trip.shareToken = null;
  }
  if (input.shareToken !== undefined) trip.shareToken = input.shareToken;
  trip.updatedAt = now();
  return hydrateTrip(trip);
}

export async function deleteTrip(id: string): Promise<void> {
  await delay();
  const state = getStore();
  const index = state.trips.findIndex((trip) => trip.id === id);
  if (index < 0) throw new Error(`Trip '${id}' was not found.`);
  state.trips.splice(index, 1);
  state.chatMessages = state.chatMessages.filter((message) => message.tripId !== id);
}

export async function getSharedTrip(shareToken: string): Promise<Trip | null> {
  await delay();
  const trip = getStore().trips.find(
    (candidate) => candidate.isPublic && candidate.shareToken === shareToken,
  );
  return trip ? hydrateTrip(trip) : null;
}

export async function setTripPublic(id: string, isPublic = true): Promise<Trip> {
  return updateTrip(id, { isPublic });
}

export async function getTripAdvisoriesForTrip(id: string): Promise<Advisory[]> {
  const trip = await getTrip(id);
  return trip ? deriveTripAdvisories(trip) : [];
}

export async function addActivity(input: CreateActivityInput): Promise<Activity> {
  await delay();
  const trip = getStore().trips.find((candidate) =>
    candidate.days.some((day) => day.id === input.tripDayId),
  );
  const day = trip?.days.find((candidate) => candidate.id === input.tripDayId);
  if (!trip || !day) throw new Error(`Trip day '${input.tripDayId}' was not found.`);
  if (input.poiId && !getRawPoi(input.poiId)) {
    throw new Error(`POI '${input.poiId}' was not found.`);
  }
  if (!input.poiId && !input.customTitle?.trim()) {
    throw new Error("An activity needs either a verified POI or a custom title.");
  }

  const afterIndex = input.afterActivityId
    ? day.activities.findIndex((activity) => activity.id === input.afterActivityId)
    : day.activities.length - 1;
  const insertionIndex = afterIndex < 0 ? day.activities.length : afterIndex + 1;
  day.activities.forEach((activity) => {
    if (activity.orderIndex >= insertionIndex) activity.orderIndex += 1;
  });
  const activity: Activity = {
    id: nextMockId("activity"),
    tripDayId: day.id,
    poiId: input.poiId ?? null,
    customTitle: input.customTitle?.trim() || null,
    category: input.category,
    startTime: input.startTime ?? null,
    endTime: input.endTime ?? null,
    orderIndex: insertionIndex,
    notes: input.notes ?? null,
    estimatedCost: input.estimatedCost ?? null,
    costCurrency: input.costCurrency ?? "PKR",
    addedByUserId: "user-sana-khan",
  };
  day.activities.push(activity);
  trip.updatedAt = now();
  return hydrateActivity(activity);
}

export async function updateActivity(id: string, input: UpdateActivityInput): Promise<Activity> {
  await delay();
  const found = findActivity(id);
  if (!found) throw new Error(`Activity '${id}' was not found.`);
  if (input.poiId && !getRawPoi(input.poiId)) {
    throw new Error(`POI '${input.poiId}' was not found.`);
  }
  Object.assign(found.activity, {
    ...(input.poiId !== undefined ? { poiId: input.poiId } : {}),
    ...(input.customTitle !== undefined ? { customTitle: input.customTitle } : {}),
    ...(input.category !== undefined ? { category: input.category } : {}),
    ...(input.startTime !== undefined ? { startTime: input.startTime } : {}),
    ...(input.endTime !== undefined ? { endTime: input.endTime } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
    ...(input.estimatedCost !== undefined ? { estimatedCost: input.estimatedCost } : {}),
    ...(input.costCurrency !== undefined ? { costCurrency: input.costCurrency } : {}),
  });
  found.trip.updatedAt = now();
  return hydrateActivity(found.activity);
}

export async function deleteActivity(id: string): Promise<void> {
  await delay();
  const found = findActivity(id);
  if (!found) throw new Error(`Activity '${id}' was not found.`);
  found.day.activities = found.day.activities
    .filter((activity) => activity.id !== id)
    .map((activity, orderIndex) => ({ ...activity, orderIndex }));
  found.trip.updatedAt = now();
}

/**
 * NOTE: signature is (dayId, orderedActivityIds) — no tripId — because
 * trip-itinerary.tsx only ever has the active day's id on hand when it
 * calls this after a drag/reorder. The owning trip is resolved internally
 * via findTripDay.
 */
export async function reorderActivities(
  dayId: string,
  orderedActivityIds: string[],
): Promise<TripDay> {
  await delay();
  const found = findTripDay(dayId);
  if (!found) throw new Error(`Trip day '${dayId}' was not found.`);
  const { trip, day } = found;
  if (
    orderedActivityIds.length !== day.activities.length ||
    new Set(orderedActivityIds).size !== day.activities.length ||
    !orderedActivityIds.every((id) => day.activities.some((activity) => activity.id === id))
  ) {
    throw new Error("Reorder requests must include every activity exactly once.");
  }
  const activityMap = new Map(day.activities.map((activity) => [activity.id, activity]));
  day.activities = orderedActivityIds.map((id, orderIndex) => ({
    ...activityMap.get(id)!,
    orderIndex,
  }));
  trip.updatedAt = now();
  return clone(hydrateTrip(trip).days.find((candidate) => candidate.id === day.id)!);
}

export async function createInvite(
  tripId: string,
  invitedEmail: string,
  role: TripCollaborator["role"] = "EDITOR",
): Promise<TripCollaborator> {
  await delay();
  const trip = getRequiredRawTrip(tripId);
  const invitation: TripCollaborator = {
    id: nextMockId("invite"),
    tripId,
    invitedEmail: invitedEmail.trim().toLowerCase(),
    role,
    joinedAt: null,
    createdAt: now(),
  };
  trip.collaborators = [...(trip.collaborators ?? []), invitation];
  trip.updatedAt = now();
  return clone(invitation);
}

export async function voteActivity(id: string): Promise<{ activityId: string; votes: number }> {
  await delay();
  const found = findActivity(id);
  if (!found) throw new Error(`Activity '${id}' was not found.`);
  // Votes are Phase 2 in the real schema; the mock keeps a lightweight count.
  const metadata = found.activity as Activity & { mockVotes?: number };
  metadata.mockVotes = (metadata.mockVotes ?? 0) + 1;
  return { activityId: id, votes: metadata.mockVotes };
}

export async function exportTrip(id: string): Promise<TripExport> {
  await delay(160);
  const trip = getRequiredRawTrip(id);
  const hydrated = hydrateTrip(trip);
  const lines = [
    hydrated.title,
    `${hydrated.startDate.slice(0, 10)} — ${hydrated.endDate.slice(0, 10)}`,
    ...hydrated.days.flatMap((day) => [
      `Day ${day.dayNumber}: ${day.date.slice(0, 10)}`,
      ...day.activities.map(
        (activity) =>
          `  ${activity.startTime ?? ""} ${activity.poi?.name ?? activity.customTitle ?? "Untitled activity"}`,
      ),
    ]),
  ];
  return {
    filename: `${slugify(hydrated.title) || "safar-itinerary"}.pdf`,
    mimeType: "application/pdf",
    content: lines.join("\n"),
  };
}
