"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { UserCheck, UserMinus } from "lucide-react"
import { assignCaseAction, setCaseSeverityAction, setCaseStatusAction } from "@/app/app/modules/brand/cases/actions"
import { CASE_SEVERITIES, CASE_STATUSES, CASE_STATUS_LABEL, CASE_SEVERITY_LABEL } from "@/lib/brand/cases-meta"
import { cn } from "@/lib/utils"

const STATUS_ACTIVE: Record<string, string> = {
  open: "bg-glow text-white",
  investigating: "bg-signal text-white",
  closed: "bg-ok text-white",
  false_positive: "bg-ink/[0.2] text-ink",
}
const SEV_ACTIVE: Record<string, string> = {
  high: "bg-sev-critical text-white",
  medium: "bg-signal text-white",
  low: "bg-ink/[0.15] text-ink",
}

export function CaseControls({
  id,
  status,
  severity,
  assigneeName,
  assignedToMe,
}: {
  id: string
  status: string
  severity: string
  assigneeName: string | null
  assignedToMe: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null)
    start(async () => {
      const res = await fn()
      if (!res.ok) setError(res.error ?? "Something went wrong.")
      else router.refresh()
    })
  }

  return (
    <div className="grid gap-4">
      <div>
        <p className="mb-1.5 font-mono text-[10px] tracking-wider text-muted-foreground/70 uppercase">Status</p>
        <div className="flex flex-wrap gap-1 rounded-md border border-ink/10 bg-navy-950/50 p-1">
          {CASE_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              disabled={pending}
              onClick={() => run(() => setCaseStatusAction(id, s))}
              className={cn(
                "rounded px-2.5 py-1.5 font-mono text-[10px] tracking-wide uppercase transition-colors disabled:opacity-60",
                status === s ? STATUS_ACTIVE[s] : "text-muted-foreground hover:text-ink"
              )}
            >
              {CASE_STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 font-mono text-[10px] tracking-wider text-muted-foreground/70 uppercase">Severity</p>
        <div className="flex gap-1 rounded-md border border-ink/10 bg-navy-950/50 p-1">
          {CASE_SEVERITIES.map((s) => (
            <button
              key={s}
              type="button"
              disabled={pending}
              onClick={() => run(() => setCaseSeverityAction(id, s))}
              className={cn(
                "rounded px-2.5 py-1.5 font-mono text-[10px] tracking-wide uppercase transition-colors disabled:opacity-60",
                severity === s ? SEV_ACTIVE[s] : "text-muted-foreground hover:text-ink"
              )}
            >
              {CASE_SEVERITY_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 font-mono text-[10px] tracking-wider text-muted-foreground/70 uppercase">Assignee</p>
        <div className="flex items-center justify-between gap-2 rounded-md border border-ink/10 bg-navy-950/40 px-3 py-2">
          <span className="truncate text-sm text-foreground/90">{assigneeName ?? "Unassigned"}</span>
          {assignedToMe ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => assignCaseAction(id, false))}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-ink/10 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-ink disabled:opacity-60"
            >
              <UserMinus className="size-3.5" />
              Unassign
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => assignCaseAction(id, true))}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-brand/90 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-brand disabled:opacity-60"
            >
              <UserCheck className="size-3.5" />
              Assign to me
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-sev-critical">{error}</p>}
    </div>
  )
}
