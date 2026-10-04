"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { Activity, Loader2, Search, X } from "lucide-react"
import type { NewsTimeline } from "@/lib/intel/news"
import { formatInTimeZone, offsetLabel } from "@/lib/timezone"
import { cn } from "@/lib/utils"

const RANGES: [string, string][] = [
  ["all", "All time"],
  ["1y", "1Y"],
  ["90d", "90D"],
  ["30d", "30D"],
  ["7d", "7D"],
  ["24h", "24H"],
]

/** Round a max count up to a clean axis value (1, 2, 5 × 10ⁿ). */
function niceCeil(v: number): number {
  if (v <= 1) return 1
  const p = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / p
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return m * p
}

function bucketSizeLabel(ms: number): string {
  if (ms <= 0) return "—"
  if (ms >= 86_400_000) return `${Math.round(ms / 86_400_000)}d`
  if (ms >= 3_600_000) return `${Math.round(ms / 3_600_000)}h`
  return `${Math.round(ms / 60_000)}m`
}

export function NewsTimelineSearch({
  tz,
  keyword,
  range,
  timeline,
  selFrom,
  selTo,
}: {
  tz: string
  keyword: string
  range: string
  timeline: NewsTimeline | null
  selFrom: number | null
  selTo: number | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const [pending, startTransition] = useTransition()

  // Keep the box in sync with the active keyword (e.g. back/forward) without an
  // effect — the officially-sanctioned "adjust state during render" pattern.
  const [input, setInput] = useState(keyword)
  const [prevKeyword, setPrevKeyword] = useState(keyword)
  if (keyword !== prevKeyword) {
    setPrevKeyword(keyword)
    setInput(keyword)
  }
  const [hover, setHover] = useState<number | null>(null)

  const go = (mut: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(sp?.toString() ?? "")
    mut(p)
    startTransition(() => router.push(`${pathname}${p.toString() ? `?${p.toString()}` : ""}`, { scroll: false }))
  }

  const submit = () => {
    const clean = input.trim()
    if (clean.length < 2) return
    go((p) => {
      p.set("k", clean)
      p.delete("kfrom")
      p.delete("kto")
      p.delete("a")
    })
  }
  const setRange = (r: string) =>
    go((p) => {
      if (r === "all") p.delete("krange")
      else p.set("krange", r)
      p.delete("kfrom")
      p.delete("kto")
    })
  const clearAll = () => {
    setInput("")
    go((p) => {
      p.delete("k")
      p.delete("krange")
      p.delete("kfrom")
      p.delete("kto")
    })
  }
  const clearSelection = () =>
    go((p) => {
      p.delete("kfrom")
      p.delete("kto")
    })
  const clickBucket = (t: number, bucketMs: number) =>
    go((p) => {
      if (selFrom === t) {
        p.delete("kfrom")
        p.delete("kto")
      } else {
        p.set("kfrom", String(t))
        p.set("kto", String(t + bucketMs))
      }
    })

  const niceMax = useMemo(() => (timeline ? niceCeil(Math.max(1, ...timeline.buckets.map((b) => b.count))) : 1), [timeline])
  const spanDays = timeline?.from && timeline?.to ? (new Date(timeline.to).getTime() - new Date(timeline.from).getTime()) / 86_400_000 : 0
  const withYear = spanDays > 300

  const fmtTick = (iso: string) =>
    formatInTimeZone(iso, tz, withYear ? { day: "numeric", month: "short", year: "2-digit" } : { day: "numeric", month: "short" })
  const fmtBucket = (t: number, bucketMs: number) =>
    formatInTimeZone(
      new Date(t).toISOString(),
      tz,
      bucketMs >= 86_400_000
        ? { day: "numeric", month: "short", year: "numeric" }
        : { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }
    )

  const ticks = useMemo(() => {
    if (!timeline || timeline.buckets.length === 0) return [] as { pct: number; label: string }[]
    const n = timeline.buckets.length
    const want = Math.min(7, n)
    const out: { pct: number; label: string }[] = []
    for (let i = 0; i < want; i++) {
      const idx = want === 1 ? 0 : Math.round((i * (n - 1)) / (want - 1))
      out.push({ pct: n === 1 ? 50 : (idx / (n - 1)) * 100, label: fmtTick(new Date(timeline.buckets[idx].t).toISOString()) })
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline, tz, withYear])

  const hoveredReadout =
    timeline && hover != null && timeline.buckets[hover]
      ? { when: fmtBucket(timeline.buckets[hover].t, timeline.bucketMs), count: timeline.buckets[hover].count }
      : null

  const N = timeline?.buckets.length ?? 0
  const slot = N ? 1000 / N : 0
  const barW = slot * 0.66
  const H = 100

  return (
    <section className="rounded-xl border border-ink/[0.09] bg-navy-900/40 p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Activity className="size-4 text-sev-critical" />
        <p className="font-mono text-[10px] tracking-[0.18em] text-sev-critical/90 uppercase">Keyword activity</p>
        <span className="hidden font-mono text-[10px] text-muted-foreground/45 sm:inline">· when a term shows up across the archive</span>
      </div>

      {/* search + ranges */}
      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground/50" />
          <input
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. mandiant, LockBit, CVE-2024-3400, transportation…"
            aria-label="Keyword activity search"
            className="h-11 w-full rounded-lg border border-ink/[0.1] bg-navy-950/50 pr-10 pl-10 text-sm text-ink placeholder:text-muted-foreground/50 transition-colors focus:border-sev-critical/40 focus:bg-navy-900/70 focus:outline-none"
          />
          {(input || keyword) && (
            <button
              type="button"
              onClick={clearAll}
              aria-label="Clear"
              className="absolute top-1/2 right-3 grid size-6 -translate-y-1/2 place-items-center rounded text-muted-foreground/60 transition-colors hover:bg-ink/[0.06] hover:text-ink"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={pending || input.trim().length < 2}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-sev-critical px-6 text-sm font-medium text-white transition-colors hover:bg-sev-critical/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          Search
        </button>
      </form>

      {/* range selector — only meaningful once a keyword is active */}
      {keyword && (
        <div className="mt-3 flex flex-wrap items-center gap-1">
          <span className="mr-1 font-mono text-[9px] tracking-[0.14em] text-muted-foreground/45 uppercase">Window</span>
          {RANGES.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setRange(key)}
              className={cn(
                "rounded-md px-2.5 py-1 font-mono text-[10px] tracking-wide uppercase transition-colors",
                range === key ? "bg-sev-critical/15 text-sev-critical" : "text-muted-foreground/60 hover:bg-ink/[0.05] hover:text-ink"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* empty prompt */}
      {!keyword && !pending && (
        <p className="mt-4 font-mono text-[11px] text-muted-foreground/60">
          Type a keyword and search to chart its activity over time — matches headlines, our summaries, sources, analyst
          notes and extracted entities (actors, malware, CVEs, sectors). Click a bar to focus the feed below on that
          window. Read-only; nothing in the feed changes.
        </p>
      )}

      {/* chart */}
      {keyword && timeline && (
        <div className={cn("mt-4 transition-opacity", pending && "opacity-50")}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-lg font-semibold text-ink tabular-nums">
              {timeline.total.toLocaleString()}{" "}
              <span className="text-sm font-normal text-muted-foreground">{timeline.total === 1 ? "event" : "events"}</span>
              {timeline.total === 0 && <span className="ml-2 text-xs font-normal text-muted-foreground/60">— no activity in this window</span>}
            </p>
            <p className="font-mono text-[11px] text-muted-foreground/70 tabular-nums">
              {hoveredReadout ? (
                <span className="text-sev-critical">
                  {hoveredReadout.when} · {hoveredReadout.count} {hoveredReadout.count === 1 ? "event" : "events"}
                </span>
              ) : timeline.from && timeline.to ? (
                <>
                  {fmtTick(timeline.from)} — {fmtTick(timeline.to)} · {offsetLabel(tz)} · {bucketSizeLabel(timeline.bucketMs)}/bar
                </>
              ) : null}
            </p>
          </div>

          <div className="mt-3 flex gap-2">
            {/* y ticks */}
            <div className="flex w-7 shrink-0 flex-col justify-between py-0.5 text-right font-mono text-[9px] text-muted-foreground/45 tabular-nums">
              <span>{niceMax}</span>
              {niceMax >= 2 && <span>{niceMax / 2}</span>}
              <span>0</span>
            </div>

            <div className="min-w-0 flex-1">
              <svg
                viewBox={`0 0 1000 ${H}`}
                preserveAspectRatio="none"
                className="h-32 w-full text-sev-critical"
                role="img"
                aria-label={`Activity histogram for ${timeline.keyword}`}
                onMouseLeave={() => setHover(null)}
              >
                {/* baseline + mid gridline */}
                <line x1="0" y1={H} x2="1000" y2={H} stroke="currentColor" strokeOpacity="0.15" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                <line x1="0" y1={H / 2} x2="1000" y2={H / 2} stroke="currentColor" strokeOpacity="0.07" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                {timeline.buckets.map((b, i) => {
                  const h = b.count > 0 ? Math.max(2.5, (b.count / niceMax) * H) : 0
                  const x = i * slot + (slot - barW) / 2
                  const selected = selFrom != null && b.t === selFrom
                  const hovered = hover === i
                  const op = selected ? 1 : hovered ? 0.92 : 0.5
                  return (
                    <g key={b.t}>
                      {h > 0 && <rect x={x} y={H - h} width={barW} height={h} fill="currentColor" fillOpacity={op} />}
                      {/* full-height hit target */}
                      <rect
                        x={i * slot}
                        y={0}
                        width={slot}
                        height={H}
                        fill="transparent"
                        className={b.count > 0 ? "cursor-pointer" : "cursor-default"}
                        onMouseEnter={() => setHover(i)}
                        onClick={() => b.count > 0 && clickBucket(b.t, timeline.bucketMs)}
                      >
                        <title>{`${fmtBucket(b.t, timeline.bucketMs)} · ${b.count} ${b.count === 1 ? "event" : "events"}`}</title>
                      </rect>
                    </g>
                  )
                })}
              </svg>

              {/* x ticks */}
              <div className="relative mt-1.5 h-3.5">
                {ticks.map((t, i) => (
                  <span
                    key={i}
                    className="absolute -translate-x-1/2 font-mono text-[9px] whitespace-nowrap text-muted-foreground/50 tabular-nums"
                    style={{ left: `${Math.min(97, Math.max(3, t.pct))}%` }}
                  >
                    {t.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* focused-window chip */}
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
            {selFrom != null && selTo != null ? (
              <span className="inline-flex items-center gap-2 rounded-md border border-sev-critical/30 bg-sev-critical/[0.08] px-2.5 py-1 font-mono text-[10.5px] text-sev-critical">
                Feed focused · {fmtBucket(selFrom, timeline.bucketMs)}
                <button type="button" onClick={clearSelection} aria-label="Clear focus" className="grid size-4 place-items-center rounded hover:bg-sev-critical/15">
                  <X className="size-3" />
                </button>
              </span>
            ) : (
              <span className="font-mono text-[10px] text-muted-foreground/45">
                Click a bar to focus the feed below on that window · times in {offsetLabel(tz)} · by platform arrival
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
