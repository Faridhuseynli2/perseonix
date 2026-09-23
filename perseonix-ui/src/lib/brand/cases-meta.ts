// Shared by server and client components: no server-only imports here.

export const CASE_STATUSES = ["open", "investigating", "closed", "false_positive"] as const
export type CaseStatus = (typeof CASE_STATUSES)[number]

export const CASE_STATUS_LABEL: Record<CaseStatus, string> = {
  open: "Open",
  investigating: "Investigating",
  closed: "Closed",
  false_positive: "False positive",
}

/** Statuses that count as still needing analyst attention. */
export const OPEN_STATUSES: CaseStatus[] = ["open", "investigating"]
export const CLOSED_STATUSES: CaseStatus[] = ["closed", "false_positive"]

export function isOpenStatus(status: string): boolean {
  return status === "open" || status === "investigating"
}

export const CASE_SEVERITIES = ["high", "medium", "low"] as const
export type CaseSeverity = (typeof CASE_SEVERITIES)[number]

export const CASE_SEVERITY_LABEL: Record<string, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
}

/** Human case number, e.g. CASE-0007. */
export function caseNumber(seq: number): string {
  return `CASE-${String(seq).padStart(4, "0")}`
}

export function isCaseStatus(value: string): value is CaseStatus {
  return (CASE_STATUSES as readonly string[]).includes(value)
}

export function isCaseSeverity(value: string): value is CaseSeverity {
  return (CASE_SEVERITIES as readonly string[]).includes(value)
}
