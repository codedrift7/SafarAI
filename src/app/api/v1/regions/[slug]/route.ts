import { prisma } from "@/server/db";
import { jsonError, jsonOk } from "@/server/http";
import { toRegionDto } from "@/server/serialize";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const region = await prisma.region.findFirst({ where: { OR: [{ id: slug }, { slug }] } });
  if (!region) return jsonError("Region not found", 404);
  return jsonOk(toRegionDto(region));
}
