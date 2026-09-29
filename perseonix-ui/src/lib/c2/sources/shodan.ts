import "server-only"
import { connectorActive, connectorKey } from "@/lib/connectors/service"
import type { C2Def } from "@/lib/c2/catalog"
import type { C2Endpoint } from "@/lib/c2/sources/feodo"

// Shodan for C2 hunting. COUNT is free (no query credits) and powers the software
// leaderboard + time-series. SEARCH returns real IP:port endpoints and DOES spend
// query credits, so the scheduled job runs it only for a small rotating subset.

const API = "https://api.shodan.io"

export function shodanC2Enabled() {
  return connectorActive("shodan")
}

function key() {
  return connectorKey("shodan")
}

/** Free: number of matching endpoints for a query (no query credit spent). */
export async function shodanCount(query: string): Promise<number | null> {
  const k = key()
  if (!k) return null
  const url = new URL(`${API}/shodan/host/count`)
  url.searchParams.set("key", k)
  url.searchParams.set("query", query)
  const res = await fetch(url, { signal: AbortSignal.timeout(12_000) })
  if (!res.ok) return null
  const json = (await res.json()) as { total?: number }
  return typeof json.total === "number" ? json.total : null
}

type ShodanMatch = {
  ip_str?: string
  port?: number
  transport?: string
  timestamp?: string
  org?: string | null
  asn?: string | null // "AS13335"
  hostnames?: string[]
  location?: { country_code?: string | null }
}

/** Costs one query credit per call. Returns up to ~100 endpoints (first page). */
export async function shodanSearch(def: C2Def, limit = 60): Promise<C2Endpoint[]> {
  const k = key()
  if (!k) return []
  const url = new URL(`${API}/shodan/host/search`)
  url.searchParams.set("key", k)
  url.searchParams.set("query", def.query)
  url.searchParams.set("minify", "true")
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  if (!res.ok) return []
  const json = (await res.json()) as { matches?: ShodanMatch[] }
  const matches = json.matches ?? []
  const nowIso = new Date().toISOString()
  return matches
    .filter((m) => m.ip_str && m.port)
    .slice(0, limit)
    .map<C2Endpoint>((m) => ({
      ip: m.ip_str!,
      port: m.port!,
      software: def.key,
      softwareName: def.name,
      category: def.category,
      malware: null,
      tags: def.tags,
      country: m.location?.country_code ?? null,
      asn: m.asn ? Number(m.asn.replace(/^AS/i, "")) || null : null,
      asName: m.org ?? null,
      hostname: m.hostnames?.[0] ?? null,
      risk: def.risk,
      source: "shodan",
      status: "online",
      firstSeen: m.timestamp ? new Date(m.timestamp).toISOString() : nowIso,
      lastSeen: m.timestamp ? new Date(m.timestamp).toISOString() : nowIso,
    }))
}
