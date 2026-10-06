import type { Metadata } from "next"
import Link from "next/link"
import { KeyRound, MapPin, Radio, Swords } from "lucide-react"
import { DashboardRefresher } from "@/components/intel/dashboard-refresher"
import { LiveClock } from "@/components/intel/live-clock"
import { FrontlineFeed } from "@/components/frontline/frontline-feed"
import { requireModule } from "@/lib/auth/dal"
import { frontlineStats, listEvents } from "@/lib/frontline/data"
import { categoryLabel, FRONTLINE_MODULE_KEY } from "@/lib/frontline/meta"
import { getConnector } from "@/lib/intel/connectors"
import { formatInTimeZone, offsetLabel } from "@/lib/timezone"

export const metadata: Metadata = { title: "Frontline" }

function ago(iso: string | null): string {
  if (!iso) return "—"
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000)
  if (h < 1) return "<1h"
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}
const n = (x: number) => x.toLocaleString("en-US")

export default async function FrontlinePage() {
  const { user } = await requireModule(FRONTLINE_MODULE_KEY)
  const tz = user.timezone || "UTC"
  const isAdmin = user.role === "admin"
  const connector = getConnector("frontline")!

  const [events, stats] = await Promise.all([listEvents({ limit: 200 }), frontlineStats()])

  const maxCat = Math.max(1, ...stats.byCategory.map((c) => c.count))
  const maxRegion = Math.max(1, ...stats.topRegions.map((r) => r.count))

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-5">
      <DashboardRefresher intervalMs={60000} />

      {/* Masthead */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/10 pb-5">
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-[0.22em] text-sev-critical/90 uppercase">Conflict Monitor</p>
          <h1 className="mt-2 flex items-center gap-2.5 font-display text-[26px] leading-none font-semibold tracking-tight text-ink lg:text-[30px]">
            <Swords className="size-6 text-sev-critical" />
            Frontline
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
            <span>Russia–Ukraine</span>
            <span aria-hidden className="text-muted-foreground/30">/</span>
            <span>{n(stats.total)} events</span>
            <span aria-hidden className="text-muted-foreground/30">/</span>
            <span>{n(stats.last24h)} in last 24h</span>
            <span aria-hidden className="text-muted-foreground/30">/</span>
            {stats.lastAt ? (
              <span title={`${formatInTimeZone(stats.lastAt, tz, { dateStyle: "medium", timeStyle: "short" })} · ${offsetLabel(tz)}`}>
                latest {ago(stats.lastAt)} ago
              </span>
            ) : (
              <span>awaiting feed</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              href="/app/admin/connectors/modules?connector=frontline"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-ink/12 bg-ink/[0.03] px-3 text-sm text-foreground/85 transition-colors hover:bg-ink/[0.07] hover:text-ink"
            >
              <KeyRound className="size-4" />
              Ingestion key
            </Link>
          )}
          <LiveClock tz={tz} />
        </div>
      </header>

      {/* Metric rail */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-ink/[0.09] bg-ink/10 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Events", value: n(stats.total), sub: "tracked" },
          { label: "Last 24h", value: n(stats.last24h), sub: "events", hot: stats.last24h > 0 },
          { label: "Critical", value: n(stats.critical), sub: "severity", hot: stats.critical > 0 },
          { label: "High", value: n(stats.high), sub: "severity" },
          { label: "Regions", value: n(stats.topRegions.length), sub: "active" },
          {
            label: "Latest",
            value: stats.lastAt ? formatInTimeZone(stats.lastAt, tz, { hour: "2-digit", minute: "2-digit", hour12: false }) : "—",
            sub: stats.lastAt ? offsetLabel(tz) : "no feed",
          },
        ].map((c) => (
          <div key={c.label} className="bg-navy-900 px-4 py-3">
            <p className="font-mono text-[9px] tracking-[0.16em] text-muted-foreground/55 uppercase">{c.label}</p>
            <p className={"mt-1 font-mono text-2xl leading-none font-semibold tabular-nums " + (c.hot ? "text-sev-critical" : "text-ink")}>
              {c.value}
            </p>
            <p className="mt-1 font-mono text-[9px] tracking-wide text-muted-foreground/45 uppercase">{c.sub}</p>
          </div>
        ))}
      </div>

      {stats.total === 0 ? (
        /* Empty state — the feed isn't connected yet */
        <div className="rounded-xl border border-dashed border-ink/12 bg-navy-900/30 px-6 py-14 text-center">
          <Radio className="mx-auto size-7 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-foreground/85">No events yet.</p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground/70">
            Frontline fills from an n8n playbook that pushes Russia–Ukraine conflict events (Telegram OSINT + news) to the
            ingestion endpoint below. Mint a key in Module Connectors, then point your playbook here.
          </p>
          <div className="mx-auto mt-4 max-w-lg rounded-lg border border-ink/[0.08] bg-navy-950/50 p-3 text-left">
            <p className="font-mono text-[10px] tracking-wider text-muted-foreground/60 uppercase">Ingestion endpoint</p>
            <p className="mt-1 font-mono text-[12px] text-foreground/85">POST {connector.endpoint}</p>
            <p className="mt-2 font-mono text-[10px] text-muted-foreground/50">
              body: {"{ items: [{ title, summary, category, severity, side, region, country, lat, lng, source, url, happenedAt }] }"}
            </p>
          </div>
          {isAdmin && (
            <Link
              href="/app/admin/connectors/modules?connector=frontline"
              className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-glow/30 bg-glow/[0.06] px-3 py-2 text-sm text-glow transition-colors hover:bg-glow/10"
            >
              <KeyRound className="size-4" />
              Mint ingestion key
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,300px)]">
          {/* Live feed */}
          <FrontlineFeed events={events} tz={tz} categories={stats.byCategory} />

          {/* Right rail: category + regions */}
          <div className="grid content-start gap-4">
            <section className="rounded-xl border border-ink/[0.09] bg-navy-900/40 p-5">
              <h2 className="font-mono text-[11px] font-semibold tracking-[0.14em] text-ink uppercase">By category</h2>
              <ul className="mt-3 grid gap-2">
                {stats.byCategory
                  .slice()
                  .sort((a, b) => b.count - a.count)
                  .map((c) => (
                    <li key={c.category}>
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="font-mono text-[12px] text-foreground/90">{categoryLabel(c.category)}</span>
                        <span className="font-mono text-[10px] text-muted-foreground/50 tabular-nums">{c.count}</span>
                      </span>
                      <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.06]">
                        <span className="block h-full rounded-full bg-sev-high" style={{ width: `${(c.count / maxCat) * 100}%` }} />
                      </span>
                    </li>
                  ))}
              </ul>
            </section>

            {stats.topRegions.length > 0 && (
              <section className="rounded-xl border border-ink/[0.09] bg-navy-900/40 p-5">
                <h2 className="flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.14em] text-ink uppercase">
                  <MapPin className="size-3.5 text-glow" /> Hotspots
                </h2>
                <ul className="mt-3 grid gap-2">
                  {stats.topRegions.map((r) => (
                    <li key={r.region}>
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="min-w-0 truncate font-mono text-[12px] text-foreground/90">{r.region}</span>
                        <span className="font-mono text-[10px] text-muted-foreground/50 tabular-nums">{r.count}</span>
                      </span>
                      <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.06]">
                        <span className="block h-full rounded-full bg-sev-critical" style={{ width: `${(r.count / maxRegion) * 100}%` }} />
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      )}

      <p className="border-t border-ink/[0.07] pt-4 font-mono text-[10px] leading-relaxed text-muted-foreground/55">
        Events are OSINT and open-source reporting, summarised on ingestion. Treat unverified claims as claims; sources are
        linked where available. Timestamps shown in your timezone ({offsetLabel(tz)}).
      </p>
    </div>
  )
}
