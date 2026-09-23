import "server-only"
import { filterGroups, type AdversaryGroup } from "@/lib/adversaries/data"
import {
  COUNTRY_BY_CODE,
  COUNTRIES,
  REGION_PHRASES,
  SECTORS,
  type RegionKey,
  type SectorKey,
} from "@/lib/intel/taxonomy"

// Structured targeting per group, extracted from the free-text "targets"/notes
// prose with the shared taxonomy. Deterministic, no LLM. Memoised for the
// process. A curated override map fixes the most prominent groups.

export type Motivation = "espionage" | "financial" | "hacktivism" | "destructive"

export type Targeting = {
  sectors: SectorKey[]
  countries: string[]
  regions: RegionKey[]
  motivation: Motivation
  confidence: "high" | "medium" | "low"
}

// Curated corrections for well-known crews (matched by name or alias, lowercase).
const OVERRIDES: { match: string[]; data: Partial<Targeting> }[] = [
  { match: ["apt28", "fancy bear", "sofacy"], data: { sectors: ["government", "defense", "aerospace", "media"], regions: ["north_america", "europe"], countries: ["US", "UA"], motivation: "espionage" } },
  { match: ["apt29", "cozy bear", "the dukes", "midnight blizzard"], data: { sectors: ["government", "technology", "ngo", "healthcare"], regions: ["north_america", "europe"], motivation: "espionage" } },
  { match: ["lazarus", "hidden cobra"], data: { sectors: ["financial", "crypto", "defense", "energy"], regions: ["north_america", "east_asia", "europe"], countries: ["KR", "US"], motivation: "financial" } },
  { match: ["sandworm", "voodoo bear"], data: { sectors: ["energy", "critical_infra", "government", "transportation"], regions: ["europe"], countries: ["UA"], motivation: "destructive" } },
  { match: ["apt41", "winnti", "barium"], data: { sectors: ["technology", "healthcare", "telecom", "manufacturing", "government"], regions: ["north_america", "east_asia", "southeast_asia", "europe"], motivation: "espionage" } },
  { match: ["muddywater", "static kitten"], data: { sectors: ["government", "telecom", "energy", "defense"], regions: ["middle_east"], countries: ["TR", "SA", "IL", "AE"], motivation: "espionage" } },
  { match: ["kimsuky", "velvet chollima"], data: { sectors: ["government", "education", "defense", "ngo"], regions: ["east_asia", "north_america"], countries: ["KR", "US"], motivation: "espionage" } },
  { match: ["apt10", "stone panda", "menupass"], data: { sectors: ["technology", "manufacturing", "government", "healthcare"], regions: ["north_america", "europe", "east_asia"], motivation: "espionage" } },
  { match: ["turla", "snake", "venomous bear"], data: { sectors: ["government", "defense", "technology", "education"], regions: ["north_america", "europe", "middle_east"], motivation: "espionage" } },
  { match: ["charming kitten", "apt35", "phosphorus"], data: { sectors: ["government", "media", "ngo", "education"], regions: ["middle_east", "north_america", "europe"], countries: ["IL", "US"], motivation: "espionage" } },
  { match: ["oceanlotus", "apt32"], data: { sectors: ["government", "manufacturing", "media", "technology"], regions: ["southeast_asia"], countries: ["VN"], motivation: "espionage" } },
  { match: ["apt33", "elfin"], data: { sectors: ["aerospace", "energy", "defense"], regions: ["middle_east", "north_america"], countries: ["SA", "US"], motivation: "espionage" } },
  { match: ["equation"], data: { sectors: ["government", "telecom", "energy", "defense"], regions: ["middle_east", "east_asia", "europe"], motivation: "espionage" } },
  { match: ["fin7", "carbanak"], data: { sectors: ["retail", "financial", "hospitality"], regions: ["north_america", "europe"], motivation: "financial" } },
  { match: ["anonymous", "killnet"], data: { sectors: ["government", "financial", "media", "critical_infra"], regions: ["north_america", "europe"], motivation: "hacktivism" } },
]

const globalForTargeting = globalThis as typeof globalThis & {
  __pxTargeting?: Map<string, Targeting>
}

function textOf(g: AdversaryGroup): string {
  return [g.targets, g.notes, g.operations, g.modusOperandi].filter(Boolean).join(" ").toLowerCase()
}

function extractSectors(text: string): SectorKey[] {
  const out: SectorKey[] = []
  for (const s of SECTORS) {
    if (s.synonyms.some((syn) => text.includes(syn))) out.push(s.key)
  }
  return out
}

function matchTerm(text: string, term: string): boolean {
  if (/[^a-z]/.test(term)) return text.includes(term) // has punctuation/space → substring
  return new RegExp(`\\b${term}\\b`).test(text)
}

function extractGeo(text: string): { countries: string[]; regions: Set<RegionKey> } {
  const countries: string[] = []
  const regions = new Set<RegionKey>()
  for (const c of COUNTRIES) {
    const terms = [c.name.toLowerCase(), ...(c.aliases ?? [])].filter((t) => t.length >= 3)
    if (terms.some((t) => matchTerm(text, t))) {
      countries.push(c.code)
      regions.add(c.region)
    }
  }
  for (const rp of REGION_PHRASES) {
    if (text.includes(rp.phrase)) rp.regions.forEach((r) => regions.add(r))
  }
  return { countries, regions }
}

function inferMotivation(g: AdversaryGroup, text: string): Motivation {
  if (g.category === "Ransomware" || /financ|monet|extort|ransom|cybercrim|fraud|theft of funds/.test(text)) return "financial"
  if (g.category === "Hacktivist" || /hacktivis|protest|ideolog|defacement/.test(text)) return "hacktivism"
  if (/sabotage|destructive|wiper|disrupt operations|data destruction/.test(text)) return "destructive"
  return "espionage"
}

function computeTargeting(g: AdversaryGroup): Targeting {
  const text = textOf(g)
  const hay = [g.name, ...g.aliasNames].map((s) => s.toLowerCase())
  const override = OVERRIDES.find((o) => o.match.some((m) => hay.includes(m)))

  const sectors = new Set<SectorKey>(extractSectors(text))
  const geo = extractGeo(text)
  const countries = new Set<string>(geo.countries)
  const regions = new Set<RegionKey>(geo.regions)
  let motivation = inferMotivation(g, text)

  if (override) {
    override.data.sectors?.forEach((s) => sectors.add(s))
    override.data.countries?.forEach((c) => countries.add(c))
    override.data.regions?.forEach((r) => regions.add(r))
    if (override.data.motivation) motivation = override.data.motivation
  }
  // A matched country implies its region.
  for (const code of countries) {
    const region = COUNTRY_BY_CODE[code]?.region
    if (region) regions.add(region)
  }

  const matched = sectors.size + countries.size + regions.size
  const confidence: Targeting["confidence"] = override
    ? "high"
    : g.targets && matched > 0
      ? "high"
      : matched > 0
        ? "medium"
        : "low"

  return {
    sectors: [...sectors],
    countries: [...countries],
    regions: [...regions],
    motivation,
    confidence,
  }
}

function build(): Map<string, Targeting> {
  const map = new Map<string, Targeting>()
  for (const g of filterGroups({})) map.set(g.slug, computeTargeting(g))
  return map
}

function all(): Map<string, Targeting> {
  return (globalForTargeting.__pxTargeting ??= build())
}

export function getTargeting(slug: string): Targeting | undefined {
  return all().get(slug)
}

export function targetingCoverage(): { total: number; withSectors: number; withGeo: number } {
  let withSectors = 0
  let withGeo = 0
  for (const t of all().values()) {
    if (t.sectors.length) withSectors++
    if (t.countries.length || t.regions.length) withGeo++
  }
  return { total: all().size, withSectors, withGeo }
}
