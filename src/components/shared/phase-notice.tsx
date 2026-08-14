import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PhaseNotice({ title, description }: { title: string; description: string }) {
  return <section className="paper-grain min-h-[58vh] bg-sandstone-mist px-4 py-20 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-2xl rounded-[2rem] border border-karakoram-ink/12 bg-white p-8 text-center shadow-route-card sm:p-12">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-truck-art-marigold/20 text-karakoram-ink"><Compass size={28} /></span>
      <p className="mt-6 text-xs font-bold uppercase tracking-[.18em] text-attabad-turquoise">Travel toolkit</p>
      <h1 className="display-type mt-3 text-4xl leading-tight text-karakoram-ink">{title}</h1>
      <p className="mx-auto mt-4 max-w-lg leading-7 text-karakoram-ink/70">{description}</p>
      <Button asChild className="mt-7"><Link href="/trips/new">Plan a route <ArrowRight size={16} /></Link></Button>
    </div>
  </section>;
}
