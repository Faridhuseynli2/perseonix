import "server-only"
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm"
import { getDb } from "@/db"
import { frontlineEvents } from "@/db/schema"
import {
  CATEGORIES,
  SEVERITIES,
  type FrontlineCategory,
  type FrontlineSeverity,
  type FrontlineSide,
} from "@/lib/frontline/meta"

// Frontline store. Ingests Russia–Ukraine conflict events pushed by an n8n
// playbook (Telegram OSINT + news), each already short-summarised. We keep OUR
// summary + a link to the source (never the full source text). Degrades to
// empty before the table exists (until one restart).

function isSchemaNotReady(error: unknown): boolean {
  for (let cur: unknown = error, d = 0; cur && d < 6; d++) {
    if (typeof cur !== "object") break
    const r = cur as { code?: unknown; message?: unknown; cause?: unknown }
    if (r.code === "42P01" || r.code === "42703") return true
    if (typeof r.message === "string" && /frontline_events/.test(r.message) && /does not exist|no such/.test(r.message)) return true
    cur = r.cause
  }
  return false
}
async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (isSchemaNotReady(error)) return fallback
    throw error
  }
}

// ── Normalisation helpers ───────────────────────────────────────────────────
const str = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "")
const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN
  return Number.isFinite(n) ? n : null
}
function parseDate(v: unknown): Date | null {
  if (!v) return null
  const d = new Date(typeof v === "number" ? v : String(v))
  return Number.isNaN(d.getTime()) ? null : d
}
function titleKey(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9Ѐ-ӿ]+/g, " ").trim().slice(0, 160)
}
function normSeverity(v: unknown): FrontlineSeverity | null {
  const s = str(v, 20).toLowerCase()
  return (SEVERITIES as string[]).includes(s) ? (s as FrontlineSeverity) : null
}
function normCategory(v: unknown): FrontlineCategory {
  const c = str(v, 20).toLowerCase()
  return (CATEGORIES as string[]).includes(c) ? (c as FrontlineCategory) : "other"
}
function normSide(v: unknown): FrontlineSide | null {
  const s = str(v, 10).toLowerCase()
  if (s === "ru" || s === "russia") return "RU"
  if (s === "ua" || s === "ukraine") return "UA"
  if (s === "both") return "both"
  if (s === "other") return "other"
  return null
}

// ── Ingest ──────────────────────────────────────────────────────────────────
export type FrontlineInput = {
  title?: unknown
  summary?: unknown
  analystNote?: unknown
  category?: unknown
  severity?: unknown
  side?: unknown
  region?: unknown
  country?: unknown
  lat?: unknown
  lng?: unknown
  source?: unknown
  url?: unknown
  externalId?: unknown
  happenedAt?: unknown
  occurredAt?: unknown
  date?: unknown
}
export type IngestResult = { received: number; added: number; updated: number; duplicates: number; dropped: number }

const DUP_WINDOW_DAYS = 2

export async function ingestFrontline(items: FrontlineInput[]): Promise<IngestResult> {
  return safe(
    async () => {
      const db = await getDb()
      let added = 0
      let duplicates = 0
      let dropped = 0
      const since = new Date(Date.now() - DUP_WINDOW_DAYS * 86_400_000)

      for (const raw of items) {
        const title = str(raw.title, 500)
        if (title.length < 3) {
          dropped++
          continue
        }
        const url = str(raw.url, 1000) || null
        const dedup = titleKey(title)

        const existing = await db
          .select({ id: frontlineEvents.id })
          .from(frontlineEvents)
          .where(
            and(
              gte(frontlineEvents.createdAt, since),
              url ? eq(frontlineEvents.url, url) : eq(frontlineEvents.dedupKey, dedup)
            )
          )
          .limit(1)
        if (existing.length) {
          duplicates++
          continue
        }

        await db.insert(frontlineEvents).values({
          externalId: str(raw.externalId, 200) || null,
          title,
          summary: str(raw.summary, 4000) || null,
          analystNote: str(raw.analystNote, 2000) || null,
          dedupKey: dedup,
          category: normCategory(raw.category),
          severity: normSeverity(raw.severity),
          side: normSide(raw.side),
          region: str(raw.region, 200) || null,
          country: (str(raw.country, 8) || "").toUpperCase() || null,
          lat: num(raw.lat),
          lng: num(raw.lng),
          source: str(raw.source, 200) || null,
          url,
          happenedAt: parseDate(raw.happenedAt ?? raw.occurredAt ?? raw.date),
        })
        added++
      }

      return { received: items.length, added, updated: 0, duplicates, dropped }
    },
    { received: items.length, added: 0, updated: 0, duplicates: 0, dropped: items.length }
  )
}

// ── Reads ───────────────────────────────────────────────────────────────────
export type EventRow = {
  id: string
  title: string
  summary: string | null
  analystNote: string | null
  category: string | null
  severity: string | null
  side: string | null
  region: string | null
  country: string | null
  lat: number | null
  lng: number | null
  source: string | null
  url: string | null
  /** When the event occurred (source time), or arrival if unknown. */
  at: string
  /** When it landed on our platform. */
  createdAt: string
  happenedAt: string | null
}

export type EventFilter = {
  categories?: string[]
  severities?: string[]
  side?: string
  sinceMinutes?: number
  limit?: number
}

// Effective time = when it occurred, falling back to arrival.
const whenExpr = sql<Date>`coalesce(${frontlineEvents.happenedAt}, ${frontlineEvents.createdAt})`

export async function listEvents(f: EventFilter = {}): Promise<EventRow[]> {
  return safe(async () => {
    const db = await getDb()
    const clauses = []
    if (f.categories?.length) clauses.push(inArray(frontlineEvents.category, f.categories))
    if (f.severities?.length) clauses.push(inArray(frontlineEvents.severity, f.severities))
    if (f.side) clauses.push(eq(frontlineEvents.side, f.side))
    if (f.sinceMinutes && f.sinceMinutes > 0)
      clauses.push(gte(whenExpr, new Date(Date.now() - f.sinceMinutes * 60_000)))

    const rows = await db
      .select()
      .from(frontlineEvents)
      .where(clauses.length ? and(...clauses) : undefined)
      .orderBy(desc(whenExpr))
      .limit(f.limit ?? 200)

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      summary: r.summary,
      analystNote: r.analystNote,
      category: r.category,
      severity: r.severity,
      side: r.side,
      region: r.region,
      country: r.country,
      lat: r.lat,
      lng: r.lng,
      source: r.source,
      url: r.url,
      at: (r.happenedAt ?? r.createdAt).toISOString(),
      createdAt: r.createdAt.toISOString(),
      happenedAt: r.happenedAt ? r.happenedAt.toISOString() : null,
    }))
  }, [])
}

export type FrontlineStats = {
  total: number
  last24h: number
  critical: number
  high: number
  lastAt: string | null
  byCategory: { category: string; count: number }[]
  bySeverity: { severity: string; count: number }[]
  topRegions: { region: string; count: number }[]
}

export async function frontlineStats(): Promise<FrontlineStats> {
  const empty: FrontlineStats = {
    total: 0,
    last24h: 0,
    critical: 0,
    high: 0,
    lastAt: null,
    byCategory: [],
    bySeverity: [],
    topRegions: [],
  }
  return safe(async () => {
    const db = await getDb()
    const since = new Date(Date.now() - 86_400_000)
    const [agg] = await db
      .select({
        total: sql<number>`cast(count(*) as int)`,
        last24h: sql<number>`cast(count(*) filter (where ${whenExpr} >= ${since}) as int)`,
        critical: sql<number>`cast(count(*) filter (where ${frontlineEvents.severity} = 'critical') as int)`,
        high: sql<number>`cast(count(*) filter (where ${frontlineEvents.severity} = 'high') as int)`,
        lastAt: sql<string | null>`max(${whenExpr})`,
      })
      .from(frontlineEvents)

    const cats = await db
      .select({ category: frontlineEvents.category, count: sql<number>`cast(count(*) as int)` })
      .from(frontlineEvents)
      .groupBy(frontlineEvents.category)
    const sevs = await db
      .select({ severity: frontlineEvents.severity, count: sql<number>`cast(count(*) as int)` })
      .from(frontlineEvents)
      .groupBy(frontlineEvents.severity)
    const regions = await db
      .select({ region: frontlineEvents.region, count: sql<number>`cast(count(*) as int)` })
      .from(frontlineEvents)
      .where(sql`${frontlineEvents.region} is not null and ${frontlineEvents.region} <> ''`)
      .groupBy(frontlineEvents.region)
      .orderBy(desc(sql`count(*)`))
      .limit(6)

    return {
      total: agg?.total ?? 0,
      last24h: agg?.last24h ?? 0,
      critical: agg?.critical ?? 0,
      high: agg?.high ?? 0,
      lastAt: agg?.lastAt ? new Date(agg.lastAt).toISOString() : null,
      byCategory: cats.filter((c) => c.category).map((c) => ({ category: c.category as string, count: c.count })),
      bySeverity: sevs.filter((s) => s.severity).map((s) => ({ severity: s.severity as string, count: s.count })),
      topRegions: regions.filter((r) => r.region).map((r) => ({ region: r.region as string, count: r.count })),
    }
  }, empty)
}
