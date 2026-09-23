// Shared by server and client components: keep free of server-only imports.

export type CustomerPlan = "poc" | "licensed"

export const PLAN_LABELS: Record<CustomerPlan, string> = {
  poc: "Proof of concept",
  licensed: "Licensed",
}

/** Days before the end date at which a POC or license is flagged as ending soon. */
export const ENDING_SOON_DAYS = 14

const DAY_MS = 86_400_000

export function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function addDaysIso(dateIso: string, days: number) {
  return new Date(Date.parse(`${dateIso}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10)
}

export function daysUntil(dateIso: string, today = todayIso()) {
  return Math.round((Date.parse(dateIso) - Date.parse(today)) / DAY_MS)
}

/**
 * Customer users lose access the day after a POC's end date. Licensed terms
 * never lock users out — they're only flagged for renewal.
 */
export function evaluationEnded(
  plan: CustomerPlan,
  endsAt: string | null,
  today = todayIso()
) {
  return plan === "poc" && endsAt !== null && daysUntil(endsAt, today) < 0
}

export type TermStatus = {
  tone: "active" | "ending" | "ended" | "open"
  label: string
  daysLeft: number | null
}

export function termStatus(
  plan: CustomerPlan,
  endsAt: string | null,
  today = todayIso()
): TermStatus {
  if (!endsAt) return { tone: "open", label: "No end date", daysLeft: null }
  const days = daysUntil(endsAt, today)
  if (days < 0) return { tone: "ended", label: plan === "poc" ? "POC ended" : "Expired", daysLeft: days }
  if (days === 0) return { tone: "ending", label: "Ends today", daysLeft: 0 }
  if (days <= ENDING_SOON_DAYS) {
    return { tone: "ending", label: `${days} day${days === 1 ? "" : "s"} left`, daysLeft: days }
  }
  return { tone: "active", label: "Active", daysLeft: days }
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" })

export function formatDate(dateIso: string | null) {
  return dateIso ? dateFormat.format(new Date(`${dateIso}T00:00:00Z`)) : "—"
}
