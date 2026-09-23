// Shared by server and client components: no server-only imports here.

export const ADVERSARIES_MODULE_KEY = "adversaries"
export const GROUPS_PER_PAGE = 24

export const REGION_KEYS = [
  "China",
  "Russia",
  "North Korea",
  "Iran",
  "Middle East",
  "Israel",
  "NATO",
  "Others",
  "Unknown",
] as const

export const CATEGORY_KEYS = ["APT", "Ransomware", "Hacktivist"] as const

export const THREAT_LEVEL_STYLES: Record<string, string> = {
  CRITICAL: "bg-sev-critical/10 text-sev-critical ring-sev-critical/30",
  HIGH: "bg-sev-high/10 text-sev-high ring-sev-high/30",
  MEDIUM: "bg-sev-medium/10 text-sev-medium ring-sev-medium/30",
  VARIABLE: "bg-signal/10 text-signal ring-signal/30",
  UNKNOWN: "bg-ink/[0.05] text-muted-foreground ring-ink/15",
}

export const CATEGORY_STYLES: Record<string, string> = {
  APT: "bg-brand/10 text-glow ring-brand/25",
  Ransomware: "bg-sev-critical/10 text-sev-critical ring-sev-critical/25",
  Hacktivist: "bg-signal/10 text-signal ring-signal/25",
}

// Hex accents for inline styles (left bars, dots, glows), keyed to the brand
// severity tokens. Used where a dynamic Tailwind class can't be generated.
export const THREAT_ACCENT: Record<string, string> = {
  CRITICAL: "#ff4d5e",
  HIGH: "#ff8a3d",
  MEDIUM: "#ffb400",
  VARIABLE: "#00b5fa",
  UNKNOWN: "#5b6a8f",
}

export function threatAccent(level?: string | null) {
  return (level && THREAT_ACCENT[level]) || THREAT_ACCENT.UNKNOWN
}

export const CATEGORY_ACCENT: Record<string, string> = {
  APT: "#00b5fa",
  Ransomware: "#ff4d5e",
  Hacktivist: "#ffb400",
}

export function mitreGroupUrl(mitreId: string) {
  return `https://attack.mitre.org/groups/${encodeURIComponent(mitreId)}`
}
