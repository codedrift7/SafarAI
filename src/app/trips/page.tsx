import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { TripsDashboard } from "@/components/trips/trips-dashboard";
import { listTrips } from "@/lib/api";
import { getCurrentUserPayload } from "@/server/auth";

export default async function TripsPage() {
  const user = await getCurrentUserPayload();

  if (!user) {
    redirect("/login");
  }

  const cookieStore = await cookies();

  const trips = await listTrips(
    {},
    {
      headers: {
        Cookie: cookieStore.toString(),
      },
    },
  );

  return <TripsDashboard trips={trips} />;
}