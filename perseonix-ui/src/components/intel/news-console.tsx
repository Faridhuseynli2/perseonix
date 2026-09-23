"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowUpRight, Crosshair, FileText, Newspaper, Search, ShieldCheck, TrendingUp, X } from "lucide-react"
import type { ArticleRow } from "@/lib/intel/news"
import { cn } from "@/lib/utils"

const SEV: Record<string, { dot: string; text: string; spine: string }> = {
  critical: { dot: "bg-sev-critical", text: "text-sev-critical", spine: "bg-sev-critical" },
  high: { dot: "bg-sev-high", text: "text-sev-high", spine: "bg-sev-high" },
  medium: { dot: "bg-signal", text: "text-signal", spine: "bg-signal" },
  low: { dot: "bg-glow", text: "text-glow", spine: "bg-glow" },
  info: { dot: "bg-muted-foreground/50", text: "text-muted-foreground", spine: "bg-ink/20" },
}

const REL: Record<string, { chip: string; label: string }> = {
  critical: { chip: "border-sev-critical/40 bg-sev-critical/10 text-sev-critical", label: "Critical to you" },
  high: { chip: "border-sev-high/40 bg-sev-high/10 text-sev-high", label: "Relevant to you" },
  moderate: { chip: "border-signal/40 bg-signal/10 text-signal", label: "Worth a look" },
}

function ago(iso: string | null): string {
  if (!iso) return "—"
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d === 1) return "yesterday"
  if (d < 7) return `${d}d ago`
  if (d < 30) return `${Math.floor(d / 7)}w ago`
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}
const fullDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : ""

export function NewsConsole({
  rows,
  trendingActors,
  hasFilter,
  endpoint,
  initialSelectedId,
}: {
  rows: ArticleRow[]
  trendingActors: { value: string; count: number }[]
  hasFilter: boolean
  endpoint: string
  initialSelectedId?: string
}) {
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()

  const filtered = useMemo(() => {
    if (!q) return rows
    return rows.filter((a) =>
      [a.title, a.summary, a.source, a.category, ...a.cves, ...a.actors, ...a.malware, ...a.ttps.flatMap((t) => [t.id, t.name]), ...a.sectors, ...a.regions]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    )
  }, [rows, q])

  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null)
  const selected = filtered.find((a) => a.id === selectedId) ?? filtered[0] ?? null

  // Deep-link focus: scroll the selected case into view when arriving with ?a=<id>.
  const detailRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (initialSelectedId && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [initialSelectedId])

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-ink/12 bg-navy-900/30 px-6 py-14 text-center">
        <Newspaper className="mx-auto size-7 text-muted-foreground/40" />
        <p className="mt-3 text-sm font-medium text-foreground/85">
          {hasFilter ? "No articles match this filter." : "No threat news ingested yet."}
        </p>
        <div className="mx-auto mt-4 max-w-md rounded-lg border border-ink/[0.08] bg-navy-950/50 p-3 text-left">
          <p className="font-mono text-[10px] tracking-wider text-muted-foreground/60 uppercase">Ingestion endpoint</p>
          <p className="mt-1 font-mono text-[12px] text-foreground/85">POST {endpoint}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* search */}
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground/50" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search headlines, CVEs, threat actors, malware…"
          aria-label="Search threat news"
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

      {/* trending actors */}
      {trendingActors.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.12em] text-muted-foreground/60 uppercase">
            <TrendingUp className="size-3" /> Trending
          </span>
          {trendingActors.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setQuery(t.value)}
              className="inline-flex items-center gap-1 rounded-full border border-sev-critical/20 bg-sev-critical/[0.05] px-2 py-0.5 font-mono text-[10px] text-sev-critical/90 transition-colors hover:bg-sev-critical/[0.12]"
            >
              {t.value}
              <span className="text-muted-foreground/50 tabular-nums">{t.count}</span>
            </button>
          ))}
        </div>
      )}

      {q && (
        <p className="font-mono text-[11px] text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "result" : "results"} for <span className="text-ink">&ldquo;{query.trim()}&rdquo;</span>
        </p>
      )}

      {/* master-detail */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        {/* list */}
        <ul className="flex max-h-[calc(100dvh-13rem)] flex-col gap-1.5 overflow-y-auto pr-1 lg:sticky lg:top-4">
          {filtered.map((a) => {
            const sev = SEV[a.severity ?? "info"] ?? SEV.info
            const active = selected?.id === a.id
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(a.id)}
                  className={cn(
                    "group flex w-full gap-2.5 rounded-lg border p-3 text-left transition-colors",
                    active
                      ? "border-glow/30 bg-glow/[0.06]"
                      : "border-ink/[0.07] bg-navy-900/40 hover:border-ink/15 hover:bg-navy-900/70"
                  )}
                >
                  <span aria-hidden className={cn("mt-0.5 h-full w-[3px] shrink-0 rounded-full", sev.spine)} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 font-mono text-[9.5px] tracking-wide text-muted-foreground/70 uppercase">
                      {a.severity && <span className={sev.text}>{a.severity}</span>}
                      {a.source && (
                        <>
                          <span aria-hidden className="text-muted-foreground/30">·</span>
                          <span className="truncate">{a.source}</span>
                        </>
                      )}
                      <span aria-hidden className="text-muted-foreground/30">·</span>
                      <span className="shrink-0">{ago(a.publishedAt ?? a.createdAt)}</span>
                      {a.relevance && a.relevance.level !== "none" && a.relevance.level !== "low" && (
                        <span className={cn("ml-auto shrink-0 rounded border px-1 py-px text-[8.5px] normal-case", REL[a.relevance.level]?.chip)}>
                          ★ you
                        </span>
                      )}
                      {a.sources.length > 1 && (
                        <span className={cn("shrink-0 rounded border border-glow/25 bg-glow/[0.06] px-1 py-px text-[8.5px] text-glow normal-case", a.relevance && a.relevance.level !== "none" && a.relevance.level !== "low" ? "" : "ml-auto")}>
                          {a.sources.length} src
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "mt-1 line-clamp-2 text-[13px] leading-snug font-medium",
                        active ? "text-ink" : "text-foreground/90 group-hover:text-ink"
                      )}
                    >
                      {a.title}
                    </span>
                    {(a.cves.length > 0 || a.actors.length > 0) && (
                      <span className="mt-1.5 flex flex-wrap gap-1">
                        {a.cves.slice(0, 2).map((c) => (
                          <span key={c} className="rounded border border-glow/20 bg-glow/[0.05] px-1 py-px font-mono text-[9px] text-glow">
                            {c}
                          </span>
                        ))}
                        {a.actors.slice(0, 2).map((x) => (
                          <span key={x} className="rounded border border-sev-critical/20 bg-sev-critical/[0.05] px-1 py-px font-mono text-[9px] text-sev-critical/90">
                            {x}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
          {filtered.length === 0 && (
            <li className="rounded-lg border border-dashed border-ink/12 bg-navy-900/30 px-4 py-10 text-center text-sm text-muted-foreground">
              No article matches &ldquo;{query.trim()}&rdquo;.
            </li>
          )}
        </ul>

        {/* detail */}
        {selected && (
          <div ref={detailRef} className="scroll-mt-4">
            <ArticleDetail a={selected} />
          </div>
        )}
      </div>
    </div>
  )
}

function EntityGroup({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  if (count === 0) return null
  return (
    <section>
      <h3 className="flex items-center justify-between font-mono text-[10px] font-semibold tracking-[0.14em] text-muted-foreground/70 uppercase">
        <span>{title}</span>
        <span className="text-muted-foreground/40 tabular-nums">{count}</span>
      </h3>
      <ul className="mt-2 grid gap-0.5">{children}</ul>
    </section>
  )
}

function EntityRow({ label, sub, dot, href }: { label: string; sub?: string | null; dot: string; href?: string }) {
  const inner = (
    <span className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-ink/[0.05]">
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", dot)} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-mono text-[12px] text-foreground/90">{label}</span>
        {sub && <span className="block truncate text-[11px] text-muted-foreground/60">{sub}</span>}
      </span>
      {href && <ArrowUpRight className="size-3 shrink-0 text-muted-foreground/40" />}
    </span>
  )
  return <li>{href ? <Link href={href}>{inner}</Link> : inner}</li>
}

function ArticleDetail({ a }: { a: ArticleRow }) {
  const sev = SEV[a.severity ?? "info"] ?? SEV.info
  const when = a.publishedAt ?? a.createdAt
  const targets = [...a.sectors, ...a.regions]
  const hasEntities = a.actors.length > 0 || a.malware.length > 0 || a.ttps.length > 0 || a.cves.length > 0
  const hasIndicators = a.actors.length > 0 || a.malware.length > 0 || a.ttps.length > 0 || targets.length > 0

  return (
    <article className="rounded-xl border border-ink/[0.09] bg-navy-900/40 p-6">
      <div className={cn("grid gap-6", hasEntities && "xl:grid-cols-[minmax(0,1fr)_236px]")}>
        {/* main column */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-[0.14em] uppercase">
            <span aria-hidden className={cn("size-1.5 rounded-full", sev.dot)} />
            {a.severity && <span className={sev.text}>{a.severity}</span>}
            {a.category && (
              <>
                <span aria-hidden className="text-muted-foreground/30">·</span>
                <span className="text-muted-foreground">{a.category}</span>
              </>
            )}
            {a.relevance && REL[a.relevance.level] && (
              <span className={cn("rounded border px-1.5 py-0.5 text-[9px] normal-case", REL[a.relevance.level].chip)}>
                ★ {REL[a.relevance.level].label}
              </span>
            )}
            {a.sources.length > 1 && (
              <span className="inline-flex items-center gap-1 rounded border border-glow/30 bg-glow/[0.08] px-1.5 py-0.5 text-[9px] text-glow normal-case">
                <ShieldCheck className="size-3" /> Verified · {a.sources.length} sources
              </span>
            )}
          </div>

          <h1 className="mt-3 text-2xl leading-tight font-semibold text-balance text-ink">{a.title}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
            {a.source && <span className="text-foreground/80">{a.source}</span>}
            <span title={fullDate(when)}>{ago(when)}</span>
            <a
              href={a.url}
              target="_blank"
              rel="noreferrer noopener"
              className="ml-auto inline-flex items-center gap-1 text-glow transition-colors hover:text-ink"
            >
              Read original <ArrowUpRight className="size-3.5" />
            </a>
          </div>

          {a.relevance && a.relevance.reasons.length > 0 && (
            <div className={cn("mt-5 rounded-lg border px-4 py-3", REL[a.relevance.level]?.chip ?? "border-ink/10")}>
              <p className="flex items-center gap-2 font-mono text-[10px] font-semibold tracking-[0.14em] uppercase">
                <Crosshair className="size-3.5" /> Why this matters to you
                <span className="opacity-60">· score {a.relevance.score}</span>
              </p>
              <ul className="mt-2 grid gap-1 text-[13px] text-foreground/85">
                {a.relevance.reasons.map((r) => (
                  <li key={r} className="flex items-start gap-1.5">
                    <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-current opacity-60" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {a.summary && (
            <p className="mt-5 text-[15px] leading-relaxed whitespace-pre-line text-foreground/85">{a.summary}</p>
          )}

          {a.analystNote && (
            <div className="mt-5 rounded-r-lg border-l-2 border-glow/50 bg-glow/[0.04] py-3 pr-4 pl-4">
              <p className="flex items-center gap-2 font-mono text-[10px] font-semibold tracking-[0.14em] text-glow uppercase">
                <FileText className="size-3.5" /> Analyst note
              </p>
              <p className="mt-2 text-[13px] leading-relaxed whitespace-pre-line text-foreground/80">{a.analystNote}</p>
            </div>
          )}

          {hasIndicators && (
            <div className="mt-5 border-t border-ink/[0.07] pt-4">
              <h2 className="flex items-center gap-2 font-mono text-[10px] font-semibold tracking-[0.14em] text-ink uppercase">
                <Crosshair className="size-3.5 text-glow" /> Key indicators
              </h2>
              <ul className="mt-2.5 grid gap-1.5 text-[13px] text-foreground/80">
                {a.actors.length > 0 && (
                  <li><span className="text-muted-foreground/70">Attributed to:</span> {a.actors.join(", ")}</li>
                )}
                {a.malware.length > 0 && (
                  <li><span className="text-muted-foreground/70">Implants observed:</span> {a.malware.join(", ")}</li>
                )}
                {a.ttps.length > 0 && (
                  <li><span className="text-muted-foreground/70">{a.ttps.length} ATT&CK techniques mapped</span></li>
                )}
                {targets.length > 0 && (
                  <li><span className="text-muted-foreground/70">Targets:</span> {targets.join(", ")}</li>
                )}
              </ul>
            </div>
          )}

          {a.sources.length > 1 && (
            <div className="mt-5 border-t border-ink/[0.07] pt-4">
              <h2 className="flex items-center gap-2 font-mono text-[10px] font-semibold tracking-[0.14em] text-ink uppercase">
                <ShieldCheck className="size-3.5 text-glow" /> Corroborated across sources
                <span className="font-normal text-muted-foreground/50">{a.sources.length}</span>
              </h2>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Independently reported by multiple outlets — higher confidence this is real.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {a.sources.map((s) => (
                  <span key={s} className="rounded border border-ink/10 bg-ink/[0.03] px-2 py-0.5 font-mono text-[11px] text-foreground/85">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* right entity rail */}
        {hasEntities && (
          <aside className="grid content-start gap-5 xl:border-l xl:border-ink/[0.07] xl:pl-6">
            <EntityGroup title="Threat actors" count={a.actors.length}>
              {a.actors.map((x) => (
                <EntityRow key={x} label={x} dot="bg-sev-critical" href={`/app/modules/adversaries/actor/${encodeURIComponent(x)}`} />
              ))}
            </EntityGroup>
            <EntityGroup title="Malware" count={a.malware.length}>
              {a.malware.map((x) => (
                <EntityRow key={x} label={x} dot="bg-sev-high" />
              ))}
            </EntityGroup>
            <EntityGroup title="CVEs" count={a.cves.length}>
              {a.cves.map((c) => (
                <EntityRow key={c} label={c} dot="bg-glow" href={`/app/modules/intel/cve/${encodeURIComponent(c)}`} />
              ))}
            </EntityGroup>
            <EntityGroup title="ATT&CK techniques" count={a.ttps.length}>
              {a.ttps.map((t) => (
                <EntityRow key={t.id} label={t.id} sub={t.name} dot="bg-muted-foreground/50" />
              ))}
            </EntityGroup>
          </aside>
        )}
      </div>
    </article>
  )
}
