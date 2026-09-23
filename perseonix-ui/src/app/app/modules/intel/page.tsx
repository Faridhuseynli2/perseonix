import type { Metadata } from "next"
import Link from "next/link"
import { Bug, MonitorPlay, Radar, Rss } from "lucide-react"
import { DashboardRefresher } from "@/components/intel/dashboard-refresher"
import { Awaiting, Empty, FeedCol, RankRows, Rows, StreamRow } from "@/components/intel/feed-wall"
import { LiveClock } from "@/components/intel/live-clock"
import { ThreatMap } from "@/components/intel/threat-map"
import { requireModule } from "@/lib/auth/dal"
import { listDetections } from "@/lib/brand/store"
import { INTEL_MODULE_KEY } from "@/lib/intel/connectors"
import { cveStats, listCves } from "@/lib/intel/cve"
import { listArticles } from "@/lib/intel/news"
import {
  liveSnapshot,
  mapData,
  overview,
  recentVictims,
  topCountries,
  topGroups,
  topIndustries,
  type Range,
} from "@/lib/ransomware/data"
import { countryName, sectorLabel, timeAgo } from "@/lib/ransomware/meta"
import { datasetStats } from "@/lib/adversaries/data"
import { geoPoints } from "@/lib/ransomware/world-map"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Threat Monitor · Threat Intelligence" }

const n = (x: number) => x.toLocaleString("en-US")

const RANGES: { key: string; label: string }[] = [
  { key: "live", label: "LIVE" },
  { key: "24h", label: "24H" },
  { key: "3d", label: "3D" },
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
]

export default async function ThreatCommandPage({ searchParams }: PageProps<"/app/modules/intel">) {
  const { user } = await requireModule(INTEL_MODULE_KEY)
  const actor = { id: user.id, organizationId: user.organizationId }
  const sp = await searchParams
  const sel = typeof sp?.range === "string" && RANGES.some((r) => r.key === sp.range) ? sp.range : "live"
  const isLive = sel === "live"
  const range = (isLive ? "24h" : sel) as Range
  const rangeLabel = RANGES.find((r) => r.key === sel)?.label ?? "24H"

  const [points, ov, live, groups, countries, sectors, victims, brand, cveRows, cstats, newsRows] = await Promise.all([
    mapData(range),
    overview(range),
    liveSnapshot(),
    topGroups(range, {}, 8),
    topCountries(range, {}, 8),
    topIndustries(range, {}, 8),
    recentVictims(20, range),
    listDetections(actor),
    listCves({ limit: 12 }),
    cveStats(),
    listArticles({ limit: 12 }),
  ])
  const adv = datasetStats()
  const geo = geoPoints(points)

  const metrics: { label: string; value: string; hot?: boolean; muted?: boolean }[] = [
    { label: `Victims · ${rangeLabel}`, value: n(ov.totalVictims), hot: ov.totalVictims > 0 },
    { label: "Last 24h", value: n(live.last24h), hot: live.last24h > 0 },
    { label: "Active groups", value: n(ov.activeGroups) },
    { label: "Countries hit", value: n(ov.countries) },
    { label: "Tracked actors", value: n(adv.groups) },
    { label: "Brand exposure", value: n(brand.length) },
    { label: "CVEs · KEV", value: cstats.total ? `${n(cstats.total)}` : "—", hot: cstats.kev > 0, muted: !cstats.total },
    { label: "IOC feed", value: "—", muted: true },
  ]

  return (
    <div className="mx-auto flex max-w-[1700px] flex-col gap-3">
      <DashboardRefresher intervalMs={isLive ? 20000 : 120000} />

      {/* Command bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-2.5">
        <div className="flex items-center gap-2.5">
          <Radar className="size-4 text-glow" />
          <span className="font-mono text-[11px] font-semibold tracking-[0.2em] text-ink uppercase">
            Perseonix Corvael<span className="text-muted-foreground/40">{" // "}</span>Threat Monitor
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* time-range selector */}
          <div className="flex items-center gap-0.5 rounded-md border border-ink/[0.08] bg-navy-900/50 p-0.5">
            {RANGES.map((r) => {
              const active = r.key === sel
              return (
                <Link
                  key={r.key}
                  href={`?range=${r.key}`}
                  scroll={false}
                  className={cn(
                    "inline-flex items-center gap-1 rounded px-2.5 py-1 font-mono text-[10px] tracking-wide uppercase transition-colors",
                    active ? "bg-ink/[0.12] text-ink" : "text-muted-foreground hover:text-ink"
                  )}
                >
                  {r.key === "live" && (
                    <span
                      aria-hidden
                      className={cn("size-1.5 rounded-full", active ? "bg-glow motion-safe:animate-beacon" : "bg-muted-foreground/40")}
                    />
                  )}
                  {r.label}
                </Link>
              )
            })}
          </div>
          <Link
            href="/app/modules/intel/wall"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-ink/12 bg-ink/[0.03] px-3 font-mono text-[10px] tracking-wide text-foreground/85 uppercase transition-colors hover:bg-ink/[0.07] hover:text-ink"
          >
            <MonitorPlay className="size-3.5" /> Wallboard
          </Link>
          <LiveClock tz={user.timezone} />
        </div>
      </div>

      {/* Metric strip — hairline cells, not cards */}
      <div className="flex flex-wrap overflow-hidden rounded-lg border border-ink/[0.08] bg-navy-900/40 divide-x divide-ink/[0.07]">
        {metrics.map((m) => (
          <div key={m.label} className="min-w-[110px] flex-1 px-4 py-2.5">
            <p className={"font-mono text-lg font-semibold tabular-nums " + (m.hot ? "text-sev-critical" : m.muted ? "text-muted-foreground/60" : "text-ink")}>
              {m.value}
            </p>
            <p className="mt-0.5 font-mono text-[9px] tracking-[0.14em] text-muted-foreground/60 uppercase">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Full-bleed threat map */}
      <ThreatMap
        points={geo}
        victims={victims.map((v) => ({ id: v.id, groupName: v.groupName, victim: v.victim, country: v.country, discovered: v.discovered }))}
      />

      {/* Live intel wall */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <FeedCol title="Ransomware victims" count={victims.length} live>
          {victims.length === 0 ? (
            <Empty>No claimed victims in the window.</Empty>
          ) : (
            <Rows>
              {victims.slice(0, 12).map((v) => (
                <StreamRow
                  key={v.id}
                  href={`/app/modules/ransomware/victims/${v.id}`}
                  headline={v.victim}
                  tag={v.groupName}
                  meta={[v.country ? countryName(v.country) : null, v.sector ? sectorLabel(v.sector) : null].filter(Boolean).join(" · ")}
                  time={timeAgo(v.discovered)}
                />
              ))}
            </Rows>
          )}
        </FeedCol>

        <FeedCol title="Most active groups" count={groups.length} live>
          <RankRows rows={groups} render={(r) => r.label} />
        </FeedCol>

        <FeedCol title="Targeted sectors" count={sectors.length} live>
          <RankRows rows={sectors} render={(r) => sectorLabel(r.key)} />
        </FeedCol>

        <FeedCol title="Top countries" count={countries.length} live>
          <RankRows rows={countries} render={(r) => countryName(r.key)} />
        </FeedCol>

        <FeedCol title="Brand exposure" count={brand.length} live={brand.length > 0}>
          {brand.length === 0 ? (
            <Empty>
              No lookalikes. <Link href="/app/modules/brand" className="text-glow hover:underline">Open Brand Protection</Link>
            </Empty>
          ) : (
            <Rows>
              {brand.slice(0, 12).map((d) => (
                <StreamRow
                  key={d.id}
                  href={`/app/modules/brand/detections/${d.id}`}
                  headline={d.domain}
                  tag={d.severity}
                  meta={`lookalike of ${d.assetDomain}`}
                  time={`risk ${d.score}`}
                />
              ))}
            </Rows>
          )}
        </FeedCol>

        <FeedCol title="CVE feed" count={cveRows.length} live={cveRows.length > 0}>
          {cveRows.length === 0 ? (
            <Awaiting href="/app/modules/intel/cve" label="Connect the CVE feed" icon={Bug} />
          ) : (
            <Rows>
              {cveRows.slice(0, 10).map((c) => (
                <StreamRow
                  key={c.id}
                  href={`/app/modules/intel/cve/${encodeURIComponent(c.cveId)}`}
                  headline={c.title ?? c.cveId}
                  tag={c.severity}
                  meta={`${c.cveId}${c.cvss != null ? ` · CVSS ${c.cvss.toFixed(1)}` : ""}`}
                  time={c.kev ? "KEV" : timeAgo(c.published)}
                />
              ))}
            </Rows>
          )}
        </FeedCol>

        <FeedCol title="Threat news" count={newsRows.length} live={newsRows.length > 0}>
          {newsRows.length === 0 ? (
            <Awaiting href="/app/modules/intel/news" label="Connect the news feed" icon={Rss} />
          ) : (
            <Rows>
              {newsRows.slice(0, 10).map((a) => (
                <StreamRow
                  key={a.id}
                  href={`/app/modules/intel/news?a=${encodeURIComponent(a.id)}`}
                  headline={a.title}
                  tag={a.severity ?? "info"}
                  meta={[a.source, a.category].filter(Boolean).join(" · ")}
                  time={timeAgo(a.publishedAt ?? a.createdAt)}
                />
              ))}
            </Rows>
          )}
        </FeedCol>

        <FeedCol title="IOC feed">
          <Awaiting href="/app/modules/intel" label="IOC feed coming soon" icon={Radar} />
        </FeedCol>
      </div>

      <p className="border-t border-ink/[0.07] pt-3 font-mono text-[10px] leading-relaxed text-muted-foreground/55">
        Sources: ransomware.live · Brand Protection. CVE / IOC / news activate with their ingestion connectors.
      </p>
    </div>
  )
}
