"use client";

import { Map, MapPin, Route } from "lucide-react";
import type { TripDay } from "@/lib/domain/types";

export function TripMap({ day }: { day: TripDay | undefined }) {
  const points = day?.activities.filter((activity) => activity.poi?.latitude != null && activity.poi?.longitude != null) ?? [];
  return <div className="relative min-h-[280px] overflow-hidden rounded-[1.3rem] border border-karakoram-ink/12 bg-[#c6dde0] sm:min-h-[350px]" role="img" aria-label={day ? `Static map overview for day ${day.dayNumber}` : "Static map overview"}>
    <div className="absolute inset-0 opacity-90" style={{ backgroundImage: "linear-gradient(24deg, transparent 48%, rgba(18,35,43,.27) 49%, rgba(18,35,43,.27) 51%, transparent 52%), linear-gradient(150deg, transparent 46%, rgba(255,255,255,.65) 47%, rgba(255,255,255,.65) 50%, transparent 51%), radial-gradient(ellipse at 28% 44%, #4f8f75 0 18%, transparent 18.5%), radial-gradient(ellipse at 72% 64%, #729e5a 0 13%, transparent 13.5%), radial-gradient(ellipse at 62% 18%, #eef0e7 0 15%, transparent 15.5%)" }} />
    <svg className="absolute inset-0 size-full" viewBox="0 0 600 350" preserveAspectRatio="none" aria-hidden="true"><path d="M75 270 C145 230, 160 160, 250 175 S355 90, 435 135 S520 84, 555 74" fill="none" stroke="#D6336C" strokeWidth="4" strokeLinecap="round" strokeDasharray="1 10" /></svg>
    <div className="absolute inset-0 flex items-center justify-around px-[12%] pt-8" aria-hidden="true">{points.slice(0, 4).map((point, index) => <div key={point.id} className="relative" style={{ transform: `translateY(${[58, -25, 10, -62][index] ?? 0}px)` }}><span className="grid size-8 place-items-center rounded-full border-2 border-white bg-karakoram-ink text-xs font-bold text-white shadow-lg">{index + 1}</span><span className="absolute left-1/2 top-9 w-24 -translate-x-1/2 rounded-md bg-white/90 px-1 py-0.5 text-center text-[9px] font-bold text-karakoram-ink shadow-sm">{point.poi?.name ?? point.customTitle}</span></div>)}</div>
    <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-white/88 px-3 py-2 text-xs font-semibold text-karakoram-ink shadow"><Map size={14} className="text-attabad-turquoise" /> Map preview <span className="text-karakoram-ink/45">· token-free mode</span></div><div className="absolute right-3 top-3 grid size-9 place-items-center rounded-xl bg-karakoram-ink text-sandstone-mist shadow"><Route size={17} /></div>
    {points.length === 0 && <div className="absolute inset-0 grid place-items-center text-center"><span className="rounded-xl bg-white/85 p-4 text-xs font-semibold text-karakoram-ink"><MapPin className="mx-auto mb-1 text-attabad-turquoise" size={18} /> Route points appear here</span></div>}
  </div>;
}
