import Link from "next/link"
import { Building2, Globe2, Skull, type LucideIcon } from "lucide-react"
import type { RankRow } from "@/lib/ransomware/data"
import { countryName, flagEmoji, sectorLabel, slugifyGroup } from "@/lib/ransomware/meta"
import { cn } from "@/lib/utils"

const nf = new Intl.NumberFormat("en-US")

type Kind = "groups" | "countries" | "industries"

const CONFIG: Record<Kind, { title: string; icon: LucideIcon; bar: string; metric: string }> = {
  groups: { title: "Top 10 Ransomware Groups", icon: Skull, bar: "bg-signal", metric: "text-signal" },
  countries: { title: "Top 10 Targeted Countries", icon: Globe2, bar: "bg-sev-critical", metric: "text-sev-critical" },
  industries: { title: "Top 10 Targeted Industries", icon: Building2, bar: "bg-ok", metric: "text-ok" },
}

function rowLabel(kind: Kind, row: RankRow) {
  if (kind === "countries") {
    return (
      <span className="flex items-center gap-2">
        <span aria-hidden>{flagEmoji(row.key)}</span>
        <span className="truncate">{countryName(row.key)}</span>
      </span>
    )
  }
  if (kind === "industries") return <span className="truncate">{sectorLabel(row.label)}</span>
  return <span className="truncate">{row.label}</span>
}

function rowHref(kind: Kind, row: RankRow): string {
  if (kind === "groups") return `/app/modules/ransomware/groups/${slugifyGroup(row.label)}`
  if (kind === "countries") return `/app/modules/ransomware/victims?country=${encodeURIComponent(row.key)}`
  return `/app/modules/ransomware/victims?sector=${encodeURIComponent(row.label)}`
}

export function RankCard({ kind, rows }: { kind: Kind; rows: RankRow[] }) {
  const cfg = CONFIG[kind]
  const max = Math.max(...rows.map((r) => r.count), 1)

  return (
    <section className="rounded-lg border border-ink/[0.09] bg-navy-900/40 p-5">
      <h3 className="flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.14em] text-ink uppercase">
        <cfg.icon className="size-4 text-sev-critical" />
        {cfg.title}
      </h3>

      <ol className="mt-4 grid gap-3">
        {rows.map((row, i) => (
          <li key={row.key || i}>
            <Link href={rowHref(kind, row)} className="group grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-3">
              <span className="text-right font-mono text-[11px] text-muted-foreground/60 tabular-nums">{i + 1}</span>
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-2 text-[13px] text-foreground/90 group-hover:text-ink">
                  {rowLabel(kind, row)}
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
                  <span className={cn("block h-full rounded-full", cfg.bar)} style={{ width: `${(row.count / max) * 100}%` }} />
                </div>
              </div>
              <span className={cn("text-right font-mono text-[13px] font-semibold tabular-nums", cfg.metric)}>
                {kind === "industries" ? `${row.pct}%` : nf.format(row.count)}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}
