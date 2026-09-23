import "server-only"
import { SOURCE_USER_AGENT } from "@/lib/investigate/sources/http"
import { connectorActive, connectorKey } from "@/lib/connectors/service"
import type { Target } from "@/lib/investigate/target"
import type { ThreatFeedHit, ThreatFeedResult } from "@/lib/investigate/types"

// Optional provider: abuse.ch URLhaus. Its data is free for commercial use but
// the API needs a (free) Auth-Key, set as ABUSECH_AUTH_KEY.
const API = "https://urlhaus-api.abuse.ch/v1"

function authKey() {
  return connectorKey("urlhaus")
}

export function threatFeedEnabled() {
  return connectorActive("urlhaus")
}

type UrlhausUrl = {
  url?: string
  url_status?: string
  threat?: string
  date_added?: string
  tags?: string[] | null
}

type HostResponse = {
  query_status: string
  urlhaus_reference?: string
  url_count?: string | number
  urls?: UrlhausUrl[]
}

type UrlResponse = UrlhausUrl & { query_status: string; urlhaus_reference?: string }

async function query<T>(path: "host" | "url", field: string, value: string): Promise<T> {
  const key = authKey()
  if (!key) throw new Error("URLhaus is not configured.")
  const response = await fetch(`${API}/${path}/`, {
    method: "POST",
    headers: {
      "Auth-Key": key,
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": SOURCE_USER_AGENT,
    },
    body: new URLSearchParams({ [field]: value }),
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) throw new Error(`URLhaus responded with HTTP ${response.status}.`)
  return (await response.json()) as T
}

function toHit(entry: UrlhausUrl, fallbackUrl: string): ThreatFeedHit {
  return {
    url: entry.url ?? fallbackUrl,
    status: entry.url_status ?? "unknown",
    threat: entry.threat ?? "unknown",
    dateAdded: entry.date_added ?? "",
    tags: entry.tags ?? [],
  }
}

export async function lookupThreatFeed(target: Target): Promise<ThreatFeedResult> {
  if (target.kind === "url") {
    const result = await query<UrlResponse>("url", "url", target.value)
    if (result.query_status === "no_results") return { listed: false, active: false, urlCount: 0, hits: [] }
    if (result.query_status !== "ok") throw new Error("URLhaus couldn't process this URL.")
    const hit = toHit(result, target.value)
    return { listed: true, active: hit.status === "online", urlCount: 1, hits: [hit], reference: result.urlhaus_reference }
  }

  const result = await query<HostResponse>("host", "host", target.host)
  if (result.query_status === "no_results") return { listed: false, active: false, urlCount: 0, hits: [] }
  if (result.query_status !== "ok") throw new Error("URLhaus couldn't process this host.")
  const hits = (result.urls ?? []).map((entry) => toHit(entry, target.host))
  return {
    listed: hits.length > 0,
    active: hits.some((hit) => hit.status === "online"),
    urlCount: Number(result.url_count ?? hits.length),
    hits: hits.slice(0, 10),
    reference: result.urlhaus_reference,
  }
}
