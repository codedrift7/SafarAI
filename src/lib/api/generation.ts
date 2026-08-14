import type {
  Activity,
  ActivityCategory,
  ChatMessage,
  ChatStreamEvent,
  GenerateItineraryInput,
  ItineraryStreamEvent,
  POI,
  SendChatMessageInput,
  Trip,
  TripDay,
} from "@/lib/domain/types";
import { getActivityAdvisories, isPoiSeasonallySuitable } from "./advisories";
import {
  getRawPoi,
  getRawRegion,
  getRawTrip,
  getStore,
  hydrateActivity,
  hydrateTrip,
  nextMockId,
} from "./store";
import { addDays, asDateOnlyIso, delay, inclusiveDayCount } from "./utils";

type GenerateOptions = Omit<GenerateItineraryInput, "tripId">;
type ChatInput = Omit<SendChatMessageInput, "tripId">;

const routePlans: Record<string, string[][]> = {
  hunza: [
    ["poi-altit-fort", "poi-baltit-fort"],
    ["poi-eagles-nest-duikar"],
    ["poi-attabad-lake", "poi-hussaini-bridge", "poi-passu-cones"],
    ["poi-khunjerab-pass"],
  ],
  skardu: [
    ["poi-katpana-desert", "poi-shangrila-lake"],
    ["poi-upper-kachura-lake", "poi-shigar-fort"],
    ["poi-deosai-plains"],
    ["poi-basho-valley", "poi-satpara-lake"],
  ],
  lahore: [
    ["poi-lahore-fort", "poi-badshahi-mosque", "poi-fort-road-food-street"],
    ["poi-walled-city-delhi-gate", "poi-wazir-khan-mosque", "poi-anarkali-bazaar"],
    ["poi-shalimar-gardens", "poi-data-darbar", "poi-minar-e-pakistan"],
  ],
};

function categoryForPoi(poi: POI): ActivityCategory {
  if (poi.category === "RESTAURANT") return "FOOD";
  if (poi.category === "MOSQUE" || poi.category === "SHRINE") return "RELIGIOUS";
  if (
    poi.category === "MOUNTAIN" ||
    poi.category === "GLACIER" ||
    poi.category === "VALLEY" ||
    poi.category === "WATERFALL"
  ) {
    return "ADVENTURE";
  }
  if (poi.category === "BAZAAR") return "SHOPPING";
  return "SIGHTSEEING";
}

function timeSlots(index: number): { startTime: string; endTime: string } {
  const slots = [
    { startTime: "09:00", endTime: "10:30" },
    { startTime: "12:00", endTime: "13:30" },
    { startTime: "16:00", endTime: "17:30" },
  ];
  return slots[index % slots.length];
}

function resolveRegionSlug(input: GenerateItineraryInput, trip: Trip): string {
  if (input.regionSlug && getRawRegion(input.regionSlug)) return input.regionSlug;
  if (input.destination && getRawRegion(input.destination)) return input.destination;
  const regionFromExistingDay = trip.days.find((day) => day.regionId)?.regionId;
  if (regionFromExistingDay) return getRawRegion(regionFromExistingDay)?.slug ?? "hunza";
  const title = `${trip.title} ${input.destination ?? ""}`.toLowerCase();
  const matched = getStore().regions.find((region) => title.includes(region.slug));
  return matched?.slug ?? "hunza";
}

function buildActivitiesForDay(
  tripDayId: string,
  poiIds: string[],
  tripId: string,
): Activity[] {
  return poiIds
    .map((poiId) => getRawPoi(poiId))
    .filter((poi): poi is POI => Boolean(poi))
    .map((poi, orderIndex) => ({
      id: nextMockId("activity"),
      tripDayId,
      poiId: poi.id,
      customTitle: null,
      category: categoryForPoi(poi),
      ...timeSlots(orderIndex),
      orderIndex,
      notes:
        poi.category === "MOUNTAIN" || poi.category === "GLACIER"
          ? "Keep this flexible around weather, acclimatisation and local road advice."
          : "Selected from SafarAI's curated place catalogue.",
      estimatedCost: poi.entryFeePkr ?? 0,
      costCurrency: "PKR",
      addedByUserId: "user-sana-khan",
    }));
}

function normaliseGenerationInput(
  inputOrTripId: GenerateItineraryInput | string,
  options?: GenerateOptions,
): GenerateItineraryInput {
  return typeof inputOrTripId === "string"
    ? { tripId: inputOrTripId, ...(options ?? {}) }
    : inputOrTripId;
}

/**
 * Mock SSE replacement. It writes each completed day to the in-memory trip and
 * yields it separately, letting the Karakoram Line animate progressively.
 */
export function generateItinerary(input: GenerateItineraryInput): AsyncGenerator<ItineraryStreamEvent>;
export function generateItinerary(
  tripId: string,
  options?: GenerateOptions,
): AsyncGenerator<ItineraryStreamEvent>;
export async function* generateItinerary(
  inputOrTripId: GenerateItineraryInput | string,
  options?: GenerateOptions,
): AsyncGenerator<ItineraryStreamEvent> {
  const input = normaliseGenerationInput(inputOrTripId, options);
  try {
    const trip = getRawTrip(input.tripId);
    if (!trip) {
      yield {
        type: "error",
        tripId: input.tripId,
        message: "That trip no longer exists.",
        progress: 0,
      };
      return;
    }

    if (input.startDate) trip.startDate = asDateOnlyIso(input.startDate);
    if (input.endDate) trip.endDate = asDateOnlyIso(input.endDate);
    if (input.travelerType) trip.travelerType = input.travelerType;
    if (input.budgetTier !== undefined) trip.budgetTier = input.budgetTier;
    if (input.pace) trip.pace = input.pace;
    const regionSlug = resolveRegionSlug(input, trip);
    const region = getRawRegion(regionSlug);
    if (!region) throw new Error("We could not match that destination to SafarAI's current regions.");

    const duration = Math.max(1, Math.min(inclusiveDayCount(trip.startDate, trip.endDate), 7));
    const askedForExpedition = /k2|concordia|biafo|expedition|permit|trek/i.test(
      `${input.prompt ?? ""} ${input.destination ?? ""}`,
    );
    const candidates = getStore().pois.filter(
      (poi) =>
        poi.regionId === region.id &&
        isPoiSeasonallySuitable(poi, trip.startDate, trip.endDate) &&
        (askedForExpedition || !poi.requiresPermit),
    );
    const fallbackCandidates = getStore().pois.filter(
      (poi) => poi.regionId === region.id && (askedForExpedition || !poi.requiresPermit),
    );
    const candidateIds = new Set((candidates.length ? candidates : fallbackCandidates).map((poi) => poi.id));
    const basePlan = routePlans[region.slug] ?? [];
    trip.days = [];
    trip.status = "PLANNING";
    trip.updatedAt = new Date().toISOString();

    yield {
      type: "status",
      tripId: trip.id,
      message: `Grounding your route in ${region.name}'s verified places…`,
      progress: 5,
    };

    for (let index = 0; index < duration; index += 1) {
      await delay(index === 0 ? 260 : 360);
      const preferredIds = basePlan[index % Math.max(basePlan.length, 1)] ?? [];
      let poiIds = preferredIds.filter((id) => candidateIds.has(id));
      if (!poiIds.length) {
        const fallbackStart = (index * 2) % Math.max(candidateIds.size, 1);
        poiIds = [...candidateIds].slice(fallbackStart, fallbackStart + 3);
      }
      if (!poiIds.length) {
        throw new Error(`There are no eligible verified POIs for ${region.name} on those dates.`);
      }
      const dayId = nextMockId("day");
      const day: TripDay = {
        id: dayId,
        tripId: trip.id,
        dayNumber: index + 1,
        date: addDays(trip.startDate, index),
        regionId: region.id,
        notes:
          index === 0
            ? "Start at an easy pace and use this day to confirm local transport conditions."
            : "Built from real SafarAI POIs; timings are intentionally flexible around mountain roads and local conditions.",
        activities: buildActivitiesForDay(dayId, poiIds, trip.id),
      };
      trip.days.push(day);
      trip.updatedAt = new Date().toISOString();
      const hydratedDay = hydrateTrip(trip).days.find((candidate) => candidate.id === day.id)!;
      const progress = Math.round(((index + 1) / duration) * 90) + 5;
      yield {
        type: "day",
        tripId: trip.id,
        day: hydratedDay,
        advisories: hydratedDay.activities.flatMap((activity) =>
          getActivityAdvisories(activity, trip.startDate, trip.endDate),
        ),
        progress,
      };
    }

    trip.status = "CONFIRMED";
    trip.updatedAt = new Date().toISOString();
    yield { type: "complete", tripId: trip.id, trip: hydrateTrip(trip), progress: 100 };
  } catch (error) {
    yield {
      type: "error",
      tripId: input.tripId,
      message: error instanceof Error ? error.message : "The mock itinerary could not be generated.",
      progress: 0,
    };
  }
}

function normaliseChatInput(inputOrTripId: SendChatMessageInput | string, content?: string): SendChatMessageInput {
  return typeof inputOrTripId === "string"
    ? { tripId: inputOrTripId, content: content ?? "" }
    : inputOrTripId;
}

function findTargetActivity(trip: Trip, content: string): { day: TripDay; activity: Activity } | null {
  const lower = content.toLowerCase();
  for (const day of trip.days) {
    for (const activity of day.activities) {
      const poiName = activity.poiId ? getRawPoi(activity.poiId)?.name.toLowerCase() : "";
      const customTitle = activity.customTitle?.toLowerCase() ?? "";
      if ((poiName && lower.includes(poiName)) || (customTitle && lower.includes(customTitle))) {
        return { day, activity };
      }
    }
  }
  const firstDay = trip.days[0];
  const firstActivity = firstDay?.activities[0];
  return firstDay && firstActivity ? { day: firstDay, activity: firstActivity } : null;
}

function assistantMessage(
  tripId: string,
  content: string,
  toolCalls?: ChatMessage["toolCalls"],
): ChatMessage {
  const message: ChatMessage = {
    id: nextMockId("chat"),
    tripId,
    role: "assistant",
    content,
    toolCalls: toolCalls ?? null,
    createdAt: new Date().toISOString(),
  };
  getStore().chatMessages.push(message);
  return message;
}

function shiftTime(time: string | null | undefined, minutes: number): string | null {
  if (!time) return null;
  const [hours, mins] = time.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(mins)) return time;
  const total = (hours * 60 + mins + minutes + 1440) % 1440;
  return `${Math.floor(total / 60)
    .toString()
    .padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
}

/** Mock SSE replacement for conversational itinerary edits. */
export function sendChatMessage(input: SendChatMessageInput): AsyncGenerator<ChatStreamEvent>;
export function sendChatMessage(tripId: string, content: string): AsyncGenerator<ChatStreamEvent>;
export async function* sendChatMessage(
  inputOrTripId: SendChatMessageInput | string,
  maybeContent?: string,
): AsyncGenerator<ChatStreamEvent> {
  const input = normaliseChatInput(inputOrTripId, maybeContent);
  const trip = getRawTrip(input.tripId);
  if (!trip) return;
  const cleanContent = input.content.trim();
  if (!cleanContent) return;

  const userMessage: ChatMessage = {
    id: nextMockId("chat"),
    tripId: trip.id,
    role: "user",
    content: cleanContent,
    toolCalls: null,
    createdAt: new Date().toISOString(),
  };
  getStore().chatMessages.push(userMessage);
  yield { type: "message", tripId: trip.id, message: userMessage };
  await delay(180);

  const lower = cleanContent.toLowerCase();
  const target = findTargetActivity(trip, lower);
  let response: ChatMessage;
  let updatedActivity: Activity | null = null;

  if (target && /(swap|replace|outdoor|outdoors)/.test(lower)) {
    const currentPoiId = target.activity.poiId;
    const regionId = target.day.regionId;
    const replacement = getStore().pois.find(
      (poi) =>
        poi.regionId === regionId &&
        poi.id !== currentPoiId &&
        !poi.requiresPermit &&
        ["MOUNTAIN", "LAKE", "VIEWPOINT", "VALLEY", "WATERFALL", "NATIONAL_PARK"].includes(poi.category) &&
        isPoiSeasonallySuitable(poi, trip.startDate, trip.endDate),
    );
    if (replacement) {
      target.activity.poiId = replacement.id;
      target.activity.customTitle = null;
      target.activity.category = categoryForPoi(replacement);
      target.activity.notes = `Swapped in from the verified ${replacement.regionId === target.day.regionId ? "local" : ""} POI catalogue.`;
      updatedActivity = target.activity;
      response = assistantMessage(
        trip.id,
        `Done — I swapped in ${replacement.name}, a verified outdoor stop that fits this day's region and season.`,
        [
          {
            name: "swap_activity",
            arguments: { activityId: target.activity.id, replacementCriteria: "outdoors" },
          },
        ],
      );
    } else {
      response = assistantMessage(
        trip.id,
        "I couldn't find a season-appropriate verified outdoor replacement for that day. Try a different date or ask me to keep the current stop.",
      );
    }
  } else if (target && /(remove|delete|skip)/.test(lower)) {
    target.day.activities = target.day.activities
      .filter((activity) => activity.id !== target.activity.id)
      .map((activity, orderIndex) => ({ ...activity, orderIndex }));
    response = assistantMessage(
      trip.id,
      "Removed that stop and tightened the remaining order for the day.",
      [{ name: "remove_activity", arguments: { activityId: target.activity.id } }],
    );
  } else if (target && /(later|earlier|retime|time)/.test(lower)) {
    const delta = lower.includes("earlier") ? -60 : 60;
    target.activity.startTime = shiftTime(target.activity.startTime, delta);
    target.activity.endTime = shiftTime(target.activity.endTime, delta);
    updatedActivity = target.activity;
    response = assistantMessage(
      trip.id,
      `Updated the timing by ${Math.abs(delta)} minutes. Keep the day flexible if local transport runs behind schedule.`,
      [
        {
          name: "modify_activity",
          arguments: {
            activityId: target.activity.id,
            startTime: target.activity.startTime,
            endTime: target.activity.endTime,
          },
        },
      ],
    );
  } else {
    response = assistantMessage(
      trip.id,
      "I’ve kept the route grounded in verified places. Ask me to swap a stop for something outdoors, remove one, or move it earlier or later.",
    );
  }

  trip.updatedAt = new Date().toISOString();
  if (updatedActivity) {
    yield {
      type: "activity-updated",
      tripId: trip.id,
      activity: hydrateActivity(updatedActivity),
      message: response,
    };
  } else {
    yield { type: "message", tripId: trip.id, message: response };
  }
  await delay(100);
  yield { type: "complete", tripId: trip.id, trip: hydrateTrip(trip), message: response };
}

export async function getChatHistory(tripId: string): Promise<ChatMessage[]> {
  await delay();
  return getStore()
    .chatMessages.filter((message) => message.tripId === tripId)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .map((message) => ({ ...message, toolCalls: message.toolCalls ? [...message.toolCalls] : null }));
}
