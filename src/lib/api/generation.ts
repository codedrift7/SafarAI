import type {
  ChatMessage,
  ChatStreamEvent,
  GenerateItineraryInput,
  ItineraryStreamEvent,
  SendChatMessageInput,
} from "@/lib/domain/types";
import { apiUrl, parseSse, fetchJson } from "./utils";

type GenerateOptions = Omit<GenerateItineraryInput, "tripId">;

type ChatInput = Omit<SendChatMessageInput, "tripId">;

function normaliseGenerationInput(
  inputOrTripId: GenerateItineraryInput | string,
  options?: GenerateOptions,
): GenerateItineraryInput {
  return typeof inputOrTripId === "string"
    ? { tripId: inputOrTripId, ...(options ?? {}) }
    : inputOrTripId;
}

export function generateItinerary(input: GenerateItineraryInput): AsyncGenerator<ItineraryStreamEvent>;
export function generateItinerary(
  tripId: string,
  options?: GenerateOptions,
): AsyncGenerator<ItineraryStreamEvent>;
export async function* generateItinerary(
  inputOrTripId: GenerateItineraryInput | string,
  options?: GenerateOptions,
): AsyncGenerator<ItineraryStreamEvent> {
  const payload = normaliseGenerationInput(inputOrTripId, options);
  const response = await fetch(apiUrl(`/api/v1/trips/${payload.tripId}/generate`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      regionSlug: payload.regionSlug,
      prompt: payload.prompt,
      destination: payload.destination,
      startDate: payload.startDate,
      endDate: payload.endDate,
      travelerType: payload.travelerType,
      budgetTier: payload.budgetTier,
      pace: payload.pace,
    }),
    cache: "no-store",
  });

  for await (const event of parseSse<ItineraryStreamEvent>(response)) {
    yield event;
  }
}

function normaliseChatInput(inputOrTripId: SendChatMessageInput | string, content?: string): SendChatMessageInput {
  return typeof inputOrTripId === "string"
    ? { tripId: inputOrTripId, content: content ?? "" }
    : inputOrTripId;
}

export function sendChatMessage(input: SendChatMessageInput): AsyncGenerator<ChatStreamEvent>;
export function sendChatMessage(tripId: string, content: string): AsyncGenerator<ChatStreamEvent>;
export async function* sendChatMessage(
  inputOrTripId: SendChatMessageInput | string,
  maybeContent?: string,
): AsyncGenerator<ChatStreamEvent> {
  const payload = normaliseChatInput(inputOrTripId, maybeContent);
  const response = await fetch(apiUrl(`/api/v1/trips/${payload.tripId}/chat`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: payload.content }),
    cache: "no-store",
  });

  for await (const event of parseSse<ChatStreamEvent>(response)) {
    yield event;
  }
}

export async function getChatHistory(tripId: string): Promise<ChatMessage[]> {
  return fetchJson<ChatMessage[]>(`/api/v1/trips/${tripId}/chat/history`);
}
