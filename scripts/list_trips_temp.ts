import { prisma } from '@/server/db';

async function main() {
  // Find a Hunza region trip to test with
  const hunzaRegion = await prisma.region.findFirst({ where: { name: { contains: 'Hunza' } } });
  console.log('Hunza region:', hunzaRegion ? `${hunzaRegion.name} (${hunzaRegion.id}, slug: ${hunzaRegion.slug})` : 'NOT FOUND');
  
  // Find a trip using Hunza or any existing trip to test with
  const trips = await prisma.trip.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { 
      owner: { select: { id: true, email: true } },
    },
  });
  
  console.log('\nRecent trips:');
  for (const t of trips) {
    console.log(`  ${t.id} - "${t.title}" - status:${t.status} - owner:${t.owner.email}`);
    console.log(`    dates: ${t.startDate?.toISOString().slice(0, 10)} → ${t.endDate?.toISOString().slice(0, 10)}`);
  }

  // Find users for auth
  const users = await prisma.user.findMany({ take: 3, select: { id: true, email: true } });
  console.log('\nUsers:', users.map(u => `${u.email} (${u.id})`).join(', '));

  await prisma.$disconnect();
}
main().catch((e: unknown) => { console.error(e); process.exit(1); });
