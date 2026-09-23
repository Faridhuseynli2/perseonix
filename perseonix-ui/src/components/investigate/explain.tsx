import Link from "next/link"
import {
  ArrowUpRight,
  CircleCheck,
  CircleDashed,
  CircleMinus,
  CircleX,
  type LucideIcon,
} from "lucide-react"
import { Panel } from "@/components/admin/ui"
import { SeverityTag, verdictStyles } from "@/components/investigate/report"
import {
  collectPivots,
  coverage,
  traceSteps,
  verdictDrivers,
  type TraceStatus,
} from "@/lib/investigate/explain"
import { SOURCES, SOURCE_GROUPS, VERDICTS, VERDICT_ORDER, plural } from "@/lib/investigate/meta"
import type { InvestigationReport } from "@/lib/investigate/types"
import { cn } from "@/lib/utils"

const formatMs = (ms: number) => (ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`)

/** The verdict rules, which one applied, and the findings that triggered it. */
export function VerdictExplanation({ report, className }: { report: InvestigationReport; className?: string }) {
  const drivers = verdictDrivers(report)
  const { answered, attempted } = coverage(traceSteps(report))
  const lower = report.signals.filter((signal) => signal.severity === "medium" || signal.severity === "low").length

  return (
    <section className={cn("rounded-xl border border-ink/[0.07] bg-navy-800/60", className)}>
      <header className="border-b border-ink/[0.06] px-5 py-3.5">
        <h2 className="text-sm font-semibold text-ink">Verdict</h2>
      </header>
      <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
        <ol className="grid content-start gap-1.5" aria-label="Verdict rules">
          {VERDICT_ORDER.map((verdict) => {
            const current = verdict === report.verdict
            return (
              <li
                key={verdict}
                aria-current={current ? "true" : undefined}
                className={cn(
                  "rounded-md px-3 py-2 ring-1 ring-inset",
                  current ? verdictStyles[verdict] : "text-muted-foreground ring-ink/[0.06]"
                )}
              >
                <p className="flex items-center gap-2 text-[13px] font-medium">
                  <span aria-hidden className={cn("size-1.5 rounded-full", current ? "bg-current" : "bg-ink/20")} />
                  {VERDICTS[verdict].label}
                </p>
                <p className={cn("mt-0.5 pl-3.5 text-[11.5px]", current ? "opacity-85" : "text-muted-foreground/75")}>
                  {VERDICTS[verdict].rule}
                </p>
              </li>
            )
          })}
        </ol>

        <div className="flex min-w-0 flex-col">
          <p className="eyebrow text-[10px]">Triggered by</p>
          {drivers.length > 0 ? (
            <ul className="mt-3 grid gap-3">
              {drivers.map((signal, index) => (
                <li key={`${signal.title}-${index}`} className="flex gap-3">
                  <SeverityTag severity={signal.severity} />
                  <div className="min-w-0">
                    <p className="text-sm text-ink">{signal.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {[signal.source && SOURCES[signal.source].provider, signal.detail].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-foreground/85">
              {report.verdict === "inconclusive"
                ? "Core sources did not respond."
                : lower > 0
                  ? `No critical or high findings. ${plural(lower, "lower-severity finding")} to review.`
                  : "No findings above info level."}
            </p>
          )}

          <div className="mt-auto pt-6">
            <div className="flex items-baseline justify-between gap-3 font-mono text-[11px] text-muted-foreground">
              <span>
                <span className="text-ink">{answered}</span>/{attempted} sources responded
              </span>
              <span>{formatMs(report.tookMs)}</span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink/[0.06]" aria-hidden>
              <div
                className="h-full rounded-full bg-glow/70"
                style={{ width: `${attempted ? (answered / attempted) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const statusMeta: Record<TraceStatus, { label: string; icon: LucideIcon; className: string }> = {
  ok: { label: "OK", icon: CircleCheck, className: "text-ok" },
  empty: { label: "No data", icon: CircleDashed, className: "text-muted-foreground" },
  error: { label: "Error", icon: CircleX, className: "text-alert" },
  not_enabled: { label: "Off", icon: CircleMinus, className: "text-muted-foreground/60" },
  not_applicable: { label: "N/A", icon: CircleMinus, className: "text-muted-foreground/60" },
  missing: { label: "—", icon: CircleMinus, className: "text-muted-foreground/60" },
}

/** Every source queried for the report, with its result and response time. */
export function InvestigationTrace({ report, className }: { report: InvestigationReport; className?: string }) {
  const steps = traceSteps(report)
  const longest = Math.max(1, ...steps.map((step) => step.tookMs ?? 0))

  return (
    <section className={cn("overflow-hidden rounded-xl border border-ink/[0.07] bg-navy-800/60", className)}>
      <header className="flex items-center justify-between gap-3 border-b border-ink/[0.06] px-5 py-3.5">
        <h2 className="text-sm font-semibold text-ink">Investigation trace</h2>
        <span className="font-mono text-[11px] text-muted-foreground">
          {steps.length} sources · {formatMs(report.tookMs)}
        </span>
      </header>
      <div className="divide-y divide-ink/[0.05]">
        {SOURCE_GROUPS.map((group) => (
          <div key={group.key} className="px-5 py-4">
            <p className="eyebrow text-[10px]">{group.label}</p>
            <ol className="mt-3 grid gap-3.5">
              {steps
                .filter((step) => SOURCES[step.key].group === group.key)
                .map((step) => {
                  const meta = statusMeta[step.status]
                  const source = SOURCES[step.key]
                  const dim = step.status === "not_enabled" || step.status === "not_applicable" || step.status === "missing"
                  return (
                    <li
                      key={step.key}
                      className={cn(
                        "grid gap-x-5 gap-y-1 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_6.5rem]",
                        dim && "opacity-55"
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <meta.icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", meta.className)} />
                        <div className="min-w-0">
                          <p className="text-sm text-ink">{source.label}</p>
                          <p className="font-mono text-[10px] tracking-wider text-muted-foreground/70 uppercase">
                            {source.provider}
                          </p>
                        </div>
                      </div>
                      <div className="min-w-0 pl-6.5 sm:pl-0">
                        <p className={cn("text-[13px]", step.status === "error" ? "text-alert" : "text-foreground/90")}>
                          {step.outcome}
                          {step.findings > 0 && (
                            <span className="ml-2 inline-flex rounded bg-sev-high/10 px-1.5 py-px font-mono text-[10px] text-sev-high ring-1 ring-sev-high/20 ring-inset">
                              {plural(step.findings, "finding")}
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground/80">{source.description}</p>
                      </div>
                      <div className="pl-6.5 sm:pl-0">
                        <p className={cn("font-mono text-[10px] tracking-wider uppercase sm:text-right", meta.className)}>
                          {step.tookMs !== undefined ? formatMs(step.tookMs) : meta.label}
                        </p>
                        {step.tookMs !== undefined && (
                          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-ink/[0.06]" aria-hidden>
                            <div
                              className={cn("h-full rounded-full", step.status === "error" ? "bg-alert/60" : "bg-glow/55")}
                              style={{ width: `${Math.max(3, (step.tookMs / longest) * 100)}%` }}
                            />
                          </div>
                        )}
                        <span className="sr-only">{meta.label}</span>
                      </div>
                    </li>
                  )
                })}
            </ol>
          </div>
        ))}
      </div>
    </section>
  )
}

const MAX_VISIBLE_PIVOTS = 16

/** Related infrastructure, one click away from its own investigation. */
export function PivotPanel({ report }: { report: InvestigationReport }) {
  const groups = collectPivots(report)
  if (groups.length === 0) return null
  return (
    <Panel title="Pivot" description="Related indicators. Select one to investigate.">
      <div className="grid gap-5">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="eyebrow text-[10px]">
              {group.label} · {group.values.length}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {group.values.slice(0, MAX_VISIBLE_PIVOTS).map((value) => (
                <Link
                  key={value}
                  href={`/app/modules/investigate?q=${encodeURIComponent(value)}`}
                  className="group inline-flex max-w-full items-center gap-1 rounded border border-ink/[0.08] bg-ink/[0.03] px-1.5 py-0.5 font-mono text-[11px] text-foreground/85 transition-colors hover:border-glow/40 hover:text-ink"
                >
                  <span className="truncate">{value}</span>
                  <ArrowUpRight aria-hidden className="size-3 shrink-0 text-muted-foreground group-hover:text-glow" />
                </Link>
              ))}
              {group.values.length > MAX_VISIBLE_PIVOTS && (
                <span className="px-1 text-xs text-muted-foreground">
                  +{group.values.length - MAX_VISIBLE_PIVOTS}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  )
}
