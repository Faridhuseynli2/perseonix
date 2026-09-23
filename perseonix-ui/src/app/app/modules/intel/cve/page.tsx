import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Bug, KeyRound } from "lucide-react"
import { CveFeedGrid } from "@/components/intel/cve-feed-grid"
import { requireModule } from "@/lib/auth/dal"
import { getConnector, INTEL_MODULE_KEY } from "@/lib/intel/connectors"
import { cveStats, listCves } from "@/lib/intel/cve"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "CVE Feed · Threat Intelligence" }

const RANGES: { key: string; label: string; min: number }[] = [
  { key: "", label: "All time", min: 0 },
  { key: "15m", label: "15 min", min: 15 },
  { key: "1h", label: "1 hour", min: 60 },
  { key: "24h", label: "24 hours", min: 1440 },
  { key: "3d", label: "3 days", min: 4320 },
  { key: "7d", label: "7 days", min: 10080 },
  { key: "30d", label: "30 days", min: 43200 },
]

function ago(iso: string | null): string {
  if (!iso) return "—"
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000)
  if (h < 1) return "<1h"
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export default async function CveFeedPage({ searchParams }: PageProps<"/app/modules/intel/cve">) {
  const { user } = await requireModule(INTEL_MODULE_KEY)
  const isAdmin = user.role === "admin"
  const connector = getConnector("cve")!
  const sp = await searchParams
  const view = typeof sp?.view === "string" ? sp.view : ""
  const sort = sp?.sort === "recent" ? "recent" : "cvss"
  const range = typeof sp?.range === "string" && RANGES.some((r) => r.key === sp.range) ? sp.range : ""
  const sinceMinutes = RANGES.find((r) => r.key === range)?.min ?? 0

  const filter =
    view === "kev" ? { kev: true } : view === "critical" || view === "high" || view === "medium" ? { severity: view } : {}
  const [rows, stats] = await Promise.all([listCves({ ...filter, sort, sinceMinutes, limit: 300 }), cveStats()])

  const chips: { key: string; label: string; count: number; color?: string }[] = [
    { key: "", label: "All", count: stats.total },
    { key: "critical", label: "Critical · 9+", count: stats.critical, color: "#ff4d5e" },
    { key: "high", label: "High · 7–8.9", count: stats.high, color: "#ff8a3d" },
    { key: "medium", label: "Medium · 4–6.9", count: stats.medium, color: "#ffb400" },
    { key: "kev", label: "Exploited", count: stats.kev, color: "#ff4d5e" },
  ]
  const q = (v: string, s: string, r: string) => {
    const params = new URLSearchParams()
    if (v) params.set("view", v)
    if (s !== "cvss") params.set("sort", s)
    if (r) params.set("range", r)
    const qs = params.toString()
    return `/app/modules/intel/cve${qs ? `?${qs}` : ""}`
  }

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-5">
      <Link
        href="/app/modules/intel"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Threat Intelligence
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/10 pb-5">
        <div>
          <p className="font-mono text-[10px] tracking-[0.22em] text-glow uppercase">Threat Intelligence // CVE Feed</p>
          <h1 className="mt-2 flex items-center gap-2.5 font-display text-[26px] leading-none font-semibold tracking-tight text-ink lg:text-[30px]">
            <Bug className="size-6 text-glow" />
            CVEs tracked
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
            <span>{stats.total} tracked</span>
            <span aria-hidden className="text-muted-foreground/30">/</span>
            <span className={stats.kev ? "font-semibold text-sev-critical" : ""}>{stats.kev} exploited</span>
            <span aria-hidden className="text-muted-foreground/30">/</span>
            <span>updated {ago(stats.lastAt)} ago</span>
          </div>
        </div>
        {isAdmin && (
          <Link
            href="/app/admin/connectors/modules?connector=cve"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-ink/12 bg-ink/[0.03] px-3 text-sm text-foreground/85 transition-colors hover:bg-ink/[0.07] hover:text-ink"
          >
            <KeyRound className="size-4" />
            Ingestion key
          </Link>
        )}
      </header>

      {/* time range */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground/60 uppercase">Arrived</span>
        <div className="flex flex-wrap items-center gap-0.5 rounded-md border border-ink/[0.08] bg-navy-900/40 p-0.5">
          {RANGES.map((r) => (
            <Link
              key={r.key || "all"}
              href={q(view, sort, r.key)}
              className={cn(
                "rounded px-2.5 py-1 font-mono text-[10px] tracking-wide uppercase transition-colors",
                range === r.key ? "bg-glow/15 text-glow" : "text-muted-foreground hover:text-ink"
              )}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      {/* filter chips + sort */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => {
            const active = view === c.key
            return (
              <Link
                key={c.key || "all"}
                href={q(c.key, sort, range)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] transition-colors",
                  active
                    ? "border-ink/20 bg-ink/[0.08] text-ink"
                    : "border-ink/[0.08] bg-navy-900/40 text-muted-foreground hover:text-ink"
                )}
              >
                {c.color && <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: c.color }} />}
                {c.label}
                <span className="font-mono text-[10px] text-muted-foreground/60 tabular-nums">{c.count}</span>
              </Link>
            )
          })}
        </div>
        <div className="flex items-center gap-1 rounded-md border border-ink/[0.08] bg-navy-900/40 p-0.5">
          {[
            { key: "cvss", label: "Highest CVSS" },
            { key: "recent", label: "Most recent" },
          ].map((s) => (
            <Link
              key={s.key}
              href={q(view, s.key, range)}
              className={cn(
                "rounded px-2.5 py-1 font-mono text-[10px] tracking-wide uppercase transition-colors",
                sort === s.key ? "bg-ink/[0.12] text-ink" : "text-muted-foreground hover:text-ink"
              )}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      <CveFeedGrid rows={rows} hasFilter={view !== "" || range !== ""} endpoint={connector.endpoint} />
    </div>
  )
}
