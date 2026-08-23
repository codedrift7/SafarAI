import Link from "next/link";
import { ArrowUpRight, Clock3, MapPin, UsersRound } from "lucide-react";
import type { TripTemplate } from "@/lib/domain/types";
import { Badge } from "@/components/ui/badge";

export function TemplateCard({ template }: { template: TripTemplate }) {
  const isTopPositioned =
    template.id === "template-lahore-layers-of-history" ||
    template.regionId === "region-lahore" ||
    template.id.includes("lahore") ||
    template.id === "template-islamabad-weekend" ||
    template.id.includes("islamabad");

  return <Link href={`/templates/${template.id}`} className="group overflow-hidden rounded-[1.25rem] border border-karakoram-ink/12 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-route-card">
    <div className="relative h-44 bg-karakoram-ink">
      {template.coverImageUrl && (
        <div
          className="absolute inset-0 bg-cover transition duration-700 group-hover:scale-105"
          style={{
            backgroundImage: `linear-gradient(0deg, rgba(18,35,43,.3), transparent), url(${template.coverImageUrl})`,
            backgroundPosition: isTopPositioned ? "center top" : "center",
          }}
        />
      )}
      <div className="absolute inset-x-4 top-4 flex items-center justify-between"><Badge variant="marigold">{template.region?.name ?? "Pakistan"}</Badge><span className="grid size-8 place-items-center rounded-full bg-white/15 text-white opacity-0 backdrop-blur transition group-hover:opacity-100"><ArrowUpRight size={16} /></span></div>
    </div>
    <div className="p-5"><div className="flex flex-wrap gap-1.5">{template.tags.slice(0, 2).map((tag) => <span key={tag} className="text-[11px] font-bold uppercase tracking-[.08em] text-truck-art-marigold">#{tag}</span>)}</div><h3 className="display-type mt-2 text-2xl leading-tight text-karakoram-ink">{template.title}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-karakoram-ink/68">{template.description}</p><div className="mt-4 flex flex-wrap gap-x-3 gap-y-2 border-t border-karakoram-ink/10 pt-4 text-xs font-medium text-karakoram-ink/68"><span className="inline-flex items-center gap-1"><Clock3 size={14} /> {template.durationDays} days</span><span className="inline-flex items-center gap-1"><MapPin size={14} /> {template.region?.name}</span><span className="inline-flex items-center gap-1"><UsersRound size={14} /> {template.priceTier?.replace("_", " ") ?? "Flexible"}</span></div></div>
  </Link>;
}
