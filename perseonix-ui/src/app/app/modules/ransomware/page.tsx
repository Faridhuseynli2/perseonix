import type { Metadata } from "next"
import Link from "next/link"
import { AttackMap } from "@/components/ransomware/attack-map"
import { AttackVolume } from "@/components/ransomware/attack-volume"
import { FilterRail } from "@/components/ransomware/filter-rail"
import { LiveFeed } from "@/components/ransomware/live-feed"
import { MetricRail } from "@/components/ransomware/metric-rail"
import { EmptyData } from "@/components/ransomware/pieces"
import { RankCard } from "@/components/ransomware/rank-card"
import { RefreshButton } from "@/components/ransomware/refresh-button"
import { RansomwareWatchButton } from "@/components/ransomware/watch-button"
import { requireModule } from "@/lib/auth/dal"
import {
  attackVolume,
  filterOptions,
  lastIngestion,
  liveSnapshot,
  mapData,
  normalizeRange,
  overview,
  recentVictims,
  topCountries,
  topGroups,
  topIndustries,
  type Facets,
} from "@/lib/ransomware/data"
import { RANSOMWARE_MODULE_KEY, timeAgo } from "@/lib/ransomware/meta"
import { watchExists } from "@/lib/ransomware/watch"

export const metadata: Metadata = { title: "Ransomware Tracker" }

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ""
const rangeWord: Record<string, string> = {
  "30d": "30 days",
  "6m": "6 months",
  "1y": "12 months",
  all: "all time",
}

function SectionLabel({ index, title, aside }: { index: string; title: string; aside?: string }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="font-mono text-[11px] font-semibold text-sev-critical">{index}</span>
      <h2 className="font-mono text-[12px] font-semibold tracking-[0.18em] text-ink uppercase">{title}</h2>
      <span aria-hidden className="h-px flex-1 bg-ink/10" />
      {aside && <span className="font-mono text-[10px] tracking-wide text-muted-foreground/50 uppercase">{aside}</span>}
    </div>
  )
}

export default async function RansomwareDashboard({
  searchParams,
}: PageProps<"/app/modules/ransomware">) {
  const { user } = await requireModule(RANSOMWARE_MODULE_KEY)
  const canRefresh = user.role === "admin"
  const params = await searchParams
  const range = normalizeRange(one(params.range))
  const facets: Facets = {
    country: one(params.country) || undefined,
    group: one(params.group) || undefined,
    sector: one(params.sector) || undefined,
  }
  const q = one(params.q)
  const hasFacets = Boolean(facets.country || facets.group || facets.sector || q)

  const [ov, live, feed, volume, groups, countries, industries, points, options, ingestion] =
    await Promise.all([
      overview(range, facets),
      liveSnapshot(facets),
      recentVictims(10, range, facets),
      attackVolume(range, facets),
      topGroups(range, facets),
      topCountries(range, facets),
      topIndustries(range, facets),
      mapData(range, facets),
      filterOptions(),
      lastIngestion(),
    ])

  const empty = ov.totalVictims === 0 && live.last30d === 0 && !hasFacets
  const watchingView = hasFacets ? await watchExists(user.id, facets) : false
  const watchGroupName = facets.group
    ? options.groups.find((g) => g.value === facets.group)?.label
    : undefined

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-5">
      {/* Masthead — asymmetric, command-center */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/10 pb-5">
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-[0.22em] text-sev-critical/90 uppercase">
            Perseonix Corvael // Ransomware Ops
          </p>
          <h1 className="mt-2 font-display text-[28px] leading-none font-semibold tracking-tight text-ink lg:text-4xl">
            Ransomware Command
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 font-semibold text-sev-critical">
              <span aria-hidden className="size-1.5 rounded-full bg-sev-critical motion-safe:animate-beacon" />
              LIVE
            </span>
            <span aria-hidden className="text-muted-foreground/30">/</span>
            <span>{ingestion ? `updated ${timeAgo(ingestion.ranAt)}` : "awaiting first refresh"}</span>
            <span aria-hidden className="text-muted-foreground/30">/</span>
            <span>window: {rangeWord[range]}</span>
            <span aria-hidden className="text-muted-foreground/30">/</span>
            <span className="text-muted-foreground/70">source: ransomware.live</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <nav className="flex items-center gap-1 font-mono text-[11px] tracking-wide uppercase">
            <span className="rounded bg-sev-critical/12 px-2.5 py-1.5 text-sev-critical">Command</span>
            <Link href="/app/modules/ransomware/victims" className="rounded px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-ink/[0.04] hover:text-ink">
              Victims
            </Link>
            <Link href="/app/modules/ransomware/groups" className="rounded px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-ink/[0.04] hover:text-ink">
              Groups
            </Link>
            <Link href="/app/modules/ransomware/watchlist" className="rounded px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-ink/[0.04] hover:text-ink">
              Watchlist
            </Link>
          </nav>
          {canRefresh && <RefreshButton />}
        </div>
      </header>

      <MetricRail overview={ov} live={live} />

      <FilterRail
        value={{ q, country: facets.country ?? "", group: facets.group ?? "", sector: facets.sector ?? "", range }}
        countries={options.countries}
        sectors={options.sectors}
        groups={options.groups}
      />

      {hasFacets && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sev-critical/20 bg-sev-critical/[0.04] px-4 py-3">
          <p className="font-mono text-[11px] text-muted-foreground">
            <span className="tracking-[0.15em] text-sev-critical uppercase">Watch this slice</span>
            <span className="ml-2 text-foreground/70">
              get a bell alert whenever a new victim matches these filters.
            </span>
          </p>
          <RansomwareWatchButton
            facets={{ country: facets.country, sector: facets.sector, group: facets.group, groupName: watchGroupName }}
            initialWatching={watchingView}
            idleLabel="Watch this view"
            size="sm"
          />
        </div>
      )}

      {empty ? (
        <EmptyData canRefresh={canRefresh} />
      ) : (
        <>
          <section>
            <SectionLabel index="01" title="Live threat feed" aside={`${live.last30d} in ${rangeWord[range] === "all time" ? "range" : rangeWord[range]}`} />
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,440px)]">
              <LiveFeed victims={feed} />
              <AttackMap points={points} />
            </div>
          </section>

          <section>
            <SectionLabel index="02" title="Attack volume" />
            <AttackVolume points={volume} title={`Claims per ${range === "30d" ? "day" : "month"} — last ${rangeWord[range]}`} />
          </section>

          <section>
            <SectionLabel index="03" title="Targeting breakdown" />
            <div className="grid gap-4 lg:grid-cols-3">
              <RankCard kind="groups" rows={groups} />
              <RankCard kind="countries" rows={countries} />
              <RankCard kind="industries" rows={industries} />
            </div>
          </section>
        </>
      )}

      <p className="border-t border-ink/[0.07] pt-4 font-mono text-[10.5px] leading-relaxed text-muted-foreground/60">
        Victims are unverified claims posted by ransomware operators on their leak sites. Perseonix stores only claim
        metadata — never leak-site links or stolen data. Source: ransomware.live.
      </p>
    </div>
  )
}
