import { prisma } from "@/server/db";
import { jsonOk } from "@/server/http";
import { poiQuerySchema } from "@/server/validators";
import { toPoiDto } from "@/server/serialize";
import { cacheGetJson, cacheSetJson } from "@/server/cache";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = poiQuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
  const cacheKey = `pois:${url.searchParams.toString()}`;
  const cached = await cacheGetJson<any[]>(cacheKey);
  if (cached) return jsonOk(cached);

  const regionKey = query.region ?? query.regionId;
  const region = regionKey
    ? await prisma.region.findFirst({ where: { OR: [{ id: regionKey }, { slug: regionKey }] } })
    : null;

  const pois = await prisma.pOI.findMany({
    where: {
      regionId: region ? region.id : undefined,
      category: query.category as any,
      bestSeasons: query.season ? { has: query.season } : undefined,
      requiresPermit: query.requiresPermit ? query.requiresPermit === "true" : undefined,
      OR: query.query
        ? [
            { name: { contains: query.query, mode: "insensitive" } },
            { description: { contains: query.query, mode: "insensitive" } },
          ]
        : undefined,
    },
    include: { region: true },
    orderBy: { name: "asc" },
  });

  const dto = pois.map(toPoiDto);
  await cacheSetJson(cacheKey, dto, 60 * 30);
  return jsonOk(dto);
}
