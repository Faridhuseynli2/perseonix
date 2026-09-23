import Link from "next/link"
import { ChevronRight, DatabaseZap } from "lucide-react"
import type { VictimRow } from "@/lib/ransomware/data"
import { countryName, flagEmoji, sectorLabel, timeAgo } from "@/lib/ransomware/meta"
import { cn } from "@/lib/utils"

export function EmptyData({ canRefresh }: { canRefresh: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-ink/12 bg-navy-900/40 px-6 py-14 text-center">
      <DatabaseZap className="mx-auto size-7 text-muted-foreground/40" />
      <p className="mt-3 text-sm font-medium text-ink">No ransomware data yet</p>
      <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
        {canRefresh
          ? "Hit “Refresh data” to pull the latest groups and claimed victims from the source."
          : "Data hasn’t been loaded yet. Please check back shortly."}
      </p>
    </div>
  )
}

/** Compact victim list used on the victims page and group dossiers. */
export function VictimList({ items, className }: { items: VictimRow[]; className?: string }) {
  return (
    <ul className={cn("grid gap-1.5", className)}>
      {items.map((v) => (
        <li key={v.id}>
          <Link
            href={`/app/modules/ransomware/victims/${v.id}`}
            className="group flex items-center gap-4 rounded-lg border border-ink/[0.07] bg-navy-800/50 px-4 py-3 transition-colors hover:border-sev-critical/25 hover:bg-navy-800"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-ink group-hover:text-sev-critical" title={v.victim}>
                {v.victim}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                <span className="font-medium text-sev-critical/90">{v.groupName}</span>
                <span aria-hidden className="text-muted-foreground/30">·</span>
                <span>{sectorLabel(v.sector)}</span>
                <span aria-hidden className="text-muted-foreground/30">·</span>
                <span className="font-mono">
                  {flagEmoji(v.country)} {countryName(v.country)}
                </span>
              </div>
            </div>
            <span className="shrink-0 font-mono text-[10px] tracking-wide text-muted-foreground/60">
              {timeAgo(v.discovered)}
            </span>
            <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground/0 transition-colors group-hover:text-sev-critical" />
          </Link>
        </li>
      ))}
    </ul>
  )
}
