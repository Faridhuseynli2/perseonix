// Shared by server and client components: no server-only imports here.

export const RANSOMWARE_MODULE_KEY = "ransomware"
export const RANSOMWARE_MODULE_NAME = "Ransomware Tracker"

/** Connector id for the ingestion source (managed in the admin console). */
export const RANSOMWARE_SOURCE_ID = "ransomware_live"

/** Brand accent for this module — ransomware reads as critical/red. */
export const RANSOMWARE_ACCENT = "#ff4d5e"

/** Normalize a group name into a stable url-safe slug. */
export function slugifyGroup(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

const regionNames = new Intl.DisplayNames(["en"], { type: "region" })

/** "GB" → "United Kingdom"; falls back to the code itself. */
export function countryName(code?: string | null): string {
  if (!code) return "Unknown"
  try {
    return regionNames.of(code.toUpperCase()) ?? code
  } catch {
    return code
  }
}

/** Sectors arrive as free text; tidy for display. */
export function sectorLabel(value?: string | null): string {
  const v = value?.trim()
  return v && v.length > 0 ? v : "Unknown"
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return n === 1 ? one : many
}

/** Compact "about X ago" from an ISO timestamp. */
export function timeAgo(iso: string | null): string {
  if (!iso) return "—"
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return "—"
  const diff = Date.now() - t
  const min = Math.floor(diff / 60000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `about ${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}d ago`
  const mo = Math.floor(day / 30)
  if (mo < 12) return `${mo}mo ago`
  return `${Math.floor(mo / 12)}y ago`
}

/** True when the timestamp is within the last 24h. */
export function isFresh(iso: string | null, hours = 24): boolean {
  if (!iso) return false
  const t = new Date(iso).getTime()
  return !Number.isNaN(t) && Date.now() - t < hours * 3_600_000
}

/** ISO-3166-1 alpha-2 → regional-indicator flag emoji ("US" → 🇺🇸). */
export function flagEmoji(code?: string | null): string {
  if (!code || code.length !== 2 || !/^[a-zA-Z]{2}$/.test(code)) return "🏴"
  const base = 0x1f1e6
  const up = code.toUpperCase()
  return String.fromCodePoint(base + up.charCodeAt(0) - 65, base + up.charCodeAt(1) - 65)
}
