import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHero({ eyebrow, title, description, children, className }: { eyebrow?: string; title: ReactNode; description?: string; children?: ReactNode; className?: string }) {
  return <section className={cn("relative overflow-hidden bg-karakoram-ink px-4 pb-14 pt-16 text-sandstone-mist sm:px-6 sm:pb-20 sm:pt-20 lg:px-8", className)}>
    <div className="lattice absolute inset-y-0 right-0 hidden w-[36%] opacity-60 md:block" />
    <div className="relative mx-auto max-w-7xl">
      {eyebrow && <p className="mb-4 text-xs font-bold uppercase tracking-[.18em] text-truck-art-marigold">{eyebrow}</p>}
      <h1 className="display-type max-w-3xl text-4xl leading-[.98] tracking-tight sm:text-5xl lg:text-6xl">{title}</h1>
      {description && <p className="mt-5 max-w-2xl text-base leading-7 text-sandstone-mist/72 sm:text-lg">{description}</p>}
      {children}
    </div>
  </section>;
}
