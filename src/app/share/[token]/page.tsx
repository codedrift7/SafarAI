import { notFound } from "next/navigation";
import { TripItinerary } from "@/components/trips/trip-itinerary";
import { getSharedTrip, getTripAdvisories } from "@/lib/api";

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const trip = await getSharedTrip(token);
  if (!trip) notFound();
  return <TripItinerary initialTrip={trip} initialAdvisories={await getTripAdvisories(trip.id)} readOnly />;
}
