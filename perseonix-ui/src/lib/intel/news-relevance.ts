import "server-only"
import type { CurrentUser } from "@/lib/auth/dal"
import { getProfiles } from "@/lib/adversaries/relevance-store"
import { listWatchlist } from "@/lib/adversaries/watch"
import { listAssets } from "@/lib/brand/store"
import { COUNTRY_BY_CODE, REGION_LABEL, SECTOR_LABEL } from "@/lib/intel/taxonomy"
import type { ArticleRelevance, ArticleRow } from "@/lib/intel/news"

// Org-relevance scoring for Threat News: how much a news item matters to THIS customer,
// from their relevance profile (sectors/region), protected brand assets, and watched actors.
// This is our differentiator over a public feed — a public feed can't personalise.

export type OrgContext = {
  sectorTokens: string[] // lowercased sector keys + labels the org cares about
  regionTokens: string[] // lowercased region keys + labels
  assetDomains: string[] // lowercased protected domains
  watchedActors: string[] // lowercased watched actor names
  hasSignals: boolean
}

const lc = (s: string) => s.trim().toLowerCase()

export async function getOrgContext(user: CurrentUser): Promise<OrgContext> {
  const [profiles, assets, watch] = await Promise.all([
    getProfiles(user).catch(() => null),
    listAssets(user).catch(() => []),
    listWatchlist(user.id).catch(() => []),
  ])
  const eff = profiles?.effective ?? null
  const sectors = eff?.sectors ?? []
  const country = eff?.country
  const region = country ? COUNTRY_BY_CODE[country]?.region : undefined

  const sectorTokens = [
    ...sectors.map((s) => lc(String(s))),
    ...sectors.map((s) => lc(SECTOR_LABEL[s] ?? String(s))),
  ]
  const regionTokens = region ? [lc(region), lc(REGION_LABEL[region] ?? region)] : []

  const ctx: OrgContext = {
    sectorTokens: [...new Set(sectorTokens)],
    regionTokens: [...new Set(regionTokens)],
    assetDomains: assets.map((a) => lc(a.domain)),
    watchedActors: watch.map((w) => lc(w.name)),
    hasSignals: false,
  }
  ctx.hasSignals = Boolean(
    ctx.watchedActors.length || ctx.assetDomains.length || ctx.sectorTokens.length || ctx.regionTokens.length
  )
  return ctx
}

function scoreArticle(a: ArticleRow, org: OrgContext): ArticleRelevance {
  let score = 0
  const reasons: string[] = []

  const actorHit = a.actors.filter((x) => org.watchedActors.includes(lc(x)))
  if (actorHit.length) {
    score += 55
    reasons.push(`You track ${actorHit.slice(0, 3).join(", ")}`)
  }

  const text = (a.title + " " + (a.summary ?? "")).toLowerCase()
  const domHit = org.assetDomains.filter((d) => text.includes(d))
  if (domHit.length) {
    score += 45
    reasons.push(`Mentions your asset ${domHit.slice(0, 2).join(", ")}`)
  }

  const secHit = a.sectors.filter((s) => org.sectorTokens.includes(lc(s)))
  if (secHit.length) {
    score += 25
    reasons.push(`Your sector: ${secHit.slice(0, 3).join(", ")}`)
  }

  const regHit = a.regions.filter((r) => org.regionTokens.includes(lc(r)))
  if (regHit.length) {
    score += 12
    reasons.push(`Your region: ${regHit.slice(0, 2).join(", ")}`)
  }

  if (a.severity === "critical") score += 12
  else if (a.severity === "high") score += 6

  score = Math.min(100, score)
  const level =
    score >= 70 ? "critical" : score >= 45 ? "high" : score >= 22 ? "moderate" : score > 0 ? "low" : "none"
  return { score, level, reasons }
}

/** Fill each article's `relevance` for this org. No-op (null) when the org has no signals to match against. */
export function scoreArticles(rows: ArticleRow[], org: OrgContext): ArticleRow[] {
  if (!org.hasSignals) return rows
  for (const r of rows) r.relevance = scoreArticle(r, org)
  return rows
}
