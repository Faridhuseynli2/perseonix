import "server-only"
import groupsData from "@/lib/adversaries/data/groups.json"
import regionsData from "@/lib/adversaries/data/regions.json"
import mitreData from "@/lib/adversaries/data/mitre.json"
import campaignsData from "@/lib/adversaries/data/campaigns.json"

// Curated APT / threat-group dataset, parsed from the "APT Groups & Operations"
// tracker (CC BY 4.0). Read-only reference data bundled with the app; per-group
// images are added later by the customer. Kept server-side — the JSON is large.

export type Alias = { name: string; source?: string }

export type AdversaryGroup = {
  slug: string
  name: string
  region: string
  flag: string
  category: string
  mitreId: string | null
  aliases: Alias[]
  aliasNames: string[]
  toolset: string
  malware: string[]
  targets: string
  operations: string
  overlapping: string[]
  modusOperandi: string
  notes: string
  /** Public path to a portrait, when one has been assigned. */
  image?: string
}

export type MitreTechnique = { id: string; name: string; url: string; sub: boolean }
export type MitreTactic = { key: string; label: string; techniques: MitreTechnique[] }
export type MitreSoftware = { id: string; name: string; type: "malware" | "tool"; url: string }
export type MitreReference = { name: string; url: string }

/** MITRE ATT&CK enrichment for a group (from scripts/refresh-adversaries.mjs). */
export type MitreEnrichment = {
  attackId: string
  attackUrl: string
  attackName: string
  description: string
  techniqueCount: number
  tactics: MitreTactic[]
  software: MitreSoftware[]
  references: MitreReference[]
}

/** A public threat report, used as the module's campaign/activity timeline. */
export type Campaign = {
  id: string
  year: number
  title: string
  vendor: string
  url: string
  actorSlug: string | null
  actorName: string | null
  region: string | null
}

export type ThreatLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "VARIABLE" | "UNKNOWN"

export type Region = {
  key: string
  flag: string
  count: number
  threatLevel: ThreatLevel | null
  sponsor: string | null
  motivation: string | null
  description: string | null
}

// The source table uses "ORTA" (Turkish) for medium.
function normalizeLevel(value: string | null): ThreatLevel | null {
  if (!value) return null
  const upper = value.toUpperCase()
  return (upper === "ORTA" ? "MEDIUM" : upper) as ThreatLevel
}

const GROUPS = (groupsData as AdversaryGroup[]).slice().sort((a, b) => a.name.localeCompare(b.name))
const REGIONS: Region[] = (regionsData as Region[]).map((region) => ({
  ...region,
  threatLevel: normalizeLevel(region.threatLevel),
}))

const BY_SLUG = new Map(GROUPS.map((group) => [group.slug, group]))
const MITRE = (mitreData as { groups: Record<string, MitreEnrichment> }).groups

export function getMitre(slug: string): MitreEnrichment | undefined {
  return MITRE[slug]
}

const CAMPAIGNS = (campaignsData as { campaigns: Campaign[] }).campaigns
const CAMPAIGNS_BY_ACTOR = new Map<string, Campaign[]>()
for (const campaign of CAMPAIGNS) {
  if (!campaign.actorSlug) continue
  const list = CAMPAIGNS_BY_ACTOR.get(campaign.actorSlug) ?? []
  list.push(campaign)
  CAMPAIGNS_BY_ACTOR.set(campaign.actorSlug, list)
}

export function getActorCampaigns(slug: string): Campaign[] {
  return CAMPAIGNS_BY_ACTOR.get(slug) ?? []
}

/** Campaign count and most recent reported year for an actor. */
export function actorActivity(slug: string): { count: number; lastYear: number | null } {
  const list = CAMPAIGNS_BY_ACTOR.get(slug)
  if (!list?.length) return { count: 0, lastYear: null }
  return { count: list.length, lastYear: Math.max(...list.map((c) => c.year)) }
}

export type CampaignFilter = { q?: string; year?: number; actor?: string; vendor?: string; region?: string }

export function filterCampaigns(filter: CampaignFilter): Campaign[] {
  const q = filter.q?.trim().toLowerCase()
  return CAMPAIGNS.filter((c) => {
    if (filter.year && c.year !== filter.year) return false
    if (filter.actor && c.actorSlug !== filter.actor) return false
    if (filter.vendor && c.vendor !== filter.vendor) return false
    if (filter.region && c.region !== filter.region) return false
    if (q && !`${c.title} ${c.actorName ?? ""} ${c.vendor}`.toLowerCase().includes(q)) return false
    return true
  })
}

export function campaignYears(): { year: number; count: number }[] {
  const counts = new Map<number, number>()
  for (const c of CAMPAIGNS) counts.set(c.year, (counts.get(c.year) ?? 0) + 1)
  return [...counts.entries()].map(([year, count]) => ({ year, count })).sort((a, b) => a.year - b.year)
}

export function campaignVendors(): string[] {
  return [...new Set(CAMPAIGNS.map((c) => c.vendor))].sort((a, b) => a.localeCompare(b))
}

export function campaignStats() {
  return {
    total: CAMPAIGNS.length,
    attributed: CAMPAIGNS.filter((c) => c.actorSlug).length,
    actors: CAMPAIGNS_BY_ACTOR.size,
  }
}

// Resolve an "overlapping group" name (or alias) to a profile we hold, for pivots.
const NAME_INDEX = new Map<string, string>()
for (const group of GROUPS) {
  NAME_INDEX.set(group.name.toLowerCase(), group.slug)
  for (const alias of group.aliasNames) {
    const key = alias.toLowerCase()
    if (!NAME_INDEX.has(key)) NAME_INDEX.set(key, group.slug)
  }
}

export const CATEGORIES = ["APT", "Ransomware", "Hacktivist"] as const
export type Category = (typeof CATEGORIES)[number]

export function getRegions(): Region[] {
  return REGIONS
}

export function getRegion(key: string): Region | undefined {
  return REGIONS.find((region) => region.key === key)
}

export function getGroup(slug: string): AdversaryGroup | undefined {
  return BY_SLUG.get(slug)
}

export function resolveGroupSlug(name: string): string | undefined {
  return NAME_INDEX.get(name.trim().toLowerCase())
}

export type GroupFilter = { q?: string; region?: string; category?: string }

function matches(group: AdversaryGroup, filter: GroupFilter): boolean {
  if (filter.region && group.region !== filter.region) return false
  if (filter.category && group.category !== filter.category) return false
  const q = filter.q?.trim().toLowerCase()
  if (q) {
    const haystack = [
      group.name,
      ...group.aliasNames,
      ...group.malware,
      group.targets,
      group.operations,
      group.mitreId ?? "",
    ]
      .join(" ")
      .toLowerCase()
    if (!haystack.includes(q)) return false
  }
  return true
}

export function filterGroups(filter: GroupFilter): AdversaryGroup[] {
  return GROUPS.filter((group) => matches(group, filter))
}

const REGION_LEVEL = new Map(REGIONS.map((region) => [region.key, region.threatLevel]))

export type GroupSummary = {
  slug: string
  name: string
  region: string
  flag: string
  category: string
  threatLevel: ThreatLevel | null
  mitreId: string | null
  aliasNames: string[]
  malware: string[]
  targets: string
  image?: string
  techniqueCount?: number
  campaignCount?: number
  lastActive?: number | null
}

export function toSummary(group: AdversaryGroup): GroupSummary {
  return {
    slug: group.slug,
    name: group.name,
    region: group.region,
    flag: group.flag,
    category: group.category,
    threatLevel: REGION_LEVEL.get(group.region) ?? null,
    mitreId: group.mitreId,
    aliasNames: group.aliasNames,
    malware: group.malware,
    targets: group.targets,
    image: group.image,
    techniqueCount: MITRE[group.slug]?.techniqueCount,
    campaignCount: CAMPAIGNS_BY_ACTOR.get(group.slug)?.length,
    lastActive: actorActivity(group.slug).lastYear,
  }
}

/** Groups a profile overlaps with, resolved to profiles we can link to. */
export function relatedGroups(group: AdversaryGroup): { name: string; slug?: string }[] {
  const seen = new Set<string>()
  const out: { name: string; slug?: string }[] = []
  for (const name of group.overlapping) {
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const slug = resolveGroupSlug(name)
    if (slug === group.slug) continue
    out.push({ name, slug })
  }
  return out
}

export function datasetStats() {
  const malware = new Set<string>()
  for (const group of GROUPS) {
    for (const m of group.malware) malware.add(m.toLowerCase())
  }
  return {
    groups: GROUPS.length,
    regions: REGIONS.length,
    malware: malware.size,
    attackMapped: Object.keys(MITRE).length,
  }
}
