import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import type { Region } from "@/lib/domain/types";
import { Badge } from "@/components/ui/badge";

export function DestinationCard({ region, index = 0 }: { region: Region; index?: number }) {
  const isTopPositioned = region.slug === "lahore";
  return <Link href={`/destinations/${region.slug}`} className="group relative isolate min-h-[330px] overflow-hidden rounded-[1.5rem] bg-karakoram-ink p-5 text-sandstone-mist shadow-route-card focus-visible:outline-truck-art-marigold sm:min-h-[390px]">
    {region.heroImageUrl && <div className="absolute inset-0 -z-20 bg-cover transition duration-700 group-hover:scale-105" style={{ backgroundImage: `url(${region.heroImageUrl})`, backgroundPosition: isTopPositioned ? "center top" : "center" }} />}
    <div className="absolute inset-0 -z-10 bg-gradient-to-t from-karakoram-ink via-karakoram-ink/35 to-karakoram-ink/5" />
    <div className="flex h-full flex-col justify-between">
      <div className="flex items-start justify-between gap-3"><Badge variant="marigold">{region.province}</Badge><span className="grid size-9 place-items-center rounded-full border border-white/25 bg-karakoram-ink/20 opacity-0 backdrop-blur transition group-hover:opacity-100"><ArrowUpRight size={18} /></span></div>
      <div><h3 className="display-type text-3xl leading-tight">{region.name}</h3><p className="mt-2 line-clamp-2 max-w-sm text-sm leading-6 text-sandstone-mist/78">{region.description}</p><div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-sandstone-mist/80"><span className="inline-flex items-center gap-1.5"><CalendarDays size={14} className="text-truck-art-marigold" /> {region.bestSeasons.map((season) => season[0] + season.slice(1).toLowerCase()).join(" · ")}</span><span className="inline-flex items-center gap-1.5"><MapPin size={14} className="text-truck-art-marigold" /> {region.typicalTripDays ?? 3} days works well</span></div></div>
    </div>
  </Link>;
}
