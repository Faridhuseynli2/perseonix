// Shared by server and client components: keep free of server-only imports.

export const THEMES = [
  {
    value: "perseonix",
    label: "Perseonix",
    badge: "Default",
    description: "Our signature deep-navy workspace with electric-blue accents.",
  },
  {
    value: "dark",
    label: "Dark",
    badge: null,
    description: "Neutral graphite for low light and long analysis sessions.",
  },
  {
    value: "light",
    label: "Light",
    badge: null,
    description: "Bright, high-contrast surfaces for daylight work.",
  },
] as const

export type Theme = (typeof THEMES)[number]["value"]

export function isTheme(value: unknown): value is Theme {
  return THEMES.some((theme) => theme.value === value)
}
