"use client";

import { create } from "zustand";
import type { Advisory, ChatMessage, ItineraryStreamEvent, Trip, TripDay } from "@/lib/domain/types";

type GenerationState = "idle" | "preparing" | "streaming" | "complete" | "error";

interface TripState {
  activeTrip: Trip | null;
  streamedDays: TripDay[];
  advisories: Advisory[];
  chatMessages: ChatMessage[];
  generationState: GenerationState;
  generationMessage: string;
  progress: number;
  setTrip: (trip: Trip | null) => void;
  applyItineraryEvent: (event: ItineraryStreamEvent) => void;
  setChatMessages: (messages: ChatMessage[]) => void;
  addChatMessage: (message: ChatMessage) => void;
  reset: () => void;
}

const initialState = {
  activeTrip: null,
  streamedDays: [],
  advisories: [],
  chatMessages: [],
  generationState: "idle" as GenerationState,
  generationMessage: "",
  progress: 0,
};

export const useTripStore = create<TripState>((set) => ({
  ...initialState,
  setTrip: (trip) => set({ activeTrip: trip, streamedDays: trip?.days ?? [], generationState: "idle", progress: 0 }),
  applyItineraryEvent: (event) => set((state) => {
    if (event.type === "status") return { generationState: "preparing", generationMessage: event.message, progress: event.progress };
    if (event.type === "day") {
      const withoutCurrent = state.streamedDays.filter((day) => day.dayNumber !== event.day.dayNumber);
      return { streamedDays: [...withoutCurrent, event.day].sort((a, b) => a.dayNumber - b.dayNumber), advisories: [...state.advisories, ...event.advisories], generationState: "streaming", generationMessage: `Day ${event.day.dayNumber} is ready`, progress: event.progress };
    }
    if (event.type === "complete") return { activeTrip: event.trip, streamedDays: event.trip.days, generationState: "complete", generationMessage: "Your route is ready.", progress: 100 };
    return { generationState: "error", generationMessage: event.message, progress: event.progress };
  }),
  setChatMessages: (messages) => set({ chatMessages: messages }),
  addChatMessage: (message) => set((state) => ({ chatMessages: [...state.chatMessages, message] })),
  reset: () => set(initialState),
}));
