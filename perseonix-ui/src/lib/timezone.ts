// Shared timezone helpers (safe on server + client).

/** True when the string is a valid IANA timezone the runtime accepts. */
export function isValidTimeZone(tz: string): boolean {
  if (!tz || typeof tz !== "string") return false
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/** The list of IANA zones the runtime knows (falls back to a small set on old engines). */
export function timeZoneList(): string[] {
  const sv = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf
  try {
    const list = sv ? sv("timeZone") : []
    if (list.length) return list
  } catch {
    // fall through
  }
  return ["UTC", "Europe/London", "Europe/Istanbul", "Asia/Baku", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo"]
}

/** The current UTC offset label for a zone, e.g. "UTC+04:00". */
export function offsetLabel(tz: string, at: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" }).formatToParts(at)
    const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "UTC"
    return name.replace(/^GMT/, "UTC") || "UTC"
  } catch {
    return "UTC"
  }
}

/** Format an instant in a given timezone. */
export function formatInTimeZone(
  iso: string | Date | null,
  tz: string,
  opts: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" }
): string {
  if (!iso) return "—"
  const d = typeof iso === "string" ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return "—"
  try {
    return new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: tz }).format(d)
  } catch {
    return new Intl.DateTimeFormat("en-GB", opts).format(d)
  }
}
