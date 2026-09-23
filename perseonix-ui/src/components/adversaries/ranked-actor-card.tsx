import Link from "next/link"
import { ArrowUpRight, Check } from "lucide-react"
import type { RankedActor, RelevanceLevel } from "@/lib/adversaries/relevance"
import { initials } from "@/lib/format"
import { cn } from "@/lib/utils"

const LEVEL: Record<RelevanceLevel, { label: string; accent: string; chip: string }> = {
  critical: { label: "Critical", accent: "#ff4d5e", chip: "bg-sev-critical/12 text-sev-critical ring-sev-critical/25" },
  high: { label: "High", accent: "#ff8a3d", chip: "bg-sev-high/12 text-sev-high ring-sev-high/25" },
  moderate: { label: "Moderate", accent: "#ffb400", chip: "bg-signal/12 text-signal ring-signal/25" },
  low: { label: "Low", accent: "#5b6a8f", chip: "bg-ink/[0.06] text-muted-foreground ring-ink/15" },
}

export function RankedActorCard({ actor, rank }: { actor: RankedActor; rank: number }) {
  const lv = LEVEL[actor.level]
  return (
    <Link
      href={`/app/modules/adversaries/${actor.slug}`}
      className="group relative flex gap-4 overflow-hidden rounded-lg border border-ink/[0.08] bg-navy-900/40 p-4 pl-5 transition-colors hover:border-ink/20 hover:bg-navy-800/50"
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: lv.accent }} />
      <span className="mt-0.5 w-5 shrink-0 text-right font-mono text-xs text-muted-foreground/50 tabular-nums">{rank}</span>

      {actor.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={actor.image} alt="" loading="lazy" className="size-11 shrink-0 rounded-lg object-cover ring-1 ring-ink/[0.1]" />
      ) : (
        <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-lg bg-navy-800/80 font-mono text-xs font-semibold text-muted-foreground/80 ring-1 ring-ink/[0.08]">
          {initials(actor.name)}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2">
              <span className="truncate font-semibold text-ink group-hover:text-glow">{actor.name}</span>
              <ArrowUpRight aria-hidden className="size-3.5 shrink-0 text-muted-foreground/0 transition-colors group-hover:text-glow" />
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{actor.region}</p>
          </div>
          <div className="shrink-0 text-right">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-lg font-semibold tabular-nums" style={{ color: lv.accent }}>{actor.score}</span>
              <span className={cn("rounded px-1.5 py-0.5 font-mono text-[9px] tracking-wider uppercase ring-1 ring-inset", lv.chip)}>{lv.label}</span>
            </div>
            <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-ink/[0.06]">
              <span className="block h-full rounded-full" style={{ width: `${actor.score}%`, backgroundColor: lv.accent }} />
            </div>
          </div>
        </div>

        <ul className="mt-2.5 grid gap-1">
          {actor.reasons.map((r, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[12px] text-foreground/80">
              <Check aria-hidden className="mt-0.5 size-3 shrink-0 text-glow/70" />
              <span className="line-clamp-1">{r}</span>
            </li>
          ))}
        </ul>
      </div>
    </Link>
  )
}
