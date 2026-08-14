"use client";

import { FormEvent, useState } from "react";
import { Check, LoaderCircle, Luggage, Sparkles } from "lucide-react";
import type { PackingList as PackingListType, Region } from "@/lib/domain/types";
import { createPackingList } from "@/lib/api";
import { Button } from "@/components/ui/button";

export function PackingListTool({ regions }: { regions: Region[] }) {
  const [region, setRegion] = useState(regions[0]?.slug ?? "hunza");
  const [list, setList] = useState<PackingListType | null>(null);
  const [loading, setLoading] = useState(false);
  const create = async (event: FormEvent) => { event.preventDefault(); setLoading(true); try { setList(await createPackingList({ regionSlug: region, startDate: "2026-09-15", endDate: "2026-09-19", travelerType: "FRIENDS" })); } finally { setLoading(false); } };
  const sections = list ? [["Essentials", list.essentials], ["Clothing", list.clothing], ["Health & safety", list.healthAndSafety], ["Documents", list.documents]] as const : [];
  return <section className="paper-grain min-h-[68vh] px-4 py-12 sm:px-6 sm:py-16 lg:px-8"><div className="mx-auto max-w-4xl"><div className="rounded-[1.7rem] bg-karakoram-ink p-7 text-sandstone-mist sm:p-10"><div className="flex gap-3"><span className="grid size-11 place-items-center rounded-xl bg-truck-art-marigold/20 text-truck-art-marigold"><Luggage size={22} /></span><div><p className="text-xs font-bold uppercase tracking-[.16em] text-truck-art-marigold">Travel toolkit</p><h1 className="display-type mt-1 text-4xl">Pack with the road in mind.</h1></div></div><p className="mt-5 max-w-2xl text-sm leading-6 text-sandstone-mist/72">A light, sensible starting list shaped by region and season. Always use your own judgment for current weather and personal needs.</p><form onSubmit={create} className="mt-7 flex gap-2"><label className="sr-only" htmlFor="packing-region">Destination</label><select id="packing-region" value={region} onChange={(event) => setRegion(event.target.value)} className="min-h-12 flex-1 rounded-xl bg-white px-4 text-sm font-medium text-karakoram-ink">{regions.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select><Button type="submit" variant="light" disabled={loading}>{loading ? <LoaderCircle className="animate-spin" size={16} /> : <><Sparkles size={16} /> Make list</>}</Button></form></div>{list && <div className="mt-6 grid gap-4 sm:grid-cols-2">{sections.map(([title, items]) => <div key={title} className="rounded-2xl border border-karakoram-ink/12 bg-white p-5"><h2 className="font-bold">{title}</h2><ul className="mt-3 space-y-2">{items.map((item) => <li key={item} className="flex gap-2 text-sm leading-5 text-karakoram-ink/72"><Check className="mt-0.5 shrink-0 text-meadow" size={15} /> {item}</li>)}</ul></div>)}<div className="rounded-2xl border border-truck-art-marigold/30 bg-truck-art-marigold/10 p-5 sm:col-span-2"><h2 className="font-bold text-[#754800]">Local note</h2><ul className="mt-3 space-y-2">{list.notes.map((note) => <li key={note} className="text-sm leading-6 text-karakoram-ink/72">{note}</li>)}</ul></div></div>}</div></section>;
}
