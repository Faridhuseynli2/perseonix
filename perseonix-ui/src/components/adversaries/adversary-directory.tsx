import Link from "next/link"
import { BellRing, CalendarClock, ChevronLeft, ChevronRight, Target } from "lucide-react"
import { AdversaryFilterBar } from "@/components/adversaries/filter-bar"
import { GroupCard } from "@/components/adversaries/group-card"
import { EmptyState } from "@/components/admin/ui"
import { AdversaryMark } from "@/components/brand/adversary-mark"
import { datasetStats, filterGroups, getRegions, toSummary } from "@/lib/adversaries/data"
import { GROUPS_PER_PAGE, threatAccent } from "@/lib/adversaries/meta"
import { cn } from "@/lib/utils"

const numberFormat = new Intl.NumberFormat("en-US")

export type DirectoryQuery = { q: string; region: string; category: string; page: number }

export function AdversaryDirectory({
  query,
  osintActors = [],
  emergingCount = 0,
}: {
  query: DirectoryQuery
  osintActors?: { value: string; count: number }[]
  emergingCount?: number
}) {
  const { q, region, category } = query
  const stats = datasetStats()
  const regions = getRegions()
  const results = filterGroups({ q, region, category })
  const filtered = Boolean(q || region || category)
  const maxRegion = Math.max(...regions.map((r) => r.count), 1)

  const totalPages = Math.max(1, Math.ceil(results.length / GROUPS_PER_PAGE))
  const current = Math.min(Math.max(1, query.page), totalPages)
  const shown = results.slice((current - 1) * GROUPS_PER_PAGE, current * GROUPS_PER_PAGE).map(toSummary)

  const buildQuery = (next: Partial<DirectoryQuery>) => {
    const merged = { q, region, category, page: current, ...next }
    const search = new URLSearchParams()
    if (merged.q) search.set("q", merged.q)
    if (merged.region) search.set("region", merged.region)
    if (merged.category) search.set("category", merged.category)
    if (merged.page && merged.page > 1) search.set("page", String(merged.page))
    const s = search.toString()
    return `/app/modules/adversaries${s ? `?${s}` : ""}`
  }

  const counters: { value: string; label: string; live?: boolean }[] = [
    { value: numberFormat.format(stats.groups), label: "Confirmed APTs" },
    { value: numberFormat.format(emergingCount), label: "Emerging actors", live: true },
    { value: String(stats.regions), label: "Origin regions" },
    { value: numberFormat.format(stats.malware), label: "Malware families" },
    { value: numberFormat.format(stats.attackMapped), label: "ATT&CK mapped" },
  ]

  return (
    <div className="mx-auto max-w-[1400px]">
      {/* Command masthead */}
      <section className="hud-corners relative overflow-hidden rounded-2xl border border-ink/[0.08] bg-navy-900/70">
        <div aria-hidden className="hud-grid fade-mask-top pointer-events-none absolute inset-0 opacity-60" />
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-72 opacity-[0.15]">
          <div className="radar-rings size-full rounded-full" />
        </div>
        <div className="relative grid gap-8 p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:p-8">
          <div>
            <p className="eyebrow flex items-center gap-2 text-[10px] text-glow">
              <span aria-hidden className="inline-block size-1.5 rounded-full bg-glow motion-safe:animate-beacon" />
              Perseonix Corvael // Adversary Intelligence
            </p>
            <div className="mt-3 flex items-center gap-4">
              <AdversaryMark className="size-12" />
              <h1 className="font-display text-3xl font-semibold tracking-tight text-ink lg:text-4xl">
                Know your enemy
              </h1>
            </div>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              A living dossier of the threat actors that matter — APT crews, ransomware operators and
              hacktivists. Track their aliases, arsenals, targets and the operations attributed to them.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link
                href="/app/modules/adversaries/activity"
                className="inline-flex items-center gap-1.5 rounded-md border border-ink/10 bg-ink/[0.03] px-3 py-2 text-sm text-foreground/85 transition-colors hover:border-glow/40 hover:text-ink"
              >
                <CalendarClock className="size-4 text-glow" />
                Threat activity feed
              </Link>
              <Link
                href="/app/modules/adversaries/watchlist"
                className="inline-flex items-center gap-1.5 rounded-md border border-ink/10 bg-ink/[0.03] px-3 py-2 text-sm text-foreground/85 transition-colors hover:border-glow/40 hover:text-ink"
              >
                <BellRing className="size-4 text-glow" />
                My watchlist
              </Link>
              <Link
                href="/app/modules/adversaries/relevance"
                className="inline-flex items-center gap-1.5 rounded-md border border-glow/30 bg-glow/[0.06] px-3 py-2 text-sm text-glow transition-colors hover:bg-glow/10"
              >
                <Target className="size-4" />
                Your threat landscape
              </Link>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-8 gap-y-5 border-t border-ink/[0.08] pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
            {counters.map((counter) => (
              <div key={counter.label}>
                <dt className="eyebrow flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
                  {counter.live && <span aria-hidden className="inline-block size-1.5 rounded-full bg-glow motion-safe:animate-beacon" />}
                  {counter.label}
                </dt>
                <dd className={cn("mt-1 font-mono text-3xl font-semibold tabular-nums", counter.live ? "text-glow" : "text-ink")}>
                  {counter.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Threat landscape */}
      <section className="mt-4 rounded-2xl border border-ink/[0.07] bg-navy-800/50 p-5 lg:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow text-[10px] text-muted-foreground/70">Threat landscape · by origin</p>
          {region && (
            <Link href={buildQuery({ region: "", page: 1 })} className="text-xs font-medium text-glow hover:text-ink">
              Reset origin
            </Link>
          )}
        </div>

        <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-ink/[0.06]" role="img" aria-label="Actors by origin region">
          {regions.map((r) => (
            <Link
              key={r.key}
              href={region === r.key ? buildQuery({ region: "", page: 1 }) : buildQuery({ region: r.key, page: 1 })}
              title={`${r.key}: ${r.count}`}
              className={cn("h-full transition-opacity hover:opacity-100", region && region !== r.key ? "opacity-30" : "opacity-90")}
              style={{ flexGrow: r.count, flexBasis: 0, backgroundColor: threatAccent(r.threatLevel) }}
            />
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {regions.map((r) => {
            const active = region === r.key
            return (
              <Link
                key={r.key}
                href={active ? buildQuery({ region: "", page: 1 }) : buildQuery({ region: r.key, page: 1 })}
                aria-pressed={active}
                className={cn(
                  "group relative overflow-hidden rounded-lg border p-3 transition-colors",
                  active ? "border-brand/40 bg-brand/[0.06]" : "border-ink/[0.07] bg-navy-900/40 hover:border-ink/15"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: threatAccent(r.threatLevel) }}
                    />
                    <span className="truncate text-[13px] font-medium text-ink">{r.key}</span>
                  </span>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">{r.count}</span>
                </div>
                <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-ink/[0.06]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(r.count / maxRegion) * 100}%`, backgroundColor: threatAccent(r.threatLevel) }}
                  />
                </div>
                <p className="mt-2 font-mono text-[9px] tracking-wider text-muted-foreground/70 uppercase">
                  {r.threatLevel ?? "—"}
                </p>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Command bar */}
      <div className="mt-4">
        <AdversaryFilterBar value={{ q, region, category }} resultCount={results.length} />
      </div>

      {/* Results */}
      <section className="mt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <span aria-hidden className="h-4 w-1 rounded-full bg-signal" />
            {filtered ? "Matching threat actors" : "All threat actors"}
            <span className="font-mono text-xs font-normal text-muted-foreground">
              {numberFormat.format(results.length)}
            </span>
          </h2>
          {filtered && (
            <Link href="/app/modules/adversaries" className="text-xs font-medium text-glow hover:text-ink">
              Clear filters
            </Link>
          )}
        </div>

        {osintActors.length > 0 && (
          <div className="mt-4 rounded-xl border border-glow/20 bg-glow/[0.03] p-4">
            <p className="flex items-center gap-2 font-mono text-[10px] font-semibold tracking-[0.14em] text-glow uppercase">
              <Target className="size-3.5" /> OSINT-tracked · from Threat News
              <span className="font-normal text-muted-foreground/50">{osintActors.length}</span>
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Not in the curated APT dataset — surfaced live from news mentions. Open to see reporting and enrichment.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {osintActors.map((a) => (
                <Link
                  key={a.value}
                  href={`/app/modules/adversaries/actor/${encodeURIComponent(a.value)}`}
                  className="group flex items-center justify-between gap-2 rounded-lg border border-ink/[0.08] bg-navy-900/40 px-3 py-2 transition-colors hover:border-glow/30 hover:bg-navy-900/70"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-ink group-hover:text-glow">{a.value}</span>
                    <span className="font-mono text-[10px] tracking-wide text-muted-foreground/60 uppercase">OSINT-tracked</span>
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground/60 tabular-nums">
                    {a.count} {a.count === 1 ? "report" : "reports"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {shown.length === 0 ? (
          osintActors.length > 0 ? null : (
            <div className="mt-4">
              <EmptyState
                title="No threat actors match"
                body="Try a different name, alias or malware family, or clear the filters."
              />
            </div>
          )
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((group, index) => (
              <div
                key={group.slug}
                className="motion-safe:animate-rise"
                style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
              >
                <GroupCard group={group} />
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <Link
              href={buildQuery({ page: current - 1 })}
              aria-disabled={current <= 1}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-md border border-ink/10 px-3 text-sm transition-colors",
                current <= 1
                  ? "pointer-events-none text-muted-foreground/40"
                  : "text-muted-foreground hover:bg-ink/[0.04] hover:text-ink"
              )}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Link>
            <span className="font-mono text-xs text-muted-foreground">
              Page {current} of {totalPages}
            </span>
            <Link
              href={buildQuery({ page: current + 1 })}
              aria-disabled={current >= totalPages}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-md border border-ink/10 px-3 text-sm transition-colors",
                current >= totalPages
                  ? "pointer-events-none text-muted-foreground/40"
                  : "text-muted-foreground hover:bg-ink/[0.04] hover:text-ink"
              )}
            >
              Next
              <ChevronRight className="size-4" />
            </Link>
          </div>
        )}

        <p className="mt-8 text-xs leading-relaxed text-muted-foreground/70">
          Data: APT Groups &amp; Operations tracker, licensed under CC BY 4.0. Profiles aggregate public
          reporting from CrowdStrike, Mandiant, Kaspersky, Microsoft, MITRE ATT&amp;CK and others.
        </p>
      </section>
    </div>
  )
}
