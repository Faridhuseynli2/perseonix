import "server-only"
import { SOURCE_USER_AGENT } from "@/lib/investigate/sources/http"
import { connectorActive, connectorKey } from "@/lib/connectors/service"
import type { UrlscanPoll, UrlscanSubmission } from "@/lib/investigate/types"

// Optional provider. Requires URLSCAN_API_KEY — and, for use with paying
// customers, a commercial agreement with urlscan.io (see their terms).
const API = "https://urlscan.io/api/v1"
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function apiKey() {
  return connectorKey("urlscan")
}

export function urlscanEnabled() {
  return connectorActive("urlscan")
}

async function urlscanFetch(url: string, init: RequestInit = {}) {
  const key = apiKey()
  if (!key) throw new Error("urlscan.io is not configured.")
  return fetch(url, {
    ...init,
    headers: { "API-Key": key, "user-agent": SOURCE_USER_AGENT, ...init.headers },
    signal: AbortSignal.timeout(10_000),
  })
}

/** Customer investigations are always submitted privately: never listed on urlscan.io. */
export async function submitUrlscan(url: string): Promise<UrlscanSubmission> {
  const response = await urlscanFetch(`${API}/scan/`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url, visibility: "private" }),
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(body?.message ?? `urlscan.io responded with HTTP ${response.status}.`)
  }
  const data = (await response.json()) as { uuid: string }
  return { uuid: data.uuid, visibility: "private", submittedAt: new Date().toISOString() }
}

type UrlscanResult = {
  page?: {
    url?: string
    domain?: string
    ip?: string
    country?: string
    server?: string
    title?: string
    status?: string | number
  }
  verdicts?: {
    overall?: { malicious?: boolean; score?: number; categories?: string[]; brands?: string[] }
  }
  stats?: { requests?: unknown[] }
  lists?: { domains?: string[] }
}

export async function fetchUrlscanResult(uuid: string): Promise<UrlscanPoll> {
  if (!UUID.test(uuid)) return { state: "error", message: "Invalid scan reference." }
  const response = await urlscanFetch(`${API}/result/${uuid}/`)
  // 404 means the scan is still running; 410 means it was deleted.
  if (response.status === 404) return { state: "pending" }
  if (response.status === 410) return { state: "gone" }
  if (!response.ok) return { state: "error", message: `urlscan.io responded with HTTP ${response.status}.` }

  const result = (await response.json()) as UrlscanResult
  const overall = result.verdicts?.overall
  return {
    state: "done",
    summary: {
      url: result.page?.url,
      domain: result.page?.domain,
      ip: result.page?.ip,
      country: result.page?.country,
      server: result.page?.server,
      title: result.page?.title,
      status: result.page?.status ? Number(result.page.status) : undefined,
      malicious: Boolean(overall?.malicious),
      score: overall?.score ?? 0,
      categories: overall?.categories ?? [],
      brands: overall?.brands ?? [],
      requests: result.stats?.requests?.length,
      domains: result.lists?.domains?.length,
    },
  }
}

export async function fetchUrlscanScreenshot(uuid: string) {
  if (!UUID.test(uuid)) return null
  const response = await urlscanFetch(`https://urlscan.io/screenshots/${uuid}.png`)
  return response.ok ? response : null
}
