import { enqueuePdfExport, getPdfResult } from "@/server/queue";
import { env } from "@/server/env";
import { jsonOk } from "@/server/http";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shareUrl = `${env.CLIENT_URL}/trips/${id}`;
  const jobId = await enqueuePdfExport({ tripId: id, targetUrl: shareUrl });

  const started = Date.now();
  let pdf: Buffer | null = null;
  while (!pdf && Date.now() - started < 20000) {
    pdf = await getPdfResult(jobId);
    if (!pdf) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  if (!pdf) {
    return jsonOk({ status: "queued", jobId }, { status: 202 });
  }

  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="trip-${id}.pdf"`,
    },
  });
}
