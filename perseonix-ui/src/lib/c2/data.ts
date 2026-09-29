import "server-only"
import { and, desc, eq, gte, sql } from "drizzle-orm"
import { getDb } from "@/db"
import { c2Ingestions, c2Servers, c2Snapshots } from "@/db/schema"
import { colorForSoftware } from "@/lib/c2/catalog"

// Reads for Talon (C2 hunting). Degrades to empty before the tables exist.

function isSchemaNotReady(error: unknown): boolean {
  for (let cur: unknown = error, d = 0; cur && d < 6; d++) {
    if (typeof cur !== "object") break
    const r = cur as { code?: unknown; message?: unknown; cause?: unknown }
    if (r.code === "42P01" || r.code === "42703") return true
    if (typeof r.message === "string" && /c2_/.test(r.message) && /does not exist|no such/.test(r.message)) return true
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

export type C2ServerRow = {
  id: string
  ip: string
  port: number
  software: string
  softwareName: string
  category: string | null
  malware: string | null
  tags: string[]
  country: string | null
  asn: number | null
  asName: string | null
  hostname: string | null
  risk: string
  source: string
  status: string
  firstSeen: string | null
  lastSeen: string | null
}

const toRow = (c: typeof c2Servers.$inferSelect): C2ServerRow => ({
  id: c.id,
  ip: c.ip,
  port: c.port,
  software: c.software,
  softwareName: c.softwareName,
  category: c.category,
  malware: c.malware,
  tags: c.tags ?? [],
  country: c.country,
  asn: c.asn,
  asName: c.asName,
  hostname: c.hostname,
  risk: c.risk,
  source: c.source,
  status: c.status,
  firstSeen: c.firstSeen ? c.firstSeen.toISOString() : null,
  lastSeen: c.lastSeen ? c.lastSeen.toISOString() : null,
})

export type IngestionInfo = { ranAt: string; status: string; message: string | null } | null

export async function lastC2Ingestion(): Promise<IngestionInfo> {
  return safe(async () => {
    const db = await getDb()
    const [row] = await db.select().from(c2Ingestions).orderBy(desc(c2Ingestions.ranAt)).limit(1)
    return row ? { ranAt: row.ranAt.toISOString(), status: row.status, message: row.message } : null
  }, null)
}

export type C2Stat = { key: string; name: string; category: string | null; tags: string[]; count: number }
export type C2Stack = { key: string; name: string; color: string; values: number[] }
export type C2Overview = {
  days: string[]
  stacks: C2Stack[]
  recent: C2ServerRow[]
  software: C2Stat[]
  totals: { activeSoftware: number; endpoints: number; countries: number; new24h: number }
}

function dayList(days: number): string[] {
  const out: string[] = []
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  for (let i = days - 1; i >= 0; i--) {
    const x = new Date(d)
    x.setUTCDate(d.getUTCDate() - i)
    out.push(x.toISOString().slice(0, 10))
  }
  return out
}

export async function c2Overview(timeframeDays: number): Promise<C2Overview> {
  return safe(
    async () => {
      const db = await getDb()
      const days = dayList(timeframeDays)
      const start = days[0]

      // Snapshots → stacked time series + software leaderboard.
      const snaps = await db.select().from(c2Snapshots).where(gte(c2Snapshots.day, start))
      const byKey = new Map<string, { name: string; category: string | null; tags: string[]; perDay: Map<string, number> }>()
      for (const s of snaps) {
        let e = byKey.get(s.software)
        if (!e) {
          e = { name: s.softwareName, category: s.category, tags: s.tags ?? [], perDay: new Map() }
          byKey.set(s.software, e)
        }
        e.perDay.set(s.day, Math.max(e.perDay.get(s.day) ?? 0, s.count))
      }

      // Software leaderboard: peak count over the period, per software.
      const software: C2Stat[] = [...byKey.entries()]
        .map(([key, v]) => ({ key, name: v.name, category: v.category, tags: v.tags, count: Math.max(0, ...v.perDay.values()) }))
        .sort((a, b) => b.count - a.count)

      // Stacked series: top 8 software by peak; rest folded into "Other".
      const top = software.slice(0, 8)
      const topKeys = new Set(top.map((s) => s.key))
      const stacks: C2Stack[] = top.map((s) => {
        const per = byKey.get(s.key)!.perDay
        return { key: s.key, name: s.name, color: colorForSoftware(s.key), values: days.map((d) => per.get(d) ?? 0) }
      })
      const otherVals = days.map((d) => {
        let sum = 0
        for (const [key, v] of byKey) if (!topKeys.has(key)) sum += v.perDay.get(d) ?? 0
        return sum
      })
      if (otherVals.some((v) => v > 0)) stacks.push({ key: "other", name: "Other", color: "#3a4a6b", values: otherVals })

      // Recent discoveries (actual endpoints).
      const recentRows = await db.select().from(c2Servers).orderBy(desc(c2Servers.firstSeen)).limit(10)
      const recent = recentRows.map(toRow)

      // Totals.
      const [tot = { endpoints: 0, countries: 0, new24h: 0 }] = await db
        .select({
          endpoints: sql<number>`cast(count(*) as int)`,
          countries: sql<number>`cast(count(distinct ${c2Servers.country}) as int)`,
          new24h: sql<number>`cast(count(*) filter (where ${c2Servers.firstSeen} > now() - interval '24 hours') as int)`,
        })
        .from(c2Servers)

      return {
        days,
        stacks,
        recent,
        software,
        totals: {
          activeSoftware: software.filter((s) => s.count > 0).length,
          endpoints: Number(tot.endpoints) || 0,
          countries: Number(tot.countries) || 0,
          new24h: Number(tot.new24h) || 0,
        },
      }
    },
    { days: dayList(timeframeDays), stacks: [], recent: [], software: [], totals: { activeSoftware: 0, endpoints: 0, countries: 0, new24h: 0 } }
  )
}

export async function listC2Servers(filter: { software?: string; q?: string; limit?: number } = {}): Promise<C2ServerRow[]> {
  return safe(
    async () => {
      const db = await getDb()
      const clauses = []
      if (filter.software) clauses.push(eq(c2Servers.software, filter.software))
      if (filter.q) clauses.push(sql`(${c2Servers.ip} ilike ${"%" + filter.q + "%"} or ${c2Servers.asName} ilike ${"%" + filter.q + "%"} or ${c2Servers.softwareName} ilike ${"%" + filter.q + "%"})`)
      const rows = await db
        .select()
        .from(c2Servers)
        .where(clauses.length ? and(...clauses) : undefined)
        .orderBy(desc(c2Servers.lastSeen))
        .limit(filter.limit ?? 200)
      return rows.map(toRow)
    },
    []
  )
}

/** All endpoints Talon has recorded for one IP (may span several ports/software). */
export async function getC2ByIp(ip: string): Promise<C2ServerRow[]> {
  return safe(
    async () => {
      const db = await getDb()
      const rows = await db.select().from(c2Servers).where(eq(c2Servers.ip, ip)).orderBy(c2Servers.port)
      return rows.map(toRow)
    },
    []
  )
}
