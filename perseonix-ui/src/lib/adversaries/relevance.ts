import "server-only"
import {
  actorActivity,
  filterGroups,
  getMitre,
  getRegion,
  toSummary,
  type GroupSummary,
} from "@/lib/adversaries/data"
import { getTargeting, type Motivation } from "@/lib/adversaries/targeting"
import {
  COUNTRY_BY_CODE,
  REGION_LABEL,
  SECTOR_LABEL,
  type RegionKey,
  type SectorKey,
} from "@/lib/intel/taxonomy"

export type RelevanceProfile = { sectors: SectorKey[]; country?: string }

export type RelevanceLevel = "critical" | "high" | "moderate" | "low"

export type RankedActor = GroupSummary & {
  score: number
  level: RelevanceLevel
  motivation: Motivation
  reasons: string[]
  matchedSectors: string[]
}

export type RelevanceResult = {
  actors: RankedActor[]
  total: number
  byOrigin: { region: string; count: number }[]
  byMotivation: { motivation: Motivation; count: number }[]
  topMalware: { name: string; count: number }[]
}

const W_SECTOR = 45
const W_GEO = 30
const W_RECENCY = 15
const W_SEVERITY = 10
const CURRENT_YEAR = 2026

function recencyScore(lastYear: number | null): number {
  if (!lastYear) return 0.25
  if (lastYear >= CURRENT_YEAR - 1) return 1
  if (lastYear >= CURRENT_YEAR - 3) return 0.7
  if (lastYear >= CURRENT_YEAR - 5) return 0.45
  return 0.25
}

function severityScore(regionKey: string): number {
  const level = getRegion(regionKey)?.threatLevel
  if (level === "CRITICAL") return 1
  if (level === "HIGH") return 0.8
  if (level === "MEDIUM" || level === "VARIABLE") return 0.5
  return 0.3
}

function levelFor(score: number): RelevanceLevel {
  if (score >= 70) return "critical"
  if (score >= 45) return "high"
  if (score >= 25) return "moderate"
  return "low"
}

const MOTIVATION_LABEL: Record<Motivation, string> = {
  espionage: "Espionage",
  financial: "Financially motivated",
  hacktivism: "Hacktivism",
  destructive: "Destructive / sabotage",
}

export function hasProfile(p: RelevanceProfile): boolean {
  return p.sectors.length > 0 || Boolean(p.country)
}

/** Rank every tracked actor by how likely it is to target the given profile. */
export function scoreActors(profile: RelevanceProfile, limit = 40): RelevanceResult {
  const profileRegion = profile.country ? COUNTRY_BY_CODE[profile.country]?.region : undefined
  const sectorSet = new Set(profile.sectors)

  const ranked: RankedActor[] = []
  for (const group of filterGroups({})) {
    const t = getTargeting(group.slug)
    if (!t || t.confidence === "low") continue

    const matched = t.sectors.filter((s) => sectorSet.has(s))
    const sectorScore = sectorSet.size ? matched.length / sectorSet.size : 0

    let geoScore = 0
    let geoReason = ""
    if (profile.country && t.countries.includes(profile.country)) {
      geoScore = 1
      geoReason = `Targets ${COUNTRY_BY_CODE[profile.country]?.name ?? profile.country}`
    } else if (profileRegion && t.regions.includes(profileRegion as RegionKey)) {
      geoScore = 0.6
      geoReason = `Active in your region: ${REGION_LABEL[profileRegion as RegionKey]}`
    }

    if (sectorScore === 0 && geoScore === 0) continue

    const lastYear = actorActivity(group.slug).lastYear
    const rec = recencyScore(lastYear)
    const sev = severityScore(group.region)
    const score = Math.round(W_SECTOR * sectorScore + W_GEO * geoScore + W_RECENCY * rec + W_SEVERITY * sev)

    const reasons: string[] = []
    if (matched.length) reasons.push(`Hits your sectors: ${matched.map((m) => SECTOR_LABEL[m]).join(", ")}`)
    if (geoReason) reasons.push(geoReason)
    if (lastYear && lastYear >= CURRENT_YEAR - 2) reasons.push(`Active in ${lastYear}`)
    reasons.push(MOTIVATION_LABEL[t.motivation])

    ranked.push({
      ...toSummary(group),
      score,
      level: levelFor(score),
      motivation: t.motivation,
      reasons,
      matchedSectors: matched.map((m) => SECTOR_LABEL[m]),
    })
  }

  ranked.sort((a, b) => b.score - a.score)
  const top = ranked.slice(0, limit)

  // Landscape aggregates over the ranked set.
  const originCounts = new Map<string, number>()
  const motivationCounts = new Map<Motivation, number>()
  const malwareCounts = new Map<string, number>()
  for (const a of ranked) {
    originCounts.set(a.region, (originCounts.get(a.region) ?? 0) + 1)
    motivationCounts.set(a.motivation, (motivationCounts.get(a.motivation) ?? 0) + 1)
    for (const m of a.malware.slice(0, 6)) malwareCounts.set(m, (malwareCounts.get(m) ?? 0) + 1)
  }

  return {
    actors: top,
    total: ranked.length,
    byOrigin: [...originCounts.entries()].map(([region, count]) => ({ region, count })).sort((a, b) => b.count - a.count),
    byMotivation: [...motivationCounts.entries()].map(([motivation, count]) => ({ motivation, count })).sort((a, b) => b.count - a.count),
    topMalware: [...malwareCounts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 12),
  }
}

/** Techniques most common across the top relevant actors (from MITRE enrichment). */
export function commonTechniques(actors: RankedActor[], limit = 8): { id: string; name: string; url: string; count: number }[] {
  const counts = new Map<string, { name: string; url: string; count: number }>()
  for (const a of actors.slice(0, 20)) {
    const mitre = getMitre(a.slug)
    if (!mitre) continue
    for (const tactic of mitre.tactics) {
      for (const tech of tactic.techniques) {
        if (tech.sub) continue
        const cur = counts.get(tech.id) ?? { name: tech.name, url: tech.url, count: 0 }
        cur.count++
        counts.set(tech.id, cur)
      }
    }
  }
  return [...counts.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

export { MOTIVATION_LABEL }
