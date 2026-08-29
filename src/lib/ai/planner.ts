import type { POI } from "@/lib/domain/types";
import { env } from "@/server/env";
import { groqClient } from "./client";
import {
  chatToolDefinitions,
  generateItinerarySchema,
  toolDefinitions,
  type GeneratedItineraryArgs,
} from "./schemas";

interface PlannerInput {
  userPrompt: string;
  todayIso: string;
  tripDateRange: string;
  candidatePois: POI[];
  // B2: trip preferences threaded into the prompt
  travelerType?: string;
  budgetTier?: string | null;
  pace?: string;
  // B5: vibe and partySize from the Trip record
  vibe?: string | null;
  partySize?: number | null;
}

export class ItineraryGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ItineraryGenerationError";
  }
}

/**
 * Attempt to rescue truncated JSON from Groq's failed_generation.
 * The model produces valid content but runs out of tokens mid-JSON.
 * Strategy: extract the arguments JSON, then try to close incomplete structures
 * by trimming back to the last complete activity/day and closing brackets.
 */
function rescueTruncatedJson(failedGeneration: string): Record<string, unknown> | null {
  try {
    // The failed_generation format is: {"name": "generate_itinerary", "arguments": {...}}
    // Extract just the arguments part
    let argsStr = failedGeneration;

    // Try to find the arguments object start
    const argsMatch = failedGeneration.match(/"arguments"\s*:\s*(\{[\s\S]*)/);
    if (argsMatch) {
      argsStr = argsMatch[1];
    }

    // Try parsing as-is first (maybe it's valid)
    try {
      return JSON.parse(argsStr);
    } catch {
      // Expected — it's truncated
    }

    // Strategy: find the last complete activity object (ends with "}")
    // then close all open structures
    // Find the last complete activity (look for the pattern: "note": "..."\n        }
    const lastCompleteActivity = argsStr.lastIndexOf('"note":');
    if (lastCompleteActivity === -1) return null;

    // Find the closing brace of this activity's note string + object
    let pos = lastCompleteActivity;
    // Find the end of the note value (closing quote)
    let inString = false;
    let escaped = false;
    for (let i = pos + 7; i < argsStr.length; i++) {
      if (escaped) { escaped = false; continue; }
      if (argsStr[i] === '\\') { escaped = true; continue; }
      if (argsStr[i] === '"') {
        if (!inString) { inString = true; } else {
          // Found the closing quote of the note value
          pos = i + 1;
          break;
        }
      }
    }

    // Now we have up to the end of the last complete note value
    // Trim and close: activity object, activities array, day object, days array, root object
    let trimmed = argsStr.substring(0, pos).trimEnd();

    // Remove any trailing comma
    if (trimmed.endsWith(',')) trimmed = trimmed.slice(0, -1);

    // Close the structures: } (activity) ] (activities) } (day) ] (days) } (root)
    trimmed += '}]}]}';

    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.days && Array.isArray(parsed.days) && parsed.days.length > 0) {
        console.log(`[planner] Rescued ${parsed.days.length} days from truncated output`);
        return parsed;
      }
    } catch {
      // Rescue failed
    }

    return null;
  } catch {
    return null;
  }
}

// Cap free-text fields so a handful of long descriptions/safety notes can't blow the
// per-POI token budget. Model gets enough to write a grounded note, not the full record.
const MAX_DESC_CHARS = 140;
const MAX_SAFETY_CHARS = 90;
const MAX_PERMIT_NOTE_CHARS = 60;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

// B1: Serialize just enough of each POI for the model to write a grounded, specific
// activity note — one compact line per POI instead of a multi-line block. Region
// description/typicalTripDays and per-POI "Verified" stamps were dropped: they added
// ~2 lines/POI across up to CANDIDATE_TARGET (80) POIs without changing what the model
// needs to decide (region name + province is enough; unverified-handling is covered
// once in the system prompt, not restated per candidate).
function candidateSummary(candidatePois: POI[]): string {
  return candidatePois
    .map((poi) => {
      const parts: string[] = [
        `[${poi.id}] ${poi.name} (${poi.category}) — ${poi.region?.name ?? poi.regionId}${poi.region?.province ? `, ${poi.region.province}` : ""}`,
      ];

      if (poi.description) {
        parts.push(truncate(poi.description, MAX_DESC_CHARS));
      }

      const meta = [
        `Seasons: ${poi.bestSeasons.join(",")}`,
        poi.avgVisitHours != null ? `~${poi.avgVisitHours}h` : "",
        poi.altitudeMeters != null ? `${poi.altitudeMeters}m alt` : "",
        poi.roadCondition ? `Road: ${poi.roadCondition}` : "",
        poi.entryFeePkr != null ? `${poi.entryFeePkr} PKR` : "Free",
        !poi.verifiedAt ? "UNVERIFIED" : "",
      ]
        .filter(Boolean)
        .join(" | ");
      if (meta) parts.push(meta);

      if (poi.safetyNotes) {
        parts.push(`Safety: ${truncate(poi.safetyNotes, MAX_SAFETY_CHARS)}`);
      }

      if (poi.requiresPermit) {
        const permitParts = ["PERMIT REQUIRED"];
        if (poi.permitAuthority) permitParts.push(poi.permitAuthority);
        if (poi.permitNotes) permitParts.push(truncate(poi.permitNotes, MAX_PERMIT_NOTE_CHARS));
        parts.push(permitParts.join(" — "));
      }

      return parts.join(" | ");
    })
    .join("\n");
}

function systemPrompt(input: PlannerInput): string {
  const parts = [
    "You are SafarAI itinerary planner for trips in Pakistan.",
    "Only choose POIs from the candidate list by id.",
    "Never include Balochistan or former FATA regions.",
    "If suggesting a non-verified stop, set poiId to null and provide customTitle.",
    "If POI requiresPermit=true, mention it in the note.",
    // B3: Reinforce note requirement
    "Every activity MUST have a note field: 1–2 sentences on what the place is and why it is worth stopping. Include a practical tip (fee, permit, road condition, duration) when the data is in the candidate list. Never leave note blank.",
    // Layer 1: Gap prevention — threshold matches gap-filler.ts getPaceThreshold()
    `Avoid gaps longer than ${input.pace === "packed" ? 60 : input.pace === "relaxed" ? 120 : 90} minutes between activities. If there is idle time between two stops, insert a nearby candidate POI as a filler — prefer walkable stops and choose ONLY from the candidate list by id (never invent a POI). Check avgVisitHours to estimate duration. For packed pace, fill ALL gaps. For relaxed pace, gaps up to 2 hours are acceptable only if you insert a REST activity (category REST, poiId omitted) to cover them.`,
  ];

  // B2: Inject trip preferences so the model adapts output accordingly
  if (input.travelerType) {
    parts.push(`Traveler type: ${input.travelerType}.`);
  }
  if (input.budgetTier) {
    const budgetHint =
      input.budgetTier === "BUDGET"
        ? "Prefer free or low-cost venues. Avoid luxury options."
        : input.budgetTier === "LUXURY"
          ? "Prefer premium venues and experiences where available."
          : "Mix of affordable and mid-range venues.";
    parts.push(`Budget tier: ${input.budgetTier} — ${budgetHint}`);
  }
  if (input.pace) {
    const paceHint =
      input.pace === "packed"
        ? "Schedule more stops per day; minimize rest gaps."
        : input.pace === "relaxed"
          ? "Fewer stops, longer visits, include rest time."
          : "Balanced mix of activity and rest.";
    parts.push(`Pace: ${input.pace} — ${paceHint}`);
  }
  if (input.partySize && input.partySize > 1) {
    parts.push(`Party size: ${input.partySize} people — factor in group logistics.`);
  }
  // B5: vibe is the most direct style signal — include it verbatim
  if (input.vibe) {
    parts.push(`Trip vibe / mood: "${input.vibe}" — let this guide the tone and venue selection.`);
  }

  return parts.join(" ");
}

type ParseResult =
  | { success: true; data: GeneratedItineraryArgs }
  | { success: false; errorSummary: string };

function parseAndValidate(argsRaw: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(argsRaw);
  } catch {
    return { success: false, errorSummary: "response was not valid JSON" };
  }
  const parsed = generateItinerarySchema.safeParse(json);
  if (parsed.success) return { success: true, data: parsed.data };
  return {
    success: false,
    errorSummary: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
  };
}

export async function generateItineraryWithRetry(input: PlannerInput): Promise<GeneratedItineraryArgs> {
  const preferencesSummary = [
    input.travelerType ? `Traveler: ${input.travelerType}` : "",
    input.budgetTier ? `Budget: ${input.budgetTier}` : "",
    input.pace ? `Pace: ${input.pace}` : "",
    input.partySize ? `Party size: ${input.partySize}` : "",
    input.vibe ? `Vibe: "${input.vibe}"` : "",
  ]
    .filter(Boolean)
    .join(" | ");

  const userContent = [
    `Today: ${input.todayIso}`,
    `Trip dates: ${input.tripDateRange}`,
    preferencesSummary ? `Preferences: ${preferencesSummary}` : "",
    `User brief: ${input.userPrompt}`,
    "Candidate POIs:",
    candidateSummary(input.candidatePois),
  ]
    .filter(Boolean)
    .join("\n");

  // Dynamic max_tokens: Groq bills (input_tokens + max_tokens) against a hard per-model
  // ceiling (8 000 for openai/gpt-oss-120b).  Estimate input size at ~1 token per 4 chars,
  // then compute how much headroom remains — capped at 6 500 so we never request a
  // completion budget larger than the model can actually fill.
  //
  // Example results:
  //   Hunza (8 POIs,  ~1 200 input tokens) → max_tokens = 6 500  (total ≈ 7 700 ✅)
  //   All 78 POIs     (~5 800 input tokens) → max_tokens = 2 000  (total ≈ 7 800 ✅)
  const sysLen = systemPrompt(input).length;
  const estimatedInputTokens = Math.round((sysLen + userContent.length + 1462 /* tool JSON */) / 4);
  const dynamicMaxTokens = Math.min(6500, Math.max(1000, 7800 - estimatedInputTokens));
  console.log("[planner] token budget", { estimatedInputTokens, dynamicMaxTokens });

  let first;
  try {
    first = await groqClient.chat.completions.create({
      model: env.GROQ_MODEL_GENERATION,
      messages: [
        { role: "system", content: systemPrompt(input) },
        { role: "user", content: userContent },
      ],
      tools: toolDefinitions as any,
      tool_choice: { type: "function", function: { name: "generate_itinerary" } },
      temperature: 0.2,
      max_tokens: dynamicMaxTokens,
    });
  } catch (err: any) {
    console.error("[planner] First API call failed:", {
      status: err?.status,
      code: err?.code,
      message: err?.message,
      model: env.GROQ_MODEL_GENERATION,
    });

    // When the model runs out of tokens, Groq returns a 400 with the truncated JSON
    // in err.error.failed_generation. Try to rescue it.
    if (err?.status === 400 && err?.error?.failed_generation) {
      console.log("[planner] Attempting to rescue truncated JSON from failed_generation...");
      const rescued = rescueTruncatedJson(err.error.failed_generation);
      if (rescued) {
        const result = parseAndValidate(JSON.stringify(rescued));
        if (result.success) {
          console.log("[planner] Successfully rescued truncated generation!");
          return result.data;
        }
        console.warn("[planner] Rescued JSON failed validation:", result.errorSummary);
      }
      throw new ItineraryGenerationError(`Model output was truncated (token limit). Try a shorter trip or fewer days.`);
    }
    if (err?.status === 400) {
      throw new ItineraryGenerationError(`Model produced invalid tool call JSON: ${err.message}`);
    }
    throw err;
  }

  const firstToolCall = first.choices[0]?.message?.tool_calls?.[0];

  console.log("[planner] First call result:", {
    model: env.GROQ_MODEL_GENERATION,
    hasToolCall: !!firstToolCall,
    finishReason: first.choices[0]?.finish_reason,
    toolCallName: firstToolCall?.function?.name,
    argsLength: firstToolCall?.function?.arguments?.length ?? 0,
  });

  // BUG2: If the model returned no tool call at all, fail immediately rather than
  // sending tool_calls:[undefined] to the retry (which itself causes a 400).
  if (!firstToolCall) {
    throw new ItineraryGenerationError("Model returned no tool call on first attempt");
  }

  const firstArgsRaw = firstToolCall.function.arguments ?? "{}";
  const firstResult = parseAndValidate(firstArgsRaw);
  if (firstResult.success) return firstResult.data;

  let second;
  try {
    second = await groqClient.chat.completions.create({
      model: env.GROQ_MODEL_GENERATION,
      messages: [
        { role: "system", content: systemPrompt(input) },
        { role: "user", content: userContent },
        {
          role: "assistant",
          content: "Your previous tool call had schema errors.",
          tool_calls: [firstToolCall as any],
        },
        {
          role: "user",
          content: `Retry and match schema exactly. Errors: ${firstResult.errorSummary}`,
        },
      ],
      tools: toolDefinitions as any,
      tool_choice: { type: "function", function: { name: "generate_itinerary" } },
      temperature: 0.1,
      max_tokens: dynamicMaxTokens, // same budget as first call
    });
  } catch (err: any) {
    // Same rescue logic for retry
    if (err?.status === 400 && err?.error?.failed_generation) {
      console.log("[planner] Retry truncated — attempting rescue...");
      const rescued = rescueTruncatedJson(err.error.failed_generation);
      if (rescued) {
        const result = parseAndValidate(JSON.stringify(rescued));
        if (result.success) {
          console.log("[planner] Successfully rescued retry truncated generation!");
          return result.data;
        }
      }
      throw new ItineraryGenerationError(`Model output was truncated on retry. Try a shorter trip.`);
    }
    if (err?.status === 400) {
      throw new ItineraryGenerationError(`Model produced invalid tool call JSON on retry: ${err.message}`);
    }
    throw err;
  }

  const secondToolCall = second.choices[0]?.message?.tool_calls?.[0];
  const secondArgsRaw = secondToolCall?.function?.arguments ?? "{}";
  const secondResult = parseAndValidate(secondArgsRaw);
  if (secondResult.success) return secondResult.data;

  throw new ItineraryGenerationError(
    `Model output failed schema validation after retry: ${secondResult.errorSummary}`,
  );
}

function chatSystemPrompt(): string {
  return [
    "Choose exactly one tool call to edit the itinerary.",
    "For swap_activity, replacementCriteria must be exactly one of the POI category values defined in that tool's schema — map the user's natural-language request (e.g. 'something outdoors', 'more food nearby') onto the single closest category. Do not invent a value outside that list.",
  ].join(" ");
}

export async function chatToolCall(input: {
  instruction: string;
  context: string;
}): Promise<{ name: string; args: Record<string, unknown> } | null> {
  const completion = await groqClient.chat.completions.create({
    model: env.GROQ_MODEL_CHAT,
    messages: [
      { role: "system", content: chatSystemPrompt() },
      { role: "user", content: `${input.context}\n${input.instruction}` },
    ],
    tools: chatToolDefinitions as any,
    tool_choice: "required",
    temperature: 0.1,
  });

  const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
  if (!toolCall) return null;

  // BUG3: guard JSON.parse — invalid arguments string must not throw out of this function
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(toolCall.function.arguments || "{}");
  } catch {
    return null;
  }

  return { name: toolCall.function.name, args };
}