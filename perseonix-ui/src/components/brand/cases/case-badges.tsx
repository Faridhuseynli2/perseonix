import { Bot, User } from "lucide-react"
import { CASE_SEVERITY_LABEL, CASE_STATUS_LABEL, type CaseStatus } from "@/lib/brand/cases-meta"
import { cn } from "@/lib/utils"

const STATUS_STYLE: Record<string, string> = {
  open: "bg-glow/10 text-glow ring-glow/25",
  investigating: "bg-signal/10 text-signal ring-signal/25",
  closed: "bg-ok/10 text-ok ring-ok/25",
  false_positive: "bg-ink/[0.06] text-muted-foreground ring-ink/15",
}

const SEVERITY_STYLE: Record<string, string> = {
  high: "bg-sev-critical/12 text-sev-critical ring-sev-critical/25",
  medium: "bg-signal/12 text-signal ring-signal/25",
  low: "bg-ink/[0.06] text-muted-foreground ring-ink/15",
}

export function CaseStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[10px] font-medium tracking-wider uppercase ring-1 ring-inset",
        STATUS_STYLE[status] ?? STATUS_STYLE.false_positive,
        className
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {CASE_STATUS_LABEL[status as CaseStatus] ?? status}
    </span>
  )
}

export function CaseSeverityBadge({ severity, className }: { severity: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[10px] font-medium tracking-wider uppercase ring-1 ring-inset",
        SEVERITY_STYLE[severity] ?? SEVERITY_STYLE.low,
        className
      )}
    >
      {CASE_SEVERITY_LABEL[severity] ?? severity}
    </span>
  )
}

export function CaseSourceBadge({ source, className }: { source: string; className?: string }) {
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
