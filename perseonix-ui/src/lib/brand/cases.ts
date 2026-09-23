import "server-only"
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm"
import { getDb } from "@/db"
import {
  brandCaseEvents,
  brandCaseNotifications,
  brandCases,
  phishingDetections,
  protectedAssets,
  users,
} from "@/db/schema"
import { isCaseSeverity, isCaseStatus, isOpenStatus, type CaseSeverity } from "@/lib/brand/cases-meta"
import { ownerOf, type Actor, type Owner } from "@/lib/brand/owner"

type Db = Awaited<ReturnType<typeof getDb>>

// Case management for Brand Protection. Owner is the org (team-wide) or the user.
// Degrades to empty/no-op before the tables exist (until one dev-server restart).

function isSchemaNotReady(error: unknown): boolean {
  for (let cur: unknown = error, d = 0; cur && d < 6; d++) {
    if (typeof cur !== "object") break
    const r = cur as { code?: unknown; message?: unknown; cause?: unknown }
    if (r.code === "42P01" || r.code === "42703") return true
    if (typeof r.message === "string" && /brand_case/.test(r.message) && /does not exist|no such/.test(r.message)) return true
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

export type CaseRow = {
  id: string
  seq: number
  title: string
  status: string
  severity: string
  source: string
  domain: string | null
  assetDomain: string | null
  assigneeId: string | null
  assigneeName: string | null
  openedByName: string | null
  detectionId: string | null
  createdAt: string
  updatedAt: string
  closedAt: string | null
  commentCount: number
}

export type CaseEvent = {
  id: string
  kind: string
  body: string | null
  authorName: string | null
  meta: Record<string, unknown> | null
  createdAt: string
}

export type CaseDetail = CaseRow & { summary: string | null; assetId: string | null; events: CaseEvent[] }

type CaseSelect = typeof brandCases.$inferSelect

function toRow(c: CaseSelect, commentCount = 0): CaseRow {
  return {
    id: c.id,
    seq: c.seq,
    title: c.title,
    status: c.status,
    severity: c.severity,
    source: c.source,
    domain: c.domain,
    assetDomain: c.assetDomain,
    assigneeId: c.assigneeId,
    assigneeName: c.assigneeName,
    openedByName: c.openedByName,
    detectionId: c.detectionId,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    closedAt: c.closedAt ? c.closedAt.toISOString() : null,
    commentCount,
  }
}

/** Team members who should be alerted about a new case. */
async function recipients(db: Db, owner: Owner): Promise<string[]> {
  if (owner.ownerType === "user") return [owner.ownerId]
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.organizationId, owner.ownerId), eq(users.status, "active")))
  return rows.map((r) => r.id)
}

async function notifyCaseOpened(db: Db, owner: Owner, c: CaseSelect, excludeUserId?: string): Promise<void> {
  const ids = (await recipients(db, owner)).filter((id) => id !== excludeUserId)
  if (!ids.length) return
  await db
    .insert(brandCaseNotifications)
    .values(
      ids.map((userId) => ({
        userId,
        caseId: c.id,
        seq: c.seq,
        title: c.title,
        domain: c.domain,
        severity: c.severity,
        source: c.source,
      }))
    )
    .onConflictDoNothing()
}

async function nextSeq(db: Db, ownerId: string): Promise<number> {
  const [row] = await db
    .select({ max: sql<number>`coalesce(max(${brandCases.seq}), 0)` })
    .from(brandCases)
    .where(eq(brandCases.ownerId, ownerId))
  return (Number(row?.max) || 0) + 1
}

type NewCase = {
  title: string
  summary?: string | null
  severity: string
  source: "auto" | "manual"
  assetId?: string | null
  detectionId?: string | null
  domain?: string | null
  assetDomain?: string | null
  openedById?: string | null
  openedByName?: string | null
}

/** Insert a case, allocating a per-owner sequence number (retries on a seq race). */
async function insertCase(db: Db, owner: Owner, values: NewCase): Promise<CaseSelect> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const seq = await nextSeq(db, owner.ownerId)
    try {
      const [row] = await db
        .insert(brandCases)
        .values({ ownerId: owner.ownerId, ownerType: owner.ownerType, seq, ...values })
        .returning()
      return row
    } catch (error) {
      if (attempt < 3 && /brand_cases_owner_seq_key/.test(String((error as { message?: unknown })?.message ?? error))) {
        continue
      }
      throw error
    }
  }
  throw new Error("Could not allocate a case number.")
}

async function logEvent(
  db: Db,
  caseId: string,
  kind: string,
  opts: { body?: string | null; authorId?: string | null; authorName?: string | null; meta?: Record<string, unknown> } = {}
): Promise<void> {
  await db.insert(brandCaseEvents).values({
    caseId,
    kind,
    body: opts.body ?? null,
    authorId: opts.authorId ?? null,
    authorName: opts.authorName ?? null,
    meta: opts.meta ?? null,
  })
}

async function existingCaseForDetection(db: Db, ownerId: string, detectionId: string): Promise<CaseSelect | null> {
  const [row] = await db
    .select()
    .from(brandCases)
    .where(and(eq(brandCases.ownerId, ownerId), eq(brandCases.detectionId, detectionId)))
    .limit(1)
  return row ?? null
}

// ── Auto-open (called from the scan) ───────────────────────────────────────

export type AutoDetection = { id: string; domain: string; severity: string; score: number }

/**
 * Open a case for each highest-risk (high severity) new detection, deduped by
 * detection so a re-scan never opens the same case twice. Alerts the whole team.
 * Best-effort: never throws into the scan.
 */
export async function autoOpenCasesForDetections(
  db: Db,
  actor: Actor,
  asset: { id: string; domain: string },
  detections: AutoDetection[],
): Promise<number> {
  const highs = detections.filter((d) => d.severity === "high")
  if (!highs.length) return 0
  const owner = ownerOf(actor)
  let opened = 0
  for (const d of highs) {
    try {
      if (await existingCaseForDetection(db, owner.ownerId, d.id)) continue
      const c = await insertCase(db, owner, {
        title: `High-risk lookalike: ${d.domain}`,
        summary: `Auto-opened from a scan of ${asset.domain}. A high-risk lookalike domain (risk score ${d.score}) was detected impersonating your brand. Review the evidence and decide on a takedown.`,
        severity: "high",
        source: "auto",
        assetId: asset.id,
        detectionId: d.id,
        domain: d.domain,
        assetDomain: asset.domain,
      })
      await logEvent(db, c.id, "created", {
        body: `Case auto-opened for high-risk lookalike ${d.domain}.`,
        authorName: "Perseonix automation",
      })
      await notifyCaseOpened(db, owner, c)
      opened++
    } catch (error) {
      if (isSchemaNotReady(error)) return opened
      // Skip a single bad detection rather than failing the whole scan.
      if (/brand_cases_owner_detection_key/.test(String((error as { message?: unknown })?.message ?? error))) continue
      throw error
    }
  }
  return opened
}

// ── Manual creation ────────────────────────────────────────────────────────

export type CreateResult = { ok: boolean; caseId?: string; seq?: number; existed?: boolean; error?: string }

const NOT_READY = "Restart the dev server once to enable incident cases, then try again."

/** Open a case from a specific detection (a threat hunter's manual action). */
export async function createCaseFromDetection(user: Actor, detectionId: string): Promise<CreateResult> {
  return safe<CreateResult>(
    async () => {
      const db = await getDb()
      const owner = ownerOf(user)
      const [det] = await db
        .select({ d: phishingDetections, assetDomain: protectedAssets.domain })
        .from(phishingDetections)
        .innerJoin(protectedAssets, eq(protectedAssets.id, phishingDetections.assetId))
        .where(and(eq(phishingDetections.id, detectionId), eq(protectedAssets.ownerId, owner.ownerId)))
        .limit(1)
      if (!det) return { ok: false, error: "Detection not found." }

      const existing = await existingCaseForDetection(db, owner.ownerId, detectionId)
      if (existing) return { ok: true, caseId: existing.id, seq: existing.seq, existed: true }

      const authorName = (user as { name?: string }).name ?? null
      const c = await insertCase(db, owner, {
        title: `Lookalike: ${det.d.domain}`,
        summary: `Opened from the detection for ${det.d.domain} (impersonating ${det.assetDomain}). Risk score ${det.d.score}.`,
        severity: isCaseSeverity(det.d.severity) ? det.d.severity : "medium",
        source: "manual",
        assetId: det.d.assetId,
        detectionId,
        domain: det.d.domain,
        assetDomain: det.assetDomain,
        openedById: user.id,
        openedByName: authorName,
      })
      await logEvent(db, c.id, "created", {
        body: `Case opened from detection ${det.d.domain}.`,
        authorId: user.id,
        authorName,
      })
      await notifyCaseOpened(db, owner, c, user.id)
      return { ok: true, caseId: c.id, seq: c.seq }
    },
    { ok: false, error: NOT_READY }
  )
}

/** Open a blank case (not tied to a specific detection). */
export async function createBlankCase(
  user: Actor,
  input: { title: string; severity: string; domain?: string | null; summary?: string | null }
): Promise<CreateResult> {
  const title = input.title.trim()
  if (!title) return { ok: false, error: "Give the case a title." }
  const severity = isCaseSeverity(input.severity) ? input.severity : "medium"
  return safe<CreateResult>(
    async () => {
      const db = await getDb()
      const owner = ownerOf(user)
      const authorName = (user as { name?: string }).name ?? null
      const c = await insertCase(db, owner, {
        title,
        summary: input.summary?.trim() || null,
        severity,
        source: "manual",
        domain: input.domain?.trim() || null,
        openedById: user.id,
        openedByName: authorName,
      })
      await logEvent(db, c.id, "created", { body: "Case opened manually.", authorId: user.id, authorName })
      await notifyCaseOpened(db, owner, c, user.id)
      return { ok: true, caseId: c.id, seq: c.seq }
    },
    { ok: false, error: NOT_READY }
  )
}

// ── Reads ──────────────────────────────────────────────────────────────────

export async function listCases(user: Actor, filter: { status?: string; severity?: string } = {}): Promise<CaseRow[]> {
  return safe(
    async () => {
      const db = await getDb()
      const owner = ownerOf(user)
      const clauses = [eq(brandCases.ownerId, owner.ownerId)]
      if (filter.status && isCaseStatus(filter.status)) clauses.push(eq(brandCases.status, filter.status))
      if (filter.severity && isCaseSeverity(filter.severity)) clauses.push(eq(brandCases.severity, filter.severity))
      const rows = await db
        .select()
        .from(brandCases)
        .where(and(...clauses))
        .orderBy(desc(brandCases.createdAt))
        .limit(300)
      if (!rows.length) return []

      const counts = await db
        .select({
          caseId: brandCaseEvents.caseId,
          comments: sql<number>`cast(count(*) filter (where ${brandCaseEvents.kind} = 'comment') as int)`,
        })
        .from(brandCaseEvents)
        .where(inArray(brandCaseEvents.caseId, rows.map((r) => r.id)))
        .groupBy(brandCaseEvents.caseId)
      const byId = new Map(counts.map((c) => [c.caseId, Number(c.comments) || 0]))
      return rows.map((r) => toRow(r, byId.get(r.id) ?? 0))
    },
    []
  )
}

export async function getCase(user: Actor, id: string): Promise<CaseDetail | null> {
  return safe(async () => {
    const db = await getDb()
    const owner = ownerOf(user)
    const [c] = await db
      .select()
      .from(brandCases)
      .where(and(eq(brandCases.id, id), eq(brandCases.ownerId, owner.ownerId)))
      .limit(1)
    if (!c) return null
    const events = await db
      .select()
      .from(brandCaseEvents)
      .where(eq(brandCaseEvents.caseId, id))
      .orderBy(desc(brandCaseEvents.createdAt))
    const commentCount = events.filter((e) => e.kind === "comment").length
    return {
      ...toRow(c, commentCount),
      summary: c.summary,
      assetId: c.assetId,
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

export async function caseStats(user: Actor): Promise<{ open: number; investigating: number; high: number; total: number }> {
  return safe(
    async () => {
      const db = await getDb()
      const owner = ownerOf(user)
      const [row = { open: 0, investigating: 0, high: 0, total: 0 }] = await db
        .select({
          total: sql<number>`cast(count(*) as int)`,
          open: sql<number>`cast(count(*) filter (where ${brandCases.status} = 'open') as int)`,
          investigating: sql<number>`cast(count(*) filter (where ${brandCases.status} = 'investigating') as int)`,
          high: sql<number>`cast(count(*) filter (where ${brandCases.severity} = 'high' and ${brandCases.status} in ('open','investigating')) as int)`,
        })
        .from(brandCases)
        .where(eq(brandCases.ownerId, owner.ownerId))
      return {
        total: Number(row.total) || 0,
        open: Number(row.open) || 0,
        investigating: Number(row.investigating) || 0,
        high: Number(row.high) || 0,
      }
    },
    { open: 0, investigating: 0, high: 0, total: 0 }
  )
}

// ── Mutations ────────────────────────────────────────────────────────────────

async function ownedCase(db: Db, user: Actor, id: string): Promise<CaseSelect | null> {
  const owner = ownerOf(user)
  const [c] = await db
    .select()
    .from(brandCases)
    .where(and(eq(brandCases.id, id), eq(brandCases.ownerId, owner.ownerId)))
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
      const c = await ownedCase(db, user, id)
      if (!c) return { ok: false, error: "Case not found." }
      await logEvent(db, id, "comment", { body: text, authorId: user.id, authorName: actorName(user) })
      await db.update(brandCases).set({ updatedAt: new Date() }).where(eq(brandCases.id, id))
      return { ok: true }
    },
    { ok: false, error: NOT_READY }
  )
}

export async function setStatus(user: Actor, id: string, status: string): Promise<{ ok: boolean; error?: string }> {
  if (!isCaseStatus(status)) return { ok: false, error: "Unknown status." }
  return safe<{ ok: boolean; error?: string }>(
    async () => {
      const db = await getDb()
      const c = await ownedCase(db, user, id)
      if (!c) return { ok: false, error: "Case not found." }
      if (c.status === status) return { ok: true }
      const nowClosed = !isOpenStatus(status)
      const wasClosed = !isOpenStatus(c.status)
      await db
        .update(brandCases)
        .set({
          status,
          closedAt: nowClosed ? new Date() : null,
          closedById: nowClosed ? user.id : null,
        })
        .where(eq(brandCases.id, id))
      const kind = nowClosed && !wasClosed ? "closed" : !nowClosed && wasClosed ? "reopened" : "status"
      await logEvent(db, id, kind, {
        authorId: user.id,
        authorName: actorName(user),
        meta: { from: c.status, to: status },
      })
      return { ok: true }
    },
    { ok: false, error: NOT_READY }
  )
}

export async function setSeverity(user: Actor, id: string, severity: string): Promise<{ ok: boolean; error?: string }> {
  if (!isCaseSeverity(severity)) return { ok: false, error: "Unknown severity." }
  return safe<{ ok: boolean; error?: string }>(
    async () => {
      const db = await getDb()
      const c = await ownedCase(db, user, id)
      if (!c) return { ok: false, error: "Case not found." }
      if (c.severity === severity) return { ok: true }
      await db.update(brandCases).set({ severity }).where(eq(brandCases.id, id))
      await logEvent(db, id, "severity", {
        authorId: user.id,
        authorName: actorName(user),
        meta: { from: c.severity, to: severity },
      })
      return { ok: true }
    },
    { ok: false, error: NOT_READY }
  )
}

export async function assign(user: Actor, id: string, toSelf: boolean): Promise<{ ok: boolean; error?: string }> {
  return safe<{ ok: boolean; error?: string }>(
    async () => {
      const db = await getDb()
      const c = await ownedCase(db, user, id)
      if (!c) return { ok: false, error: "Case not found." }
      const name = actorName(user)
      await db
        .update(brandCases)
        .set({ assigneeId: toSelf ? user.id : null, assigneeName: toSelf ? name : null })
        .where(eq(brandCases.id, id))
      await logEvent(db, id, "assign", {
        authorId: user.id,
        authorName: name,
        meta: toSelf ? { to: name ?? "self" } : { to: null },
      })
      return { ok: true }
    },
    { ok: false, error: NOT_READY }
  )
}

// ── Bell notifications ───────────────────────────────────────────────────────

export type CaseNotification = {
  id: string
  caseId: string
  seq: number
  title: string
  domain: string | null
  severity: string
  source: string
  read: boolean
  createdAt: string
}

export async function caseNotificationsView(user: Actor, limit = 12): Promise<{ items: CaseNotification[]; unread: number }> {
  return safe(
    async () => {
      const db = await getDb()
      const rows = await db
        .select()
        .from(brandCaseNotifications)
        .where(eq(brandCaseNotifications.userId, user.id))
        .orderBy(desc(brandCaseNotifications.createdAt))
        .limit(limit)
      const [{ count } = { count: 0 }] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(brandCaseNotifications)
        .where(and(eq(brandCaseNotifications.userId, user.id), isNull(brandCaseNotifications.readAt)))
      return {
        unread: Number(count) || 0,
        items: rows.map((r) => ({
          id: r.id,
          caseId: r.caseId,
          seq: r.seq,
          title: r.title,
          domain: r.domain,
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

export async function markCasesRead(userId: string): Promise<void> {
  await safe(async () => {
    const db = await getDb()
    await db
      .update(brandCaseNotifications)
      .set({ readAt: new Date() })
      .where(and(eq(brandCaseNotifications.userId, userId), isNull(brandCaseNotifications.readAt)))
  }, undefined)
}

export type { CaseSeverity }
