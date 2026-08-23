import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHero({
  eyebrow,
  title,
  description,
  children,
  className,
  imageUrl,
  imageClassName,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  children?: ReactNode;
  className?: string;
  imageUrl?: string | null;
  imageClassName?: string;
}) {
  return (
    <section
      className={cn(
        "relative isolate overflow-hidden bg-karakoram-ink px-4 pb-10 pt-12 text-sandstone-mist sm:px-6 sm:pb-20 sm:pt-20 lg:px-8",
        className
      )}
    >
      {imageUrl ? (
        <>
          <div
            className={cn("destination-hero absolute inset-0 -z-20 bg-cover bg-center transition duration-700", imageClassName)}
            style={{ backgroundImage: `url(${imageUrl})` }}
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-karakoram-ink/90 via-karakoram-ink/78 to-karakoram-ink/45" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-karakoram-ink/80 via-transparent to-black/30" />
        </>
      ) : (
        <div className="lattice pointer-events-none absolute inset-y-0 right-0 hidden w-[36%] opacity-60 md:block" />
      )}
      <div className="relative mx-auto max-w-7xl">
        {eyebrow && <p className="mb-4 text-xs font-bold uppercase tracking-[.18em] text-truck-art-marigold">{eyebrow}</p>}
        <h1 className="display-type max-w-3xl text-3xl leading-[.98] tracking-tight sm:text-5xl lg:text-6xl">{title}</h1>
        {description && <p className="mt-4 sm:mt-5 max-w-2xl text-base leading-7 text-sandstone-mist/72 sm:text-lg">{description}</p>}
        {children}
      </div>
    </section>
  );
}
