import { prisma } from "@/server/db";
import { jsonOk } from "@/server/http";
import { templatesQuerySchema } from "@/server/validators";
import { toTemplateDto } from "@/server/serialize";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = templatesQuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
  const regionKey = query.region ?? query.regionId;
  const region = regionKey
    ? await prisma.region.findFirst({ where: { OR: [{ id: regionKey }, { slug: regionKey }] } })
    : null;

  const templates = await prisma.tripTemplate.findMany({
    where: {
      regionId: region?.id,
      tags: query.tag ? { has: query.tag } : undefined,
    },
    include: { region: true },
    orderBy: { usageCount: "desc" },
  });

  return jsonOk(templates.map(toTemplateDto));
}
