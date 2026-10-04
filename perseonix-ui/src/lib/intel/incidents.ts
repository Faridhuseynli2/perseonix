import "server-only"
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm"
import { getDb } from "@/db"
import {
  newsArticles,
  newsIncidentEvents,
  newsIncidentNotifications,
  newsIncidents,
  users,
} from "@/db/schema"
import {
  isIncidentSeverity,
  isIncidentStatus,
  isOpenStatus,
  slaDueFrom,
} from "@/lib/intel/incidents-meta"
import { ownerOf, type Actor, type Owner } from "@/lib/brand/owner"

type Db = Awaited<ReturnType<typeof getDb>>

// Incident cases for Cyber Threat News. Owner is the org (team-wide) or the user.
// Degrades to empty/no-op before the tables exist (until one dev-server restart).

function isSchemaNotReady(error: unknown): boolean {
  for (let cur: unknown = error, d = 0; cur && d < 6; d++) {
    if (typeof cur !== "object") break
    const r = cur as { code?: unknown; message?: unknown; cause?: unknown }
    if (r.code === "42P01" || r.code === "42703") return true
    if (typeof r.message === "string" && /news_incident/.test(r.message) && /does not exist|no such/.test(r.message)) return true
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

export type IncidentRow = {
  id: string
  seq: number
  title: string
  status: string
  severity: string
  source: string
  category: string | null
  articleId: string | null
  articleUrl: string | null
  slaDueAt: string | null
  assigneeId: string | null
  assigneeName: string | null
  openedByName: string | null
  createdAt: string
  updatedAt: string
  closedAt: string | null
  commentCount: number
}

export type IncidentEvent = {
  id: string
  kind: string
  body: string | null
  authorName: string | null
  meta: Record<string, unknown> | null
  createdAt: string
}

export type IncidentDetail = IncidentRow & {
  summary: string | null
  articleTitle: string | null
  events: IncidentEvent[]
}

type IncidentSelect = typeof newsIncidents.$inferSelect

function toRow(c: IncidentSelect, commentCount = 0): IncidentRow {
  return {
    id: c.id,
    seq: c.seq,
    title: c.title,
    status: c.status,
    severity: c.severity,
    source: c.source,
    category: c.category,
    articleId: c.articleId,
    articleUrl: c.articleUrl,
    slaDueAt: c.slaDueAt ? c.slaDueAt.toISOString() : null,
    assigneeId: c.assigneeId,
    assigneeName: c.assigneeName,
    openedByName: c.openedByName,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    closedAt: c.closedAt ? c.closedAt.toISOString() : null,
    commentCount,
  }
}

/** Map a news-article severity (which can be "info") onto an incident severity. */
function severityFromArticle(v: string | null): string {
  if (v && isIncidentSeverity(v)) return v
  return "medium"
}

// ── Team notifications ───────────────────────────────────────────────────────

async function recipients(db: Db, owner: Owner): Promise<string[]> {
  if (owner.ownerType === "user") return [owner.ownerId]
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.organizationId, owner.ownerId), eq(users.status, "active")))
  return rows.map((r) => r.id)
}

async function notifyOpened(db: Db, owner: Owner, c: IncidentSelect, excludeUserId?: string): Promise<void> {
  const ids = (await recipients(db, owner)).filter((id) => id !== excludeUserId)
  if (!ids.length) return
  await db
    .insert(newsIncidentNotifications)
    .values(ids.map((userId) => ({ userId, incidentId: c.id, seq: c.seq, title: c.title, severity: c.severity, source: c.source })))
    .onConflictDoNothing()
}

async function nextSeq(db: Db, ownerId: string): Promise<number> {
  const [row] = await db
    .select({ max: sql<number>`coalesce(max(${newsIncidents.seq}), 0)` })
    .from(newsIncidents)
    .where(eq(newsIncidents.ownerId, ownerId))
  return (Number(row?.max) || 0) + 1
}

type NewIncident = {
  title: string
  summary?: string | null
  severity: string
  source: "auto" | "manual"
  articleId?: string | null
  articleTitle?: string | null
  articleUrl?: string | null
  category?: string | null
  openedById?: string | null
  openedByName?: string | null
}

async function insertIncident(db: Db, owner: Owner, values: NewIncident): Promise<IncidentSelect> {
  const slaDueAt = slaDueFrom(new Date(), values.severity)
  for (let attempt = 0; attempt < 4; attempt++) {
    const seq = await nextSeq(db, owner.ownerId)
    try {
      const [row] = await db
        .insert(newsIncidents)
        .values({ ownerId: owner.ownerId, ownerType: owner.ownerType, seq, slaDueAt, ...values })
        .returning()
      return row
    } catch (error) {
      if (attempt < 3 && /news_incidents_owner_seq_key/.test(String((error as { message?: unknown })?.message ?? error))) {
        continue
      }
      throw error
    }
  }
  throw new Error("Could not allocate an incident number.")
}

async function logEvent(
  db: Db,
  incidentId: string,
  kind: string,
  opts: { body?: string | null; authorId?: string | null; authorName?: string | null; meta?: Record<string, unknown> } = {}
): Promise<void> {
  await db.insert(newsIncidentEvents).values({
    incidentId,
    kind,
    body: opts.body ?? null,
    authorId: opts.authorId ?? null,
    authorName: opts.authorName ?? null,
    meta: opts.meta ?? null,
  })
}

async function existingForArticle(db: Db, ownerId: string, articleId: string): Promise<IncidentSelect | null> {
  const [row] = await db
    .select()
    .from(newsIncidents)
    .where(and(eq(newsIncidents.ownerId, ownerId), eq(newsIncidents.articleId, articleId)))
    .limit(1)
  return row ?? null
}

// ── Creation ─────────────────────────────────────────────────────────────────

export type CreateResult = { ok: boolean; incidentId?: string; seq?: number; existed?: boolean; error?: string }

const NOT_READY = "Restart the dev server once to enable incidents, then try again."

/** Open an incident from a Threat-News article (an analyst's manual escalation). */
export async function createIncidentFromArticle(user: Actor, articleId: string): Promise<CreateResult> {
  return safe<CreateResult>(
    async () => {
      const db = await getDb()
      const owner = ownerOf(user)
      const [a] = await db.select().from(newsArticles).where(eq(newsArticles.id, articleId)).limit(1)
      if (!a) return { ok: false, error: "Article not found." }

      const existing = await existingForArticle(db, owner.ownerId, articleId)
      if (existing) return { ok: true, incidentId: existing.id, seq: existing.seq, existed: true }

      const authorName = (user as { name?: string }).name ?? null
      const c = await insertIncident(db, owner, {
        title: a.title,
        summary: a.analystNote || a.summary || null,
        severity: severityFromArticle(a.severity),
        source: "manual",
        articleId: a.id,
        articleTitle: a.title,
        articleUrl: a.url,
        category: a.category,
        openedById: user.id,
        openedByName: authorName,
      })
      await logEvent(db, c.id, "created", {
        body: `Incident opened from Cyber Threat News: “${a.title}”.`,
        authorId: user.id,
        authorName,
      })
      await notifyOpened(db, owner, c, user.id)
      return { ok: true, incidentId: c.id, seq: c.seq }
    },
    { ok: false, error: NOT_READY }
  )
}

/** Open a blank incident (not tied to a specific article). */
export async function createBlankIncident(
  user: Actor,
  input: { title: string; severity: string; summary?: string | null; articleUrl?: string | null }
): Promise<CreateResult> {
  const title = input.title.trim()
  if (!title) return { ok: false, error: "Give the incident a title." }
  const severity = isIncidentSeverity(input.severity) ? input.severity : "medium"
  return safe<CreateResult>(
    async () => {
      const db = await getDb()
      const owner = ownerOf(user)
      const authorName = (user as { name?: string }).name ?? null
      const c = await insertIncident(db, owner, {
        title,
        summary: input.summary?.trim() || null,
        severity,
        source: "manual",
        articleUrl: input.articleUrl?.trim() || null,
        openedById: user.id,
        openedByName: authorName,
      })
      await logEvent(db, c.id, "created", { body: "Incident opened manually.", authorId: user.id, authorName })
      await notifyOpened(db, owner, c, user.id)
      return { ok: true, incidentId: c.id, seq: c.seq }
    },
    { ok: false, error: NOT_READY }
  )
}

// ── Reads ────────────────────────────────────────────────────────────────────

export async function listIncidents(
  user: Actor,
  filter: { status?: string; severity?: string } = {}
): Promise<IncidentRow[]> {
  return safe(
    async () => {
      const db = await getDb()
      const owner = ownerOf(user)
      const clauses = [eq(newsIncidents.ownerId, owner.ownerId)]
      if (filter.status && isIncidentStatus(filter.status)) clauses.push(eq(newsIncidents.status, filter.status))
      if (filter.severity && isIncidentSeverity(filter.severity)) clauses.push(eq(newsIncidents.severity, filter.severity))
      const rows = await db
        .select()
        .from(newsIncidents)
        .where(and(...clauses))
        .orderBy(desc(newsIncidents.createdAt))
        .limit(300)
      if (!rows.length) return []
      const counts = await db
        .select({
          incidentId: newsIncidentEvents.incidentId,
          comments: sql<number>`cast(count(*) filter (where ${newsIncidentEvents.kind} = 'comment') as int)`,
        })
        .from(newsIncidentEvents)
        .where(inArray(newsIncidentEvents.incidentId, rows.map((r) => r.id)))
        .groupBy(newsIncidentEvents.incidentId)
      const byId = new Map(counts.map((c) => [c.incidentId, Number(c.comments) || 0]))
      return rows.map((r) => toRow(r, byId.get(r.id) ?? 0))
    },
    []
  )
}

export async function getIncident(user: Actor, id: string): Promise<IncidentDetail | null> {
  return safe(async () => {
    const db = await getDb()
    const owner = ownerOf(user)
    const [c] = await db
      .select()
      .from(newsIncidents)
      .where(and(eq(newsIncidents.id, id), eq(newsIncidents.ownerId, owner.ownerId)))
      .limit(1)
    if (!c) return null
    const events = await db
      .select()
      .from(newsIncidentEvents)
      .where(eq(newsIncidentEvents.incidentId, id))
      .orderBy(desc(newsIncidentEvents.createdAt))
    const commentCount = events.filter((e) => e.kind === "comment").length
    return {
      ...toRow(c, commentCount),
      summary: c.summary,
      articleTitle: c.articleTitle,
      events: events.map((e) => ({
        id: e.id,
        kind: e.kind,
        body: e.body,
        authorName: e.authorName,
        meta: e.meta ?? null,
        createdAt: e.createdAt.toISOString(),
      })),
    }
  }, null)
}

export async function incidentStats(
  user: Actor
): Promise<{ open: number; investigating: number; high: number; overdue: number; total: number }> {
  return safe(
    async () => {
      const db = await getDb()
      const owner = ownerOf(user)
      const [row = { open: 0, investigating: 0, high: 0, overdue: 0, total: 0 }] = await db
        .select({
          total: sql<number>`cast(count(*) as int)`,
          open: sql<number>`cast(count(*) filter (where ${newsIncidents.status} = 'open') as int)`,
          investigating: sql<number>`cast(count(*) filter (where ${newsIncidents.status} = 'investigating') as int)`,
          high: sql<number>`cast(count(*) filter (where ${newsIncidents.severity} in ('critical','high') and ${newsIncidents.status} in ('open','investigating')) as int)`,
          overdue: sql<number>`cast(count(*) filter (where ${newsIncidents.status} in ('open','investigating') and ${newsIncidents.slaDueAt} is not null and ${newsIncidents.slaDueAt} < now()) as int)`,
        })
        .from(newsIncidents)
        .where(eq(newsIncidents.ownerId, owner.ownerId))
      return {
        total: Number(row.total) || 0,
        open: Number(row.open) || 0,
        investigating: Number(row.investigating) || 0,
        high: Number(row.high) || 0,
        overdue: Number(row.overdue) || 0,
      }
    },
    { open: 0, investigating: 0, high: 0, overdue: 0, total: 0 }
  )
}

// ── Mutations ──────────────────────────────────────────────────────────────────

async function owned(db: Db, user: Actor, id: string): Promise<IncidentSelect | null> {
  const owner = ownerOf(user)
  const [c] = await db
    .select()
    .from(newsIncidents)
    .where(and(eq(newsIncidents.id, id), eq(newsIncidents.ownerId, owner.ownerId)))
    .limit(1)
  return c ?? null
}

function actorName(user: Actor): string | null {
  return (user as { name?: string }).name ?? null
}

export async function addComment(user: Actor, id: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const text = body.trim()
  if (!text) return { ok: false, error: "Write something first." }
  return safe<{ ok: boolean; error?: string }>(
    async () => {
      const db = await getDb()
      const c = await owned(db, user, id)
      if (!c) return { ok: false, error: "Incident not found." }
      await logEvent(db, id, "comment", { body: text, authorId: user.id, authorName: actorName(user) })
      await db.update(newsIncidents).set({ updatedAt: new Date() }).where(eq(newsIncidents.id, id))
      return { ok: true }
    },
    { ok: false, error: NOT_READY }
  )
}

export async function setStatus(user: Actor, id: string, status: string): Promise<{ ok: boolean; error?: string }> {
  if (!isIncidentStatus(status)) return { ok: false, error: "Unknown status." }
  return safe<{ ok: boolean; error?: string }>(
    async () => {
      const db = await getDb()
      const c = await owned(db, user, id)
      if (!c) return { ok: false, error: "Incident not found." }
      if (c.status === status) return { ok: true }
      const nowClosed = !isOpenStatus(status)
      const wasClosed = !isOpenStatus(c.status)
      await db
        .update(newsIncidents)
        .set({ status, closedAt: nowClosed ? new Date() : null, closedById: nowClosed ? user.id : null })
        .where(eq(newsIncidents.id, id))
      const kind = nowClosed && !wasClosed ? "closed" : !nowClosed && wasClosed ? "reopened" : "status"
      await logEvent(db, id, kind, { authorId: user.id, authorName: actorName(user), meta: { from: c.status, to: status } })
      return { ok: true }
    },
    { ok: false, error: NOT_READY }
  )
}

export async function setSeverity(user: Actor, id: string, severity: string): Promise<{ ok: boolean; error?: string }> {
  if (!isIncidentSeverity(severity)) return { ok: false, error: "Unknown severity." }
  return safe<{ ok: boolean; error?: string }>(
    async () => {
      const db = await getDb()
      const c = await owned(db, user, id)
      if (!c) return { ok: false, error: "Incident not found." }
      if (c.severity === severity) return { ok: true }
      // Re-derive the SLA due-date from the (unchanged) open time and the new severity.
      const slaDueAt = slaDueFrom(c.createdAt, severity)
      await db.update(newsIncidents).set({ severity, slaDueAt }).where(eq(newsIncidents.id, id))
      await logEvent(db, id, "severity", { authorId: user.id, authorName: actorName(user), meta: { from: c.severity, to: severity } })
      return { ok: true }
    },
    { ok: false, error: NOT_READY }
  )
}

export async function assign(user: Actor, id: string, toSelf: boolean): Promise<{ ok: boolean; error?: string }> {
  return safe<{ ok: boolean; error?: string }>(
    async () => {
      const db = await getDb()
      const c = await owned(db, user, id)
      if (!c) return { ok: false, error: "Incident not found." }
      const name = actorName(user)
      await db
        .update(newsIncidents)
        .set({ assigneeId: toSelf ? user.id : null, assigneeName: toSelf ? name : null })
        .where(eq(newsIncidents.id, id))
      await logEvent(db, id, "assign", { authorId: user.id, authorName: name, meta: toSelf ? { to: name ?? "self" } : { to: null } })
      return { ok: true }
    },
    { ok: false, error: NOT_READY }
  )
}

// ── Bell notifications ─────────────────────────────────────────────────────────

export type IncidentNotification = {
  id: string
  incidentId: string
  seq: number
  title: string
  severity: string
  source: string
  read: boolean
  createdAt: string
}

export async function incidentNotificationsView(user: Actor, limit = 12): Promise<{ items: IncidentNotification[]; unread: number }> {
  return safe(
    async () => {
      const db = await getDb()
      const rows = await db
        .select()
        .from(newsIncidentNotifications)
        .where(eq(newsIncidentNotifications.userId, user.id))
        .orderBy(desc(newsIncidentNotifications.createdAt))
        .limit(limit)
      const [{ count } = { count: 0 }] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(newsIncidentNotifications)
        .where(and(eq(newsIncidentNotifications.userId, user.id), isNull(newsIncidentNotifications.readAt)))
      return {
        unread: Number(count) || 0,
        items: rows.map((r) => ({
          id: r.id,
          incidentId: r.incidentId,
          seq: r.seq,
          title: r.title,
          severity: r.severity,
          source: r.source,
          read: r.readAt !== null,
          createdAt: r.createdAt.toISOString(),
        })),
      }
    },
    { items: [], unread: 0 }
  )
}

export async function markIncidentsRead(userId: string): Promise<void> {
  await safe(async () => {
    const db = await getDb()
    await db
      .update(newsIncidentNotifications)
      .set({ readAt: new Date() })
      .where(and(eq(newsIncidentNotifications.userId, userId), isNull(newsIncidentNotifications.readAt)))
  }, undefined)
}
