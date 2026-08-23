"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, Check, CircleDollarSign, MapPinned, Sparkles } from "lucide-react";
import type { POI, TripTemplate } from "@/lib/domain/types";
import { applyTemplate } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PoiCard } from "@/components/pois/poi-card";

export function TemplateDetail({ template, places }: { template: TripTemplate; places: POI[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const makeTrip = async () => {
    setLoading(true);
    try {
      const trip = await applyTemplate(template.id);
      router.push(`/trips/${trip.id}`);
    } finally { setLoading(false); }
  };
  const isIslamabad = template.regionId === "region-islamabad" || template.id.includes("islamabad");
  const isBottomAnchored = template.regionId === "region-swat-valley" || template.id.includes("swat");
  const isTopAnchored =
    template.id === "template-lahore-layers-of-history" ||
    template.regionId === "region-lahore" ||
    template.id.includes("lahore");
  const positionClass = isIslamabad ? "destination-hero-islamabad" : isBottomAnchored ? "destination-hero-bottom" : isTopAnchored ? "destination-hero-top" : "";
  return <><section className="relative isolate overflow-hidden bg-karakoram-ink px-4 pb-10 pt-12 text-sandstone-mist sm:px-6 sm:pb-20 sm:pt-20 lg:px-8"><div className={`destination-hero absolute inset-0 -z-20 bg-cover bg-center ${positionClass}`} style={{ backgroundImage: template.coverImageUrl ? `url(${template.coverImageUrl})` : undefined }} /><div className="absolute inset-0 -z-10 bg-gradient-to-r from-karakoram-ink/90 via-karakoram-ink/78 to-karakoram-ink/45" /><div className="mx-auto max-w-7xl"><div className="flex flex-wrap gap-1.5 sm:gap-2">{template.tags.map((tag) => <Badge key={tag} variant="marigold">{tag}</Badge>)}</div><h1 className="display-type mt-4 sm:mt-6 max-w-3xl text-3xl leading-[.98] sm:text-5xl lg:text-6xl">{template.title}</h1><p className="mt-4 sm:mt-5 max-w-2xl text-base leading-7 text-sandstone-mist/76 sm:text-lg">{template.description}</p><div className="mt-5 sm:mt-7 flex flex-wrap gap-x-3 sm:gap-x-5 gap-y-2 text-sm text-sandstone-mist/80"><span className="inline-flex items-center gap-2"><CalendarDays size={17} className="text-truck-art-marigold" /> {template.durationDays} days</span><span className="inline-flex items-center gap-2"><MapPinned size={17} className="text-truck-art-marigold" /> {template.region?.name}</span><span className="inline-flex items-center gap-2"><CircleDollarSign size={17} className="text-truck-art-marigold" /> {template.priceTier?.replace("_", " ") ?? "Flexible"}</span></div><Button onClick={makeTrip} disabled={loading} className="mt-6 sm:mt-9" variant="light">{loading ? "Adding to your trips…" : <><Sparkles size={16} /> Use this escape <ArrowRight size={16} /></>}</Button></div></section><section className="bg-sandstone-mist px-4 py-16 sm:px-6 sm:py-20 lg:px-8"><div className="mx-auto max-w-7xl"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.16em] text-truck-art-marigold">What’s inside</p><h2 className="display-type mt-3 text-4xl">A simple, workable arc.</h2></div><ol className="mt-8 grid gap-3 md:grid-cols-2">{template.itineraryJson.days.map((day) => <li key={day.dayNumber} className="rounded-2xl border border-karakoram-ink/12 bg-white p-5"><div className="flex gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-attabad-turquoise text-xs font-bold text-white">{day.dayNumber}</span><div><h3 className="font-bold">Day {day.dayNumber}</h3><p className="mt-1 text-sm leading-6 text-karakoram-ink/70">{day.activities.map((activity) => activity.customTitle ?? places.find((poi) => poi.id === activity.poiId)?.name ?? "A verified stop").join(" · ")}</p></div></div></li>)}</ol></div></section><section className="bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8"><div className="mx-auto max-w-7xl"><p className="text-xs font-bold uppercase tracking-[.16em] text-truck-art-marigold">Places on this route</p><div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{places.slice(0, 6).map((poi) => <PoiCard key={poi.id} poi={poi} />)}</div><p className="mt-8 flex items-center gap-2 text-sm text-karakoram-ink/65"><Check size={16} className="text-meadow" /> You can adjust times and stops after adding this route.</p></div></section></>;
}
