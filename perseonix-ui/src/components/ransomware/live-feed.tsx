import Link from "next/link"
import { ChevronRight } from "lucide-react"
import type { VictimRow } from "@/lib/ransomware/data"
import { countryName, flagEmoji, isFresh, sectorLabel, timeAgo } from "@/lib/ransomware/meta"

export function LiveFeed({ victims }: { victims: VictimRow[] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-ink/[0.09] bg-navy-900/40">
      <header className="flex items-center justify-between border-b border-ink/[0.07] px-4 py-3">
        <span className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.15em] text-ink uppercase">
          <span aria-hidden className="size-1.5 rounded-full bg-sev-critical motion-safe:animate-beacon" />
          Latest claims
        </span>
        <Link
          href="/app/modules/ransomware/victims"
          className="inline-flex items-center gap-1 font-mono text-[10px] tracking-wide text-muted-foreground uppercase transition-colors hover:text-ink"
        >
          View all
          <ChevronRight className="size-3.5" />
        </Link>
      </header>

      {victims.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">No claims match these filters.</p>
      ) : (
        <ul className="divide-y divide-ink/[0.05]">
          {victims.map((v) => (
            <li key={v.id}>
              <Link
                href={`/app/modules/ransomware/victims/${v.id}`}
                className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-sev-critical/[0.05]"
              >
                <span aria-hidden className="font-mono text-base leading-none">{flagEmoji(v.country)}</span>
                <div className="min-w-0">
                  <p className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-medium text-ink group-hover:text-sev-critical" title={v.victim}>
                      {v.victim}
                    </span>
                    {isFresh(v.discovered, 48) && (
                      <span className="shrink-0 rounded-sm bg-sev-critical px-1 py-0.5 font-mono text-[8px] font-bold tracking-wider text-white uppercase">
                        New
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[10.5px] text-muted-foreground">
                    <span className="text-sev-critical/90">{v.groupName}</span>
                    <span className="text-muted-foreground/40"> / </span>
                    {sectorLabel(v.sector)}
                    <span className="text-muted-foreground/40"> / </span>
                    {countryName(v.country)}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground/55">{timeAgo(v.discovered)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
