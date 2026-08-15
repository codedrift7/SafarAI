import { prisma } from "@/server/db";
import { jsonOk } from "@/server/http";
import { toRegionDto } from "@/server/serialize";
import { cacheGetJson, cacheSetJson } from "@/server/cache";

export async function GET() {
  const cacheKey = "regions:all";
  const cached = await cacheGetJson<any[]>(cacheKey);
  if (cached) return jsonOk(cached);

  const regions = await prisma.region.findMany({ orderBy: { name: "asc" } });
  const dto = regions.map(toRegionDto);
  await cacheSetJson(cacheKey, dto, 60 * 30);
  return jsonOk(dto);
}
