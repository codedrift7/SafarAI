"use client";

import Link from "next/link";
import { ChevronDown, ChevronUp, CircleDollarSign, GripVertical, MapPin, Trash2 } from "lucide-react";
import type { Activity, Advisory } from "@/lib/domain/types";
import { ActivityIcon } from "@/components/trips/activity-icon";
import { AdvisoryBanner } from "@/components/advisories/advisory-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function KarakoramLine({ activities, advisories, onMove, onDelete }: { activities: Activity[]; advisories: Advisory[]; onMove?: (activity: Activity, direction: -1 | 1) => void; onDelete?: (activity: Activity) => void }) {
  const ordered = [...activities].sort((a, b) => a.orderIndex - b.orderIndex);
  return <div className="relative pl-12 sm:pl-16"><svg
  className="pointer-events-none absolute left-[19px] top-5 h-[calc(100%-40px)] w-5 sm:left-[27px]"
  viewBox="0 0 20 100"
  preserveAspectRatio="none"
  aria-hidden="true"
>
  <path
    className="route-dash motion-safe:animate-draw-line"
    d="M10 0 C0 10, 20 15, 10 25 S0 40, 10 50 S20 65, 10 75 S0 90, 10 100"
    fill="none"
    stroke="#1C8299"
    strokeWidth="3"
    strokeDasharray="8 8"
    vectorEffect="non-scaling-stroke"
  />
</svg>{ordered.map((activity, index) => { const activityAdvisories = advisories.filter((advisory) => advisory.activityId === activity.id || (!advisory.activityId && advisory.poiId === activity.poiId)); const title = activity.poi?.name ?? activity.customTitle ?? "Unverified suggestion"; return <article key={activity.id} className="relative mb-5 motion-safe:animate-rise-in" style={{ animationDelay: `${index * 80}ms` }}><span className="absolute -left-12 top-5 grid size-10 place-items-center rounded-full border-4 border-sandstone-mist bg-karakoram-ink text-sandstone-mist shadow sm:-left-16 sm:size-12"><ActivityIcon category={activity.category} size={18} /></span><div className="overflow-hidden rounded-2xl border border-karakoram-ink/12 bg-white shadow-sm"><div className="flex items-start gap-3 p-4 sm:p-5"><div className="mono-type w-12 shrink-0 pt-0.5 text-xs font-bold text-attabad-turquoise">{activity.startTime ?? "—"}</div><div className="min-w-0 flex-1"><div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><h3 className="display-type text-xl leading-tight text-karakoram-ink">{activity.poi?.slug ? <Link className="hover:text-attabad-turquoise" href={`/pois/${activity.poi.slug}`}>{title}</Link> : title}</h3>{!activity.poiId && <Badge variant="magenta">AI suggestion, unverified</Badge>}</div><p className="mt-1 text-xs font-bold uppercase tracking-[.09em] text-karakoram-ink/48">{activity.category.toLowerCase()} · until {activity.endTime ?? "flexible"}</p></div><div className="flex shrink-0 items-center gap-1"><button type="button" className="grid size-7 place-items-center rounded hover:bg-karakoram-ink/7 disabled:opacity-35" onClick={() => onMove?.(activity, -1)} disabled={index === 0} aria-label={`Move ${title} earlier`}><ChevronUp size={16} /></button><button type="button" className="grid size-7 place-items-center rounded hover:bg-karakoram-ink/7 disabled:opacity-35" onClick={() => onMove?.(activity, 1)} disabled={index === ordered.length - 1} aria-label={`Move ${title} later`}><ChevronDown size={16} /></button><button type="button" className="grid size-7 place-items-center rounded text-alert-red hover:bg-alert-red/8" onClick={() => onDelete?.(activity)} aria-label={`Remove ${title}`}><Trash2 size={15} /></button></div></div><p className="mt-3 text-sm leading-6 text-karakoram-ink/70">{activity.notes ?? "A real stop to shape around your day."}</p><div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-karakoram-ink/8 pt-3 text-xs text-karakoram-ink/57">{activity.poi?.altitudeMeters && <span className="inline-flex items-center gap-1"><MapPin size={13} /> {activity.poi.altitudeMeters.toLocaleString()} m</span>}{activity.estimatedCost != null && <span className="inline-flex items-center gap-1"><CircleDollarSign size={13} /> {activity.costCurrency} {activity.estimatedCost.toLocaleString()}</span>}<span className="inline-flex items-center gap-1 text-karakoram-ink/40"><GripVertical size={13} /> Use arrows to reorder</span></div></div></div>{activityAdvisories.length > 0 && <div className="space-y-2 border-t border-karakoram-ink/8 bg-sandstone-mist/55 p-3">{activityAdvisories.map((advisory) => <AdvisoryBanner key={advisory.id} advisory={advisory} />)}</div>}</div></article>; })}</div>;
}
