import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Activity, POI } from "../types";
import { classifyActivity } from "../classification";
import { getActivityAdvisories } from "../advisories";

// Mock catalogue POI for testing
const mockCataloguePoi: POI = {
  id: "poi-ayun-valley",
  name: "Ayun Valley",
  slug: "ayun-valley",
  regionId: "region-chitral",
  category: "VALLEY",
  latitude: 35.733,
  longitude: 71.783,
  description: "A lush valley on the way to Kalash valleys.",
  bestSeasons: ["SUMMER", "AUTUMN"],
  altitudeMeters: 1400,
  requiresPermit: false,
  roadCondition: "PAVED",
  photos: [],
  verifiedAt: "2026-08-01T00:00:00.000Z",
};

describe("Three-Tier Itinerary Item Verification & Classification", () => {
  // ---------------------------------------------------------------------------
  // Step 4 Required Test Cases
  // ---------------------------------------------------------------------------

  it("Test Case 1: 'Take a short break at a local tea house' resolves to Tier 2 (ai_generic)", () => {
    const activity: Activity = {
      id: "act-1",
      tripDayId: "day-1",
      poiId: null,
      customTitle: "Take a short break at a local tea house",
      notes: "A pleasant rest stop before continuing the journey.",
      category: "REST",
      orderIndex: 0,
      costCurrency: "PKR",
      source: "ai_generated",
      unverifiedClaims: null, // Legacy / fallback check
    };

    const result = classifyActivity(activity);
    assert.equal(result.tier, 2);
    assert.equal(result.status, "ai_generic");
    assert.equal(result.isCustom, false);
    assert.equal(result.isHighStakes, false);
    assert.equal(result.claims.length, 0);

    // Advisory check: No caution callout generated for generic suggestions
    const advisories = getActivityAdvisories(activity, "2026-06-01", "2026-06-10");
    assert.equal(advisories.length, 0);
  });

  it("Test Case 2: 'Rest at Chaikhana Bumburet, open 8am–6pm, ~$1/cup' resolves to Tier 3 (ai_unverified, high-stakes)", () => {
    const activity: Activity = {
      id: "act-2",
      tripDayId: "day-1",
      poiId: null,
      customTitle: "Rest at Chaikhana Bumburet",
      notes: "Open 8am–6pm, ~$1/cup with local walnut cake.",
      category: "FOOD",
      orderIndex: 1,
      costCurrency: "PKR",
      source: "ai_generated",
      unverifiedClaims: null, // Tests fallback regex detection
    };

    const result = classifyActivity(activity);
    assert.equal(result.tier, 3);
    assert.equal(result.status, "ai_unverified");
    assert.equal(result.isHighStakes, true); // Asserting hours + price
    assert.ok(result.claims.includes("hours"));
    assert.ok(result.claims.includes("price"));
    assert.ok(result.claims.includes("place_name"));

    // Advisory check: Warning advisory generated with isHighStakes = true (expanded callout)
    const advisories = getActivityAdvisories(activity, "2026-06-01", "2026-06-10");
    assert.equal(advisories.length, 1);
    assert.equal(advisories[0].type, "UNVERIFIED");
    assert.equal(advisories[0].isHighStakes, true);
    assert.ok(advisories[0].message.includes("Confirm details locally"));
  });

  it("Test Case 3: 'Ayun Valley... 1,400m... paved road' (catalogue POI) resolves to Tier 1 (verified)", () => {
    const activity: Activity = {
      id: "act-3",
      tripDayId: "day-1",
      poiId: mockCataloguePoi.id,
      poi: mockCataloguePoi,
      category: "SIGHTSEEING",
      orderIndex: 2,
      costCurrency: "PKR",
      source: "catalog",
    };

    const result = classifyActivity(activity);
    assert.equal(result.tier, 1);
    assert.equal(result.status, "verified");
    assert.equal(result.isCustom, false);
    assert.equal(result.isHighStakes, false);

    // Advisory check: Returns verified POI advisories, NO UNVERIFIED advisory
    const advisories = getActivityAdvisories(activity, "2026-06-01", "2026-06-10");
    assert.ok(!advisories.some((a) => a.type === "UNVERIFIED"));
  });

  it("Test Case 4: 'Explore the bazaar' resolves to Tier 2 (ai_generic) without triggering address false-positive", () => {
    const activity: Activity = {
      id: "act-4",
      tripDayId: "day-1",
      poiId: null,
      customTitle: "Explore the bazaar",
      notes: "Stroll through the local bazaar to see handicraft stalls.",
      category: "SHOPPING",
      orderIndex: 3,
      costCurrency: "PKR",
      source: "ai_generated",
      unverifiedClaims: null,
    };

    const result = classifyActivity(activity);
    assert.equal(result.tier, 2);
    assert.equal(result.status, "ai_generic");
    assert.equal(result.claims.length, 0);

    const advisories = getActivityAdvisories(activity, "2026-06-01", "2026-06-10");
    assert.equal(advisories.length, 0);
  });

  it("Test Case 5: Human-authored item with specific place name ('Dinner at Mountain View Café') resolves to 'custom' with NO AI badge", () => {
    const activity: Activity = {
      id: "act-5",
      tripDayId: "day-1",
      poiId: null,
      customTitle: "Dinner at Mountain View Café",
      notes: "Reserved a table on the terrace.",
      category: "FOOD",
      orderIndex: 4,
      costCurrency: "PKR",
      source: "user_added",
      addedByUserId: "user-123",
    };

    const result = classifyActivity(activity);
    assert.equal(result.status, "custom");
    assert.equal(result.isCustom, true);
    assert.equal(result.source, "user_added");

    // Must NOT receive an unverified AI warning callout
    const advisories = getActivityAdvisories(activity, "2026-06-01", "2026-06-10");
    assert.equal(advisories.length, 0);
  });

  // ---------------------------------------------------------------------------
  // Generation-Time Structured Claims vs. Fallback Rules
  // ---------------------------------------------------------------------------

  it("Structured claims rule: Non-null claims object with all flags false ({}) bypasses regex and resolves to Tier 2", () => {
    const activity: Activity = {
      id: "act-6",
      tripDayId: "day-1",
      poiId: null,
      customTitle: "Stroll near Chaikhana Bumburet", // contains venue word, but claims is non-null {}
      category: "SIGHTSEEING",
      orderIndex: 5,
      costCurrency: "PKR",
      source: "ai_generated",
      unverifiedClaims: {}, // Explicitly provided by model with no claims
    };

    const result = classifyActivity(activity);
    assert.equal(result.tier, 2);
    assert.equal(result.status, "ai_generic");
    assert.equal(result.claims.length, 0);
  });

  it("Structured claims rule: Non-null claims object with hours=true resolves to Tier 3 (high-stakes)", () => {
    const activity: Activity = {
      id: "act-7",
      tripDayId: "day-1",
      poiId: null,
      customTitle: "Morning visit to local bakery",
      category: "FOOD",
      orderIndex: 6,
      costCurrency: "PKR",
      source: "ai_generated",
      unverifiedClaims: { hours: true },
    };

    const result = classifyActivity(activity);
    assert.equal(result.tier, 3);
    assert.equal(result.status, "ai_unverified");
    assert.equal(result.isHighStakes, true);
    assert.deepEqual(result.claims, ["hours"]);
  });

  it("Curated template non-POI stops resolve to Tier 1 (verified) as editorial content", () => {
    const activity: Activity = {
      id: "act-template-transfer",
      tripDayId: "day-1",
      poiId: null,
      customTitle: "Private transfer into Karimabad via the Karakoram Highway",
      notes: "Scenic mountain drive with photo stops.",
      category: "TRANSPORT",
      orderIndex: 0,
      costCurrency: "PKR",
      source: "catalog", // Curated editorial template content
    };

    const result = classifyActivity(activity);
    assert.equal(result.tier, 1);
    assert.equal(result.status, "verified");
    assert.equal(result.isCustom, false);

    const advisories = getActivityAdvisories(activity, "2026-06-01", "2026-06-10");
    assert.equal(advisories.length, 0);
  });

  it("Named market without entry fees ('Liberty Market') resolves to Tier 2 (ai_generic) with no caution callout", () => {
    const activity: Activity = {
      id: "act-liberty-market",
      tripDayId: "day-1",
      poiId: null,
      customTitle: "Liberty Market",
      notes: "Shop for souvenirs, fabrics and local crafts at Liberty Market. Open 10 am-9 pm; budget time for bargaining.",
      category: "SHOPPING",
      orderIndex: 3,
      costCurrency: "PKR",
      source: "ai_generated",
      unverifiedClaims: {
        placeName: true,
        hours: true,
        address: true,
      },
    };

    const result = classifyActivity(activity);
    assert.equal(result.tier, 2);
    assert.equal(result.status, "ai_generic");
    assert.equal(result.isHighStakes, false);

    const advisories = getActivityAdvisories(activity, "2026-06-01", "2026-06-10");
    assert.equal(advisories.length, 0);
  });

  it("Named market WITH entry fee resolves to Tier 3 (ai_unverified, high-stakes)", () => {
    const activity: Activity = {
      id: "act-market-with-fee",
      tripDayId: "day-1",
      poiId: null,
      customTitle: "Craft Expo Market",
      notes: "Annual crafts exhibition with entry fee 500 PKR. Open 10am-8pm.",
      category: "SHOPPING",
      orderIndex: 4,
      costCurrency: "PKR",
      source: "ai_generated",
      unverifiedClaims: {
        placeName: true,
        price: true,
        hours: true,
      },
    };

    const result = classifyActivity(activity);
    assert.equal(result.tier, 3);
    assert.equal(result.status, "ai_unverified");
    assert.equal(result.isHighStakes, true);

    const advisories = getActivityAdvisories(activity, "2026-06-01", "2026-06-10");
    assert.equal(advisories.length, 1);
    assert.equal(advisories[0].type, "UNVERIFIED");
  });
});
