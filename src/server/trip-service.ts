import { prisma } from "./db";

export const tripInclude = {
  owner: true,
  collaborators: { include: { user: true } },
  days: {
    include: {
      region: true,
      activities: {
        include: {
          poi: { include: { region: true } },
        },
      },
    },
  },
} as const;

export async function getTripByIdOrSlug(idOrSlug: string) {
  return prisma.trip.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: tripInclude,
  });
}
