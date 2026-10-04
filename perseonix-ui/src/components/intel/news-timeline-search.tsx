"use client"

import { useMemo, useState, useTransition } from "react"
import { Activity, Loader2, Search, X } from "lucide-react"
import { searchNewsTimeline } from "@/app/app/modules/intel/news/actions"
import type { NewsTimeline } from "@/lib/intel/news"
import { formatInTimeZone, offsetLabel } from "@/lib/timezone"
import { cn } from "@/lib/utils"

function bucketSizeLabel(ms: number): string {
  if (ms <= 0) return "—"
  if (ms >= 86_400_000) return `${Math.round(ms / 86_400_000)}d`
  if (ms >= 3_600_000) return `${Math.round(ms / 3_600_000)}h`
  return `${Math.round(ms / 60_000)}m`
}

export function NewsTimelineSearch({ tz }: { tz: string }) {
  const [keyword, setKeyword] = useState("")
  const [result, setResult] = useState<NewsTimeline | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [pending, startTransition] = useTransition()

  const run = (kw: string) => {
    const clean = kw.trim()
    if (clean.length < 2) return
    startTransition(async () => {
      setHover(null)
      const r = await searchNewsTimeline(clean)
      setResult(r)
    })
  }

  const max = useMemo(() => (result ? Math.max(1, ...result.buckets.map((b) => b.count)) : 1), [result])
  const dayBuckets = result ? result.bucketMs >= 86_400_000 : false

  // Evenly spaced x-axis ticks (dates), in the viewer's timezone.
  const ticks = useMemo(() => {
    if (!result || result.buckets.length === 0) return [] as { pct: number; label: string }[]
    const n = result.buckets.length
    const spanDays = result.from && result.to ? (new Date(result.to).getTime() - new Date(result.from).getTime()) / 86_400_000 : 0
    const withYear = spanDays > 300
    const want = Math.min(8, n)
    const out: { pct: number; label: string }[] = []
    for (let i = 0; i < want; i++) {
      const idx = want === 1 ? 0 : Math.round((i * (n - 1)) / (want - 1))
      const t = result.buckets[idx].t
      out.push({
        pct: n === 1 ? 50 : (idx / (n - 1)) * 100,
        label: formatInTimeZone(new Date(t).toISOString(), tz, withYear ? { day: "numeric", month: "short", year: "2-digit" } : { day: "numeric", month: "short" }),
      })
    }
    return out
  }, [result, tz])

  const hoveredReadout = useMemo(() => {
    if (!result || hover == null || !result.buckets[hover]) return null
    const b = result.buckets[hover]
    const opts: Intl.DateTimeFormatOptions = dayBuckets
      ? { day: "numeric", month: "short", year: "numeric" }
      : { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }
    const when = formatInTimeZone(new Date(b.t).toISOString(), tz, opts)
    return { when, count: b.count }
  }, [result, hover, tz, dayBuckets])

  return (
    <section className="rounded-xl border border-ink/[0.09] bg-navy-900/40 p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Activity className="size-4 text-glow" />
        <p className="font-mono text-[10px] tracking-[0.18em] text-glow uppercase">Keyword activity</p>
        <span className="font-mono text-[10px] text-muted-foreground/50">
          · when a term shows up across the archive
        </span>
      </div>

      {/* search bar — echoes the research console look */}
      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault()
          run(keyword)
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground/50" />
          <input
            type="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="e.g. mandiant, LockBit, CVE-2024-3400, transportation…"
            aria-label="Keyword activity search"
            className="h-11 w-full rounded-lg border border-ink/[0.1] bg-navy-950/50 pr-10 pl-10 text-sm text-ink placeholder:text-muted-foreground/50 transition-colors focus:border-glow/40 focus:bg-navy-900/70 focus:outline-none"
          />
          {keyword && (
            <button
              type="button"
              onClick={() => setKeyword("")}
              aria-label="Clear"
              className="absolute top-1/2 right-3 grid size-6 -translate-y-1/2 place-items-center rounded text-muted-foreground/60 transition-colors hover:bg-ink/[0.06] hover:text-ink"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={pending || keyword.trim().length < 2}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-brand px-6 text-sm font-medium text-white transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          Search
        </button>
      </form>

      {/* result */}
      {!result && !pending && (
        <p className="mt-4 font-mono text-[11px] text-muted-foreground/60">
          Type a keyword and search to chart its activity over time — matches headlines, our summaries, sources, analyst
          notes and extracted entities (actors, malware, CVEs, sectors). Read-only; nothing in the feed changes.
        </p>
      )}

      {result && result.total === 0 && !pending && (
        <p className="mt-4 font-mono text-[11px] text-muted-foreground">
          No activity for <span className="text-ink">&ldquo;{result.keyword}&rdquo;</span> in the archive.
        </p>
      )}

      {result && result.total > 0 && (
        <div className={cn("mt-4 transition-opacity", pending && "opacity-50")}>
          {/* headline */}
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-lg font-semibold text-ink">
              {result.total.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">events</span>
            </p>
            <p className="font-mono text-[11px] text-muted-foreground/70 tabular-nums">
              {hoveredReadout ? (
                <span className="text-glow">
                  {hoveredReadout.when} · {hoveredReadout.count} {hoveredReadout.count === 1 ? "event" : "events"}
                </span>
              ) : (
                <>
                  {formatInTimeZone(result.from, tz, { day: "numeric", month: "short", year: "numeric" })} —{" "}
                  {formatInTimeZone(result.to, tz, { day: "numeric", month: "short", year: "numeric" })} ·{" "}
                  {offsetLabel(tz)} · {bucketSizeLabel(result.bucketMs)}/bar
                </>
              )}
            </p>
          </div>

          {/* chart */}
          <div className="mt-3 flex gap-2">
            {/* y-axis ticks */}
            <div className="flex w-6 shrink-0 flex-col justify-between py-0.5 text-right font-mono text-[9px] text-muted-foreground/50 tabular-nums">
              <span>{max}</span>
              <span>{Math.round(max / 2)}</span>
              <span>0</span>
            </div>

            <div className="min-w-0 flex-1">
              <div
                className="relative flex h-28 items-end gap-px border-b border-ink/10"
                onMouseLeave={() => setHover(null)}
              >
                {/* gridline at mid */}
                <span aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-ink/[0.06]" />
                {result.buckets.map((b, i) => {
                  const h = b.count > 0 ? Math.max(3, (b.count / max) * 100) : 0
                  const active = hover === i
                  return (
                    <div
                      key={b.t}
                      className="flex h-full flex-1 items-end"
                      onMouseEnter={() => setHover(i)}
                      title={
                        formatInTimeZone(
                          new Date(b.t).toISOString(),
                          tz,
                          dayBuckets
                            ? { day: "numeric", month: "short", year: "numeric" }
                            : { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }
                        ) + ` · ${b.count} ${b.count === 1 ? "event" : "events"}`
                      }
                    >
                      <div
                        className={cn(
                          "w-full rounded-t-[1px] transition-colors",
                          b.count === 0 ? "bg-transparent" : active ? "bg-glow" : "bg-glow/55 hover:bg-glow/80"
                        )}
                        style={{ height: `${h}%` }}
                      />
                    </div>
                  )
                })}
              </div>

              {/* x-axis date ticks */}
              <div className="relative mt-1.5 h-4">
                {ticks.map((t, i) => (
                  <span
                    key={i}
                    className="absolute -translate-x-1/2 font-mono text-[9px] whitespace-nowrap text-muted-foreground/55 tabular-nums"
                    style={{ left: `${Math.min(97, Math.max(3, t.pct))}%` }}
                  >
                    {t.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-2 font-mono text-[10px] text-muted-foreground/45">
            Hover a bar for its date &amp; count. Times shown in your timezone ({offsetLabel(tz)}). Based on when each item
            arrived on the platform.
          </p>
        </div>
      )}
    </section>
  )
}
