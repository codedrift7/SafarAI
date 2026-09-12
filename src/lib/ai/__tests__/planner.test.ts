import assert from "node:assert/strict";
import test from "node:test";
import { rescueTruncatedJson } from "../planner";

test("rescueTruncatedJson drops an incomplete trailing activity", () => {
  const failedGeneration = JSON.stringify({
    name: "generate_itinerary",
    arguments: {
      days: [
        {
          dayNumber: 1,
          activities: [
            {
              category: "SIGHTSEEING",
              startTime: "09:00",
              endTime: "10:00",
              note: "Visit the historic site.",
            },
            {
              category: "FOOD",
              startTime: "10:30",
              endTime: "11:30",
            },
          ],
        },
      ],
    },
  }).slice(0, -1);

  const rescued = rescueTruncatedJson(failedGeneration);

  assert.deepEqual(rescued, {
    days: [
      {
        dayNumber: 1,
        activities: [
          {
            category: "SIGHTSEEING",
            startTime: "09:00",
            endTime: "10:00",
            note: "Visit the historic site.",
          },
        ],
      },
    ],
  });
});