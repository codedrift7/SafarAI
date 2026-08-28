"use client";

import Link from "next/link";
import { Menu, Mountain, Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/layout/user-menu";

const navigation = [
  { href: "/destinations", label: "Destinations" },
  { href: "/templates", label: "Curated escapes" },
  { href: "/trips", label: "My trips" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-karakoram-ink/95 text-sandstone-mist backdrop-blur">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-2 text-xl font-bold tracking-tight" aria-label="Safar home">
          <span className="grid size-9 place-items-center rounded-xl bg-truck-art-marigold text-karakoram-ink transition-transform group-hover:-rotate-6"><Mountain size={21} strokeWidth={2.2} /></span>
          <span className="display-type text-[1.38rem]">safar<span className="font-sans text-attabad-turquoise">AI</span></span>
        </Link>
        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary navigation">
          {navigation.map((item) => <Link key={item.href} href={item.href} className="text-sm font-medium text-sandstone-mist/80 transition hover:text-truck-art-marigold">{item.label}</Link>)}
          <Button asChild size="sm"><Link href="/trips/new"><Plus size={16} strokeWidth={2} /> Plan a trip</Link></Button>
          <UserMenu />
        </nav>
        <button type="button" className="grid size-10 place-items-center rounded-full text-sandstone-mist md:hidden" onClick={() => setOpen((value) => !value)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && <nav className="border-t border-white/10 bg-karakoram-ink px-4 py-4 md:hidden" aria-label="Mobile navigation">
        <div className="mx-auto flex max-w-7xl flex-col gap-1">
          {navigation.map((item) => <Link onClick={() => setOpen(false)} key={item.href} href={item.href} className="rounded-lg px-3 py-3 text-sandstone-mist hover:bg-white/10">{item.label}</Link>)}
          <Button asChild className="mt-2"><Link onClick={() => setOpen(false)} href="/trips/new"><Plus size={16} /> Plan a trip</Link></Button>
          <div className="mt-2 border-t border-white/10 pt-2">
            <UserMenu mobile onNavigate={() => setOpen(false)} />
          </div>
        </div>
      </nav>}
    </header>
  );
}
