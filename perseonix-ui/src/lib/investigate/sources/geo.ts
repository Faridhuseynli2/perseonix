import "server-only"
import { SOURCE_USER_AGENT } from "@/lib/investigate/sources/http"
import { remember } from "@/lib/investigate/sources/quota"
import type { GeoLocation } from "@/lib/investigate/types"

// RIPEstat's maxmind-geo-lite data call serves MaxMind GeoLite2 City data.
// No key needed; `sourceapp` identifies us as RIPEstat asks.
const API = "https://stat.ripe.net/data/maxmind-geo-lite/data.json"
const CACHE_MS = 6 * 60 * 60_000

type RipeLocation = {
  country?: string
  city?: string
  resources?: string[]
  latitude?: number
  longitude?: number
  covered_percentage?: number
}

type RipeResponse = {
  status?: string
  data?: { located_resources?: { locations?: RipeLocation[] }[] }
}

type Located = RipeLocation & { country: string; latitude: number; longitude: number }

/** Unknown ranges come back as country "?" at 0,0. */
const isLocated = (location: RipeLocation): location is Located =>
  Boolean(location.country && location.country !== "?") &&
  typeof location.latitude === "number" &&
  typeof location.longitude === "number" &&
  !(location.latitude === 0 && location.longitude === 0)

export function lookupGeo(ip: string): Promise<GeoLocation | null> {
  return remember(`geo:${ip}`, CACHE_MS, async () => {
    const response = await fetch(`${API}?resource=${encodeURIComponent(ip)}&sourceapp=perseonix`, {
      headers: { accept: "application/json", "user-agent": SOURCE_USER_AGENT },
      signal: AbortSignal.timeout(8_000),
    })
    if (!response.ok) throw new Error(`RIPEstat responded with HTTP ${response.status}.`)

    const body = (await response.json()) as RipeResponse
    const best = (body.data?.located_resources ?? [])
      .flatMap((resource) => resource.locations ?? [])
      .filter(isLocated)
      .sort((a, b) => (b.covered_percentage ?? 0) - (a.covered_percentage ?? 0))[0]
    if (!best) return null

    return {
      ip,
      latitude: best.latitude,
      longitude: best.longitude,
      city: best.city || undefined,
      countryCode: best.country,
      cityLevel: Boolean(best.city),
      network: best.resources?.[0],
    }
  })
}
