import { enqueuePdfExport, getPdfResult } from "@/server/queue";
import { env } from "@/server/env";
import { jsonOk } from "@/server/http";
import { requireAuth, signRenderToken } from "@/server/auth";
import { requireTripAccess } from "@/server/trip-service";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const access = await requireTripAccess(id, auth.payload.sub, "VIEWER");
  if (!access.ok) return access.response;

  const tripId = access.trip.id;
  const existingJobId = new URL(request.url).searchParams.get("jobId");

  // A2: If this is a poll with an existing jobId, check cache once and return.
  if (existingJobId) {
    const pdf = await getPdfResult(tripId, existingJobId);
    if (pdf) {
      return new Response(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="trip-${id}.pdf"`,
        },
      });
    }
    return jsonOk({ status: "queued", jobId: existingJobId }, { status: 202 });
  }

  // A1c: Mint a render token so Puppeteer can fetch the trip page as this user.
  const renderToken = await signRenderToken(tripId, auth.payload.sub);

  // A2: Enqueue and return 202 immediately — no blocking poll loop.
  const jobId = await enqueuePdfExport({
    tripId,
    targetUrl: `${env.CLIENT_URL}/trips/${tripId}`,
    renderToken,
  });

  return jsonOk({ status: "queued", jobId }, { status: 202 });
}