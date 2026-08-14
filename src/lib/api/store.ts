import type {
  Activity,
  ChatMessage,
  POI,
  Region,
  Trip,
  TripTemplate,
  User,
  VisaGuide,
} from "@/lib/domain/types";
import {
  mockUsers,
  pois,
  regions,
  sampleChatMessages,
  sampleTrips,
  tripTemplates,
  visaGuides,
} from "@/lib/mock-data";
import { clone } from "./utils";

export interface MockStore {
  users: User[];
  regions: Region[];
  pois: POI[];
  templates: TripTemplate[];
  trips: Trip[];
  chatMessages: ChatMessage[];
  visas: VisaGuide[];
}

const seedStore = (): MockStore =>
  clone({
    users: mockUsers,
    regions,
    pois,
    templates: tripTemplates,
    trips: sampleTrips,
    chatMessages: sampleChatMessages,
    visas: visaGuides,
  });

let store = seedStore();
let idCounter = 0;

export function getStore(): MockStore {
  return store;
}

/** Useful for visual tests and story-like demos; never used by product pages. */
export function resetMockStore(): void {
  store = seedStore();
  idCounter = 0;
}

export function nextMockId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter.toString().padStart(4, "0")}`;
}

export function getRawRegion(idOrSlug: string): Region | undefined {
  return store.regions.find((region) => region.id === idOrSlug || region.slug === idOrSlug);
}

export function getRawPoi(idOrSlug: string): POI | undefined {
  return store.pois.find((poi) => poi.id === idOrSlug || poi.slug === idOrSlug);
}

export function getRawTrip(idOrSlug: string): Trip | undefined {
  return store.trips.find((trip) => trip.id === idOrSlug || trip.slug === idOrSlug);
}

export function getRawTemplate(id: string): TripTemplate | undefined {
  return store.templates.find((template) => template.id === id);
}

export function getRawUser(id: string): User | undefined {
  return store.users.find((user) => user.id === id);
}

function userPreview(user: User): Pick<User, "id" | "name" | "email" | "avatarUrl"> {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
  };
}

export function hydrateRegion(region: Region): Region {
  return clone(region);
}

export function hydratePoi(poi: POI): POI {
  const region = getRawRegion(poi.regionId);
  return {
    ...clone(poi),
    ...(region ? { region: hydrateRegion(region) } : {}),
  };
}

export function hydrateActivity(activity: Activity): Activity {
  const poi = activity.poiId ? getRawPoi(activity.poiId) : undefined;
  return {
    ...clone(activity),
    poi: poi ? hydratePoi(poi) : null,
  };
}

export function hydrateTrip(trip: Trip): Trip {
  const owner = getRawUser(trip.ownerId);
  const days = [...trip.days]
    .sort((left, right) => left.dayNumber - right.dayNumber)
    .map((day) => {
      const region = day.regionId ? getRawRegion(day.regionId) : undefined;
      return {
        ...clone(day),
        region: region ? hydrateRegion(region) : null,
        activities: [...day.activities]
          .sort((leftActivity, rightActivity) => leftActivity.orderIndex - rightActivity.orderIndex)
          .map(hydrateActivity),
      };
    });

  return {
    ...clone(trip),
    ...(owner ? { owner: userPreview(owner) } : {}),
    days,
    collaborators: trip.collaborators?.map((collaborator) => {
      const user = collaborator.userId ? getRawUser(collaborator.userId) : undefined;
      return {
        ...clone(collaborator),
        user: user ? userPreview(user) : collaborator.user ?? null,
      };
    }),
  };
}

export function hydrateTemplate(template: TripTemplate): TripTemplate {
  const region = getRawRegion(template.regionId);
  return {
    ...clone(template),
    ...(region ? { region: hydrateRegion(region) } : {}),
  };
}
