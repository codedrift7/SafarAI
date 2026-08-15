import { prisma } from "@/server/db";
import { jsonError, jsonOk } from "@/server/http";
import { parseJson } from "@/server/route-utils";
import { inviteSchema } from "@/server/validators";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const parsed = await parseJson(request, inviteSchema);
  if (!parsed.ok) return parsed.response;
  const { id } = await params;

  const trip = await prisma.trip.findFirst({ where: { OR: [{ id }, { slug: id }] } });
  if (!trip) return jsonError("Trip not found", 404);

  const collaborator = await prisma.tripCollaborator.create({
    data: {
      tripId: trip.id,
      invitedEmail: parsed.data.invitedEmail.toLowerCase(),
      role: parsed.data.role ?? "EDITOR",
    },
  });

  return jsonOk(collaborator, { status: 201 });
}
