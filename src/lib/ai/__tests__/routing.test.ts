/**
 * Unit tests for src/lib/ai/routing.ts
 *
 * Uses Node.js built-in test runner (node:test + node:assert).
 * Run with: npm test
 *
 * All tests mock global fetch to avoid real network calls.
 * OSRM env vars are set before module import via process.env defaults.
 */

import { describe, it, before, after, mock } from "node:test";
import assert from "node:assert/strict";

// ---------------------------------------------------------------------------
// Env bootstrap — must happen before routing.ts is imported, as env.ts reads
// process.env at module evaluation time.
// ---------------------------------------------------------------------------
process.env.OSRM_BASE_URL = "http://osrm.test";
process.env.OSRM_TIMEOUT_MS = "3000";
// Required by env.ts schema:
process.env.DATABASE_URL = "postgresql://test";
process.env.JWT_ACCESS_SECRET = "test-access-secret-xxxxxx";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-xxxxxx";
process.env.GOOGLE_CLIENT_ID = "test-client-id";
process.env.GROQ_API_KEY = "test-groq-key";
process.env.RESEND_API_KEY = "test-resend-key";
process.env.EMAIL_FROM = "test@safar.ai";
process.env.APP_URL = "http://localhost:3000";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFetchMock(response: object, status = 200) {
  return mock.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => response,
  }));
}

function makeActivity(overrides: object = {}) {
  return {
    poiId: null,
    customTitle: null,
    category: "SIGHTSEEING" as const,
    startTime: "09:00",
    endTime: "10:30",
    note: "Test activity",
    ...overrides,
  };
}

function makeDay(dayNumber: number, activities: object[]) {
  return { dayNumber, regionSlug: "", activities } as any;
}

const POI_A = { id: "poi-a", name: "Attabad Lake", latitude: 36.3269, longitude: 74.8605 };
const POI_B = { id: "poi-b", name: "Passu Cones", latitude: 36.4754, longitude: 74.9991 };
const POI_NEAR = { id: "poi-c", name: "Nearby Spot", latitude: 36.3270, longitude: 74.8610 };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getOsrmDuration", () => {
  it("returns drive duration on successful OSRM response", async () => {
    global.fetch = makeFetchMock({ routes: [{ duration: 5400, distance: 48200 }] }) as any;

    // Dynamic import AFTER env is set and fetch is mocked.
    const { getOsrmDuration } = await import("../routing.js");
    const result = await getOsrmDuration(36.3269, 74.8605, 36.4754, 74.9991);

    assert.equal(result, 5400);
  });

  it("returns null when OSRM returns non-200 status", async () => {
    global.fetch = makeFetchMock({}, 503) as any;
    const { getOsrmDuration } = await import("../routing.js");
    const result = await getOsrmDuration(36.0, 74.0, 37.0, 75.0);
    assert.equal(result, null);
  });

  it("returns null when OSRM returns malformed JSON (missing routes)", async () => {
    global.fetch = makeFetchMock({ error: "No route found" }) as any;
    const { getOsrmDuration } = await import("../routing.js");
    const result = await getOsrmDuration(36.1, 74.1, 37.1, 75.1);
    assert.equal(result, null);
  });

  it("returns null on network error (fetch throws)", async () => {
    global.fetch = mock.fn(async () => { throw new Error("Network error"); }) as any;
    const { getOsrmDuration } = await import("../routing.js");
    const result = await getOsrmDuration(36.2, 74.2, 37.2, 75.2);
    assert.equal(result, null);
  });
});

describe("injectTransportLegs", () => {
  it("inserts a TRANSPORT activity between two far POIs", async () => {
    // 90-minute drive between POI_A and POI_B
    global.fetch = makeFetchMock({ routes: [{ duration: 90 * 60, distance: 48000 }] }) as any;

    const { injectTransportLegs } = await import("../routing.js");

    const days = [
      makeDay(1, [
        makeActivity({ poiId: "poi-a", startTime: "09:00", endTime: "10:30", category: "SIGHTSEEING" }),
        makeActivity({ poiId: "poi-b", startTime: "12:30", endTime: "14:00", category: "ADVENTURE" }),
      ]),
    ];

    const { days: result, routingStats } = await injectTransportLegs(days, [POI_A, POI_B]);

    assert.equal(result[0].activities.length, 3, "should have 3 activities (A, TRANSPORT, B)");
    assert.equal(result[0].activities[1].category, "TRANSPORT");
    assert.equal(result[0].activities[1].customTitle, "Drive to Passu Cones");
    assert.ok(result[0].activities[1].note.includes("drive"));
    assert.equal(routingStats.legsInserted, 1);
    assert.equal(routingStats.timeConflicts.length, 0);
  });

  it("shifts subsequent activities when drive exceeds existing gap (within 21:00 ceiling)", async () => {
    // 90-min drive, but only 30-min gap between activities → 60-min overshoot
    global.fetch = makeFetchMock({ routes: [{ duration: 90 * 60, distance: 48000 }] }) as any;

    const { injectTransportLegs } = await import("../routing.js");

    const days = [
      makeDay(1, [
        makeActivity({ poiId: "poi-a", startTime: "09:00", endTime: "10:00", category: "SIGHTSEEING" }),
        makeActivity({ poiId: "poi-b", startTime: "10:30", endTime: "12:00", category: "ADVENTURE" }),
      ]),
    ];

    const { days: result, routingStats } = await injectTransportLegs(days, [POI_A, POI_B]);

    // B should be shifted forward by 60 min (10:30 → 11:30)
    const shifted = result[0].activities.find((a: any) => a.poiId === "poi-b");
    assert.ok(shifted, "POI_B activity should exist");
    assert.equal(shifted!.startTime, "11:30");
    assert.equal(routingStats.daysRescheduled, 1);
    assert.equal(routingStats.timeConflicts.length, 0);
  });

  it("flags a time conflict instead of shifting past 21:00 ceiling", async () => {
    // 3-hour drive. Last activity ends at 20:30. Shift would push to 23:30 → exceeds ceiling.
    global.fetch = makeFetchMock({ routes: [{ duration: 3 * 3600, distance: 200000 }] }) as any;

    const { injectTransportLegs } = await import("../routing.js");

    const days = [
      makeDay(1, [
        makeActivity({ poiId: "poi-a", startTime: "09:00", endTime: "10:00", category: "SIGHTSEEING" }),
        // Only 30 min gap but 3h drive needed; last activity ends at 20:30
        makeActivity({ poiId: "poi-b", startTime: "10:30", endTime: "20:30", category: "ADVENTURE" }),
      ]),
    ];

    const { days: result, routingStats } = await injectTransportLegs(days, [POI_A, POI_B]);

    assert.equal(routingStats.timeConflicts.length, 1);
    assert.equal(routingStats.timeConflicts[0].from, "Attabad Lake");
    assert.equal(routingStats.timeConflicts[0].to, "Passu Cones");
    assert.equal(routingStats.daysRescheduled, 0);
    // B should NOT have been shifted
    const bActivity = result[0].activities.find((a: any) => a.poiId === "poi-b");
    assert.equal(bActivity!.startTime, "10:30");
  });

  it("does not insert TRANSPORT for sub-15-minute drives", async () => {
    // 10-minute drive — below MIN_DRIVE_SECONDS threshold
    global.fetch = makeFetchMock({ routes: [{ duration: 10 * 60, distance: 5000 }] }) as any;

    const { injectTransportLegs } = await import("../routing.js");

    const days = [
      makeDay(1, [
        makeActivity({ poiId: "poi-a", startTime: "09:00", endTime: "10:00", category: "SIGHTSEEING" }),
        makeActivity({ poiId: "poi-c", startTime: "10:15", endTime: "11:30", category: "SIGHTSEEING" }),
      ]),
    ];

    const { days: result, routingStats } = await injectTransportLegs(days, [POI_A, POI_NEAR]);

    assert.equal(result[0].activities.length, 2, "no TRANSPORT should be inserted");
    assert.equal(routingStats.legsInserted, 0);
  });

  it("records skipped pair when OSRM returns null", async () => {
    global.fetch = makeFetchMock({}, 503) as any;

    const { injectTransportLegs } = await import("../routing.js");

    // Unique coords — different from POI_A/POI_B to avoid the in-process cache
    // populated by earlier tests that used those same coords with a successful response.
    const POI_X = { id: "poi-x", name: "Sost", latitude: 36.7000, longitude: 75.4000 };
    const POI_Y = { id: "poi-y", name: "Khunjerab Pass", latitude: 36.8461, longitude: 75.4264 };

    const days = [
      makeDay(1, [
        makeActivity({ poiId: "poi-x", startTime: "09:00", endTime: "10:30", category: "SIGHTSEEING" }),
        makeActivity({ poiId: "poi-y", startTime: "12:30", endTime: "14:00", category: "ADVENTURE" }),
      ]),
    ];

    const { days: result, routingStats } = await injectTransportLegs(days, [POI_X, POI_Y]);

    assert.equal(result[0].activities.length, 2, "no TRANSPORT when OSRM fails");
    assert.equal(routingStats.skipped, 1);
    assert.equal(routingStats.legsInserted, 0);
  });

  it("returns original days unchanged when OSRM completely fails (null fetch)", async () => {
    global.fetch = mock.fn(async () => { throw new Error("Network error"); }) as any;

    const { injectTransportLegs } = await import("../routing.js");

    // Unique coords — avoids cache hit from earlier successful tests.
    const POI_P = { id: "poi-p", name: "Naltar Valley", latitude: 36.1300, longitude: 74.2700 };
    const POI_Q = { id: "poi-q", name: "Nomal Valley", latitude: 36.2100, longitude: 74.3500 };

    const days = [
      makeDay(1, [
        makeActivity({ poiId: "poi-p", startTime: "09:00", endTime: "10:30", category: "SIGHTSEEING" }),
        makeActivity({ poiId: "poi-q", startTime: "12:30", endTime: "14:00", category: "ADVENTURE" }),
      ]),
    ];

    const { days: result, routingStats } = await injectTransportLegs(days, [POI_P, POI_Q]);

    assert.equal(result[0].activities.length, 2, "no TRANSPORT when fetch throws");
    assert.equal(routingStats.legsInserted, 0);
  });

  it("skips pairs where activities have no poiId", async () => {
    global.fetch = makeFetchMock({ routes: [{ duration: 5400, distance: 48000 }] }) as any;
    const callCount = (global.fetch as any).mock.calls.length;

    const { injectTransportLegs } = await import("../routing.js");

    const days = [
      makeDay(1, [
        // No poiId on first activity — pair should be skipped
        makeActivity({ poiId: null, startTime: "09:00", endTime: "10:30", category: "REST" }),
        makeActivity({ poiId: "poi-b", startTime: "12:30", endTime: "14:00", category: "ADVENTURE" }),
      ]),
    ];

    const { days: result, routingStats } = await injectTransportLegs(days, [POI_A, POI_B]);

    assert.equal(result[0].activities.length, 2, "no TRANSPORT for null-poiId pair");
    assert.equal(routingStats.legsInserted, 0);
    // fetch should not have been called for this pair
    const newCalls = (global.fetch as any).mock.calls.length - callCount;
    assert.equal(newCalls, 0);
  });

  it("populates routingLegKeys with correct dayNumber:startTime keys", async () => {
    global.fetch = makeFetchMock({ routes: [{ duration: 90 * 60, distance: 48000 }] }) as any;

    const { injectTransportLegs } = await import("../routing.js");

    const days = [
      makeDay(2, [
        makeActivity({ poiId: "poi-a", startTime: "09:00", endTime: "10:30", category: "SIGHTSEEING" }),
        makeActivity({ poiId: "poi-b", startTime: "12:30", endTime: "14:00", category: "ADVENTURE" }),
      ]),
    ];

    const { routingLegKeys } = await injectTransportLegs(days, [POI_A, POI_B]);

    // TRANSPORT starts at 10:30 (A's endTime), dayNumber = 2
    assert.ok(routingLegKeys.has("2:10:30"), `Expected key "2:10:30" in routingLegKeys`);
  });
});
