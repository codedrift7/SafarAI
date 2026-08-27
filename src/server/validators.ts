import { z } from "zod";
import {
  activityCategories,
  budgetTiers,
  collaboratorRoles,
  seasons,
  travelerTypes,
  tripStatuses,
} from "@/lib/domain/types";

export const createTripSchema = z.object({
  title: z.string().min(1).optional(),
  destination: z.string().optional(),
  regionSlug: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  travelerType: z.enum(travelerTypes),
  budgetTier: z.enum(budgetTiers).nullable().optional(),
  pace: z.enum(["relaxed", "balanced", "packed"]).optional(),
  partySize: z.number().int().positive().optional(),
  vibe: z.string().optional(),
  coverImageUrl: z.string().nullable().optional(),
});

export const updateTripSchema = z.object({
  title: z.string().min(1).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  travelerType: z.enum(travelerTypes).optional(),
  budgetTier: z.enum(budgetTiers).nullable().optional(),
  pace: z.enum(["relaxed", "balanced", "packed"]).optional(),
  status: z.enum(tripStatuses).optional(),
  coverImageUrl: z.string().nullable().optional(),
  isPublic: z.boolean().optional(),
  shareToken: z.string().nullable().optional(),
  partySize: z.number().int().positive().optional(),
  vibe: z.string().optional(),
});

export const createActivitySchema = z.object({
  tripDayId: z.string(),
  poiId: z.string().nullable().optional(),
  customTitle: z.string().nullable().optional(),
  category: z.enum(activityCategories),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  estimatedCost: z.number().nullable().optional(),
  costCurrency: z.string().optional(),
  afterActivityId: z.string().optional(),
});

export const updateActivitySchema = z.object({
  poiId: z.string().nullable().optional(),
  customTitle: z.string().nullable().optional(),
  category: z.enum(activityCategories).optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  estimatedCost: z.number().nullable().optional(),
  costCurrency: z.string().optional(),
});

export const reorderSchema = z.object({
  orderedActivityIds: z.array(z.string()).min(1),
});

export const loginSchema = z.object({
  provider: z.enum(["email", "google"]).default("email"),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  idToken: z.string().optional(),
  name: z.string().optional(),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  homeCountry: z.string().optional(),
});

// Both fields below are interpolated directly into the Groq prompt (see src/lib/ai/planner.ts).
// Bounded so a single request can't inflate token cost unboundedly or pad in a large
// injection payload — paired with the per-user AI rate limit in rate-limit.ts.
const AI_TEXT_MAX = 2000;

export const generateSchema = z.object({
  regionSlug: z.string().optional(),
  prompt: z.string().max(AI_TEXT_MAX).optional(),
  destination: z.string().max(200).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  travelerType: z.enum(travelerTypes).optional(),
  budgetTier: z.enum(budgetTiers).nullable().optional(),
  pace: z.enum(["relaxed", "balanced", "packed"]).optional(),
});

export const chatSchema = z.object({
  content: z.string().min(1).max(AI_TEXT_MAX),
});

export const inviteSchema = z.object({
  invitedEmail: z.string().email(),
  role: z.enum(collaboratorRoles).optional(),
});

export const poiQuerySchema = z.object({
  region: z.string().optional(),
  regionId: z.string().optional(),
  category: z.string().optional(),
  season: z.enum(seasons).optional(),
  query: z.string().optional(),
  requiresPermit: z.enum(["true", "false"]).optional(),
});

export const templatesQuerySchema = z.object({
  region: z.string().optional(),
  regionId: z.string().optional(),
  tag: z.string().optional(),
});

export const useTemplateSchema = z.object({
  startDate: z.string().datetime().optional(),
  title: z.string().optional(),
});
