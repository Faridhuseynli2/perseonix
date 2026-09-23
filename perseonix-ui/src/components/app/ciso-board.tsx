import Link from "next/link"
import { AlertTriangle, ArrowUpRight, Check, Crosshair, Fingerprint, Minus, Radar, ShieldAlert, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react"
import type { CurrentUser } from "@/lib/auth/dal"
import { caseStats } from "@/lib/brand/cases"
import type { DetectionRow } from "@/lib/brand/store"
import type { LiveSnapshot } from "@/lib/ransomware/data"
import { attackVolume, overview } from "@/lib/ransomware/data"
import { getProfiles } from "@/lib/adversaries/relevance-store"
import { hasProfile, scoreActors } from "@/lib/adversaries/relevance"
import { getOrgContext } from "@/lib/intel/news-relevance"
import { COUNTRY_BY_CODE, SECTOR_LABEL } from "@/lib/intel/taxonomy"
import { cn } from "@/lib/utils"

const n = (x: number) => x.toLocaleString("en-US")

type CveStats = { total: number; kev: number; critical: number; high: number; medium: number }

const SEV_TEXT: Record<string, string> = {
  critical: "text-sev-critical",
  high: "text-sev-high",
  guarded: "text-signal",
  low: "text-glow",
  ok: "text-ok",
}
const SEV_DOT: Record<string, string> = {
  critical: "bg-sev-critical",
  high: "bg-sev-high",
  guarded: "bg-signal",
  low: "bg-glow",
  ok: "bg-ok",
}

/** Executive, board-level view that sits beneath the operational Command Center.
 *  Strategic framing (NIST CSF functions), real 30-day numbers, org-relevant
 *  threat context — the report a CISO would take into a board meeting. */
export async function CisoBoard({
  user,
  score,
  band,
  cstats,
  live,
  detections,
  alertsUnread,
}: {
  user: CurrentUser
  score: number
  band: string
  cstats: CveStats
  live: LiveSnapshot
  detections: DetectionRow[]
  alertsUnread: number
}) {
  const actor = { id: user.id, organizationId: user.organizationId }

  const [profiles, orgCtx, rw30, volume, cases] = await Promise.all([
    getProfiles(actor).catch(() => null),
    getOrgContext(user).catch(() => null),
    overview("30d").catch(() => null),
    attackVolume("30d").catch(() => [] as { label: string; iso: string; count: number }[]),
    caseStats(actor).catch(() => ({ open: 0, investigating: 0, high: 0, total: 0 })),
  ])

  const profile = profiles?.effective ?? null
  const hasCtx = Boolean(profile && hasProfile(profile))
  const relevance = hasCtx && profile ? scoreActors(profile, 5) : null

  const highBrand = detections.filter((d) => d.severity === "high").length
  const resolved = Math.max(0, cases.total - cases.open - cases.investigating)
  const rwGrowth = rw30?.victimsGrowth ?? null

  // Governance pillars — mapped to NIST CSF functions the way a board reads risk.
  const pillars = [
    {
      fn: "Identify",
      title: "Vulnerability exposure",
      icon: ShieldAlert,
      value: n(cstats.kev),
      unit: "actively exploited",
      sev: cstats.kev > 0 ? "critical" : "ok",
      note: `${n(cstats.critical)} critical of ${n(cstats.total)} tracked`,
      href: "/app/modules/intel/cve",
    },
    {
      fn: "Detect",
      title: "External attack surface",
      icon: Radar,
      value: n(detections.length),
      unit: "brand lookalikes",
      sev: highBrand > 0 ? "high" : detections.length > 0 ? "guarded" : "ok",
      note: `${n(highBrand)} high-risk · ${n(cases.open)} open ${cases.open === 1 ? "case" : "cases"}`,
      href: "/app/modules/brand",
    },
    {
      fn: "Protect",
      title: "Identity & credentials",
      icon: Fingerprint,
      value: n(orgCtx?.assetDomains.length ?? 0),
      unit: "domains monitored",
      sev: (orgCtx?.assetDomains.length ?? 0) > 0 ? "guarded" : "low",
      note: "Self-service breach exposure checks",
      href: "/app/modules/credentials",
    },
    {
      fn: "Respond",
      title: "Threat activity",
      icon: Crosshair,
      value: n(rw30?.totalVictims ?? live.last30d),
      unit: "ransomware victims · 30d",
      sev: (rw30?.totalVictims ?? live.last30d) > 0 ? "high" : "ok",
      note:
        rwGrowth === null
          ? `${relevance?.total ?? 0} actors relevant to you`
          : `${rwGrowth >= 0 ? "+" : ""}${rwGrowth}% vs prior 30d`,
      growth: rwGrowth,
      href: "/app/modules/ransomware",
    },
  ]

  // Program coverage — what the security programme actually watches (blind spots surface honestly).
  const coverage = [
    { label: "Modules active", ok: user.modules.length > 0, value: `${user.modules.length}`, hint: "monitoring surface" },
    { label: "Assets monitored", ok: (orgCtx?.assetDomains.length ?? 0) > 0, value: `${orgCtx?.assetDomains.length ?? 0}`, hint: "brand domains" },
    { label: "Actors on watchlist", ok: (orgCtx?.watchedActors.length ?? 0) > 0, value: `${orgCtx?.watchedActors.length ?? 0}`, hint: "tracked adversaries" },
    { label: "Org profile set", ok: hasCtx, value: hasCtx ? "Yes" : "No", hint: "sector & region relevance" },
  ]

  const maxVol = Math.max(1, ...volume.map((v) => v.count))
  const sectorNames = profile?.sectors?.map((s) => SECTOR_LABEL[s] ?? String(s)) ?? []
  const countryName = profile?.country ? COUNTRY_BY_CODE[profile.country]?.name ?? profile.country : null
  const contextLabel = [sectorNames.slice(0, 2).join(", "), countryName].filter(Boolean).join(" · ")

  const updated = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

  return (
    <section className="mt-2 rounded-2xl border border-ink/[0.09] bg-navy-900/30 p-5 lg:p-6">
      {/* Board header */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink/10 pb-4">
        <div>
          <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.18em] text-glow uppercase">
            <span className="text-muted-foreground/40">05</span> CISO Board
          </p>
          <h2 className="mt-1.5 font-display text-[20px] leading-none font-semibold tracking-tight text-ink">
            Executive risk briefing
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">Board-level view · aligned to NIST CSF · updated {updated}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-ink/10 bg-ink/[0.03] px-2.5 py-1 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
          <ShieldCheck className="size-3.5 text-glow" /> NIST CSF
        </span>
      </div>

      {/* Bottom line */}
      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
        <div className="flex flex-col justify-center rounded-xl border border-ink/[0.08] bg-navy-950/40 p-5 text-center">
          <p className="font-mono text-[9px] tracking-[0.18em] text-muted-foreground/55 uppercase">Overall posture</p>
          <p className={cn("mt-2 font-mono text-5xl font-semibold tabular-nums", SEV_TEXT[band] ?? "text-ink")}>{score}</p>
          <p className={cn("mt-1 font-mono text-[12px] tracking-[0.2em] uppercase", SEV_TEXT[band] ?? "text-muted-foreground")}>
            {band === "critical" ? "Critical" : band === "high" ? "Elevated" : band === "guarded" ? "Guarded" : "Low"}
          </p>
        </div>
        <div className="rounded-xl border border-ink/[0.08] bg-navy-950/30 p-5">
          <p className="font-mono text-[9px] tracking-[0.18em] text-muted-foreground/55 uppercase">Bottom line</p>
          <p className="mt-2 text-[15px] leading-relaxed text-foreground/85">
            Over the last 30 days,{" "}
            <strong className="font-semibold text-ink">{n(rw30?.totalVictims ?? live.last30d)}</strong> ransomware victims
            were disclosed globally
            {rwGrowth !== null && (
              <span className={cn("font-mono text-[13px]", rwGrowth >= 0 ? "text-sev-high" : "text-ok")}>
                {" "}({rwGrowth >= 0 ? "+" : ""}
                {rwGrowth}%)
              </span>
            )}
            , <strong className="font-semibold text-ink">{n(cstats.kev)}</strong> vulnerabilities are under active
            exploitation, and <strong className="font-semibold text-ink">{n(highBrand)}</strong> high-risk lookalikes of
            your brand were detected.{" "}
            {hasCtx && relevance
              ? `${relevance.total} tracked adversaries are relevant to ${contextLabel || "your organization"}. `
              : "Set your organization profile to surface sector-specific threats. "}
            Overall security posture is{" "}
            <strong className={cn("font-semibold", SEV_TEXT[band] ?? "text-ink")}>
              {band === "critical" ? "critical" : band === "high" ? "elevated" : band === "guarded" ? "guarded" : "low"}
            </strong>
            .
          </p>
        </div>
      </div>

      {/* Governance pillars */}
      <p className="mt-6 font-mono text-[10px] tracking-[0.16em] text-muted-foreground/55 uppercase">Where risk concentrates</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {pillars.map((p) => (
          <Link
            key={p.title}
            href={p.href}
            className="group rounded-xl border border-ink/[0.08] bg-navy-900/40 p-4 transition-colors hover:border-ink/20 hover:bg-navy-900/70"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 font-mono text-[9px] tracking-[0.14em] text-muted-foreground/50 uppercase">
                <p.icon className="size-3.5" /> {p.fn}
              </span>
              <span aria-hidden className={cn("size-2 rounded-full", SEV_DOT[p.sev] ?? "bg-muted-foreground/40")} />
            </div>
            <p className="mt-3 font-mono text-3xl leading-none font-semibold text-ink tabular-nums">{p.value}</p>
            <p className="mt-1.5 text-[13px] font-medium text-foreground/85">{p.title}</p>
            <p className="font-mono text-[10px] tracking-wide text-muted-foreground/50 uppercase">{p.unit}</p>
            <p className="mt-2 flex items-center gap-1 border-t border-ink/[0.06] pt-2 font-mono text-[11px] text-muted-foreground/70">
              {typeof p.growth === "number" ? (
                p.growth > 0 ? (
                  <TrendingUp className="size-3 text-sev-high" />
                ) : p.growth < 0 ? (
                  <TrendingDown className="size-3 text-ok" />
                ) : (
                  <Minus className="size-3" />
                )
              ) : null}
              {p.note}
            </p>
          </Link>
        ))}
      </div>

      {/* Context + coverage + response */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* Your threat context */}
        <section className="rounded-xl border border-ink/[0.08] bg-navy-900/40 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-[10px] tracking-[0.16em] text-ink uppercase">Your threat context</h3>
            {contextLabel ? (
              <span className="truncate font-mono text-[10px] text-muted-foreground/50">{contextLabel}</span>
            ) : null}
          </div>
          {hasCtx && relevance && relevance.actors.length > 0 ? (
            <ul className="mt-3 grid gap-1.5">
              {relevance.actors.slice(0, 5).map((a) => (
                <li key={a.slug}>
                  <Link
                    href={`/app/modules/adversaries/actor/${encodeURIComponent(a.name)}`}
                    className="group flex items-center gap-2 rounded-md px-1.5 py-1.5 transition-colors hover:bg-ink/[0.04]"
                  >
                    <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", SEV_DOT[a.level] ?? "bg-muted-foreground/40")} />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-foreground/90 group-hover:text-ink">{a.name}</span>
                    {a.matchedSectors[0] ? (
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground/50">{a.matchedSectors[0]}</span>
                    ) : null}
                    <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground/30 group-hover:text-glow" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3 rounded-lg border border-dashed border-ink/12 bg-navy-950/40 p-4">
              <p className="text-[13px] text-muted-foreground">
                Define your sector and region to see which tracked adversaries target organizations like yours.
              </p>
              <Link
                href="/app/modules/adversaries"
                className="mt-2 inline-flex items-center gap-1 font-mono text-[11px] text-glow hover:underline"
              >
                Set organization profile <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          )}
        </section>

        {/* Program coverage */}
        <section className="rounded-xl border border-ink/[0.08] bg-navy-900/40 p-4">
          <h3 className="font-mono text-[10px] tracking-[0.16em] text-ink uppercase">Program coverage</h3>
          <ul className="mt-3 grid gap-1.5">
            {coverage.map((c) => (
              <li key={c.label} className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5">
                <span
                  aria-hidden
                  className={cn(
                    "inline-flex size-5 shrink-0 items-center justify-center rounded-full",
                    c.ok ? "bg-ok/15 text-ok" : "bg-signal/15 text-signal"
                  )}
                >
                  {c.ok ? <Check className="size-3" /> : <AlertTriangle className="size-3" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] text-foreground/90">{c.label}</span>
                  <span className="font-mono text-[10px] text-muted-foreground/50">{c.hint}</span>
                </span>
                <span className="shrink-0 font-mono text-[13px] font-semibold text-ink tabular-nums">{c.value}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Response effectiveness + 30d trend */}
        <section className="rounded-xl border border-ink/[0.08] bg-navy-900/40 p-4">
          <h3 className="font-mono text-[10px] tracking-[0.16em] text-ink uppercase">Response &amp; activity</h3>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-navy-950/40 py-2.5">
              <p className="font-mono text-xl font-semibold text-sev-high tabular-nums">{n(cases.open)}</p>
              <p className="font-mono text-[9px] tracking-wide text-muted-foreground/55 uppercase">Open</p>
            </div>
            <div className="rounded-lg bg-navy-950/40 py-2.5">
              <p className="font-mono text-xl font-semibold text-signal tabular-nums">{n(cases.investigating)}</p>
              <p className="font-mono text-[9px] tracking-wide text-muted-foreground/55 uppercase">Triage</p>
            </div>
            <div className="rounded-lg bg-navy-950/40 py-2.5">
              <p className="font-mono text-xl font-semibold text-ok tabular-nums">{n(resolved)}</p>
              <p className="font-mono text-[9px] tracking-wide text-muted-foreground/55 uppercase">Resolved</p>
            </div>
          </div>
          <p className="mt-4 flex items-center justify-between font-mono text-[9px] tracking-wide text-muted-foreground/50 uppercase">
            <span>Ransomware disclosures</span>
            <span>30 days</span>
          </p>
          {volume.length > 0 ? (
            <div className="mt-1.5 flex h-12 items-end gap-px">
              {volume.map((v) => (
                <span
                  key={v.iso}
                  title={`${v.label}: ${v.count}`}
                  className="flex-1 rounded-t-sm bg-sev-critical/60"
                  style={{ height: `${Math.max(3, (v.count / maxVol) * 100)}%` }}
                />
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[12px] text-muted-foreground">No disclosure data in range.</p>
          )}
          {alertsUnread > 0 ? (
            <p className="mt-3 font-mono text-[11px] text-muted-foreground/70">{alertsUnread} unread alerts awaiting review</p>
          ) : null}
        </section>
      </div>
    </section>
  )
}
