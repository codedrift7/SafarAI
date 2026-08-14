import { DestinationList } from "@/components/destinations/destination-list";
import { listRegions } from "@/lib/api";

export default async function DestinationsPage() {
  return <DestinationList regions={await listRegions()} />;
}
