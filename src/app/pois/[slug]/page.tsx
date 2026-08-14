import { notFound } from "next/navigation";
import { PoiDetail } from "@/components/pois/poi-detail";
import { getPOI, getPOIAdvisories, listPOIs } from "@/lib/api";

export default async function PoiPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const poi = await getPOI(slug);
  if (!poi) notFound();
  const [nearby, advisories] = await Promise.all([listPOIs({ regionId: poi.regionId }), getPOIAdvisories(poi.id)]);
  return <PoiDetail poi={poi} nearby={nearby.filter((item) => item.id !== poi.id).slice(0, 3)} advisories={advisories} />;
}
