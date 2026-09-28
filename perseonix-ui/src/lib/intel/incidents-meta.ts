// Shared by server and client components: no server-only imports here.
// Threat-News incident cases — statuses, severities, SLA policy, formatting.

export const INCIDENT_STATUSES = ["open", "investigating", "closed", "false_positive"] as const
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number]

export const INCIDENT_STATUS_LABEL: Record<IncidentStatus, string> = {
  open: "Open",
  investigating: "Investigating",
  closed: "Closed",
  false_positive: "False positive",
}

export const OPEN_STATUSES: IncidentStatus[] = ["open", "investigating"]

export function isOpenStatus(status: string): boolean {
  return status === "open" || status === "investigating"
}

// Threat-News severities include "critical" (news items can be critical).
export const INCIDENT_SEVERITIES = ["critical", "high", "medium", "low"] as const
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number]

export const INCIDENT_SEVERITY_LABEL: Record<string, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
}

/**
 * SLA policy — response window by severity, in HOURS. The due-date is anchored to
 * when the incident was opened; raising the severity tightens (re-derives) it.
 */
export const SLA_HOURS: Record<IncidentSeverity, number> = {
  critical: 4,
  high: 24,
  medium: 72,
  low: 168,
}

export function slaLabel(severity: string): string {
  const h = SLA_HOURS[severity as IncidentSeverity]
  if (!h) return "—"
  return h < 24 ? `${h}h` : `${h / 24}d`
}

/** Due timestamp = opened-at + the severity's SLA window. */
export function slaDueFrom(openedAtISO: string | Date, severity: string): Date {
  const base = new Date(openedAtISO)
  const h = SLA_HOURS[severity as IncidentSeverity] ?? SLA_HOURS.medium
  return new Date(base.getTime() + h * 3_600_000)
}

export type SlaState = {
  dueAtISO: string | null
  breached: boolean // past due while still open
  msLeft: number | null // negative when overdue
  label: string // "due in 3h", "overdue 2h", "met"
}

/** Compute the live SLA state for an incident (call at read time). */
export function slaState(dueAtISO: string | null, status: string, closedAtISO: string | null): SlaState {
  if (!dueAtISO) return { dueAtISO: null, breached: false, msLeft: null, label: "—" }
  const due = new Date(dueAtISO).getTime()
  const open = isOpenStatus(status)
  if (!open) {
    // Closed — did we meet the SLA?
    const closed = closedAtISO ? new Date(closedAtISO).getTime() : Date.now()
    return { dueAtISO, breached: false, msLeft: null, label: closed <= due ? "SLA met" : "SLA missed" }
  }
  const msLeft = due - Date.now()
  const breached = msLeft < 0
  return { dueAtISO, breached, msLeft, label: breached ? `overdue ${dur(-msLeft)}` : `due in ${dur(msLeft)}` }
}

function dur(ms: number): string {
  const m = Math.max(0, Math.floor(ms / 60000))
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

/** Human incident number, e.g. INC-0007. */
export function incidentNumber(seq: number): string {
  return `INC-${String(seq).padStart(4, "0")}`
}

export function isIncidentStatus(value: string): value is IncidentStatus {
  return (INCIDENT_STATUSES as readonly string[]).includes(value)
}

export function isIncidentSeverity(value: string): value is IncidentSeverity {
  return (INCIDENT_SEVERITIES as readonly string[]).includes(value)
}
