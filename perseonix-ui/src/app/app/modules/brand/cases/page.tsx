import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, FolderOpen, MessageSquare } from "lucide-react"
import { CaseSeverityBadge, CaseSourceBadge, CaseStatusBadge } from "@/components/brand/cases/case-badges"
import { NewCaseButton } from "@/components/brand/cases/new-case-button"
import { requireModule } from "@/lib/auth/dal"
import { caseNumber } from "@/lib/brand/cases-meta"
import { caseStats, listCases } from "@/lib/brand/cases"
import { BRAND_MODULE_KEY } from "@/lib/brand/meta"

export const metadata: Metadata = { title: "Incident cases · Brand Protection" }

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

export default async function CasesPage({ searchParams }: PageProps<"/app/modules/brand/cases">) {
  const { user } = await requireModule(BRAND_MODULE_KEY)
  const actor = { id: user.id, organizationId: user.organizationId }
  const sp = await searchParams
  const status = typeof sp?.status === "string" ? sp.status : ""

  const [cases, stats] = await Promise.all([listCases(actor, { status: status || undefined }), caseStats(actor)])

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6">
      <Link
        href="/app/modules/brand"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Brand Protection
      </Link>

      {/* Masthead */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/10 pb-5">
        <div>
          <p className="font-mono text-[10px] tracking-[0.22em] text-glow uppercase">Perseonix Corvael // Incident Cases</p>
          <h1 className="mt-2 font-display text-[26px] leading-none font-semibold tracking-tight text-ink lg:text-[30px]">
            Incident cases
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
            <span>{stats.open + stats.investigating} active</span>
            <span aria-hidden className="text-muted-foreground/30">/</span>
            <span className={stats.high ? "font-semibold text-sev-critical" : ""}>{stats.high} high-risk open</span>
            <span aria-hidden className="text-muted-foreground/30">/</span>
            <span>{stats.total} total</span>
          </div>
        </div>
        <NewCaseButton />
      </header>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => {
          const active = status === t.key
          return (
            <Link
              key={t.key || "all"}
              href={t.key ? `/app/modules/brand/cases?status=${t.key}` : "/app/modules/brand/cases"}
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
      {cases.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink/12 bg-navy-900/30 px-6 py-16 text-center">
          <FolderOpen className="mx-auto size-7 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-foreground/85">
            {status ? "No cases in this state." : "No incident cases yet."}
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground/70">
            High-risk lookalike domains open a case automatically on the next scan. You can also open one manually from a
            detection or with “New case”.
          </p>
        </div>
      ) : (
        <ul className="grid gap-2">
          {cases.map((c) => (
            <li key={c.id}>
              <Link
                href={`/app/modules/brand/cases/${c.id}`}
                className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-ink/[0.08] bg-navy-900/40 px-4 py-3 transition-colors hover:border-ink/15 hover:bg-navy-900/70"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] text-muted-foreground">{caseNumber(c.seq)}</span>
                    <CaseSeverityBadge severity={c.severity} />
                    <CaseStatusBadge status={c.status} />
                    <CaseSourceBadge source={c.source} />
                  </div>
                  <p className="mt-1.5 truncate text-sm font-medium text-ink" title={c.title}>
                    {c.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 font-mono text-[11px] text-muted-foreground/70">
                    {c.domain && <span className="truncate">{c.domain}</span>}
                    {c.assigneeName ? <span>· {c.assigneeName}</span> : <span>· unassigned</span>}
                    {c.commentCount > 0 && (
                      <span className="inline-flex items-center gap-1">
                        · <MessageSquare className="size-3" /> {c.commentCount}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right font-mono text-[11px] text-muted-foreground/70">
                  {ago(c.updatedAt)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="border-t border-ink/[0.07] pt-4 font-mono text-[10.5px] leading-relaxed text-muted-foreground/60">
        Cases are shared across your team. A high-severity lookalike opens one automatically and alerts everyone; an
        analyst investigates, adds notes and closes it.
      </p>
    </div>
  )
}
