import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

const variants = {
  turquoise: "bg-attabad-turquoise/12 text-[#126478] ring-attabad-turquoise/25",
  marigold: "bg-truck-art-marigold/15 text-truck-art-marigold ring-truck-art-marigold/30",
  meadow: "bg-meadow/13 text-[#235239] ring-meadow/25",
  magenta: "bg-rickshaw-magenta/12 text-[#96264e] ring-rickshaw-magenta/20",
  ink: "bg-karakoram-ink/8 text-karakoram-ink ring-karakoram-ink/15",
  alert: "bg-alert-red/10 text-alert-red ring-alert-red/25",
};

export function Badge({ children, variant = "ink", className }: { children: ReactNode; variant?: keyof typeof variants; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.08em] ring-1", variants[variant], className)}>{children}</span>;
}
