import { prisma } from "@/server/db";
import { jsonOk } from "@/server/http";
import { parseJson } from "@/server/route-utils";
import { inviteSchema } from "@/server/validators";
import { requireAuth } from "@/server/auth";
import { requireTripAccess } from "@/server/trip-service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const access = await requireTripAccess(id, auth.payload.sub, "EDITOR");
  if (!access.ok) return access.response;

  const parsed = await parseJson(request, inviteSchema);
  if (!parsed.ok) return parsed.response;

  // Only an OWNER may grant OWNER-level access. A non-OWNER inviter's requested
  // role is honored as-is (VIEWER/EDITOR) except OWNER, which is capped down to
  // EDITOR — prevents an EDITOR from inviting an ally straight to OWNER.
  const requestedRole = parsed.data.role ?? "EDITOR";
  const role = requestedRole === "OWNER" && access.role !== "OWNER" ? "EDITOR" : requestedRole;

  const collaborator = await prisma.tripCollaborator.create({
    data: {
      tripId: access.trip.id,
      invitedEmail: parsed.data.invitedEmail.toLowerCase(),
      role,
    },
  });

  return jsonOk(collaborator, { status: 201 });
}