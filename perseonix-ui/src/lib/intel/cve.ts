import "server-only"
import { and, desc, eq, gte, sql } from "drizzle-orm"
import { getDb } from "@/db"
import { cves, ingestRuns } from "@/db/schema"

// CVE Feed store. Ingests CVEs pushed by the n8n playbook (already AI-summarised
// via Groq), drops low severity, dedupes/updates by cveId. Degrades to empty
// before the tables exist (until one restart).

function isSchemaNotReady(error: unknown): boolean {
  for (let cur: unknown = error, d = 0; cur && d < 6; d++) {
    if (typeof cur !== "object") break
    const r = cur as { code?: unknown; message?: unknown; cause?: unknown }
    if (r.code === "42P01" || r.code === "42703") return true
    if (typeof r.message === "string" && /\bcves\b|ingest_runs/.test(r.message) && /does not exist|no such/.test(r.message)) return true
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

const KEEP = new Set(["critical", "high", "medium"])

function sevFromCvss(c: number | null): string {
  if (c == null) return "unknown"
  if (c >= 9) return "critical"
  if (c >= 7) return "high"
  if (c >= 4) return "medium"
  return "low"
}

export type CveInput = {
  cveId?: unknown
  title?: unknown
  summary?: unknown
  severity?: unknown
  cvss?: unknown
  cvssVector?: unknown
  cwe?: unknown
  epss?: unknown
  epssPercentile?: unknown
  description?: unknown
  kev?: unknown
  vendor?: unknown
  product?: unknown
  published?: unknown
  sourceUrl?: unknown
  refs?: unknown
  references?: unknown
  pocs?: unknown
  affected?: unknown
  kevAction?: unknown
  kevDueDate?: unknown
  kevRansomware?: unknown
}

export type Poc = { url: string; name: string; stars: number; updated: string | null; description: string | null }
function parsePocs(v: unknown): Poc[] {
  if (!Array.isArray(v)) return []
  const out: Poc[] = []
  for (const p of v) {
    if (!p || typeof p !== "object") continue
    const o = p as Record<string, unknown>
    const url = typeof o.url === "string" ? o.url.trim() : ""
    if (!/^https?:\/\//.test(url)) continue
    out.push({
      url,
      name: typeof o.name === "string" ? o.name.slice(0, 140) : "",
      stars: Number.isFinite(Number(o.stars)) ? Math.max(0, Math.trunc(Number(o.stars))) : 0,
      updated: typeof o.updated === "string" ? o.updated.slice(0, 40) : null,
      description: typeof o.description === "string" ? o.description.slice(0, 200) : null,
    })
    if (out.length >= 12) break
  }
  return out
}

export type Affected = { vendor: string | null; product: string; versions: string }
function parseAffected(v: unknown): Affected[] {
  if (!Array.isArray(v)) return []
  const out: Affected[] = []
  for (const a of v) {
    if (!a || typeof a !== "object") continue
    const o = a as Record<string, unknown>
    const product = typeof o.product === "string" ? o.product.slice(0, 120) : ""
    if (!product) continue
    out.push({
      vendor: typeof o.vendor === "string" ? o.vendor.slice(0, 120) : null,
      product,
      versions: typeof o.versions === "string" ? o.versions.slice(0, 200) : "",
    })
    if (out.length >= 20) break
  }
  return out
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null)
const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN
  return Number.isFinite(n) ? n : null
}

export type IngestResult = { received: number; added: number; updated: number; dropped: number }

export async function ingestCves(rawItems: CveInput[]): Promise<IngestResult> {
  const res: IngestResult = { received: rawItems.length, added: 0, updated: 0, dropped: 0 }
  await safe(async () => {
    const db = await getDb()
    for (const raw of rawItems) {
      const cveId = str(raw.cveId)?.toUpperCase()
      if (!cveId || !/^CVE-\d{4}-\d+$/.test(cveId)) {
        res.dropped++
        continue
      }
      const cvss = num(raw.cvss)
      let severity = (str(raw.severity) ?? "").toLowerCase()
      if (!KEEP.has(severity)) severity = sevFromCvss(cvss)
      if (!KEEP.has(severity)) {
        res.dropped++ // low / none / unknown — not wanted
        continue
      }
      const refsRaw = raw.refs ?? raw.references
      const refs = Array.isArray(refsRaw) ? refsRaw.filter((r): r is string => typeof r === "string").slice(0, 20) : []
      const published = str(raw.published)
      const epss = num(raw.epss)
      const values = {
        cveId,
        title: str(raw.title),
        summary: str(raw.summary),
        severity,
        cvss,
        cvssVector: str(raw.cvssVector),
        cwe: str(raw.cwe),
        epss: epss != null && epss >= 0 && epss <= 1 ? epss : null,
        epssPercentile: (() => {
          const p = num(raw.epssPercentile)
          return p != null && p >= 0 && p <= 1 ? p : null
        })(),
        description: str(raw.description),
        kev: raw.kev === true || raw.kev === "true",
        vendor: str(raw.vendor),
        product: str(raw.product),
        published: published ? new Date(published) : null,
        sourceUrl: str(raw.sourceUrl),
        refs,
        pocs: parsePocs(raw.pocs),
        affected: parseAffected(raw.affected),
        kevAction: str(raw.kevAction),
        kevDueDate: (() => {
          const d = str(raw.kevDueDate)
          return d ? new Date(d) : null
        })(),
        kevRansomware: raw.kevRansomware === true || raw.kevRansomware === "true",
      }
      const inserted = await db.insert(cves).values(values).onConflictDoNothing({ target: cves.cveId }).returning({ id: cves.id })
      if (inserted.length) {
        res.added++
      } else {
        const { cveId: _omit, ...update } = values
        void _omit
        await db.update(cves).set(update).where(eq(cves.cveId, cveId))
        res.updated++
      }
    }
  }, undefined)
  return res
}

export async function logIngestRun(
  connectorKey: string,
  run: { received: number; added: number; skipped: number; status: string; message?: string }
): Promise<void> {
  await safe(async () => {
    const db = await getDb()
    await db.insert(ingestRuns).values({
      connectorKey,
      received: run.received,
      added: run.added,
      skipped: run.skipped,
      status: run.status,
      message: run.message ?? null,
    })
  }, undefined)
}

export type CveRow = {
  id: string
  cveId: string
  title: string | null
  summary: string | null
  severity: string
  cvss: number | null
  cvssVector: string | null
  cwe: string | null
  epss: number | null
  epssPercentile: number | null
  description: string | null
  kev: boolean
  vendor: string | null
  product: string | null
  published: string | null
  sourceUrl: string | null
  refs: string[]
  pocs: Poc[]
  affected: Affected[]
  kevAction: string | null
  kevDueDate: string | null
  kevRansomware: boolean
  createdAt: string
}

function toRow(r: typeof cves.$inferSelect): CveRow {
  return {
    id: r.id,
    cveId: r.cveId,
    title: r.title,
    summary: r.summary,
    severity: r.severity,
    cvss: r.cvss,
    cvssVector: r.cvssVector,
    cwe: r.cwe,
    epss: r.epss,
    epssPercentile: r.epssPercentile,
    description: r.description,
    kev: r.kev,
    vendor: r.vendor,
    product: r.product,
    published: r.published ? r.published.toISOString() : null,
    sourceUrl: r.sourceUrl,
    refs: r.refs ?? [],
    pocs: parsePocs(r.pocs),
    affected: parseAffected(r.affected),
    kevAction: r.kevAction,
    kevDueDate: r.kevDueDate ? r.kevDueDate.toISOString() : null,
    kevRansomware: r.kevRansomware,
    createdAt: r.createdAt.toISOString(),
  }
}

export async function listCves(
  filter: { severity?: string; kev?: boolean; limit?: number; sort?: "cvss" | "recent"; sinceMinutes?: number } = {}
): Promise<CveRow[]> {
  return safe(
    async () => {
      const db = await getDb()
      const clauses = []
      if (filter.severity && KEEP.has(filter.severity)) clauses.push(eq(cves.severity, filter.severity))
      if (filter.kev) clauses.push(eq(cves.kev, true))
      if (filter.sinceMinutes && filter.sinceMinutes > 0)
        clauses.push(gte(cves.createdAt, new Date(Date.now() - filter.sinceMinutes * 60_000)))
      const order =
        filter.sort === "recent"
          ? [desc(cves.published), desc(cves.cvss)]
          : [desc(cves.kev), desc(cves.cvss), desc(cves.published)]
      const rows = await db
        .select()
        .from(cves)
        .where(clauses.length ? and(...clauses) : undefined)
        .orderBy(...order)
        .limit(filter.limit ?? 200)
      return rows.map(toRow)
    },
    []
  )
}

export async function getCve(cveId: string): Promise<CveRow | null> {
  return safe(async () => {
    const db = await getDb()
    const [r] = await db.select().from(cves).where(eq(cves.cveId, cveId.toUpperCase())).limit(1)
    if (!r) return null
    return toRow(r)
  }, null)
}

export async function cveStats(): Promise<{ total: number; critical: number; high: number; medium: number; kev: number; lastAt: string | null }> {
  return safe(
    async () => {
      const db = await getDb()
      const [row = { total: 0, critical: 0, high: 0, medium: 0, kev: 0 }] = await db
        .select({
          total: sql<number>`cast(count(*) as int)`,
          critical: sql<number>`cast(count(*) filter (where ${cves.severity} = 'critical') as int)`,
          high: sql<number>`cast(count(*) filter (where ${cves.severity} = 'high') as int)`,
          medium: sql<number>`cast(count(*) filter (where ${cves.severity} = 'medium') as int)`,
          kev: sql<number>`cast(count(*) filter (where ${cves.kev} = true) as int)`,
        })
        .from(cves)
      const [last] = await db.select({ at: cves.updatedAt }).from(cves).orderBy(desc(cves.updatedAt)).limit(1)
      return {
        total: Number(row.total) || 0,
        critical: Number(row.critical) || 0,
        high: Number(row.high) || 0,
        medium: Number(row.medium) || 0,
        kev: Number(row.kev) || 0,
        lastAt: last?.at ? last.at.toISOString() : null,
      }
    },
    { total: 0, critical: 0, high: 0, medium: 0, kev: 0, lastAt: null }
  )
}
