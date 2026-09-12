"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, ExternalLink, Info, ShieldAlert, X } from "lucide-react";
import type { Advisory } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export function AdvisoryBanner({ advisory, dismissible = true }: { advisory: Advisory; dismissible?: boolean }) {
  const [visible, setVisible] = useState(true);
  const isUnverified = advisory.type === "UNVERIFIED";
  const isHighStakes = advisory.isHighStakes ?? false;
  const [expanded, setExpanded] = useState(!isUnverified || isHighStakes);

  if (!visible) return null;
  const critical = advisory.severity === "critical" || advisory.type === "PERMIT";

  return (
    <aside
      className={cn(
        "relative rounded-xl border transition-all",
        critical
          ? "border-alert-red/35 bg-alert-red/8 text-[#78251e]"
          : "border-truck-art-marigold/45 bg-truck-art-marigold/12 text-[#704600]",
        isUnverified && !expanded ? "p-3" : "p-4"
      )}
      aria-label={`${advisory.type.toLowerCase()} advisory`}
    >
      <div className="flex items-start gap-3">
        <span className={cn("mt-0.5 shrink-0", critical ? "text-alert-red" : "text-[#a86900]")}>
          {critical ? <ShieldAlert size={20} /> : <AlertTriangle size={20} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold">{advisory.title}</p>
            {isUnverified && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="inline-flex items-center gap-1 text-xs font-bold hover:underline"
                aria-expanded={expanded}
              >
                {expanded ? (
                  <>
                    Collapse <ChevronUp size={14} />
                  </>
                ) : (
                  <>
                    Details <ChevronDown size={14} />
                  </>
                )}
              </button>
            )}
          </div>
          {(!isUnverified || expanded) && (
            <>
              <p className="mt-1 text-sm leading-6 opacity-85">{advisory.message}</p>
              {advisory.lastVerifiedAt && (
                <p className="mt-2 text-[11px] font-medium uppercase tracking-[.08em] opacity-65">
                  Advisory data verified{" "}
                  {new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(
                    new Date(advisory.lastVerifiedAt),
                  )}
                </p>
              )}
              {advisory.officialLink && (
                <a
                  href={advisory.officialLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold underline underline-offset-2"
                >
                  Check official source <ExternalLink size={12} />
                </a>
              )}
            </>
          )}
          {isUnverified && !expanded && (
            <p className="text-xs opacity-75">Unverified details · Confirm locally before relying on them.</p>
          )}
        </div>
        {dismissible && (
          <button
            onClick={() => setVisible(false)}
            className="grid size-7 shrink-0 place-items-center rounded-full hover:bg-black/5"
            aria-label="Dismiss advisory"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </aside>
  );
}

export function AdvisoryInfo({ children }: { children: React.ReactNode }) {
  return <p className="flex gap-2 rounded-xl bg-attabad-turquoise/9 p-3 text-sm leading-6 text-[#155367]"><Info className="mt-0.5 shrink-0" size={17} />{children}</p>;
}
