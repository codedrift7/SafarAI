import Link from "next/link";
import { Mountain } from "lucide-react";

export function SiteFooter() {
  return <footer className="border-t border-karakoram-ink/10 bg-sandstone-mist">
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.3fr_1fr_1fr] lg:px-8">
      <div><div className="flex items-center gap-2 text-lg font-bold"><Mountain className="text-attabad-turquoise" size={20} /><span className="display-type">safar<span className="font-sans text-attabad-turquoise">AI</span></span></div><p className="mt-3 max-w-sm text-sm leading-6 text-karakoram-ink/70">Pakistan, planned with care. Every route begins with real places and local context.</p></div>
      <div><p className="text-xs font-bold uppercase tracking-[.15em] text-karakoram-ink/55">Explore</p><div className="mt-3 flex flex-col gap-2 text-sm"><Link href="/destinations">Destinations</Link><Link href="/templates">Curated escapes</Link><Link href="/blog">Field notes</Link></div></div>
      <div><p className="text-xs font-bold uppercase tracking-[.15em] text-karakoram-ink/55">Travel well</p><div className="mt-3 flex flex-col gap-2 text-sm"><Link href="/tools/visa-checker">Visa advisory</Link><Link href="/tools/permit-checker">Permit checker</Link><Link href="/tools/packing-list">Packing list</Link></div></div>
    </div>
    <div className="border-t border-karakoram-ink/10 px-4 py-4 text-center text-xs text-karakoram-ink/60">© 2026 SafarAI · Travel details are advisory — verify current conditions locally.</div>
  </footer>;
}
