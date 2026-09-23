import { TrendingDown, TrendingUp } from "lucide-react"
import type { LiveSnapshot, Overview } from "@/lib/ransomware/data"
import { sectorLabel } from "@/lib/ransomware/meta"
import { cn } from "@/lib/utils"

const nf = new Intl.NumberFormat("en-US")

type Cell = { label: string; value: string; accent?: string; growth?: number | null; big?: boolean; text?: boolean }

export function MetricRail({ overview, live }: { overview: Overview; live: LiveSnapshot }) {
  const cells: Cell[] = [
    { label: "Victims", value: nf.format(overview.totalVictims), accent: "text-sev-critical", growth: overview.victimsGrowth, big: true },
    { label: "Active groups", value: nf.format(overview.activeGroups), accent: "text-signal" },
    { label: "Countries", value: nf.format(overview.countries), accent: "text-glow" },
    { label: "Last 24h", value: nf.format(live.last24h) },
    { label: "Last 30d", value: nf.format(live.last30d) },
    { label: "Critical", value: nf.format(live.critical), accent: "text-sev-critical" },
    { label: "Top group", value: overview.topGroup ?? "—", text: true },
    { label: "Top sector", value: sectorLabel(overview.topSector), text: true },
  ]

  return (
    <div className="grid grid-cols-2 divide-x divide-y divide-ink/[0.08] overflow-hidden rounded-lg border border-ink/[0.09] bg-navy-900/40 sm:grid-cols-4 sm:divide-y-0 xl:grid-cols-8">
      {cells.map((c) => (
        <div key={c.label} className="min-w-0 px-4 py-3.5">
          <p className="truncate font-mono text-[9px] tracking-[0.18em] text-muted-foreground/55 uppercase">
            {c.label}
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <span
              className={cn(
                "font-mono font-semibold",
                c.text ? "truncate text-base" : "whitespace-nowrap tabular-nums",
                c.big ? "text-2xl" : c.text ? "" : "text-xl",
                c.accent ?? "text-ink"
              )}
              title={c.value}
            >
              {c.value}
            </span>
            {c.growth !== undefined && c.growth !== null && (
              <span className={cn("inline-flex shrink-0 items-center gap-0.5 font-mono text-[10px]", c.growth >= 0 ? "text-ok" : "text-alert")}>
                {c.growth >= 0 ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
                {c.growth >= 0 ? "+" : ""}{c.growth}%
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
