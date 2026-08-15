import { prisma } from "@/server/db";
import { jsonOk } from "@/server/http";
import { toChatDto } from "@/server/serialize";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const messages = await prisma.chatMessage.findMany({
    where: { tripId: id },
    orderBy: { createdAt: "asc" },
  });
  return jsonOk(messages.map(toChatDto));
}
