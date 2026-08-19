import { enqueuePdfExport, getPdfResult } from "@/server/queue";
import { env } from "@/server/env";
import { jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { requireTripAccess } from "@/server/trip-service";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const access = await requireTripAccess(id, auth.payload.sub, "VIEWER");
  if (!access.ok) return access.response;

  const existingJobId = new URL(request.url).searchParams.get("jobId");

  const jobId = existingJobId ?? (await enqueuePdfExport({ tripId: id, targetUrl: `${env.CLIENT_URL}/trips/${id}` }));

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

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="trip-${id}.pdf"`,
    },
  });
}