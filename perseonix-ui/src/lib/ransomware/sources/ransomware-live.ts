import { slugifyGroup } from "@/lib/ransomware/meta"

// Adapter for the ransomware.live public tracker. The free v2 API needs no key
// (personal use only, 1 req/min per endpoint); a PRO key switches to the paid
// host for business use. Kept behind a narrow interface so the source can be
// swapped (PRO, or a self-hosted ransomwatch) without touching the ingestion.

const FREE_BASE = "https://api.ransomware.live/v2"
const PRO_BASE = "https://api-pro.ransomware.live/v2"
const FETCH_TIMEOUT_MS = 20_000
const USER_AGENT = "Perseonix-Corvael/1.0 (+https://perseonix.local)"

export type RawVictim = {
  victim: string
  groupName: string
  groupSlug: string
  country: string | null
  sector: string | null
  domain: string | null
  description: string | null
  ransom: string | null
  dataSize: string | null
  pressSource: string | null
  pressSummary: string | null
  infostealer: Record<string, unknown> | null
  attackDate: string | null
  discovered: Date | null
  sourceRef: string | null
}

export type RawGroup = {
  slug: string
  name: string
  aliases: string[]
  description: string | null
  tools: string[]
  sourceRef: string | null
  addedDate: Date | null
}

export type SourceOptions = { apiKey?: string | null }

async function fetchJson(path: string, opts: SourceOptions): Promise<unknown> {
  const base = opts.apiKey ? PRO_BASE : FREE_BASE
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(`${base}${path}`, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
        ...(opts.apiKey ? { "X-API-KEY": opts.apiKey } : {}),
      },
      cache: "no-store",
    })
    if (!res.ok) throw new Error(`ransomware.live ${path} → HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

// The API mixes strings and arrays across fields; coerce defensively.
function toList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean)
  if (typeof value === "string") {
    return value
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}

function toDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null
  const normalized = value.includes("T") ? value : value.replace(" ", "T")
  const d = new Date(normalized)
  return Number.isNaN(d.getTime()) ? null : d
}

function toDateString(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null
  const d = toDate(value)
  return d ? d.toISOString().slice(0, 10) : value.slice(0, 10)
}

function str(value: unknown): string | null {
  const v = typeof value === "string" ? value.trim() : ""
  return v.length ? v : null
}

export async function fetchRecentVictims(opts: SourceOptions = {}): Promise<RawVictim[]> {
  const data = await fetchJson("/recentvictims", opts)
  if (!Array.isArray(data)) return []
  return data.map((raw) => {
    const r = raw as Record<string, unknown>
    const groupName = str(r.group) ?? "Unknown"
    const press = (r.press && typeof r.press === "object" ? r.press : {}) as Record<string, unknown>
    const infostealer =
      r.infostealer && typeof r.infostealer === "object" && !Array.isArray(r.infostealer)
        ? (r.infostealer as Record<string, unknown>)
        : null
    return {
      victim: str(r.victim) ?? "(undisclosed)",
      groupName,
      groupSlug: slugifyGroup(groupName),
      country: str(r.country),
      sector: str(r.activity),
      domain: str(r.domain),
      // The group's own claim text (what they say they took) — never a leak link.
      description: str(r.description)?.slice(0, 4000) ?? null,
      ransom: str(r.ransom),
      dataSize: str(r.data_size),
      // press.source is the real news article; press.link is the tracker's page.
      pressSource: str(press.source),
      pressSummary: str(press.summary)?.slice(0, 2000) ?? null,
      infostealer,
      attackDate: toDateString(r.attackdate),
      discovered: toDate(r.discovered),
      sourceRef: str(r.url),
    }
  })
}

export async function fetchGroups(opts: SourceOptions = {}): Promise<RawGroup[]> {
  const data = await fetchJson("/groups", opts)
  if (!Array.isArray(data)) return []
  return data.map((raw) => {
    const r = raw as Record<string, unknown>
    const name = str(r.name) ?? "Unknown"
    return {
      slug: slugifyGroup(name),
      name,
      aliases: toList(r.altname),
      description: str(r.description)?.slice(0, 1200) ?? null,
      tools: toList(r.tools),
      sourceRef: str(r.url),
      addedDate: toDate(r.added_date),
    }
  })
}
