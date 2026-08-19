import { prisma } from "@/server/db";
import { jsonError, jsonOk } from "@/server/http";
import { parseJson } from "@/server/route-utils";
import { useTemplateSchema } from "@/server/validators";
import { tripInclude } from "@/server/trip-service";
import { toTrip } from "@/server/serialize";
import { requireAuth } from "@/server/auth";

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 70);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parsed = await parseJson(request, useTemplateSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await params;
  const template = await prisma.tripTemplate.findUnique({ where: { id } });
  if (!template) return jsonError("Template not found", 404);

  const startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : new Date();
  const days = ((template.itineraryJson as any)?.days ?? []) as any[];

  const trip = await prisma.trip.create({
    data: {
      ownerId: auth.payload.sub,
      title: parsed.data.title || template.title,
      slug: `${slugify(parsed.data.title || template.title)}-${Date.now().toString(36)}`,
      startDate,
      endDate: new Date(startDate.getTime() + Math.max(1, template.durationDays - 1) * 86400000),
      travelerType: "FRIENDS",
      budgetTier: template.priceTier,
      status: "PLANNING",
      pace: "balanced",
      coverImageUrl: template.coverImageUrl,
      days: {
        create: days.map((day, dayIndex) => ({
          dayNumber: day.dayNumber ?? dayIndex + 1,
          date: new Date(startDate.getTime() + dayIndex * 86400000),
          regionId: day.regionId ?? template.regionId,
          notes: day.notes ?? null,
          activities: {
            create: (day.activities ?? []).map((activity: any, activityIndex: number) => ({
              poiId: activity.poiId ?? null,
              customTitle: activity.customTitle ?? null,
              category: activity.category,
              startTime: activity.startTime ?? null,
              endTime: activity.endTime ?? null,
              notes: activity.notes ?? null,
              estimatedCost: activity.estimatedCost ?? null,
              costCurrency: activity.costCurrency ?? "PKR",
              orderIndex: activityIndex,
            })),
          },
        })),
      },
    },
    include: tripInclude,
  });

  await prisma.tripTemplate.update({
    where: { id: template.id },
    data: { usageCount: { increment: 1 } },
  });

  return jsonOk(toTrip(trip));
}