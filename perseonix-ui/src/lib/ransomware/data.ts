import "server-only"
import { and, desc, eq, gte, ilike, lte, ne, not, or, sql, type SQL } from "drizzle-orm"
import { getDb } from "@/db"
import { ransomwareGroups, ransomwareIngestions, ransomwareVictims } from "@/db/schema"

// Read layer for the Ransomware Tracker. Everything degrades to empty results
// before the tables/columns exist (after a migration, until a dev-server
// restart), so the module renders an empty state instead of crashing.

export type Range = "24h" | "3d" | "7d" | "30d" | "6m" | "1y" | "all"
export type Facets = { country?: string; group?: string; sector?: string }
const DAY = 86_400_000

// Days per bounded range (null-spanned ranges like "all" aren't listed).
const RANGE_DAYS: Record<string, number> = { "24h": 1, "3d": 3, "7d": 7, "30d": 30, "6m": 182, "1y": 365 }

export function normalizeRange(value: string | undefined): Range {
  return value && value in RANGE_DAYS ? (value as Range) : value === "all" ? "all" : "1y"
}

function rangeSince(range: Range): Date | null {
  const days = RANGE_DAYS[range]
  return days ? new Date(Date.now() - days * DAY) : null
}

function previousWindow(range: Range): { start: Date; end: Date } | null {
  const span = RANGE_DAYS[range]
  if (!span) return null
  const now = Date.now()
  return { start: new Date(now - 2 * span * DAY), end: new Date(now - span * DAY) }
}

/** Country / group / sector selectors, shared by every dashboard query. */
function facetWhere(f: Facets): SQL[] {
  const c: SQL[] = []
  if (f.country) c.push(eq(ransomwareVictims.country, f.country.toUpperCase()))
  if (f.group) c.push(eq(ransomwareVictims.groupSlug, f.group))
  if (f.sector) c.push(eq(ransomwareVictims.sector, f.sector))
  return c
}

function scopeWhere(range: Range, f: Facets): SQL | undefined {
  const since = rangeSince(range)
  const clauses: SQL[] = [...facetWhere(f)]
  if (since) clauses.push(gte(ransomwareVictims.discovered, since))
  return clauses.length ? and(...clauses) : undefined
}

// Sectors we surface as "critical" in the live snapshot.
const CRITICAL_SECTORS = [
  "health", "hospital", "government", "public admin", "energy", "utilit", "water",
  "financial", "bank", "insurance", "education", "school", "defense", "defence", "pharma",
]

export type VictimRow = {
  id: string
  groupSlug: string
  groupName: string
  victim: string
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
  discovered: string | null
  sourceRef: string | null
}

export type GroupRow = {
  slug: string
  name: string
  aliases: string[]
  description: string | null
  tools: string[]
  victimCount: number
  firstSeen: string | null
  lastSeen: string | null
  adversarySlug: string | null
  sourceRef: string | null
}

export type Overview = {
  totalVictims: number
  victimsGrowth: number | null
  activeGroups: number
  countries: number
  topGroup: string | null
  topSector: string | null
}

export type LiveSnapshot = {
  last24h: number
  last30d: number
  groupsClaiming: number
  critical: number
}

export type SeriesPoint = { label: string; iso: string; count: number }
export type RankRow = { key: string; label: string; count: number; pct: number }
export type MapPoint = { code: string; count: number }
export type Option = { value: string; label: string }

export type IngestionInfo = {
  ranAt: string
  status: string
  source: string
  victimsAdded: number
  message: string | null
} | null

function isSchemaNotReady(error: unknown): boolean {
  const messages: string[] = []
  for (let current: unknown = error, depth = 0; current && depth < 6; depth++) {
    if (typeof current !== "object") break
    const record = current as { message?: unknown; code?: unknown; cause?: unknown }
    if (record.code === "42P01" || record.code === "42703") return true
    if (typeof record.message === "string") messages.push(record.message)
    current = record.cause
  }
  const combined = messages.join(" ")
  return /ransomware_|column/i.test(combined) && /does not exist|no such table|no such column/i.test(combined)
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (isSchemaNotReady(error)) return fallback
    throw error
  }
}

const iso = (d: Date | null) => (d ? d.toISOString() : null)

function growth(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null
  return Math.round(((current - previous) / previous) * 1000) / 10
}

export async function storeReady(): Promise<boolean> {
  return safe(async () => {
    const db = await getDb()
    await db.select({ slug: ransomwareGroups.slug }).from(ransomwareGroups).limit(1)
    return true
  }, false)
}

export async function lastIngestion(): Promise<IngestionInfo> {
  return safe(async () => {
    const db = await getDb()
    const [row] = await db
      .select()
      .from(ransomwareIngestions)
      .orderBy(desc(ransomwareIngestions.ranAt))
      .limit(1)
    if (!row) return null
    return {
      ranAt: row.ranAt.toISOString(),
      status: row.status,
      source: row.source,
      victimsAdded: row.victimsAdded,
      message: row.message,
    }
  }, null)
}

async function countVictims(where?: SQL): Promise<number> {
  const db = await getDb()
  const [{ n } = { n: 0 }] = await db
    .select({ n: sql<number>`cast(count(*) as int)` })
    .from(ransomwareVictims)
    .where(where)
  return n ?? 0
}

async function topValue(
  column: typeof ransomwareVictims.groupName | typeof ransomwareVictims.sector,
  where?: SQL
): Promise<string | null> {
  const db = await getDb()
  const [row] = await db
    .select({ value: column, n: sql<number>`cast(count(*) as int)` })
    .from(ransomwareVictims)
    .where(and(where, sql`${column} is not null and ${column} <> ''`))
    .groupBy(column)
    .orderBy(sql`count(*) desc`)
    .limit(1)
  return row?.value ?? null
}

export async function overview(range: Range, facets: Facets = {}): Promise<Overview> {
  return safe(
    async () => {
      const db = await getDb()
      const where = scopeWhere(range, facets)
      const [cur] = await db
        .select({
          victims: sql<number>`cast(count(*) as int)`,
          groups: sql<number>`cast(count(distinct ${ransomwareVictims.groupSlug}) as int)`,
          countries: sql<number>`cast(count(distinct ${ransomwareVictims.country}) as int)`,
        })
        .from(ransomwareVictims)
        .where(where)

      const prevWin = previousWindow(range)
      let victimsGrowth: number | null = null
      if (prevWin) {
        const prevWhere = and(...facetWhere(facets), gte(ransomwareVictims.discovered, prevWin.start), lte(ransomwareVictims.discovered, prevWin.end))
        const prev = await countVictims(prevWhere)
        victimsGrowth = growth(cur?.victims ?? 0, prev)
      }

      const [topGroup, topSector] = await Promise.all([
        topValue(ransomwareVictims.groupName, where),
        topValue(ransomwareVictims.sector, where),
      ])

      return {
        totalVictims: cur?.victims ?? 0,
        activeGroups: cur?.groups ?? 0,
        countries: cur?.countries ?? 0,
        victimsGrowth,
        topGroup,
        topSector,
      }
    },
    { totalVictims: 0, victimsGrowth: null, activeGroups: 0, countries: 0, topGroup: null, topSector: null }
  )
}

export async function liveSnapshot(facets: Facets = {}): Promise<LiveSnapshot> {
  return safe(
    async () => {
      const db = await getDb()
      const base = facetWhere(facets)
      const d1 = new Date(Date.now() - DAY)
      const d30 = new Date(Date.now() - 30 * DAY)
      const critical = or(...CRITICAL_SECTORS.map((s) => ilike(ransomwareVictims.sector, `%${s}%`)))!
      const [last24h, [row30 = { victims: 0, groups: 0 }], criticalCount] = await Promise.all([
        countVictims(and(...base, gte(ransomwareVictims.discovered, d1))),
        db
          .select({
            victims: sql<number>`cast(count(*) as int)`,
            groups: sql<number>`cast(count(distinct ${ransomwareVictims.groupSlug}) as int)`,
          })
          .from(ransomwareVictims)
          .where(and(...base, gte(ransomwareVictims.discovered, d30))),
        countVictims(and(...base, gte(ransomwareVictims.discovered, d30), critical)),
      ])
      return { last24h, last30d: row30.victims, groupsClaiming: row30.groups, critical: criticalCount }
    },
    { last24h: 0, last30d: 0, groupsClaiming: 0, critical: 0 }
  )
}

export async function attackVolume(range: Range, facets: Facets = {}): Promise<SeriesPoint[]> {
  return safe(
    async () => {
      const db = await getDb()
      const daily = range === "30d"
      const since = rangeSince(range) ?? new Date(Date.now() - 365 * DAY)
      const bucket = daily
        ? sql`date_trunc('day', ${ransomwareVictims.discovered})`
        : sql`date_trunc('month', ${ransomwareVictims.discovered})`
      const rows = await db
        .select({ ts: sql<string>`${bucket}`, count: sql<number>`cast(count(*) as int)` })
        .from(ransomwareVictims)
        .where(and(...facetWhere(facets), gte(ransomwareVictims.discovered, since), sql`${ransomwareVictims.discovered} is not null`))
        .groupBy(bucket)
        .orderBy(bucket)

      const counts = new Map<string, number>()
      for (const r of rows) counts.set(new Date(r.ts).toISOString().slice(0, daily ? 10 : 7), r.count)

      const out: SeriesPoint[] = []
      const now = new Date()
      if (daily) {
        for (let i = 29; i >= 0; i--) {
          const d = new Date(now.getTime() - i * DAY)
          const key = d.toISOString().slice(0, 10)
          out.push({ label: key, iso: key, count: counts.get(key) ?? 0 })
        }
      } else {
        const months = range === "6m" ? 6 : 12
        for (let i = months - 1; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
          out.push({ label: key, iso: `${key}-01`, count: counts.get(key) ?? 0 })
        }
      }
      return out
    },
    []
  )
}

async function topBy(
  column: typeof ransomwareVictims.sector | typeof ransomwareVictims.country | typeof ransomwareVictims.groupName,
  range: Range,
  facets: Facets,
  limit: number
): Promise<RankRow[]> {
  const db = await getDb()
  const where = and(scopeWhere(range, facets), sql`${column} is not null and ${column} <> ''`)
  const rows = await db
    .select({ key: column, count: sql<number>`cast(count(*) as int)` })
    .from(ransomwareVictims)
    .where(where)
    .groupBy(column)
    .orderBy(sql`count(*) desc`)
    .limit(limit)
  const total = rows.reduce((s, r) => s + r.count, 0) || 1
  return rows.map((r) => ({
    key: r.key ?? "",
    label: r.key ?? "Unknown",
    count: r.count,
    pct: Math.round((r.count / total) * 1000) / 10,
  }))
}

export function topGroups(range: Range, facets: Facets = {}, limit = 10) {
  return safe(() => topBy(ransomwareVictims.groupName, range, facets, limit), [])
}
export function topCountries(range: Range, facets: Facets = {}, limit = 10) {
  return safe(() => topBy(ransomwareVictims.country, range, facets, limit), [])
}
export function topIndustries(range: Range, facets: Facets = {}, limit = 10) {
  return safe(() => topBy(ransomwareVictims.sector, range, facets, limit), [])
}

export async function mapData(range: Range, facets: Facets = {}): Promise<MapPoint[]> {
  return safe(
    async () => {
      const db = await getDb()
      const rows = await db
        .select({ code: ransomwareVictims.country, count: sql<number>`cast(count(*) as int)` })
        .from(ransomwareVictims)
        .where(and(scopeWhere(range, facets), sql`${ransomwareVictims.country} is not null and ${ransomwareVictims.country} <> ''`))
        .groupBy(ransomwareVictims.country)
      return rows.map((r) => ({ code: r.code!, count: r.count }))
    },
    []
  )
}

function mapVictim(r: typeof ransomwareVictims.$inferSelect): VictimRow {
  return {
    id: r.id,
    groupSlug: r.groupSlug,
    groupName: r.groupName,
    victim: r.victim,
    country: r.country,
    sector: r.sector,
    domain: r.domain,
    description: r.description,
    ransom: r.ransom,
    dataSize: r.dataSize,
    pressSource: r.pressSource,
    pressSummary: r.pressSummary,
    infostealer: r.infostealer,
    attackDate: r.attackDate,
    discovered: iso(r.discovered),
    sourceRef: r.sourceRef,
  }
}

export async function recentVictims(limit = 12, range: Range = "all", facets: Facets = {}): Promise<VictimRow[]> {
  return safe(async () => {
    const db = await getDb()
    const rows = await db
      .select()
      .from(ransomwareVictims)
      .where(scopeWhere(range, facets))
      .orderBy(desc(ransomwareVictims.discovered))
      .limit(limit)
    return rows.map(mapVictim)
  }, [])
}

// ---- Advanced search on the Victims page: `hospital +country:us -group:x before:2026-06` ----

type Parsed = {
  terms: string[]
  inc: { field: string; value: string }[]
  exc: { field: string; value: string }[]
  before?: Date
  after?: Date
}

const FIELD = /^([+-]?)(country|group|sector):(.+)$/i
const WHEN = /^(before|after):(.+)$/i

export function parseQuery(raw: string): Parsed {
  const parsed: Parsed = { terms: [], inc: [], exc: [] }
  for (const token of raw.trim().split(/\s+/).filter(Boolean)) {
    const when = token.match(WHEN)
    if (when) {
      const d = new Date(when[2].length <= 7 ? `${when[2]}-01` : when[2])
      if (!Number.isNaN(d.getTime())) parsed[when[1].toLowerCase() as "before" | "after"] = d
      continue
    }
    const field = token.match(FIELD)
    if (field) {
      const entry = { field: field[2].toLowerCase(), value: field[3] }
      ;(field[1] === "-" ? parsed.exc : parsed.inc).push(entry)
      continue
    }
    parsed.terms.push(token.replace(/^\+/, ""))
  }
  return parsed
}

function fieldClause(field: string, value: string): SQL | undefined {
  if (field === "country") return eq(ransomwareVictims.country, value.toUpperCase())
  if (field === "sector") return ilike(ransomwareVictims.sector, `%${value}%`)
  if (field === "group")
    return or(ilike(ransomwareVictims.groupSlug, `%${value}%`), ilike(ransomwareVictims.groupName, `%${value}%`))
  return undefined
}

export async function listVictims(
  rawQuery: string,
  range: Range,
  opts: { page?: number; perPage?: number; country?: string; sector?: string; group?: string } = {}
): Promise<{ items: VictimRow[]; total: number }> {
  const { page = 1, perPage = 40, country, sector, group } = opts
  return safe(
    async () => {
      const db = await getDb()
      const q = parseQuery(rawQuery)
      const clauses: (SQL | undefined)[] = []

      const since = rangeSince(range)
      if (since) clauses.push(gte(ransomwareVictims.discovered, since))
      if (q.before) clauses.push(lte(ransomwareVictims.discovered, q.before))
      if (q.after) clauses.push(gte(ransomwareVictims.discovered, q.after))
      if (country) clauses.push(eq(ransomwareVictims.country, country.toUpperCase()))
      if (sector) clauses.push(eq(ransomwareVictims.sector, sector))
      if (group) clauses.push(eq(ransomwareVictims.groupSlug, group))

      for (const term of q.terms) {
        clauses.push(
          or(
            ilike(ransomwareVictims.victim, `%${term}%`),
            ilike(ransomwareVictims.sector, `%${term}%`),
            ilike(ransomwareVictims.groupName, `%${term}%`)
          )
        )
      }
      for (const { field, value } of q.inc) clauses.push(fieldClause(field, value))
      for (const { field, value } of q.exc) {
        if (field === "country") clauses.push(ne(ransomwareVictims.country, value.toUpperCase()))
        else {
          const c = fieldClause(field, value)
          if (c) clauses.push(not(c))
        }
      }

      const active = clauses.filter(Boolean) as SQL[]
      const where = active.length ? and(...active) : undefined
      const [total, rows] = await Promise.all([
        countVictims(where),
        db
          .select()
          .from(ransomwareVictims)
          .where(where)
          .orderBy(desc(ransomwareVictims.discovered))
          .limit(perPage)
          .offset((page - 1) * perPage),
      ])
      return { total, items: rows.map(mapVictim) }
    },
    { items: [], total: 0 }
  )
}

// ---- Groups ----

function mapGroup(r: typeof ransomwareGroups.$inferSelect): GroupRow {
  return {
    slug: r.slug,
    name: r.name,
    aliases: r.aliases ?? [],
    description: r.description,
    tools: r.tools ?? [],
    victimCount: r.victimCount,
    firstSeen: iso(r.firstSeen),
    lastSeen: iso(r.lastSeen),
    adversarySlug: r.adversarySlug,
    sourceRef: r.sourceRef,
  }
}

export async function listGroups(
  filter: { q?: string },
  page = 1,
  perPage = 24
): Promise<{ items: GroupRow[]; total: number }> {
  return safe(
    async () => {
      const db = await getDb()
      const where = filter.q ? ilike(ransomwareGroups.name, `%${filter.q}%`) : undefined
      const [[{ total } = { total: 0 }], rows] = await Promise.all([
        db.select({ total: sql<number>`cast(count(*) as int)` }).from(ransomwareGroups).where(where),
        db
          .select()
          .from(ransomwareGroups)
          .where(where)
          .orderBy(desc(ransomwareGroups.victimCount), desc(ransomwareGroups.lastSeen))
          .limit(perPage)
          .offset((page - 1) * perPage),
      ])
      return { total: total ?? 0, items: rows.map(mapGroup) }
    },
    { items: [], total: 0 }
  )
}

export async function getGroup(slug: string): Promise<GroupRow | null> {
  return safe(async () => {
    const db = await getDb()
    const [row] = await db.select().from(ransomwareGroups).where(eq(ransomwareGroups.slug, slug)).limit(1)
    return row ? mapGroup(row) : null
  }, null)
}

export async function groupVictims(slug: string, limit = 60): Promise<VictimRow[]> {
  return safe(async () => {
    const db = await getDb()
    const rows = await db
      .select()
      .from(ransomwareVictims)
      .where(eq(ransomwareVictims.groupSlug, slug))
      .orderBy(desc(ransomwareVictims.discovered))
      .limit(limit)
    return rows.map(mapVictim)
  }, [])
}

export async function getVictim(id: string): Promise<VictimRow | null> {
  return safe(async () => {
    const db = await getDb()
    const [row] = await db.select().from(ransomwareVictims).where(eq(ransomwareVictims.id, id)).limit(1)
    return row ? mapVictim(row) : null
  }, null)
}

/** Options for the faceted filter menus. */
export async function filterOptions(): Promise<{ countries: string[]; sectors: string[]; groups: Option[] }> {
  return safe(
    async () => {
      const db = await getDb()
      const [countries, sectors, groups] = await Promise.all([
        db
          .select({ value: ransomwareVictims.country })
          .from(ransomwareVictims)
          .where(sql`${ransomwareVictims.country} is not null and ${ransomwareVictims.country} <> ''`)
          .groupBy(ransomwareVictims.country)
          .orderBy(sql`count(*) desc`)
          .limit(100),
        db
          .select({ value: ransomwareVictims.sector })
          .from(ransomwareVictims)
          .where(sql`${ransomwareVictims.sector} is not null and ${ransomwareVictims.sector} <> ''`)
          .groupBy(ransomwareVictims.sector)
          .orderBy(sql`count(*) desc`)
          .limit(80),
        db
          .select({ slug: ransomwareGroups.slug, name: ransomwareGroups.name })
          .from(ransomwareGroups)
          .orderBy(desc(ransomwareGroups.victimCount))
          .limit(150),
      ])
      return {
        countries: countries.map((c) => c.value!).filter(Boolean),
        sectors: sectors.map((s) => s.value!).filter(Boolean),
        groups: groups.map((g) => ({ value: g.slug, label: g.name })),
      }
    },
    { countries: [], sectors: [], groups: [] }
  )
}

// Back-compat alias used by the victims page filter bar.
export async function facets(): Promise<{ countries: string[]; sectors: string[] }> {
  const o = await filterOptions()
  return { countries: o.countries, sectors: o.sectors }
}
