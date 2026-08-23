import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const itineraryActivitySchema = z.object({
  poiId: z.string().nullable().optional(),
  customTitle: z.string().nullable().optional(),
  category: z.enum([
    "SIGHTSEEING",
    "FOOD",
    "TRANSPORT",
    "LODGING",
    "REST",
    "ADVENTURE",
    "SHOPPING",
    "RELIGIOUS",
  ]),
  startTime: z.string().regex(timeRegex),
  endTime: z.string().regex(timeRegex),
  // B3: note is required and must be non-empty — no more silent empty strings
  note: z.string().min(1),
});

export const itineraryDaySchema = z.object({
  dayNumber: z.number().int().min(1),
  regionSlug: z.string().optional().default(""),
  activities: z.array(itineraryActivitySchema).min(1),
});

export const generateItinerarySchema = z.object({
  days: z.array(itineraryDaySchema).min(1),
});

export type GeneratedItineraryArgs = z.infer<typeof generateItinerarySchema>;

export const toolDefinitions = [
  {
    type: "function",
    function: {
      name: "generate_itinerary",
      description:
        "Generate a day-by-day itinerary using only the candidate POIs provided in context. " +
        "For every activity, `note` is required and must be 1–2 sentences explaining what the place is " +
        "and why it is worth stopping there. Include a practical tip (entry fee, permit requirement, " +
        "visit duration, safety note, or road condition) when the data is available. Do not leave `note` blank.",
      parameters: {
        type: "object",
        properties: {
          days: {
            type: "array",
            items: {
              type: "object",
              properties: {
                dayNumber: { type: "integer" },
                regionSlug: { type: "string" },
                activities: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      poiId: { type: "string", description: "ID of a candidate POI, or omit if suggesting an unverified stop" },
                      customTitle: { type: "string", description: "Title for unverified stops (when poiId is omitted)" },
                      category: {
                        type: "string",
                        enum: [
                          "SIGHTSEEING",
                          "FOOD",
                          "TRANSPORT",
                          "LODGING",
                          "REST",
                          "ADVENTURE",
                          "SHOPPING",
                          "RELIGIOUS",
                        ],
                      },
                      startTime: { type: "string", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" },
                      endTime: { type: "string", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" },
                      // B3: note is in required[] and described as mandatory prose
                      note: {
                        type: "string",
                        description:
                          "1–2 sentences: what the place is and why it is worth the stop. " +
                          "Add a practical tip (fee, permit, duration, safety note) when available. Required.",
                      },
                    },
                    required: ["category", "startTime", "endTime", "note"],
                  },
                },
              },
              required: ["dayNumber", "activities"],
            },
          },
        },
        required: ["days"],
      },
    },
  },
] as const;

export const chatToolDefinitions = [
  {
    type: "function",
    function: {
      name: "add_activity",
      description: "Add one activity to a day",
      parameters: {
        type: "object",
        properties: {
          tripDayId: { type: "string" },
          poiId: { type: "string" },
          customTitle: { type: "string" },
          category: { type: "string" },
          startTime: { type: "string" },
          endTime: { type: "string" },
          afterActivityId: { type: "string" },
        },
        required: ["tripDayId", "category", "startTime", "endTime"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remove_activity",
      description: "Remove one activity",
      parameters: {
        type: "object",
        properties: { activityId: { type: "string" } },
        required: ["activityId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "modify_activity",
      description: "Modify one activity",
      parameters: {
        type: "object",
        properties: {
          activityId: { type: "string" },
          category: { type: "string" },
          startTime: { type: "string" },
          endTime: { type: "string" },
          notes: { type: "string" },
        },
        required: ["activityId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reorder_activities",
      description: "Reorder activities in one day",
      parameters: {
        type: "object",
        properties: {
          tripDayId: { type: "string" },
          orderedActivityIds: { type: "array", items: { type: "string" } },
        },
        required: ["tripDayId", "orderedActivityIds"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "swap_activity",
      description: "Swap one activity with a candidate based on criteria",
      parameters: {
        type: "object",
        properties: {
          activityId: { type: "string" },
          replacementCriteria: {
            type: "string",
            enum: [
              "MOUNTAIN",
              "LAKE",
              "FORT",
              "MOSQUE",
              "SHRINE",
              "MUSEUM",
              "BAZAAR",
              "WATERFALL",
              "NATIONAL_PARK",
              "HILL_STATION",
              "VALLEY",
              "GLACIER",
              "ARCHAEOLOGICAL_SITE",
              "CITY_LANDMARK",
              "RESTAURANT",
              "VIEWPOINT",
            ],
            description:
              "The POI category that best matches what the user wants instead. Map the user's natural-language request (e.g. 'something outdoors', 'more food nearby') onto the single closest category from this list.",
          },
        },
        required: ["activityId", "replacementCriteria"],
      },
    },
  },
] as const;