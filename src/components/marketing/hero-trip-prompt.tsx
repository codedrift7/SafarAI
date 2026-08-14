"use client";

import { ArrowUpRight, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const suggestions = ["A slow Hunza escape in autumn", "A family weekend in Lahore", "Skardu, lakes and big walks"];

export function HeroTripPrompt() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    router.push(`/trips/new${value.trim() ? `?brief=${encodeURIComponent(value.trim())}` : ""}`);
  };
  return <div className="relative mt-8 max-w-2xl">
    <form onSubmit={submit} className="rounded-2xl bg-sandstone-mist p-2 shadow-[0_20px_50px_rgba(0,0,0,.28)]">
      <label className="sr-only" htmlFor="trip-idea">Describe your trip idea</label>
      <div className="flex items-center gap-3">
        <Sparkles aria-hidden="true" className="ml-2 shrink-0 text-attabad-turquoise" size={21} strokeWidth={2} />
        <input id="trip-idea" value={value} onChange={(event) => setValue(event.target.value)} className="min-w-0 flex-1 bg-transparent py-3 text-sm text-karakoram-ink placeholder:text-karakoram-ink/50 focus:outline-none sm:text-base" placeholder="Tell Safar where you want to go…" />
        <button type="submit" className="grid size-11 shrink-0 place-items-center rounded-xl bg-attabad-turquoise text-white transition hover:bg-[#176f83]" aria-label="Start planning"><ArrowUpRight size={20} /></button>
      </div>
    </form>
    <div className="mt-3 flex flex-wrap gap-2" aria-label="Trip idea examples">
      {suggestions.map((suggestion) => <button type="button" onClick={() => setValue(suggestion)} key={suggestion} className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-sandstone-mist/82 transition hover:border-truck-art-marigold/70 hover:text-truck-art-marigold">{suggestion}</button>)}
    </div>
  </div>;
}
