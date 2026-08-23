import { cn } from "@/lib/utils";

export function SectionHeading({ eyebrow, title, description, inverted = false, className }: { eyebrow?: string; title: string; description?: string; inverted?: boolean; className?: string }) {
  return <div className={cn(inverted ? "text-sandstone-mist" : "text-karakoram-ink", className)}>
    {eyebrow && <p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-truck-art-marigold">{eyebrow}</p>}
    <h2 className="display-type text-3xl leading-[1.05] tracking-tight sm:text-4xl">{title}</h2>
    {description && <p className={cn("mt-3 max-w-2xl text-sm leading-6 sm:text-base", inverted ? "text-sandstone-mist/72" : "text-karakoram-ink/70")}>{description}</p>}
  </div>;
}
