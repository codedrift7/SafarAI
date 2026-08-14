import Link from "next/link";
import { ArrowUpRight, BadgeAlert, CarFront, Mountain, Navigation } from "lucide-react";
import type { POI } from "@/lib/domain/types";
import { Badge } from "@/components/ui/badge";

const titleCase = (value: string) => value.split("_").map((word) => word[0] + word.slice(1).toLowerCase()).join(" ");

export function PoiCard({ poi }: { poi: POI }) {
  return <Link href={`/pois/${poi.slug}`} className="group overflow-hidden rounded-[1.25rem] border border-karakoram-ink/12 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-route-card">
    <div className="relative h-40 bg-karakoram-ink">
      {poi.photos[0] && <div className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-105" style={{ backgroundImage: `linear-gradient(0deg, rgba(18,35,43,.24), transparent), url(${poi.photos[0]})` }} />}
      <div className="absolute inset-x-4 top-4 flex justify-between gap-2"><Badge variant="marigold">{titleCase(poi.category)}</Badge>{poi.requiresPermit && <Badge variant="alert"><BadgeAlert size={12} /> Permit</Badge>}</div>
    </div>
    <div className="p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="display-type text-2xl leading-tight">{poi.name}</h3><p className="mt-1 text-xs font-semibold text-karakoram-ink/55">{poi.region?.name ?? "Pakistan"}</p></div><ArrowUpRight className="mt-1 shrink-0 text-attabad-turquoise" size={18} /></div><p className="mt-3 line-clamp-2 text-sm leading-6 text-karakoram-ink/68">{poi.description}</p><div className="mt-4 flex flex-wrap gap-x-3 gap-y-2 text-xs text-karakoram-ink/62">{poi.altitudeMeters && <span className="inline-flex items-center gap-1"><Mountain size={14} /> {poi.altitudeMeters.toLocaleString()} m</span>}<span className="inline-flex items-center gap-1">{poi.roadCondition === "FOUR_WD_REQUIRED" ? <CarFront size={14} /> : <Navigation size={14} />}{titleCase(poi.roadCondition)}</span></div></div>
  </Link>;
}
