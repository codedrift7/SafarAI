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
import { fetchJson } from "./utils";
import { getTripAdvisories as deriveTripAdvisories } from "./advisories";

export async function listTrips(
  _filters: TripFilters = {},
  init?: RequestInit,
): Promise<Trip[]> {
  return fetchJson<Trip[]>("/api/v1/trips", init);
}

export async function getTrip(idOrSlug: string): Promise<Trip | null> {
  try {
    return await fetchJson<Trip>(`/api/v1/trips/${idOrSlug}`);
  } catch {
    return null;
  }
}

export async function createTrip(input: CreateTripInput): Promise<Trip> {
  return fetchJson<Trip>("/api/v1/trips", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateTrip(id: string, input: UpdateTripInput): Promise<Trip> {
  return fetchJson<Trip>(`/api/v1/trips/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteTrip(id: string): Promise<void> {
  await fetchJson(`/api/v1/trips/${id}`, { method: "DELETE" });
}

export async function getSharedTrip(shareToken: string): Promise<Trip | null> {
  try {
    return await fetchJson<Trip>(`/api/v1/trips/shared/${shareToken}`);
  } catch {
    return null;
  }
}

export async function setTripPublic(id: string, isPublic = true): Promise<Trip> {
  return updateTrip(id, { isPublic });
}

export async function getTripAdvisoriesForTrip(id: string): Promise<Advisory[]> {
  const trip = await getTrip(id);
  return trip ? deriveTripAdvisories(trip) : [];
}

export async function addActivity(input: CreateActivityInput): Promise<Activity> {
  return fetchJson<Activity>("/api/v1/activities", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateActivity(id: string, input: UpdateActivityInput): Promise<Activity> {
  return fetchJson<Activity>(`/api/v1/activities/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteActivity(id: string): Promise<void> {
  await fetchJson(`/api/v1/activities/${id}`, { method: "DELETE" });
}

export async function reorderActivities(dayId: string, orderedActivityIds: string[]): Promise<TripDay> {
  const trip = await listTrips();
  const ownerTrip = trip.find((candidate) => candidate.days.some((day) => day.id === dayId));
  if (!ownerTrip) {
    throw new Error(`Trip day '${dayId}' was not found.`);
  }
  return fetchJson<TripDay>(`/api/v1/trips/${ownerTrip.id}/days/${dayId}/reorder`, {
    method: "PUT",
    body: JSON.stringify({ orderedActivityIds }),
  });
}

export async function createInvite(
  tripId: string,
  invitedEmail: string,
  role: TripCollaborator["role"] = "EDITOR",
): Promise<TripCollaborator> {
  return fetchJson<TripCollaborator>(`/api/v1/trips/${tripId}/invite`, {
    method: "POST",
    body: JSON.stringify({ invitedEmail, role }),
  });
}

export async function voteActivity(id: string): Promise<{ activityId: string; votes: number }> {
  return fetchJson<{ activityId: string; votes: number }>(`/api/v1/activities/${id}/vote`, {
    method: "POST",
  });
}

export async function exportTrip(id: string): Promise<TripExport> {
  const maxTotalWaitMs = 60000;
  const started = Date.now();

  let response = await fetch(`/api/v1/trips/${id}/export/pdf`, { cache: "no-store" });

  while (response.status === 202) {
    if (Date.now() - started >= maxTotalWaitMs) {
      throw new Error("PDF export is taking longer than expected. Please try again in a moment.");
    }
    const queued = (await response.json()) as { jobId: string };
    response = await fetch(`/api/v1/trips/${id}/export/pdf?jobId=${encodeURIComponent(queued.jobId)}`, {
      cache: "no-store",
    });
  }

  if (!response.ok) throw new Error("Failed to export trip PDF");

  const blob = await response.blob();
  const text = await blob.text();
  return {
    filename: `trip-${id}.pdf`,
    mimeType: "application/pdf",
    content: text,
  };
}