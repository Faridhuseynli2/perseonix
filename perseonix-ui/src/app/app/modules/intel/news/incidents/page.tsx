import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, MessageSquare, Siren } from "lucide-react"
import {
  IncidentSeverityBadge,
  IncidentSlaBadge,
  IncidentSourceBadge,
  IncidentStatusBadge,
} from "@/components/intel/incidents/incident-badges"
import { NewIncidentButton } from "@/components/intel/incidents/new-incident-button"
import { requireModule } from "@/lib/auth/dal"
import { INTEL_MODULE_KEY } from "@/lib/intel/connectors"
import { incidentNumber } from "@/lib/intel/incidents-meta"
import { incidentStats, listIncidents } from "@/lib/intel/incidents"

export const metadata: Metadata = { title: "Incidents · Cyber Threat News" }

function ago(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const TABS: { key: string; label: string }[] = [
  { key: "", label: "All" },
  { key: "open", label: "Open" },
  { key: "investigating", label: "Investigating" },
  { key: "closed", label: "Closed" },
  { key: "false_positive", label: "False positive" },
]

export default async function IncidentsPage({ searchParams }: PageProps<"/app/modules/intel/news/incidents">) {
  const { user } = await requireModule(INTEL_MODULE_KEY)
  const actor = { id: user.id, organizationId: user.organizationId }
  const sp = await searchParams
  const status = typeof sp?.status === "string" ? sp.status : ""

  const [incidents, stats] = await Promise.all([
    listIncidents(actor, { status: status || undefined }),
    incidentStats(actor),
  ])

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6">
      <Link
        href="/app/modules/intel/news"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Cyber Threat News
      </Link>

      {/* Masthead */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/10 pb-5">
        <div>
          <p className="font-mono text-[10px] tracking-[0.22em] text-glow uppercase">Perseonix Corvael // Incidents</p>
          <h1 className="mt-2 font-display text-[26px] leading-none font-semibold tracking-tight text-ink lg:text-[30px]">
            Incidents
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
            <span>{stats.open + stats.investigating} active</span>
            <span aria-hidden className="text-muted-foreground/30">/</span>
            <span className={stats.high ? "font-semibold text-sev-high" : ""}>{stats.high} high-risk open</span>
            <span aria-hidden className="text-muted-foreground/30">/</span>
            <span className={stats.overdue ? "font-semibold text-sev-critical" : ""}>{stats.overdue} SLA overdue</span>
            <span aria-hidden className="text-muted-foreground/30">/</span>
            <span>{stats.total} total</span>
          </div>
        </div>
        <NewIncidentButton />
      </header>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => {
          const active = status === t.key
          return (
            <Link
              key={t.key || "all"}
              href={t.key ? `/app/modules/intel/news/incidents?status=${t.key}` : "/app/modules/intel/news/incidents"}
              className={
                active
                  ? "rounded-md bg-ink/[0.1] px-3 py-1.5 font-mono text-[11px] tracking-wide text-ink uppercase"
                  : "rounded-md px-3 py-1.5 font-mono text-[11px] tracking-wide text-muted-foreground uppercase transition-colors hover:text-ink"
              }
            >
              {t.label}
            </Link>
          )
        })}
      </div>

      {/* List */}
      {incidents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink/12 bg-navy-900/30 px-6 py-16 text-center">
          <Siren className="mx-auto size-7 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-foreground/85">
            {status ? "No incidents in this state." : "No incidents yet."}
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground/70">
            When a Cyber Threat News item warrants a closer look, open an incident from it — or start one with “New incident”.
            Pick a severity and Perseonix sets the response SLA automatically.
          </p>
        </div>
      ) : (
        <ul className="grid gap-2">
          {incidents.map((c) => (
            <li key={c.id}>
              <Link
                href={`/app/modules/intel/news/incidents/${c.id}`}
                className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-ink/[0.08] bg-navy-900/40 px-4 py-3 transition-colors hover:border-ink/15 hover:bg-navy-900/70"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] text-muted-foreground">{incidentNumber(c.seq)}</span>
                    <IncidentSeverityBadge severity={c.severity} />
                    <IncidentStatusBadge status={c.status} />
                    <IncidentSlaBadge slaDueAt={c.slaDueAt} status={c.status} closedAt={c.closedAt} />
                    <IncidentSourceBadge source={c.source} />
                  </div>
                  <p className="mt-1.5 truncate text-sm font-medium text-ink" title={c.title}>
                    {c.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 font-mono text-[11px] text-muted-foreground/70">
                    {c.category && <span className="uppercase">{c.category}</span>}
                    {c.assigneeName ? <span>· {c.assigneeName}</span> : <span>· unassigned</span>}
                    {c.commentCount > 0 && (
                      <span className="inline-flex items-center gap-1">
                        · <MessageSquare className="size-3" /> {c.commentCount}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right font-mono text-[11px] text-muted-foreground/70">{ago(c.updatedAt)}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="border-t border-ink/[0.07] pt-4 font-mono text-[10.5px] leading-relaxed text-muted-foreground/60">
        Incidents are shared across your team. Opening one alerts everyone; the chosen severity sets a response SLA
        (critical 4h · high 24h · medium 3d · low 7d). Analysts triage, share their analysis and close it out.
      </p>
    </div>
  )
}
