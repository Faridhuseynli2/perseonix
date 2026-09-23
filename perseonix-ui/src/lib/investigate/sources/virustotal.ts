import "server-only"
import { isIP } from "node:net"
import { SOURCE_USER_AGENT } from "@/lib/investigate/sources/http"
import { envLimit, remember, reserve } from "@/lib/investigate/sources/quota"
import { connectorActive, connectorKey } from "@/lib/connectors/service"
import type { Target } from "@/lib/investigate/target"
import type { TargetKind, VirusTotalEngineHit, VirusTotalInfo } from "@/lib/investigate/types"

// Optional provider: VirusTotal v3 lookups of existing analyses. Requires
// VIRUSTOTAL_API_KEY. Lookups only: nothing is ever submitted, so customer
// targets are never shared with VirusTotal's community.
const API = "https://www.virustotal.com/api/v3"
const CACHE_MS = 60 * 60_000
const MAX_ENGINES = 40
/** Ignore popularity rankings that stopped updating (e.g. Alexa). */
const POPULARITY_MAX_AGE_S = 180 * 86_400

const COLLECTIONS: Record<TargetKind, string> = { domain: "domains", ip: "ip_addresses", url: "urls" }
const GUI_PATHS: Record<TargetKind, string> = { domain: "domain", ip: "ip-address", url: "url" }

function apiKey() {
  return connectorKey("virustotal")
}

export function virustotalEnabled() {
  return connectorActive("virustotal")
}

type VtEngineResult = { category?: string; engine_name?: string; result?: string | null }

type VtAttributes = {
  last_analysis_stats?: Partial<VirusTotalInfo["stats"]>
  last_analysis_results?: Record<string, VtEngineResult>
  last_analysis_date?: number
  first_submission_date?: number
  first_seen_date?: number
  reputation?: number
  total_votes?: { harmless?: number; malicious?: number }
  categories?: Record<string, string>
  tags?: string[]
  threat_names?: string[]
  popularity_ranks?: Record<string, { rank?: number; timestamp?: number }>
  as_owner?: string
  asn?: number
  country?: string
  network?: string
}

const fromUnix = (seconds?: number) => (seconds ? new Date(seconds * 1000).toISOString() : undefined)

function bestPopularity(ranks: VtAttributes["popularity_ranks"]) {
  const cutoff = Date.now() / 1000 - POPULARITY_MAX_AGE_S
  let best: VirusTotalInfo["popularity"]
  for (const [provider, entry] of Object.entries(ranks ?? {})) {
    if (!entry.rank || !entry.timestamp || entry.timestamp < cutoff) continue
    if (!best || entry.rank < best.rank) best = { provider, rank: entry.rank }
  }
  return best
}

function toInfo(kind: TargetKind, indicator: string, id: string, a: VtAttributes): VirusTotalInfo {
  const engines = Object.values(a.last_analysis_results ?? {})
    .filter(
      (r): r is VtEngineResult & { category: VirusTotalEngineHit["category"] } =>
        r.category === "malicious" || r.category === "suspicious"
    )
    .map<VirusTotalEngineHit>((r) => ({
      engine: r.engine_name ?? "Unknown vendor",
      category: r.category,
      label: r.result && r.result.toLowerCase() !== r.category ? r.result.slice(0, 80) : undefined,
    }))
    .sort((x, y) =>
      x.category === y.category ? x.engine.localeCompare(y.engine) : x.category === "malicious" ? -1 : 1
    )
    .slice(0, MAX_ENGINES)
  const stats = a.last_analysis_stats ?? {}
  // Vendors append their own name to categories, e.g. "Malicious (alphaMountain.ai)".
  const categories = Object.values(a.categories ?? {})
    .map((category) => category.replace(/\s*\([^)]*\)\s*$/, "").trim())
    .filter(Boolean)

  return {
    kind,
    indicator,
    stats: {
      malicious: stats.malicious ?? 0,
      suspicious: stats.suspicious ?? 0,
      harmless: stats.harmless ?? 0,
      undetected: stats.undetected ?? 0,
      timeout: stats.timeout ?? 0,
    },
    engines,
    reputation: a.reputation,
    votes: { harmless: a.total_votes?.harmless ?? 0, malicious: a.total_votes?.malicious ?? 0 },
    categories: [...new Set(categories)].slice(0, 12),
    tags: (a.tags ?? []).slice(0, 20),
    threatNames: (a.threat_names ?? []).slice(0, 10),
    popularity: kind === "domain" ? bestPopularity(a.popularity_ranks) : undefined,
    owner: a.as_owner,
    asn: a.asn,
    country: a.country,
    network: a.network,
    firstSeenAt: fromUnix(a.first_submission_date ?? a.first_seen_date),
    lastAnalysisAt: fromUnix(a.last_analysis_date),
    permalink: `https://www.virustotal.com/gui/${GUI_PATHS[kind]}/${encodeURIComponent(id)}`,
  }
}

function fetchObject(kind: TargetKind, indicator: string): Promise<VirusTotalInfo | null> {
  return remember(`virustotal:${kind}:${indicator}`, CACHE_MS, async () => {
    const key = apiKey()
    if (!key) throw new Error("VirusTotal is not configured.")
    const perMinute = envLimit("VIRUSTOTAL_RATE_PER_MINUTE", 4)
    const blocked = reserve("virustotal", { perMinute, perDay: envLimit("VIRUSTOTAL_DAILY_LIMIT", 500) })
    if (blocked === "minute") {
      throw new Error(`VirusTotal's limit of ${perMinute} lookups per minute was reached. Run the investigation again in a minute.`)
    }
    if (blocked === "day") throw new Error("VirusTotal's daily lookup quota is used up. It resets at 00:00 UTC.")

    const id = kind === "url" ? Buffer.from(indicator).toString("base64url") : indicator
    const response = await fetch(`${API}/${COLLECTIONS[kind]}/${encodeURIComponent(id)}`, {
      headers: { "x-apikey": key, accept: "application/json", "user-agent": SOURCE_USER_AGENT },
      signal: AbortSignal.timeout(10_000),
    })
    if (response.status === 404) return null
    if (response.status === 401) throw new Error("VirusTotal rejected the API key.")
    if (response.status === 403) throw new Error("VirusTotal refused the lookup.")
    if (response.status === 429) throw new Error("VirusTotal's quota was reached. Try again shortly.")
    if (!response.ok) throw new Error(`VirusTotal responded with HTTP ${response.status}.`)

    const body = (await response.json()) as { data?: { id?: string; attributes?: VtAttributes } }
    return toInfo(kind, indicator, body.data?.id ?? id, body.data?.attributes ?? {})
  })
}

/** One lookup per investigation; a URL VirusTotal has never seen falls back to its host. */
export async function lookupVirusTotal(target: Target): Promise<VirusTotalInfo | null> {
  const host = target.host.replace(/^\[|\]$/g, "")
  const hostKind: TargetKind = isIP(host) ? "ip" : "domain"
  if (target.kind !== "url" || !target.url) return fetchObject(hostKind, host)

  const url = await fetchObject("url", target.url)
  if (url) return url
  // Most URLs have never been analysed, but the host's reputation still says a lot.
  const fallback = await fetchObject(hostKind, host).catch(() => null)
  return fallback && { ...fallback, fallbackFrom: target.url }
}
