import { notFound } from "next/navigation";
import { TripItinerary } from "@/components/trips/trip-itinerary";
import { getChatHistory, getTrip, getTripAdvisories } from "@/lib/api";

export default async function TripPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const trip = await getTrip(tripId);
  if (!trip) notFound();
  const [messages, advisories] = await Promise.all([getChatHistory(tripId), getTripAdvisories(tripId)]);
  return <TripItinerary initialTrip={trip} initialMessages={messages} initialAdvisories={advisories} />;
}
