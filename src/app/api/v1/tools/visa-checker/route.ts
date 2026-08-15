import { prisma } from "@/server/db";
import { jsonOk } from "@/server/http";
import { toVisaDto } from "@/server/serialize";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const nationality = (url.searchParams.get("nationality") || "").trim().toUpperCase();
  if (!nationality) {
    return jsonOk({ error: "nationality query parameter is required" }, { status: 422 });
  }

  const guide = await prisma.visaGuide.findUnique({ where: { nationalityCode: nationality } });
  if (guide) {
    return jsonOk(toVisaDto(guide));
  }

  return jsonOk({
    id: `visa-generic-${nationality}`,
    nationalityCode: nationality,
    evisaAvailable: true,
    visaFreeStay: false,
    feeUsdMin: 5,
    feeUsdMax: 50,
    processingDaysMin: 7,
    processingDaysMax: 20,
    notes: "Advisory only. Confirm with official portal.",
    officialLink: "https://visa.nadra.gov.pk/",
    lastVerifiedAt: new Date().toISOString(),
  });
}
