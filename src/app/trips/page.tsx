import { TripsDashboard } from "@/components/trips/trips-dashboard";
import { listTrips } from "@/lib/api";

export default async function TripsPage() {
  return <TripsDashboard trips={await listTrips()} />;
}
