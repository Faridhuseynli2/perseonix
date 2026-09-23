import "server-only"
import { and, desc, eq, gte, inArray, or, sql } from "drizzle-orm"
import type { AnyPgColumn } from "drizzle-orm/pg-core"
import { getDb } from "@/db"
import { newsArticles, newsMentions, savedNewsFilters } from "@/db/schema"

// Threat News store. Ingests security-news articles pushed by an n8n playbook —
// each already LLM-summarised and entity-extracted. We keep OUR summary + a link
// to the source (never the full article), plus extracted entities in newsMentions.
// Degrades to empty before the tables exist (until one restart).

function isSchemaNotReady(error: unknown): boolean {
  for (let cur: unknown = error, d = 0; cur && d < 6; d++) {
    if (typeof cur !== "object") break
    const r = cur as { code?: unknown; message?: unknown; cause?: unknown }
    if (r.code === "42P01" || r.code === "42703") return true
    if (typeof r.message === "string" && /news_articles|news_mentions/.test(r.message) && /does not exist|no such/.test(r.message))
      return true
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

const SEVERITIES = new Set(["critical", "high", "medium", "low", "info"])
export const MENTION_KINDS = ["cve", "actor", "malware", "ttp", "sector", "region"] as const
export type MentionKind = (typeof MENTION_KINDS)[number]

const str = (v: unknown, max = 300): string | null => {
  if (typeof v !== "string") return null
  const t = v.trim()
  return t ? t.slice(0, max) : null
}
const strArray = (v: unknown, max = 80): string[] => {
  if (!Array.isArray(v)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const x of v) {
    const s = typeof x === "string" ? x.trim() : ""
    if (!s) continue
    const key = s.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(s.slice(0, max))
    if (out.length >= 30) break
  }
  return out
}

type Ttp = { id: string; name: string | null }
function parseTtps(v: unknown): Ttp[] {
  if (!Array.isArray(v)) return []
  const out: Ttp[] = []
  const seen = new Set<string>()
  for (const x of v) {
    let id = "",
      name: string | null = null
    if (typeof x === "string") id = x.trim().toUpperCase()
    else if (x && typeof x === "object") {
      const o = x as Record<string, unknown>
      id = (typeof o.id === "string" ? o.id : typeof o.technique === "string" ? o.technique : "").trim().toUpperCase()
      name = str(o.name) ?? str(o.label)
    }
    if (!/^T\d{4}(\.\d{3})?$/.test(id) || seen.has(id)) continue
    seen.add(id)
    out.push({ id, name })
    if (out.length >= 40) break
  }
  return out
}

export type NewsInput = {
  url?: unknown
  link?: unknown
  title?: unknown
  source?: unknown
  summary?: unknown
  analystNote?: unknown
  severity?: unknown
  category?: unknown
  published?: unknown
  publishedAt?: unknown
  cves?: unknown
  actors?: unknown
  malware?: unknown
  ttps?: unknown
  sectors?: unknown
  regions?: unknown
}

export type IngestResult = { received: number; added: number; updated: number; dropped: number; duplicates: number }

const DUP_WINDOW_DAYS = 14

/** Strip tracking params / fragments / trailing slash so the same link never duplicates. */
function canonicalUrl(u: string): string {
  try {
    const url = new URL(u)
    url.hash = ""
    for (const k of [...url.searchParams.keys()]) {
      if (/^utm_|^fbclid$|^gclid$|^mc_|^ref$|^source$/i.test(k)) url.searchParams.delete(k)
    }
    return url.toString().replace(/\/$/, "")
  } catch {
    return u
  }
}
/** Normalized-title fingerprint: catches the SAME story arriving under a different URL/source. */
function titleKey(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

export async function ingestNews(rawItems: NewsInput[]): Promise<IngestResult> {
  const res: IngestResult = { received: rawItems.length, added: 0, updated: 0, dropped: 0, duplicates: 0 }
  await safe(async () => {
    const db = await getDb()
    for (const raw of rawItems) {
      const rawUrl = str(raw.url ?? raw.link, 700)
      const title = str(raw.title, 400)
      if (!rawUrl || !/^https?:\/\//.test(rawUrl) || !title) {
        res.dropped++
        continue
      }
      const url = canonicalUrl(rawUrl).slice(0, 700)
      const key = titleKey(title)
      const dedupKey = key.length >= 20 ? key : null // only fingerprint substantial titles
      const sevRaw = (str(raw.severity) ?? "").toLowerCase()
      const severity = SEVERITIES.has(sevRaw) ? sevRaw : null
      const publishedStr = str(raw.publishedAt ?? raw.published, 40)
      const published = publishedStr ? new Date(publishedStr) : null
      const values = {
        url,
        title,
        source: str(raw.source, 120),
        summary: str(raw.summary, 4000),
        analystNote: str(raw.analystNote, 2000),
        dedupKey,
        severity,
        category: str(raw.category, 60)?.toLowerCase() ?? null,
        publishedAt: published && !Number.isNaN(published.getTime()) ? published : null,
      }

      let articleId: string
      const [byUrl] = await db.select({ id: newsArticles.id }).from(newsArticles).where(eq(newsArticles.url, url)).limit(1)
      if (byUrl) {
        // Same link → refresh in place (not a duplicate).
        const { url: _u, ...update } = values
        void _u
        await db.update(newsArticles).set(update).where(eq(newsArticles.id, byUrl.id))
        articleId = byUrl.id
        res.updated++
      } else {
        // Same story under a different URL within the window → skip as a duplicate.
        if (dedupKey) {
          const since = new Date(Date.now() - DUP_WINDOW_DAYS * 86_400_000)
          const [dup] = await db
            .select({ id: newsArticles.id })
            .from(newsArticles)
            .where(and(eq(newsArticles.dedupKey, dedupKey), gte(newsArticles.createdAt, since)))
            .limit(1)
          if (dup) {
            res.duplicates++
            continue
          }
        }
        const ins = await db
          .insert(newsArticles)
          .values(values)
          .onConflictDoNothing({ target: newsArticles.url })
          .returning({ id: newsArticles.id })
        if (!ins.length) {
          res.duplicates++
          continue
        }
        articleId = ins[0].id
        res.added++
      }

      // Rebuild this article's mention graph.
      const mentions: { articleId: string; kind: MentionKind; value: string; label: string | null }[] = []
      for (const c of strArray(raw.cves, 40)) {
        const cve = c.toUpperCase()
        if (/^CVE-\d{4}-\d+$/.test(cve)) mentions.push({ articleId, kind: "cve", value: cve, label: null })
      }
      for (const a of strArray(raw.actors, 120)) mentions.push({ articleId, kind: "actor", value: a, label: null })
      for (const m of strArray(raw.malware, 120)) mentions.push({ articleId, kind: "malware", value: m, label: null })
      for (const t of parseTtps(raw.ttps)) mentions.push({ articleId, kind: "ttp", value: t.id, label: t.name })
      for (const s of strArray(raw.sectors, 80)) mentions.push({ articleId, kind: "sector", value: s, label: null })
      for (const r of strArray(raw.regions, 80)) mentions.push({ articleId, kind: "region", value: r, label: null })

      await db.delete(newsMentions).where(eq(newsMentions.articleId, articleId))
      if (mentions.length) await db.insert(newsMentions).values(mentions)
    }
  }, undefined)
  return res
}

export type ArticleRow = {
  id: string
  url: string
  title: string
  source: string | null
  summary: string | null
  analystNote: string | null
  severity: string | null
  category: string | null
  publishedAt: string | null
  createdAt: string
  cves: string[]
  actors: string[]
  malware: string[]
  ttps: { id: string; name: string | null }[]
  sectors: string[]
  regions: string[]
  /** Distinct sources reporting this same story (incl. this article's). Filled by computeCorroboration; length 1 = single-source. */
  sources: string[]
  /** How relevant this is to the viewer's organization. Filled by scoreArticles; null before scoring. */
  relevance: ArticleRelevance | null
}

export type ArticleRelevance = {
  score: number // 0..100
  level: "critical" | "high" | "moderate" | "low" | "none"
  reasons: string[]
}

async function attachMentions(
  db: Awaited<ReturnType<typeof getDb>>,
  rows: (typeof newsArticles.$inferSelect)[]
): Promise<ArticleRow[]> {
  const ids = rows.map((r) => r.id)
  const mentions = ids.length
    ? await db.select().from(newsMentions).where(inArray(newsMentions.articleId, ids))
    : []
  const byArticle = new Map<string, typeof mentions>()
  for (const m of mentions) {
    const arr = byArticle.get(m.articleId) ?? []
    arr.push(m)
    byArticle.set(m.articleId, arr)
  }
  return rows.map((r) => {
    const ms = byArticle.get(r.id) ?? []
    const pick = (kind: MentionKind) => ms.filter((m) => m.kind === kind)
    return {
      id: r.id,
      url: r.url,
      title: r.title,
      source: r.source,
      summary: r.summary,
      analystNote: r.analystNote,
      severity: r.severity,
      category: r.category,
      publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      cves: pick("cve").map((m) => m.value),
      actors: pick("actor").map((m) => m.value),
      malware: pick("malware").map((m) => m.value),
      ttps: pick("ttp").map((m) => ({ id: m.value, name: m.label })),
      sectors: pick("sector").map((m) => m.value),
      regions: pick("region").map((m) => m.value),
      sources: r.source ? [r.source] : [],
      relevance: null,
    }
  })
}

// ── Faceted filtering ─────────────────────────────────────────────────────────
export type Facet = { value: string; label?: string; count: number }
export type NewsFacets = {
  severities: Facet[]
  categories: Facet[]
  regions: Facet[]
  ttps: Facet[]
  actors: Facet[]
  malware: Facet[]
  sectors: Facet[]
  sources: Facet[]
}

/** Available facet values (with article counts) across the whole feed — powers the filter UI. */
export async function newsFacets(): Promise<NewsFacets> {
  const empty: NewsFacets = { severities: [], categories: [], regions: [], ttps: [], actors: [], malware: [], sectors: [], sources: [] }
  return safe(async () => {
    const db = await getDb()
    const articleFacet = async (col: AnyPgColumn) =>
      (
        await db
          .select({ value: col, count: sql<number>`cast(count(*) as int)` })
          .from(newsArticles)
          .where(sql`${col} is not null`)
          .groupBy(col)
          .orderBy(desc(sql`count(*)`))
      ).map((r) => ({ value: r.value as string, count: Number(r.count) }))
    const m = await db
      .select({
        kind: newsMentions.kind,
        value: newsMentions.value,
        label: sql<string | null>`max(${newsMentions.label})`,
        count: sql<number>`cast(count(distinct ${newsMentions.articleId}) as int)`,
      })
      .from(newsMentions)
      .groupBy(newsMentions.kind, newsMentions.value)
      .orderBy(desc(sql`count(distinct ${newsMentions.articleId})`))
    const byKind = (k: MentionKind): Facet[] =>
      m.filter((r) => r.kind === k).map((r) => ({ value: r.value, label: r.label ?? undefined, count: Number(r.count) }))
    return {
      severities: await articleFacet(newsArticles.severity),
      categories: await articleFacet(newsArticles.category),
      regions: byKind("region"),
      ttps: byKind("ttp"),
      actors: byKind("actor"),
      malware: byKind("malware"),
      sectors: byKind("sector"),
      sources: await articleFacet(newsArticles.source),
    }
  }, empty)
}

export type NewsFilter = {
  severities?: string[]
  categories?: string[]
  sources?: string[]
  regions?: string[]
  ttps?: string[]
  actors?: string[]
  malware?: string[]
  sectors?: string[]
  sinceMinutes?: number
  limit?: number
}

/** Multi-facet article query: AND across facet types, OR within a facet. */
export async function listArticlesAdvanced(f: NewsFilter): Promise<ArticleRow[]> {
  return safe(async () => {
    const db = await getDb()
    // Mention facets → intersect the article-id sets (AND across kinds).
    const mentionFacets: [MentionKind, string[] | undefined][] = [
      ["region", f.regions],
      ["ttp", f.ttps],
      ["actor", f.actors],
      ["malware", f.malware],
      ["sector", f.sectors],
    ]
    let idSet: Set<string> | null = null
    for (const [kind, values] of mentionFacets) {
      if (!values || !values.length) continue
      const rows = await db
        .select({ articleId: newsMentions.articleId })
        .from(newsMentions)
        .where(and(eq(newsMentions.kind, kind), inArray(newsMentions.value, values)))
      const s = new Set<string>(rows.map((r) => r.articleId))
      if (idSet === null) {
        idSet = s
      } else {
        const prev: Set<string> = idSet
        idSet = new Set<string>([...prev].filter((x) => s.has(x)))
      }
      if (idSet.size === 0) return []
    }

    const clauses = []
    if (f.severities?.length) clauses.push(inArray(newsArticles.severity, f.severities))
    if (f.categories?.length) clauses.push(inArray(newsArticles.category, f.categories))
    if (f.sources?.length) clauses.push(inArray(newsArticles.source, f.sources))
    if (f.sinceMinutes && f.sinceMinutes > 0)
      clauses.push(gte(newsArticles.createdAt, new Date(Date.now() - f.sinceMinutes * 60_000)))
    if (idSet) clauses.push(inArray(newsArticles.id, [...idSet]))

    const rows = await db
      .select()
      .from(newsArticles)
      .where(clauses.length ? and(...clauses) : undefined)
      .orderBy(desc(newsArticles.publishedAt), desc(newsArticles.createdAt))
      .limit(f.limit ?? 300)
    return attachMentions(db, rows)
  }, [])
}

// ── Saved filters ─────────────────────────────────────────────────────────────
export type SavedFilter = { id: string; name: string; query: Record<string, string[] | string>; createdAt: string }

export async function listSavedFilters(userId: string): Promise<SavedFilter[]> {
  return safe(async () => {
    const db = await getDb()
    const rows = await db
      .select()
      .from(savedNewsFilters)
      .where(eq(savedNewsFilters.userId, userId))
      .orderBy(desc(savedNewsFilters.createdAt))
    return rows.map((r) => ({ id: r.id, name: r.name, query: r.query ?? {}, createdAt: r.createdAt.toISOString() }))
  }, [])
}

export async function saveFilter(userId: string, name: string, query: Record<string, string[] | string>): Promise<void> {
  await safe(async () => {
    const db = await getDb()
    await db.insert(savedNewsFilters).values({ userId, name: name.slice(0, 80), query })
  }, undefined)
}

export async function deleteSavedFilter(userId: string, id: string): Promise<void> {
  await safe(async () => {
    const db = await getDb()
    await db.delete(savedNewsFilters).where(and(eq(savedNewsFilters.userId, userId), eq(savedNewsFilters.id, id)))
  }, undefined)
}

export async function listArticles(
  filter: { severity?: string; category?: string; sinceMinutes?: number; limit?: number } = {}
): Promise<ArticleRow[]> {
  return safe(async () => {
    const db = await getDb()
    const clauses = []
    if (filter.severity && SEVERITIES.has(filter.severity)) clauses.push(eq(newsArticles.severity, filter.severity))
    if (filter.category) clauses.push(eq(newsArticles.category, filter.category))
    if (filter.sinceMinutes && filter.sinceMinutes > 0)
      clauses.push(gte(newsArticles.createdAt, new Date(Date.now() - filter.sinceMinutes * 60_000)))
    const rows = await db
      .select()
      .from(newsArticles)
      .where(clauses.length ? and(...clauses) : undefined)
      .orderBy(desc(newsArticles.publishedAt), desc(newsArticles.createdAt))
      .limit(filter.limit ?? 200)
    return attachMentions(db, rows)
  }, [])
}

/** Top entities of a given kind across all articles (e.g. trending threat actors). */
export async function topMentions(kind: MentionKind, limit = 8): Promise<{ value: string; count: number }[]> {
  return safe(async () => {
    const db = await getDb()
    const rows = await db
      .select({ value: newsMentions.value, count: sql<number>`cast(count(*) as int)` })
      .from(newsMentions)
      .where(eq(newsMentions.kind, kind))
      .groupBy(newsMentions.value)
      .orderBy(desc(sql`count(*)`))
      .limit(limit)
    return rows.map((r) => ({ value: r.value, count: Number(r.count) }))
  }, [])
}

/** Lightweight: recent articles mentioning any of these entity values (for watch alerts). */
export async function articlesMentioning(
  kind: MentionKind,
  names: string[],
  limit = 25
): Promise<{ url: string; title: string; source: string | null; publishedAt: string | null }[]> {
  const lowered = [...new Set(names.map((n) => n.trim().toLowerCase()).filter(Boolean))]
  if (!lowered.length) return []
  return safe(async () => {
    const db = await getDb()
    const match = or(...lowered.map((v) => sql`lower(${newsMentions.value}) = ${v}`))
    const mRows = await db
      .select({ articleId: newsMentions.articleId })
      .from(newsMentions)
      .where(and(eq(newsMentions.kind, kind), match))
    const ids = [...new Set(mRows.map((r) => r.articleId))]
    if (!ids.length) return []
    const rows = await db
      .select({ url: newsArticles.url, title: newsArticles.title, source: newsArticles.source, publishedAt: newsArticles.publishedAt })
      .from(newsArticles)
      .where(inArray(newsArticles.id, ids))
      .orderBy(desc(newsArticles.publishedAt), desc(newsArticles.createdAt))
      .limit(limit)
    return rows.map((r) => ({ url: r.url, title: r.title, source: r.source, publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null }))
  }, [])
}

/** Distinct threat actors seen in the news feed whose name contains the query (for OSINT search). */
export async function searchNewsActors(q: string, limit = 12): Promise<{ value: string; count: number }[]> {
  const term = q.trim().toLowerCase()
  if (!term) return []
  return safe(async () => {
    const db = await getDb()
    const rows = await db
      .select({ value: newsMentions.value, count: sql<number>`cast(count(distinct ${newsMentions.articleId}) as int)` })
      .from(newsMentions)
      .where(and(eq(newsMentions.kind, "actor"), sql`lower(${newsMentions.value}) like ${"%" + term + "%"}`))
      .groupBy(newsMentions.value)
      .orderBy(desc(sql`count(distinct ${newsMentions.articleId})`))
      .limit(limit)
    return rows.map((r) => ({ value: r.value, count: Number(r.count) }))
  }, [])
}

export type EntityTally = { value: string; count: number }
export type EntityIntel = {
  articles: ArticleRow[]
  related: { actors: EntityTally[]; malware: EntityTally[]; cves: EntityTally[]; ttps: EntityTally[]; sectors: EntityTally[] }
  firstSeen: string | null
  lastSeen: string | null
}

/** Everything the news graph knows about one entity (e.g. a threat actor): the articles
 *  mentioning it + the entities that co-occur with it. Powers cross-module actor/malware pages. */
export async function newsForEntity(kind: MentionKind, values: string[], limit = 40): Promise<EntityIntel> {
  const empty: EntityIntel = {
    articles: [],
    related: { actors: [], malware: [], cves: [], ttps: [], sectors: [] },
    firstSeen: null,
    lastSeen: null,
  }
  const lowered = [...new Set(values.map((v) => v.trim().toLowerCase()).filter(Boolean))]
  if (!lowered.length) return empty
  return safe(async () => {
    const db = await getDb()
    const match = or(...lowered.map((v) => sql`lower(${newsMentions.value}) = ${v}`))
    const mRows = await db
      .select({ articleId: newsMentions.articleId })
      .from(newsMentions)
      .where(and(eq(newsMentions.kind, kind), match))
    const ids = [...new Set(mRows.map((r) => r.articleId))]
    if (!ids.length) return empty
    const rows = await db
      .select()
      .from(newsArticles)
      .where(inArray(newsArticles.id, ids))
      .orderBy(desc(newsArticles.publishedAt), desc(newsArticles.createdAt))
      .limit(limit)
    const articles = await attachMentions(db, rows)

    // co-occurring entities (exclude the queried entity itself)
    const self = new Set(lowered)
    const tally = (pick: (a: ArticleRow) => string[]): EntityTally[] => {
      const m = new Map<string, number>()
      for (const a of articles) for (const v of pick(a)) {
        if (self.has(v.toLowerCase())) continue
        m.set(v, (m.get(v) || 0) + 1)
      }
      return [...m.entries()].map(([value, count]) => ({ value, count })).sort((x, y) => y.count - x.count).slice(0, 20)
    }
    const dates = articles.map((a) => a.publishedAt ?? a.createdAt).filter(Boolean).sort()
    return {
      articles,
      related: {
        actors: tally((a) => a.actors),
        malware: tally((a) => a.malware),
        cves: tally((a) => a.cves),
        ttps: tally((a) => a.ttps.map((t) => t.id)),
        sectors: tally((a) => a.sectors),
      },
      firstSeen: dates[0] ?? null,
      lastSeen: dates[dates.length - 1] ?? null,
    }
  }, empty)
}

/** A single article by id (for deep-linking / focusing one case in the news console). */
export async function getArticle(id: string): Promise<ArticleRow | null> {
  return safe(async () => {
    const db = await getDb()
    const rows = await db.select().from(newsArticles).where(eq(newsArticles.id, id)).limit(1)
    if (!rows.length) return null
    const [a] = await attachMentions(db, rows)
    return a ?? null
  }, null)
}

/**
 * Multi-source corroboration: fills each row's `sources` with the distinct sources that reported the
 * SAME event — other articles sharing a CVE (strong signal) or the same actor within the same category,
 * within ±windowDays. length > 1 = "verified by N sources". Two queries total for the whole page.
 */
export async function computeCorroboration(rows: ArticleRow[], windowDays = 3): Promise<ArticleRow[]> {
  const cveSet = new Set<string>()
  const actorSet = new Set<string>()
  for (const r of rows) {
    r.cves.forEach((c) => cveSet.add(c))
    r.actors.forEach((a) => actorSet.add(a))
  }
  if (!cveSet.size && !actorSet.size) return rows
  return safe(async () => {
    const db = await getDb()
    const clauses = []
    if (cveSet.size) clauses.push(and(eq(newsMentions.kind, "cve"), inArray(newsMentions.value, [...cveSet])))
    if (actorSet.size) clauses.push(and(eq(newsMentions.kind, "actor"), inArray(newsMentions.value, [...actorSet])))
    const mrows = await db
      .select({ articleId: newsMentions.articleId, kind: newsMentions.kind, value: newsMentions.value })
      .from(newsMentions)
      .where(or(...clauses))

    const cveArticles = new Map<string, Set<string>>()
    const actorArticles = new Map<string, Set<string>>()
    const allIds = new Set<string>()
    for (const m of mrows) {
      allIds.add(m.articleId)
      const map = m.kind === "cve" ? cveArticles : m.kind === "actor" ? actorArticles : null
      if (!map) continue
      if (!map.has(m.value)) map.set(m.value, new Set())
      map.get(m.value)!.add(m.articleId)
    }
    if (!allIds.size) return rows

    const metaRows = await db
      .select({ id: newsArticles.id, source: newsArticles.source, category: newsArticles.category, publishedAt: newsArticles.publishedAt, createdAt: newsArticles.createdAt })
      .from(newsArticles)
      .where(inArray(newsArticles.id, [...allIds]))
    const meta = new Map(metaRows.map((m) => [m.id, { source: m.source, category: m.category, when: (m.publishedAt ?? m.createdAt).getTime() }]))

    const winMs = windowDays * 86_400_000
    for (const r of rows) {
      const rWhen = new Date(r.publishedAt ?? r.createdAt).getTime()
      const sources = new Set<string>()
      if (r.source) sources.add(r.source)
      const candidates = new Set<string>()
      for (const c of r.cves) cveArticles.get(c)?.forEach((id) => candidates.add(id))
      for (const a of r.actors) actorArticles.get(a)?.forEach((id) => candidates.add(id))
      for (const id of candidates) {
        if (id === r.id) continue
        const m = meta.get(id)
        if (!m || !m.source) continue
        if (Math.abs(m.when - rWhen) > winMs) continue
        const sharesCve = r.cves.some((c) => cveArticles.get(c)?.has(id))
        const sharesActor = !sharesCve && !!r.category && m.category === r.category && r.actors.some((a) => actorArticles.get(a)?.has(id))
        if (sharesCve || sharesActor) sources.add(m.source)
      }
      r.sources = [...sources]
    }
    return rows
  }, rows)
}

export async function newsStats(): Promise<{
  total: number
  last24h: number
  critical: number
  high: number
  categories: { category: string; count: number }[]
  lastAt: string | null
}> {
  return safe(
    async () => {
      const db = await getDb()
      const since = new Date(Date.now() - 24 * 3_600_000)
      const [row = { total: 0, last24h: 0, critical: 0, high: 0 }] = await db
        .select({
          total: sql<number>`cast(count(*) as int)`,
          last24h: sql<number>`cast(count(*) filter (where ${newsArticles.createdAt} >= ${since}) as int)`,
          critical: sql<number>`cast(count(*) filter (where ${newsArticles.severity} = 'critical') as int)`,
          high: sql<number>`cast(count(*) filter (where ${newsArticles.severity} = 'high') as int)`,
        })
        .from(newsArticles)
      const cats = await db
        .select({ category: newsArticles.category, count: sql<number>`cast(count(*) as int)` })
        .from(newsArticles)
        .where(sql`${newsArticles.category} is not null`)
        .groupBy(newsArticles.category)
        .orderBy(desc(sql`count(*)`))
        .limit(10)
      const [last] = await db
        .select({ at: newsArticles.createdAt })
        .from(newsArticles)
        .orderBy(desc(newsArticles.createdAt))
        .limit(1)
      return {
        total: Number(row.total) || 0,
        last24h: Number(row.last24h) || 0,
        critical: Number(row.critical) || 0,
        high: Number(row.high) || 0,
        categories: cats.filter((c) => c.category).map((c) => ({ category: c.category as string, count: Number(c.count) })),
        lastAt: last?.at ? last.at.toISOString() : null,
      }
    },
    { total: 0, last24h: 0, critical: 0, high: 0, categories: [], lastAt: null }
  )
}
