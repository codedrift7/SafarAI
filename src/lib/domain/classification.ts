import type {
  Activity,
  ActivityClassification,
  ActivitySource,
} from "./types";

export type { ActivityClassification };

/**
 * Regex patterns for fallback backstop claim detection.
 *
 * NOTE: Price and hours patterns are tailored to Pakistan/US travel conventions
 * (e.g., PKR, Rs., USD, $, am/pm, 24-hr formats) and are not locale-general.
 */

// Price patterns: ~$1/cup, $5, PKR 500, Rs. 200, 1000 rupees, entry fee: 500
const PRICE_PATTERNS = [
  /(?:~\s*)?(?:\$|PKR|Rs\.?|USD|€|£)\s*\d+(?:\.\d+)?(?:\/\w+)?/i,
  /\b\d+(?:\.\d+)?\s*(?:PKR|Rs\.?|rupees?|USD)(?:\/\w+)?/i,
  /\b(?:entry|ticket|admission|fee|cost|price)\s*(?:is|of|:)?\s*(?:about|approx\.?|around|~)?\s*(?:Rs\.?|PKR|\$)?\s*\d+/i,
];

// Hours patterns: 8am–6pm, 8:00 AM - 5:00 PM, 9am to 5pm, open daily at 9am, open 24/7
const HOURS_PATTERNS = [
  /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:-|–|—|to)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i,
  /\b(?:open(?:s|ing)?|close(?:s|d|ing)?)\s+(?:daily|from|at|between)?\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/i,
  /\b(?:open\s+24\/7|24\s*hours)\b/i,
];

// Address patterns: requires street number + street name, or explicit address labels.
// Generic phrases ("explore the bazaar", "the bazaar", "local bazaar") are explicitly NOT matched.
const ADDRESS_PATTERNS = [
  /\b\d+\s+[\w\s,-]{1,25}(?:street|st\.?|road|rd\.?|avenue|ave\.?|boulevard|blvd\.?|lane|ln\.?|sector|block|mohalla)\b/i,
  /\b(?:address|exact location|located at|situated at)\s*:\s*[^.,;\n]+/i,
];

// Specific named place patterns: proper noun venue names (e.g. "Chaikhana Bumburet", "Mountain View Café", "Serena Hotel")
// Does not match generic activities like "tea house", "local bazaar", "rest break", "village walk".
const SPECIFIC_VENUE_PATTERNS = [
  /\b(?:Chaikhana|Dhaba|Hotel|Café|Cafe|Resort|Lodge|Inn|Guest\s*House|Serai)\s+([A-Z][a-z0-9]+)/,
  /\b([A-Z][a-z0-9]+(?:\s+[A-Z][a-z0-9]+)?)\s+(?:Chaikhana|Dhaba|Hotel|Café|Cafe|Resort|Lodge|Inn|Restaurant|Guest\s*House)\b/,
];

function detectClaimsViaRegex(
  title: string,
  notes: string,
  estimatedCost?: number | null,
): { claims: string[]; isHighStakes: boolean } {
  const combinedText = `${title} ${notes}`.trim();
  const detected: string[] = [];
  let isHighStakes = false;

  // 1. Price check (High-Stakes)
  if (estimatedCost != null && estimatedCost > 0) {
    detected.push("price");
    isHighStakes = true;
  } else if (PRICE_PATTERNS.some((pattern) => pattern.test(combinedText))) {
    detected.push("price");
    isHighStakes = true;
  }

  // 2. Hours check (High-Stakes)
  if (HOURS_PATTERNS.some((pattern) => pattern.test(combinedText))) {
    detected.push("hours");
    isHighStakes = true;
  }

  // 3. Address check (Low-Stakes)
  if (ADDRESS_PATTERNS.some((pattern) => pattern.test(combinedText))) {
    detected.push("address");
  }

  // 4. Specific Named Venue check (Low-Stakes)
  if (SPECIFIC_VENUE_PATTERNS.some((pattern) => pattern.test(combinedText))) {
    detected.push("place_name");
  }

  return { claims: detected, isHighStakes };
}

/**
 * Detects whether an activity represents a named market, bazaar, shopping venue,
 * or general public stop/break that has no entry fee or paid ticket attached.
 * Such stops are treated as Tier 2 ('ai_generic') to prevent warning fatigue.
 */
function isNamedMarketOrStopWithoutFee(activity: Activity): boolean {
  const combinedText = `${activity.customTitle ?? ""} ${activity.notes ?? ""}`.trim();

  // If there's an explicit price/fee claim or non-zero estimated cost, it has a fee
  if (activity.estimatedCost != null && activity.estimatedCost > 0) return false;
  if (PRICE_PATTERNS.some((pattern) => pattern.test(combinedText))) return false;
  if (activity.unverifiedClaims?.price) return false;

  // If an explicit street address with street number is given, it's not a generic market/stop
  if (ADDRESS_PATTERNS.some((pattern) => pattern.test(combinedText))) return false;

  // Check if it's a market, shopping venue, bazaar, mall
  const isMarket =
    activity.category === "SHOPPING" ||
    /\b(market|bazaar|bazar|mandi|souk|shopping|mall|arcade|emporium)\b/i.test(combinedText);

  // Check if it's a stop / rest / viewpoint / park / walk
  const isStop =
    activity.category === "REST" ||
    activity.category === "TRANSPORT" ||
    /\b(stop|break|viewpoint|lookout|park|garden|walk|stroll|promenade)\b/i.test(combinedText);

  return isMarket || isStop;
}

/**
 * Classifies an itinerary activity into the three-tier verification system.
 *
 * Tiers:
 * - Tier 1 ('verified'): Linked to verified catalogue POI or curated template editorial stop.
 * - 'custom': Human-authored item with no catalogue link (source === 'user_added').
 * - Tier 2 ('ai_generic'): AI-generated stop with no checkable claims asserted,
 *   or named markets and stops without entry fees.
 * - Tier 3 ('ai_unverified'): AI-generated stop asserting specific checkable claims.
 */
export function classifyActivity(activity: Activity): ActivityClassification {
  const effectiveSource: ActivitySource =
    activity.source ??
    (activity.poiId ? "catalog" : activity.addedByUserId ? "user_added" : "ai_generated");

  // Tier 1: Catalogue-linked (or curated editorial template)
  if (activity.poiId != null || activity.poi != null || effectiveSource === "catalog") {
    return {
      status: "verified",
      tier: 1,
      source: effectiveSource,
      isCustom: false,
      isHighStakes: false,
      claims: [],
    };
  }

  // Human-authored stop (user_added)
  if (effectiveSource === "user_added") {
    return {
      status: "custom",
      tier: 2,
      source: "user_added",
      isCustom: true,
      isHighStakes: false,
      claims: [],
    };
  }

  // Named markets, bazaars, and stops without entry fees resolve to Tier 2 ('ai_generic')
  if (isNamedMarketOrStopWithoutFee(activity)) {
    return {
      status: "ai_generic",
      tier: 2,
      source: "ai_generated",
      isCustom: false,
      isHighStakes: false,
      claims: [],
    };
  }

  // AI-generated stop (source === 'ai_generated')
  // Rule 1: Structured generation-time claims are provided (any non-null object)
  if (activity.unverifiedClaims != null) {
    const c = activity.unverifiedClaims;
    const hasClaims = Boolean(c.placeName || c.address || c.hours || c.price);

    if (hasClaims) {
      const claimsList: string[] = [];
      if (c.placeName) claimsList.push("place_name");
      if (c.address) claimsList.push("address");
      if (c.hours) claimsList.push("hours");
      if (c.price) claimsList.push("price");

      const isHighStakes = Boolean(c.hours || c.price);
      return {
        status: "ai_unverified",
        tier: 3,
        source: "ai_generated",
        isCustom: false,
        isHighStakes,
        claims: claimsList,
      };
    }

    // Explicit non-null claims object with all flags false or {} -> Tier 2, bypass fallback
    return {
      status: "ai_generic",
      tier: 2,
      source: "ai_generated",
      isCustom: false,
      isHighStakes: false,
      claims: [],
    };
  }

  // Rule 2: unverifiedClaims == null -> Fallback backstop via regex detection
  const { claims, isHighStakes } = detectClaimsViaRegex(
    activity.customTitle ?? "",
    activity.notes ?? "",
    activity.estimatedCost,
  );

  if (claims.length > 0) {
    return {
      status: "ai_unverified",
      tier: 3,
      source: "ai_generated",
      isCustom: false,
      isHighStakes,
      claims,
    };
  }

  return {
    status: "ai_generic",
    tier: 2,
    source: "ai_generated",
    isCustom: false,
    isHighStakes: false,
    claims: [],
  };
}
