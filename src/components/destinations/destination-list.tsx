import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Region } from "@/lib/domain/types";
import { DestinationCard } from "@/components/marketing/destination-card";
import { PageHero } from "@/components/layout/page-hero";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";

export function DestinationList({ regions }: { regions: Region[] }) {
  return <><PageHero eyebrow="Explore Pakistan" title="Begin at the edge of familiar." description="Every Safar destination comes with a little more than a pin: useful planning context, seasonality and a starting collection of verified places." imageUrl="https://images.pexels.com/photos/35061821/pexels-photo-35061821.jpeg" imageClassName="destination-hero-bottom"><Button asChild variant="light" className="mt-8"><Link href="/trips/new">Plan with Safar <ArrowRight size={16} /></Link></Button></PageHero><section className="paper-grain px-4 py-16 sm:px-6 sm:py-20 lg:px-8"><div className="mx-auto max-w-7xl"><SectionHeading eyebrow="Three places to begin" title="Mountains, lakes, old cities." description="Choose a part of Pakistan. We’ll make the route feel possible." /><div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{regions.map((region, index) => <DestinationCard key={region.id} region={region} index={index} />)}</div></div></section></>;
}
