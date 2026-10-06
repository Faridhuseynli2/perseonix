// Shared by server and client components: keep free of server-only imports.

export const THEMES = [
  {
    value: "perseonix",
    label: "Perseonix",
    badge: "Default",
    description: "Deep-navy workspace, red accents.",
  },
  {
    value: "dark",
    label: "Dark",
    badge: null,
    description: "Neutral graphite, low-light.",
  },
  {
    value: "light",
    label: "Light",
    badge: null,
    description: "High-contrast, light mode.",
  },
] as const

export type Theme = (typeof THEMES)[number]["value"]

export function isTheme(value: unknown): value is Theme {
  return THEMES.some((theme) => theme.value === value)
}
