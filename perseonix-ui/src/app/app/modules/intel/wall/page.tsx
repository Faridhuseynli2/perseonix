import type { Metadata } from "next"
import { Bug } from "lucide-react"
import { DashboardRefresher } from "@/components/intel/dashboard-refresher"
import { Awaiting, FeedCol, RankRows, Rows, StreamRow } from "@/components/intel/feed-wall"
import { ThreatMap } from "@/components/intel/threat-map"
import { Wallboard } from "@/components/intel/wallboard"
import { requireModule } from "@/lib/auth/dal"
import { listDetections } from "@/lib/brand/store"
import { INTEL_MODULE_KEY } from "@/lib/intel/connectors"
import {
  liveSnapshot,
  mapData,
  overview,
  recentVictims,
  topCountries,
  topGroups,
  topIndustries,
} from "@/lib/ransomware/data"
import { countryName, sectorLabel, timeAgo } from "@/lib/ransomware/meta"
import { datasetStats } from "@/lib/adversaries/data"
import { geoPoints } from "@/lib/ransomware/world-map"

export const metadata: Metadata = { title: "Threat Wall" }

const n = (x: number) => x.toLocaleString("en-US")

export default async function ThreatWallPage() {
  const { user } = await requireModule(INTEL_MODULE_KEY)
  const actor = { id: user.id, organizationId: user.organizationId }

  const [points, ov, live, groups, countries, sectors, victims, brand] = await Promise.all([
    mapData("7d"),
    overview("7d"),
    liveSnapshot(),
    topGroups("7d", {}, 10),
    topCountries("7d", {}, 10),
    topIndustries("7d", {}, 10),
    recentVictims(24, "7d"),
    listDetections(actor),
  ])
  const adv = datasetStats()
  const geo = geoPoints(points)

  const metrics: { label: string; value: string; hot?: boolean; muted?: boolean }[] = [
    { label: "Victims · 7d", value: n(ov.totalVictims), hot: ov.totalVictims > 0 },
    { label: "Last 24h", value: n(live.last24h), hot: live.last24h > 0 },
    { label: "Active groups", value: n(ov.activeGroups) },
    { label: "Countries hit", value: n(ov.countries) },
    { label: "Tracked actors", value: n(adv.groups) },
    { label: "Brand exposure", value: n(brand.length) },
  ]

  return (
    <Wallboard tz={user.timezone}>
      <DashboardRefresher intervalMs={15000} />
      <div className="flex flex-col gap-3">
        {/* Metric strip — large for TV */}
        <div className="flex flex-wrap overflow-hidden rounded-lg border border-ink/[0.08] bg-navy-900/40 divide-x divide-ink/[0.07]">
          {metrics.map((m) => (
            <div key={m.label} className="min-w-[130px] flex-1 px-5 py-3">
              <p className={"font-mono text-3xl font-semibold tabular-nums " + (m.hot ? "text-sev-critical" : m.muted ? "text-muted-foreground/60" : "text-ink")}>
                {m.value}
              </p>
              <p className="mt-1 font-mono text-[10px] tracking-[0.16em] text-muted-foreground/60 uppercase">{m.label}</p>
            </div>
          ))}
        </div>

        {/* Map + primary stream */}
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
          <ThreatMap
            points={geo}
            victims={victims.map((v) => ({ id: v.id, groupName: v.groupName, victim: v.victim, country: v.country, discovered: v.discovered }))}
          />
          <FeedCol title="Ransomware victims" count={victims.length} live>
            {victims.length === 0 ? (
              <div className="px-3 py-6 text-center text-[11px] text-muted-foreground/60">No claimed victims in the window.</div>
            ) : (
              <Rows>
                {victims.slice(0, 16).map((v) => (
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
        </div>

        {/* Rank + feed wall */}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <FeedCol title="Most active groups" count={groups.length} live>
            <RankRows rows={groups} render={(r) => r.label} />
          </FeedCol>
          <FeedCol title="Targeted sectors" count={sectors.length} live>
            <RankRows rows={sectors} render={(r) => sectorLabel(r.key)} />
          </FeedCol>
          <FeedCol title="Top countries" count={countries.length} live>
            <RankRows rows={countries} render={(r) => countryName(r.key)} />
          </FeedCol>
          <FeedCol title="CVE feed">
            <Awaiting href="/app/modules/intel/cve" label="Connect the CVE feed" icon={Bug} />
          </FeedCol>
        </div>
      </div>
    </Wallboard>
  )
}
