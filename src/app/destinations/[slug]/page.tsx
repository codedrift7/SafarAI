import { notFound } from "next/navigation";
import { DestinationDetail } from "@/components/destinations/destination-detail";
import { getRegion, listPOIs, listTemplates } from "@/lib/api";

export default async function DestinationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const region = await getRegion(slug);
  if (!region) notFound();
  const [pois, templates] = await Promise.all([listPOIs({ region: slug }), listTemplates({ region: slug })]);
  return <DestinationDetail region={region} pois={pois} templates={templates} />;
}
