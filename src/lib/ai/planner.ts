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
}

function candidateSummary(candidatePois: POI[]): string {
  return candidatePois
    .map(
      (poi) =>
        `${poi.id}|${poi.name}|region=${poi.region?.slug ?? poi.regionId}|category=${poi.category}|permit=${poi.requiresPermit}|seasons=${poi.bestSeasons.join(",")}`,
    )
    .join("\n");
}

function systemPrompt(): string {
  return [
    "You are SafarAI itinerary planner.",
    "Only choose POIs from the candidate list by id.",
    "Never include Balochistan or former FATA regions.",
    "If suggesting non-verified stop, set poiId to null and provide customTitle.",
    "If POI requiresPermit=true, include caution note in note.",
  ].join(" ");
}

export async function generateItineraryWithRetry(input: PlannerInput): Promise<GeneratedItineraryArgs> {
  const userContent = [
    `Today: ${input.todayIso}`,
    `Trip dates: ${input.tripDateRange}`,
    `User brief: ${input.userPrompt}`,
    "Candidate POIs:",
    candidateSummary(input.candidatePois),
  ].join("\n");

  const first = await groqClient.chat.completions.create({
    model: env.GROQ_MODEL_GENERATION,
    messages: [
      { role: "system", content: systemPrompt() },
      { role: "user", content: userContent },
    ],
    tools: toolDefinitions as any,
    tool_choice: { type: "function", function: { name: "generate_itinerary" } },
    temperature: 0.2,
  });

  const firstToolCall = first.choices[0]?.message?.tool_calls?.[0];
  const firstArgsRaw = firstToolCall?.function?.arguments ?? "{}";
  const firstParsed = generateItinerarySchema.safeParse(JSON.parse(firstArgsRaw));
  if (firstParsed.success) return firstParsed.data;

  const second = await groqClient.chat.completions.create({
    model: env.GROQ_MODEL_GENERATION,
    messages: [
      { role: "system", content: systemPrompt() },
      { role: "user", content: userContent },
      {
        role: "assistant",
        content: "Your previous tool call had schema errors.",
        tool_calls: [firstToolCall as any],
      },
      {
        role: "user",
        content: `Retry and match schema exactly. Errors: ${firstParsed.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; ")}`,
      },
    ],
    tools: toolDefinitions as any,
    tool_choice: { type: "function", function: { name: "generate_itinerary" } },
    temperature: 0.1,
  });

  const secondToolCall = second.choices[0]?.message?.tool_calls?.[0];
  const secondArgsRaw = secondToolCall?.function?.arguments ?? "{}";
  const secondParsed = generateItinerarySchema.safeParse(JSON.parse(secondArgsRaw));
  if (secondParsed.success) return secondParsed.data;

  throw new Error("Model output failed schema validation after retry.");
}

export async function chatToolCall(input: {
  instruction: string;
  context: string;
}): Promise<{ name: string; args: Record<string, unknown> } | null> {
  const completion = await groqClient.chat.completions.create({
    model: env.GROQ_MODEL_CHAT,
    messages: [
      { role: "system", content: "Choose exactly one tool call to edit itinerary." },
      { role: "user", content: `${input.context}\n${input.instruction}` },
    ],
    tools: chatToolDefinitions as any,
    tool_choice: "required",
    temperature: 0.1,
  });

  const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
  if (!toolCall) return null;
  return {
    name: toolCall.function.name,
    args: JSON.parse(toolCall.function.arguments || "{}"),
  };
}
