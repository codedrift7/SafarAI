import { TripCreationFlow } from "@/components/trips/trip-creation-flow";
import { listRegions } from "@/lib/api";

export default async function NewTripPage({ searchParams }: { searchParams: Promise<{ brief?: string; destination?: string }> }) {
  const [regions, params] = await Promise.all([listRegions(), searchParams]);
  return <TripCreationFlow regions={regions} initialBrief={params.brief} initialDestination={params.destination} />;
}
