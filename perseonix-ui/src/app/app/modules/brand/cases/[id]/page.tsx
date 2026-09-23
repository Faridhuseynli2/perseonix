import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  ArrowUpRight,
  Bot,
  CircleDot,
  FileSearch,
  FolderClock,
  MessageSquare,
  ShieldCheck,
  UserCog,
} from "lucide-react"
import { CaseSeverityBadge, CaseSourceBadge, CaseStatusBadge } from "@/components/brand/cases/case-badges"
import { CaseCommentBox } from "@/components/brand/cases/case-comment-box"
import { CaseControls } from "@/components/brand/cases/case-controls"
import { requireModule } from "@/lib/auth/dal"
import { caseNumber, CASE_SEVERITY_LABEL, CASE_STATUS_LABEL, type CaseStatus } from "@/lib/brand/cases-meta"
import { getCase, type CaseEvent } from "@/lib/brand/cases"
import { BRAND_MODULE_KEY } from "@/lib/brand/meta"

export async function generateMetadata({ params }: PageProps<"/app/modules/brand/cases/[id]">): Promise<Metadata> {
  const { id } = await params
  return { title: `Case · Brand Protection`, description: id }
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" })
const fmt = (iso: string | null) => (iso ? dateFmt.format(new Date(iso)) : "—")

function sevLabel(v: unknown): string {
  return typeof v === "string" ? CASE_SEVERITY_LABEL[v] ?? v : "—"
}
function statLabel(v: unknown): string {
  return typeof v === "string" ? CASE_STATUS_LABEL[v as CaseStatus] ?? v : "—"
}

function describe(e: CaseEvent): { icon: typeof CircleDot; text: string } {
  const m = e.meta ?? {}
  switch (e.kind) {
    case "created":
      return { icon: FolderClock, text: e.body ?? "Case opened." }
    case "status":
      return { icon: CircleDot, text: `Status changed from ${statLabel(m.from)} to ${statLabel(m.to)}.` }
    case "closed":
      return { icon: ShieldCheck, text: `Case closed (${statLabel(m.to)}).` }
    case "reopened":
      return { icon: CircleDot, text: `Case reopened (${statLabel(m.to)}).` }
    case "severity":
      return { icon: CircleDot, text: `Severity changed from ${sevLabel(m.from)} to ${sevLabel(m.to)}.` }
    case "assign":
      return { icon: UserCog, text: m.to ? `Assigned to ${String(m.to)}.` : "Unassigned." }
    case "comment":
      return { icon: MessageSquare, text: e.body ?? "" }
    default:
      return { icon: CircleDot, text: e.body ?? e.kind }
  }
}

export default async function CaseDetailPage({ params }: PageProps<"/app/modules/brand/cases/[id]">) {
  const { user } = await requireModule(BRAND_MODULE_KEY)
  const { id } = await params
  const c = await getCase({ id: user.id, organizationId: user.organizationId }, id)
  if (!c) notFound()

  return (
    <div className="mx-auto max-w-[1200px]">
      <Link
        href="/app/modules/brand/cases"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Incident cases
      </Link>

      {/* Header */}
      <section className="mt-4 overflow-hidden rounded-lg border border-ink/[0.09] bg-navy-900/50">
        <span
          aria-hidden
          className={
            "block h-[3px] " +
            (c.severity === "high" ? "bg-sev-critical" : c.severity === "medium" ? "bg-signal" : "bg-ink/20")
          }
        />
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-mono text-[10px] tracking-[0.2em] text-glow uppercase">
                Incident case · {caseNumber(c.seq)}
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-ink">{c.title}</h1>
              {c.domain && (
                <p className="mt-1.5 font-mono text-sm text-muted-foreground">
                  {c.domain}
                  {c.assetDomain && (
                    <>
                      {" "}
                      <span className="text-muted-foreground/60">· impersonating {c.assetDomain}</span>
                    </>
                  )}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <CaseSeverityBadge severity={c.severity} />
                <CaseStatusBadge status={c.status} />
                <CaseSourceBadge source={c.source} />
              </div>
            </div>
            <div className="text-right font-mono text-[11px] text-muted-foreground/80">
              <p>Opened {fmt(c.createdAt)}</p>
              {c.openedByName && <p className="mt-0.5">by {c.openedByName}</p>}
              {c.source === "auto" && !c.openedByName && (
                <p className="mt-0.5 inline-flex items-center gap-1">
                  <Bot className="size-3" /> automation
                </p>
              )}
              {c.closedAt && <p className="mt-0.5 text-ok">Closed {fmt(c.closedAt)}</p>}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,340px)]">
        {/* Main: summary + timeline */}
        <div className="grid content-start gap-6">
          {c.summary && (
            <section className="rounded-lg border border-ink/[0.09] bg-navy-900/40 p-5">
              <h2 className="flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.14em] text-ink uppercase">
                <FileSearch className="size-4 text-glow" />
                Summary
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-foreground/85">{c.summary}</p>
            </section>
          )}

          <section className="rounded-lg border border-ink/[0.09] bg-navy-900/40 p-5">
            <h2 className="flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.14em] text-ink uppercase">
              <MessageSquare className="size-4 text-glow" />
              Activity
            </h2>

            <div className="mt-4">
              <CaseCommentBox id={c.id} />
            </div>

            <ol className="mt-5 grid gap-0">
              {c.events.map((e, i) => {
                const { icon: Icon, text } = describe(e)
                const isComment = e.kind === "comment"
                return (
                  <li key={e.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={
                          "grid size-7 shrink-0 place-items-center rounded-full ring-1 ring-inset " +
                          (isComment ? "bg-brand/10 text-glow ring-brand/20" : "bg-ink/[0.05] text-muted-foreground ring-ink/10")
                        }
                      >
                        <Icon className="size-3.5" />
                      </span>
                      {i < c.events.length - 1 && <span aria-hidden className="w-px flex-1 bg-ink/10" />}
                    </div>
                    <div className={"min-w-0 " + (i < c.events.length - 1 ? "pb-5" : "")}>
                      <p className="flex flex-wrap items-center gap-x-2 text-[13px]">
                        <span className="font-medium text-ink">{e.authorName ?? "Perseonix automation"}</span>
                        <span className="font-mono text-[10px] text-muted-foreground/60">{fmt(e.createdAt)}</span>
                      </p>
                      {isComment ? (
                        <p className="mt-1 rounded-md border border-ink/[0.07] bg-navy-950/40 px-3 py-2 text-sm whitespace-pre-wrap text-foreground/90">
                          {text}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-sm text-muted-foreground">{text}</p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          </section>
        </div>

        {/* Aside: controls + evidence */}
        <aside className="grid content-start gap-6">
          <section className="rounded-lg border border-ink/[0.09] bg-navy-900/50 p-5">
            <h2 className="mb-4 flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.14em] text-ink uppercase">
              <UserCog className="size-4 text-glow" />
              Manage
            </h2>
            <CaseControls
              id={c.id}
              status={c.status}
              severity={c.severity}
              assigneeName={c.assigneeName}
              assignedToMe={c.assigneeId === user.id}
            />
          </section>

          {c.detectionId && (
            <section className="rounded-lg border border-ink/[0.09] bg-navy-900/40 p-5">
              <h2 className="flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.14em] text-ink uppercase">
                <FileSearch className="size-4 text-glow" />
                Evidence
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                This case is linked to a lookalike detection with full risk evidence and a sandbox screenshot.
              </p>
              <Link
                href={`/app/modules/brand/detections/${c.detectionId}`}
                className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-ink/12 bg-ink/[0.03] px-3 py-2 text-sm text-foreground/90 transition-colors hover:bg-ink/[0.07] hover:text-ink"
              >
                View detection
                <ArrowUpRight className="size-3.5" />
              </Link>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
