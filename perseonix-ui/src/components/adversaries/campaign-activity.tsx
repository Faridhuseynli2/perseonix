import Link from "next/link"
import { ArrowLeft, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react"
import { CampaignFilterBar } from "@/components/adversaries/campaign-filter-bar"
import { EmptyState } from "@/components/admin/ui"
import {
  campaignStats,
  campaignVendors,
  campaignYears,
  filterCampaigns,
} from "@/lib/adversaries/data"
import { cn } from "@/lib/utils"

const PER_PAGE = 30
const numberFormat = new Intl.NumberFormat("en-US")

export type ActivityQuery = { q: string; vendor: string; year: number; page: number }

export function CampaignActivity({ query }: { query: ActivityQuery }) {
  const { q, vendor, year } = query
  const years = campaignYears()
  const stats = campaignStats()
  const results = filterCampaigns({ q, vendor, year: year || undefined })
  const filtered = Boolean(q || vendor || year)
  const maxYear = Math.max(...years.map((y) => y.count), 1)

  const totalPages = Math.max(1, Math.ceil(results.length / PER_PAGE))
  const current = Math.min(Math.max(1, query.page), totalPages)
  const shown = results.slice((current - 1) * PER_PAGE, current * PER_PAGE)

  const buildQuery = (next: Partial<ActivityQuery>) => {
    const merged = { q, vendor, year, page: current, ...next }
    const search = new URLSearchParams()
    if (merged.q) search.set("q", merged.q)
    if (merged.vendor) search.set("vendor", merged.vendor)
    if (merged.year) search.set("year", String(merged.year))
    if (merged.page && merged.page > 1) search.set("page", String(merged.page))
    const s = search.toString()
    return `/app/modules/adversaries/activity${s ? `?${s}` : ""}`
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      <Link
        href="/app/modules/adversaries"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        All threat actors
      </Link>

      <section className="hud-corners relative mt-4 overflow-hidden rounded-2xl border border-ink/[0.08] bg-navy-900/70">
        <div aria-hidden className="hud-grid fade-mask-top pointer-events-none absolute inset-0 opacity-50" />
        <div className="relative p-6 lg:p-7">
          <p className="eyebrow text-[10px] text-glow">Adversary Intelligence // Activity</p>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink lg:text-3xl">
            Threat activity
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Reported campaigns and operations across tracked adversaries, {years[0]?.year}–
            {years[years.length - 1]?.year}. {numberFormat.format(stats.total)} reports, {stats.attributed}{" "}
            attributed to a tracked actor.
          </p>

          <div className="mt-6 flex items-end gap-2">
            {years.map((y) => {
              const active = year === y.year
              return (
                <Link
                  key={y.year}
                  href={active ? buildQuery({ year: 0, page: 1 }) : buildQuery({ year: y.year, page: 1 })}
                  className="group flex flex-1 flex-col items-center gap-1.5"
                  title={`${y.year}: ${y.count} reports`}
                >
                  <span className="font-mono text-[10px] text-muted-foreground tabular-nums">{y.count}</span>
                  <span
                    className={cn(
                      "w-full rounded-t transition-colors",
                      active ? "bg-glow" : "bg-brand/40 group-hover:bg-brand/70"
                    )}
                    style={{ height: `${Math.max(6, (y.count / maxYear) * 96)}px` }}
                  />
                  <span
                    className={cn(
                      "font-mono text-[10px] tabular-nums",
                      active ? "text-glow" : "text-muted-foreground/70"
                    )}
                  >
                    {`'${String(y.year).slice(2)}`}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <div className="mt-4">
        <CampaignFilterBar
          value={{ q, vendor, year: year ? String(year) : "" }}
          vendors={campaignVendors()}
          resultCount={results.length}
        />
      </div>

      <section className="mt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <span aria-hidden className="h-4 w-1 rounded-full bg-signal" />
            {filtered ? "Matching reports" : "All reports"}
            <span className="font-mono text-xs font-normal text-muted-foreground">
              {numberFormat.format(results.length)}
            </span>
          </h2>
          {filtered && (
            <Link href="/app/modules/adversaries/activity" className="text-xs font-medium text-glow hover:text-ink">
              Clear filters
            </Link>
          )}
        </div>

        {shown.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No reports match" body="Try a different search, year or source." />
          </div>
        ) : (
          <ul className="mt-4 grid gap-2">
            {shown.map((campaign) => (
              <li
                key={campaign.id}
                className="flex items-center gap-4 rounded-lg border border-ink/[0.07] bg-navy-800/60 px-4 py-3 transition-colors hover:border-brand/30"
              >
                <span className="w-10 shrink-0 font-mono text-sm font-semibold text-glow tabular-nums">
                  {campaign.year}
                </span>
                <div className="min-w-0 flex-1">
                  <a
                    href={campaign.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="group inline-flex items-start gap-1.5 text-[13px] text-foreground/90 hover:text-ink"
                  >
                    <span className="line-clamp-1">{campaign.title}</span>
                    <ArrowUpRight aria-hidden className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50 group-hover:text-glow" />
                  </a>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                    {campaign.actorSlug ? (
                      <Link
                        href={`/app/modules/adversaries/${campaign.actorSlug}`}
                        className="font-medium text-foreground/70 hover:text-glow"
                      >
                        {campaign.actorName}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground/60">Unattributed</span>
                    )}
                    <span aria-hidden className="text-muted-foreground/30">·</span>
                    <span className="font-mono tracking-wider uppercase">{campaign.vendor}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
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
          Each entry links to public reporting by the named vendor. Perseonix stores the reference and the
          report&apos;s own title, not its content.
        </p>
      </section>
    </div>
  )
}
