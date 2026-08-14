"use client";

import { useMemo, useState } from "react";
import type { Region, TripTemplate } from "@/lib/domain/types";
import { PageHero } from "@/components/layout/page-hero";
import { TemplateCard } from "@/components/templates/template-card";

export function TemplateGallery({ templates, regions }: { templates: TripTemplate[]; regions: Region[] }) {
  const [region, setRegion] = useState("all");
  const [tag, setTag] = useState("all");
  const tags = useMemo(() => Array.from(new Set(templates.flatMap((template) => template.tags))), [templates]);
  const displayed = templates.filter((template) => (region === "all" || template.region?.slug === region) && (tag === "all" || template.tags.includes(tag)));
  return <><PageHero eyebrow="Curated escapes" title="Plans with room for the unexpected." description="A few carefully considered ways to see Pakistan, grounded in real places and realistic travel days." /><section className="paper-grain px-4 py-12 sm:px-6 sm:py-16 lg:px-8"><div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-4 rounded-2xl border border-karakoram-ink/12 bg-white p-4 sm:flex-row sm:items-center"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-attabad-turquoise">Filter routes</p><p className="mt-1 text-sm text-karakoram-ink/65">{displayed.length} escape{displayed.length === 1 ? "" : "s"} to make your own.</p></div><div className="flex flex-wrap gap-2"><label className="sr-only" htmlFor="region-filter">Region</label><select id="region-filter" value={region} onChange={(event) => setRegion(event.target.value)} className="rounded-full border border-karakoram-ink/15 bg-sandstone-mist px-3 py-2 text-sm font-medium"><option value="all">All regions</option>{regions.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select><label className="sr-only" htmlFor="tag-filter">Travel style</label><select id="tag-filter" value={tag} onChange={(event) => setTag(event.target.value)} className="rounded-full border border-karakoram-ink/15 bg-sandstone-mist px-3 py-2 text-sm font-medium"><option value="all">Any style</option>{tags.map((item) => <option key={item} value={item}>{item}</option>)}</select></div></div><div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{displayed.map((template) => <TemplateCard key={template.id} template={template} />)}</div>{displayed.length === 0 && <p className="py-16 text-center text-karakoram-ink/60">No route matches that combination yet.</p>}</div></section></>;
}
