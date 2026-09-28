import { Bot, Clock, User } from "lucide-react"
import {
  INCIDENT_SEVERITY_LABEL,
  INCIDENT_STATUS_LABEL,
  slaState,
  type IncidentStatus,
} from "@/lib/intel/incidents-meta"
import { cn } from "@/lib/utils"

const STATUS_STYLE: Record<string, string> = {
  open: "bg-glow/10 text-glow ring-glow/25",
  investigating: "bg-signal/10 text-signal ring-signal/25",
  closed: "bg-ok/10 text-ok ring-ok/25",
  false_positive: "bg-ink/[0.06] text-muted-foreground ring-ink/15",
}

const SEVERITY_STYLE: Record<string, string> = {
  critical: "bg-sev-critical/14 text-sev-critical ring-sev-critical/30",
  high: "bg-sev-high/12 text-sev-high ring-sev-high/25",
  medium: "bg-signal/12 text-signal ring-signal/25",
  low: "bg-ink/[0.06] text-muted-foreground ring-ink/15",
}

export function IncidentStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[10px] font-medium tracking-wider uppercase ring-1 ring-inset",
        STATUS_STYLE[status] ?? STATUS_STYLE.false_positive,
        className
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {INCIDENT_STATUS_LABEL[status as IncidentStatus] ?? status}
    </span>
  )
}

export function IncidentSeverityBadge({ severity, className }: { severity: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[10px] font-medium tracking-wider uppercase ring-1 ring-inset",
        SEVERITY_STYLE[severity] ?? SEVERITY_STYLE.low,
        className
      )}
    >
      {INCIDENT_SEVERITY_LABEL[severity] ?? severity}
    </span>
  )
}

export function IncidentSourceBadge({ source, className }: { source: string; className?: string }) {
  const auto = source === "auto"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-ink/10 bg-ink/[0.03] px-2 py-0.5 font-mono text-[10px] tracking-wide text-muted-foreground uppercase",
        className
      )}
    >
      {auto ? <Bot className="size-3" /> : <User className="size-3" />}
      {auto ? "Auto" : "Manual"}
    </span>
  )
}

/** Live SLA chip — "due in 3h" (amber when <25% left), "overdue 2h" (red), or met/missed once closed. */
export function IncidentSlaBadge({
  slaDueAt,
  status,
  closedAt,
  className,
}: {
  slaDueAt: string | null
  status: string
  closedAt: string | null
  className?: string
}) {
  const s = slaState(slaDueAt, status, closedAt)
  if (!s.dueAtISO) return null

  let tone = "border-ink/10 bg-ink/[0.03] text-muted-foreground"
  if (s.breached) tone = "border-sev-critical/30 bg-sev-critical/12 text-sev-critical"
  else if (s.label === "SLA missed") tone = "border-sev-critical/30 bg-sev-critical/10 text-sev-critical"
  else if (s.label === "SLA met") tone = "border-ok/25 bg-ok/10 text-ok"
  else if (s.msLeft !== null && s.msLeft < 6 * 3_600_000) tone = "border-signal/30 bg-signal/12 text-signal"

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10px] font-medium tracking-wide uppercase",
        tone,
        className
      )}
      title={`SLA due ${new Date(s.dueAtISO).toLocaleString()}`}
    >
      <Clock className="size-3" />
      {s.label}
    </span>
  )
}
