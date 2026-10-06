"use client"

import { useMemo, useState } from "react"
import { ArrowUpRight, MapPin, Search, X } from "lucide-react"
import type { EventRow } from "@/lib/frontline/data"
import { categoryLabel } from "@/lib/frontline/meta"
import { formatInTimeZone, offsetLabel } from "@/lib/timezone"
import { cn } from "@/lib/utils"

const SEV_SPINE: Record<string, string> = {
  critical: "bg-sev-critical",
  high: "bg-sev-high",
  medium: "bg-sev-medium",
  low: "bg-sev-low",
  info: "bg-ink/25",
}
const SEV_TEXT: Record<string, string> = {
  critical: "text-sev-critical",
  high: "text-sev-high",
  medium: "text-sev-medium",
  low: "text-sev-low",
  info: "text-muted-foreground",
}

function relAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (m < 1) return "now"
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export function FrontlineFeed({
  events,
  tz,
  categories,
}: {
  events: EventRow[]
  tz: string
  categories: { category: string; count: number }[]
}) {
  const [query, setQuery] = useState("")
  const [cats, setCats] = useState<Set<string>>(new Set())
  const [sev, setSev] = useState<string | null>(null)
  const q = query.trim().toLowerCase()

  const toggleCat = (c: string) =>
    setCats((prev) => {
      const next = new Set(prev)
      if (next.has(c)) next.delete(c)
      else next.add(c)
      return next
    })

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (cats.size && (!e.category || !cats.has(e.category))) return false
      if (sev && e.severity !== sev) return false
      if (q) {
        const hay = [e.title, e.summary, e.region, e.source, e.country].filter(Boolean).join(" ").toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [events, cats, sev, q])

  const fmt = (iso: string) =>
    formatInTimeZone(iso, tz, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })

  return (
    <div className="flex flex-col gap-3">
      {/* filter bar */}
      <div className="flex flex-col gap-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground/50" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events, regions, sources…"
            aria-label="Search frontline events"
            className="h-11 w-full rounded-lg border border-ink/[0.1] bg-navy-900/50 pr-10 pl-10 text-sm text-ink placeholder:text-muted-foreground/50 transition-colors focus:border-glow/40 focus:bg-navy-900/70 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-3 grid size-6 -translate-y-1/2 place-items-center rounded text-muted-foreground/60 transition-colors hover:bg-ink/[0.06] hover:text-ink"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((c) => {
              const active = cats.has(c.category)
              return (
                <button
                  key={c.category}
                  type="button"
                  onClick={() => toggleCat(c.category)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10px] tracking-wide uppercase transition-colors",
                    active
                      ? "border-glow/40 bg-glow/[0.08] text-glow"
                      : "border-ink/[0.08] text-muted-foreground hover:bg-ink/[0.04] hover:text-ink"
                  )}
                >
                  {categoryLabel(c.category)}
                  <span className="text-muted-foreground/50 tabular-nums">{c.count}</span>
                </button>
              )
            })}
            {(cats.size > 0 || sev) && (
              <button
                type="button"
                onClick={() => {
                  setCats(new Set())
                  setSev(null)
                }}
                className="font-mono text-[10px] tracking-wide text-muted-foreground/60 uppercase transition-colors hover:text-ink"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {q || cats.size || sev ? (
        <p className="font-mono text-[11px] text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "event" : "events"}
        </p>
      ) : null}

      {/* feed */}
      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-ink/12 bg-navy-900/30 px-4 py-10 text-center text-sm text-muted-foreground">
          No events match this filter.
        </p>
      ) : (
        <ul className="grid gap-1.5">
          {filtered.map((e) => {
            const sv = e.severity ?? "info"
            return (
              <li key={e.id}>
                <div className="group flex gap-3 rounded-lg border border-ink/[0.07] bg-navy-900/40 p-3 transition-colors hover:border-ink/15 hover:bg-navy-900/70">
                  <span aria-hidden className={cn("mt-0.5 w-[3px] shrink-0 self-stretch rounded-full", SEV_SPINE[sv] ?? SEV_SPINE.info)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] tracking-wide uppercase">
                      <span className="tabular-nums text-ink/90" title={`${formatInTimeZone(e.at, tz, { dateStyle: "medium", timeStyle: "short" })} · ${offsetLabel(tz)}`}>
                        {fmt(e.at)}
                      </span>
                      <span className="text-muted-foreground/40">· {relAgo(e.at)}</span>
                      {e.severity && (
                        <>
                          <span aria-hidden className="text-muted-foreground/30">·</span>
                          <span className={SEV_TEXT[sv] ?? SEV_TEXT.info}>{e.severity}</span>
                        </>
                      )}
                      {e.category && (
                        <span className="rounded border border-ink/10 bg-ink/[0.04] px-1.5 py-px text-muted-foreground normal-case">
                          {categoryLabel(e.category)}
                        </span>
                      )}
                      {e.side && (
                        <span className="rounded border border-ink/10 bg-ink/[0.03] px-1.5 py-px text-muted-foreground/80">{e.side}</span>
                      )}
                      {e.region && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground/70 normal-case">
                          <MapPin className="size-3" />
                          {e.region}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-[14px] leading-snug font-medium text-ink">{e.title}</p>
                    {e.summary && <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-foreground/75">{e.summary}</p>}
                    {(e.source || e.url) && (
                      <div className="mt-1.5 flex items-center gap-2 font-mono text-[10.5px] text-muted-foreground/60">
                        {e.source && <span>{e.source}</span>}
                        {e.url && (
                          <a
                            href={e.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-1 text-glow transition-colors hover:text-ink"
                          >
                            Source <ArrowUpRight className="size-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
