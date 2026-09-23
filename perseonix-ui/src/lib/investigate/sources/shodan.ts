import "server-only"
import { SOURCE_USER_AGENT } from "@/lib/investigate/sources/http"
import { connectorActive, connectorKey } from "@/lib/connectors/service"
import type { ExposureInfo, ExposureService } from "@/lib/investigate/types"

// Optional provider: Shodan host lookups (open ports, services, CVEs, tags).
// Requires SHODAN_API_KEY. Host lookups don't consume query credits.
const API = "https://api.shodan.io"
const MAX_SERVICES = 25
const MAX_VULNS = 100

function apiKey() {
  return connectorKey("shodan")
}

export function shodanEnabled() {
  return connectorActive("shodan")
}

type ShodanService = {
  port?: number
  transport?: string
  product?: string
  version?: string
  timestamp?: string
  _shodan?: { module?: string }
  http?: { title?: string | null }
}

type ShodanHost = {
  ports?: number[]
  data?: ShodanService[]
  vulns?: string[] | Record<string, unknown>
  tags?: string[]
  os?: string | null
  org?: string | null
  isp?: string | null
  hostnames?: string[]
  last_update?: string
}

/** Shodan timestamps carry no zone; they are UTC. */
function toIso(value?: string) {
  if (!value) return undefined
  const date = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

export async function lookupExposure(ip: string): Promise<ExposureInfo | null> {
  const key = apiKey()
  if (!key) throw new Error("Shodan is not configured.")

  const url = new URL(`${API}/shodan/host/${encodeURIComponent(ip)}`)
  url.searchParams.set("key", key)
  // Error messages below never include the URL: it carries the API key.
  const response = await fetch(url, {
    headers: { "user-agent": SOURCE_USER_AGENT },
    signal: AbortSignal.timeout(10_000),
  })
  if (response.status === 404) return null
  if (response.status === 401 || response.status === 403) throw new Error("Shodan rejected the API key.")
  if (response.status === 429) throw new Error("Shodan's rate limit was reached. Try again shortly.")
  if (!response.ok) throw new Error(`Shodan responded with HTTP ${response.status}.`)

  const host = (await response.json()) as ShodanHost
  const vulns = Array.isArray(host.vulns) ? host.vulns : Object.keys(host.vulns ?? {})
  const services = (host.data ?? [])
    .map<ExposureService>((service) => ({
      port: service.port ?? 0,
      transport: service.transport ?? "tcp",
      product: service.product || undefined,
      version: service.version || undefined,
      module: service._shodan?.module,
      title: service.http?.title?.trim().slice(0, 160) || undefined,
      lastSeen: toIso(service.timestamp),
    }))
    .sort((a, b) => a.port - b.port)
    .slice(0, MAX_SERVICES)

  return {
    ip,
    ports: [...(host.ports ?? [])].sort((a, b) => a - b),
    services,
    vulns: vulns.filter((id) => /^CVE-\d{4}-\d+$/i.test(id)).sort().slice(0, MAX_VULNS),
    tags: host.tags ?? [],
    os: host.os || undefined,
    org: host.org || undefined,
    isp: host.isp || undefined,
    hostnames: (host.hostnames ?? []).slice(0, 20),
    lastUpdate: toIso(host.last_update),
  }
}
