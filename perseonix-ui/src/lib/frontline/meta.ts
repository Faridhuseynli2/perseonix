// Frontline — live Russia–Ukraine conflict monitor. Shared metadata (safe on
// server + client; no server-only imports).

export const FRONTLINE_MODULE_KEY = "frontline"

export type FrontlineSeverity = "critical" | "high" | "medium" | "low" | "info"

export const SEVERITIES: FrontlineSeverity[] = ["critical", "high", "medium", "low", "info"]

export const SEVERITY_LABEL: Record<FrontlineSeverity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Info",
}

// Hex for inline SVG / charts — the shared four-step ramp + neutral info.
export const SEVERITY_HEX: Record<FrontlineSeverity, string> = {
  critical: "#ff4d5e",
  high: "#ff8a3d",
  medium: "#ffb400",
  low: "#00b5fa",
  info: "#5b6a8f",
}

export function severityHex(sev: string | null | undefined): string {
  return SEVERITY_HEX[(sev as FrontlineSeverity) ?? "info"] ?? SEVERITY_HEX.info
}

// Event categories. Keep the set tight and operationally meaningful.
export type FrontlineCategory =
  | "strike"
  | "ground"
  | "air"
  | "naval"
  | "drone"
  | "diplomacy"
  | "humanitarian"
  | "cyber"
  | "economic"
  | "other"

export const CATEGORIES: FrontlineCategory[] = [
  "strike",
  "ground",
  "air",
  "naval",
  "drone",
  "diplomacy",
  "humanitarian",
  "cyber",
  "economic",
  "other",
]

export const CATEGORY_LABEL: Record<FrontlineCategory, string> = {
  strike: "Strike",
  ground: "Ground",
  air: "Air",
  naval: "Naval",
  drone: "Drone / UAV",
  diplomacy: "Diplomacy",
  humanitarian: "Humanitarian",
  cyber: "Cyber",
  economic: "Economic",
  other: "Other",
}

export function categoryLabel(cat: string | null | undefined): string {
  return CATEGORY_LABEL[(cat as FrontlineCategory) ?? "other"] ?? "Other"
}

// Which side an event concerns / is attributed to.
export type FrontlineSide = "RU" | "UA" | "both" | "other"
export const SIDE_LABEL: Record<FrontlineSide, string> = {
  RU: "Russia",
  UA: "Ukraine",
  both: "Both",
  other: "Other",
}
