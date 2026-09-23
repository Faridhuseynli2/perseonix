import Link from "next/link"
import { ArrowUpRight, Bug, Crosshair, KeyRound, Newspaper, Radar, ShieldCheck, Siren, Skull } from "lucide-react"
import { DashboardRefresher } from "@/components/intel/dashboard-refresher"
import { LiveClock } from "@/components/intel/live-clock"
import { TimezoneAutoSet } from "@/components/settings/timezone-autoset"
import { PostureGauge, postureBand, SeverityBar, Sparkline } from "@/components/app/overview-widgets"
import { CisoBoard } from "@/components/app/ciso-board"
import { requireUser } from "@/lib/auth/dal"
import { listDetections } from "@/lib/brand/store"
import { cveStats, listCves } from "@/lib/intel/cve"
import { listArticles, newsStats, topMentions } from "@/lib/intel/news"
import { notificationFeed } from "@/lib/notifications/feed"
import { datasetStats } from "@/lib/adversaries/data"
import { liveSnapshot, recentVictims, type Range } from "@/lib/ransomware/data"
import { cn } from "@/lib/utils"

const n = (x: number) => x.toLocaleString("en-US")
const DAY = 86_400_000
const SEV_DOT: Record<string, string> = {
  critical: "bg-sev-critical",
  high: "bg-sev-high",
  medium: "bg-signal",
  low: "bg-glow",
  info: "bg-muted-foreground/50",
}

function last7(dates: (string | null)[]): number[] {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const startMs = start.getTime()
  const b = [0, 0, 0, 0, 0, 0, 0]
  for (const s of dates) {
    if (!s) continue
    const d = new Date(s)
    if (Number.isNaN(d.getTime())) continue
    d.setHours(0, 0, 0, 0)
    const i = 6 - Math.round((startMs - d.getTime()) / DAY)
    if (i >= 0 && i < 7) b[i]++
  }
  return b
}

export default async function CommandCenter() {
  const user = await requireUser()
  const actor = { id: user.id, organizationId: user.organizationId }

  const [cstats, cveRows, nstats, news7, actorsTop, malwareTop, live, rw7, detections, alerts] = await Promise.all([
    cveStats(),
    listCves({ limit: 300, sort: "recent" }),
    newsStats(),
    listArticles({ sinceMinutes: 10080, limit: 500 }),
    topMentions("actor", 6),
    topMentions("malware", 6),
    liveSnapshot(),
    recentVictims(300, "7d" as Range),
    listDetections(actor),
    notificationFeed(user),
  ])
  const adv = datasetStats()
  const firstName = user.name?.trim().split(/\s+/)[0] || "analyst"

  // 7-day trend sparklines
  const newsTrend = last7(news7.map((a) => a.publishedAt ?? a.createdAt))
  const rwTrend = last7(rw7.map((v) => v.discovered))
  const cveTrend = last7(cveRows.map((c) => c.published))

  // Risk posture — explainable drivers
  const highBrand = detections.filter((d) => d.severity === "high").length
  const drivers = [
    { pts: Math.min(30, live.last24h * 5), label: `${live.last24h} ransomware victims in 24h` },
    { pts: Math.min(25, nstats.critical * 4), label: `${nstats.critical} critical news items` },
    { pts: Math.min(20, highBrand * 8), label: `${highBrand} high-risk brand lookalikes` },
    { pts: Math.min(15, alerts.unread * 3), label: `${alerts.unread} unread alerts` },
    { pts: Math.min(10, cstats.kev > 0 ? 10 : 0), label: `${cstats.kev} exploited CVEs tracked` },
  ].filter((d) => d.pts > 0)
  const score = Math.min(100, Math.round(drivers.reduce((a, d) => a + d.pts, 0)))
  const band = postureBand(score)
  const bandWord: Record<string, string> = { critical: "critical", high: "elevated", guarded: "guarded", low: "low" }
  const bandDot: Record<string, string> = { critical: "bg-sev-critical", high: "bg-sev-high", guarded: "bg-signal", low: "bg-glow" }

  // Plain-language situation report, assembled from the live numbers.
  const plural = (count: number, one: string, many = one + "s") => (count === 1 ? one : many)
  const brief: string[] = []
  if (cstats.kev > 0) brief.push(`${cstats.kev} actively-exploited ${plural(cstats.kev, "CVE")}`)
  if (live.last24h > 0) brief.push(`${live.last24h} ransomware ${plural(live.last24h, "victim")} in 24h`)
  if (nstats.critical > 0) brief.push(`${nstats.critical} critical news ${plural(nstats.critical, "item")}`)
  if (highBrand > 0) brief.push(`${highBrand} high-risk ${plural(highBrand, "lookalike")}`)
  if (alerts.unread > 0) brief.push(`${alerts.unread} unread ${plural(alerts.unread, "alert")}`)
  const briefing = brief.length
    ? `${brief.slice(0, 3).join(" · ")} — posture ${bandWord[band]}`
    : "No active pressure signals — all monitored feeds quiet"

  // Bloomberg-style metric rail (hairline-divided terminal strip).
  const rail = [
    { label: "Risk posture", value: n(score), sub: bandWord[band] },
    { label: "Exploited", value: n(cstats.kev), sub: "KEV CVEs" },
    { label: "Ransomware", value: n(live.last24h), sub: "victims · 24h" },
    { label: "News", value: n(nstats.last24h), sub: "today" },
    { label: "Lookalikes", value: n(highBrand), sub: "high-risk" },
    { label: "Alerts", value: n(alerts.unread), sub: "unread" },
  ]

  // Priority action queue — the "do this now" list, curated across modules
  type Task = { sev: string; title: string; module: string; why: string; href: string }
  const queue: Task[] = []
  for (const c of cveRows.filter((c) => c.kev).slice(0, 4))
    queue.push({ sev: "critical", title: c.title ?? c.cveId, module: "CVE", why: "Actively exploited (KEV)", href: `/app/modules/intel/cve/${encodeURIComponent(c.cveId)}` })
  for (const a of news7.filter((a) => a.severity === "critical" || a.severity === "high").slice(0, 5))
    queue.push({ sev: a.severity ?? "high", title: a.title, module: "News", why: a.source ?? "Threat news", href: `/app/modules/intel/news?a=${encodeURIComponent(a.id)}` })
  for (const d of detections.filter((d) => d.severity === "high").slice(0, 3))
    queue.push({ sev: "high", title: d.domain, module: "Brand", why: `Lookalike of ${d.assetDomain}`, href: `/app/modules/brand/detections/${d.id}` })
  const sevRank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }
  queue.sort((a, b) => (sevRank[a.sev] ?? 5) - (sevRank[b.sev] ?? 5))
  const tasks = queue.slice(0, 8)

  const tiles = [
    { label: "CVE Feed", value: n(cstats.total), sub: `${cstats.kev} exploited`, href: "/app/modules/intel/cve", icon: Bug },
    { label: "Threat News", value: n(nstats.total), sub: `${nstats.last24h} today`, href: "/app/modules/intel/news", icon: Newspaper },
    { label: "Ransomware", value: n(live.last24h), sub: "victims · 24h", href: "/app/modules/ransomware", icon: Skull },
    { label: "Adversaries", value: n(adv.groups), sub: "tracked actors", href: "/app/modules/adversaries", icon: Crosshair },
    { label: "Brand", value: n(detections.length), sub: "lookalikes", href: "/app/modules/brand", icon: ShieldCheck },
    { label: "Credentials", value: "—", sub: "exposure check", href: "/app/modules/credentials", icon: KeyRound },
  ]

  const maxActor = Math.max(1, ...actorsTop.map((a) => a.count))
  const maxMalware = Math.max(1, ...malwareTop.map((m) => m.count))

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-4">
      <DashboardRefresher intervalMs={60000} />
      <TimezoneAutoSet current={user.timezone} />

      {/* Masthead */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/10 pb-4">
        <div>
          <p className="eyebrow flex items-center gap-2 text-[10px] text-glow">
            <span aria-hidden className="inline-block size-1.5 rounded-full bg-glow motion-safe:animate-beacon" />
            Perseonix Corvael // Command Center
          </p>
          <h1 className="mt-2 font-display text-[26px] leading-none font-semibold tracking-tight text-ink lg:text-[30px]">
            Welcome back, {firstName}.
          </h1>
          <p className="mt-2 flex items-center gap-2 font-mono text-[11px] text-foreground/70">
            <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", bandDot[band], band !== "low" && "motion-safe:animate-beacon")} />
            {briefing}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <LiveClock tz={user.timezone} />
          {user.organizationName ? (
            <span className="font-mono text-[10px] tracking-wide text-muted-foreground/50 uppercase">{user.organizationName}</span>
          ) : null}
        </div>
      </div>

      {/* Metric rail — Bloomberg-terminal strip. gap-px over an ink ground
          draws crisp hairlines between cells at any column count. */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-ink/[0.09] bg-ink/10 sm:grid-cols-3 lg:grid-cols-6">
        {rail.map((c) => (
          <div key={c.label} className="bg-navy-900 px-4 py-3">
            <p className="font-mono text-[9px] tracking-[0.16em] text-muted-foreground/55 uppercase">{c.label}</p>
            <p className="mt-1 font-mono text-2xl leading-none font-semibold text-ink tabular-nums">{c.value}</p>
            <p className="mt-1 font-mono text-[9px] tracking-wide text-muted-foreground/45 uppercase">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Posture + trends */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        {/* Posture gauge + drivers */}
        <section className="rounded-xl border border-ink/[0.09] bg-navy-900/50 p-5">
          <PostureGauge score={score} />
          <div className="mt-4 border-t border-ink/[0.07] pt-3">
            <p className="font-mono text-[9px] tracking-[0.14em] text-muted-foreground/60 uppercase">What&apos;s driving it</p>
            <ul className="mt-2 grid gap-1.5">
              {drivers.length === 0 ? (
                <li className="text-[13px] text-muted-foreground">All quiet — no active pressure signals.</li>
              ) : (
                drivers
                  .sort((a, b) => b.pts - a.pts)
                  .map((d) => (
                    <li key={d.label} className="flex items-center gap-2 text-[13px] text-foreground/85">
                      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", band === "critical" ? "bg-sev-critical" : band === "high" ? "bg-sev-high" : "bg-signal")} />
                      {d.label}
                    </li>
                  ))
              )}
            </ul>
          </div>
        </section>

        {/* Right column: sparklines + severity bars */}
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Sparkline data={cveTrend} label="Vulnerabilities" color="#ff8a3d" href="/app/modules/intel/cve" />
            <Sparkline data={newsTrend} label="Threat news" color="#00b5fa" href="/app/modules/intel/news" />
            <Sparkline data={rwTrend} label="Ransomware" color="#ff4d5e" href="/app/modules/ransomware" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <SeverityBar
              title="CVE severity mix"
              total={cstats.total}
              segments={[
                { label: "Critical", value: cstats.critical, color: "#ff4d5e" },
                { label: "High", value: cstats.high, color: "#ff8a3d" },
                { label: "Medium", value: cstats.medium, color: "#ffb400" },
              ]}
            />
            <SeverityBar
              title="Threat-news severity"
              total={nstats.total}
              segments={[
                { label: "Critical", value: nstats.critical, color: "#ff4d5e" },
                { label: "High", value: nstats.high, color: "#ff8a3d" },
                { label: "Other", value: Math.max(0, nstats.total - nstats.critical - nstats.high), color: "#3a4a6b" },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Priority action queue */}
      <section className="rounded-xl border border-ink/[0.09] bg-navy-900/40 p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.14em] text-ink uppercase">
            <Siren className="size-4 text-sev-critical" /> Priority queue
            <span className="font-normal text-muted-foreground/50">{tasks.length}</span>
          </h2>
          <span className="font-mono text-[10px] text-muted-foreground/50">what needs your attention now</span>
        </div>
        {tasks.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-ink/12 bg-navy-950/40 px-4 py-8 text-center text-sm text-muted-foreground">
            Nothing urgent right now. New KEV CVEs, critical news and high-risk lookalikes will surface here.
          </p>
        ) : (
          <ul className="mt-3 grid gap-1.5">
            {tasks.map((t, i) => (
              <li key={i}>
                <Link href={t.href} className="group flex items-center gap-3 rounded-lg border border-ink/[0.06] bg-navy-900/40 px-3 py-2.5 transition-colors hover:border-ink/15 hover:bg-navy-900/70">
                  <span aria-hidden className={cn("size-2 shrink-0 rounded-full", SEV_DOT[t.sev] ?? "bg-muted-foreground/50")} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-foreground/90 group-hover:text-ink">{t.title}</span>
                    <span className="font-mono text-[11px] text-muted-foreground/70">{t.why}</span>
                  </span>
                  <span className="shrink-0 rounded border border-ink/10 bg-ink/[0.03] px-1.5 py-0.5 font-mono text-[9px] tracking-wide text-muted-foreground uppercase">
                    {t.module}
                  </span>
                  <ArrowUpRight className="size-4 shrink-0 text-muted-foreground/30 group-hover:text-glow" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Trending + module tiles */}
      <div className="grid gap-4 lg:grid-cols-3">
        <RankBars title="Trending threat actors" rows={actorsTop} max={maxActor} color="#ff4d5e" hrefFor={(v) => `/app/modules/adversaries/actor/${encodeURIComponent(v)}`} />
        <RankBars title="Active malware families" rows={malwareTop} max={maxMalware} color="#ff8a3d" />
        <section className="rounded-xl border border-ink/[0.09] bg-navy-900/40 p-5">
          <h2 className="font-mono text-[11px] font-semibold tracking-[0.14em] text-ink uppercase">Modules</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {tiles.map((t) => (
              <Link key={t.label} href={t.href} className="group rounded-lg border border-ink/[0.06] bg-navy-900/40 p-3 transition-colors hover:border-glow/30 hover:bg-navy-900/70">
                <t.icon className="size-4 text-muted-foreground/60 group-hover:text-glow" />
                <p className="mt-2 font-mono text-xl font-semibold text-ink tabular-nums">{t.value}</p>
                <p className="font-mono text-[10px] tracking-wide text-muted-foreground/60 uppercase">{t.label}</p>
                <p className="text-[10px] text-muted-foreground/50">{t.sub}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* CISO Board — executive / board-level strategic view */}
      <CisoBoard
        user={user}
        score={score}
        band={band}
        cstats={cstats}
        live={live}
        detections={detections}
        alertsUnread={alerts.unread}
      />

      <p className="pt-1 text-center font-mono text-[10px] text-muted-foreground/40">
        <Radar className="mr-1 inline size-3" />
        Perseonix Corvael · unified command center
      </p>
    </div>
  )
}

function RankBars({
  title,
  rows,
  max,
  color,
  hrefFor,
}: {
  title: string
  rows: { value: string; count: number }[]
  max: number
  color: string
  hrefFor?: (v: string) => string
}) {
  return (
    <section className="rounded-xl border border-ink/[0.09] bg-navy-900/40 p-5">
      <h2 className="font-mono text-[11px] font-semibold tracking-[0.14em] text-ink uppercase">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {rows.map((r) => {
            const row = (
              <span className="block">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate font-mono text-[12px] text-foreground/90">{r.value}</span>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground/50 tabular-nums">{r.count}</span>
                </span>
                <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.06]">
                  <span className="block h-full rounded-full" style={{ width: `${(r.count / max) * 100}%`, backgroundColor: color }} />
                </span>
              </span>
            )
            return (
              <li key={r.value}>
                {hrefFor ? (
                  <Link href={hrefFor(r.value)} className="block rounded-md p-1 transition-colors hover:bg-ink/[0.04]">
                    {row}
                  </Link>
                ) : (
                  <div className="p-1">{row}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
