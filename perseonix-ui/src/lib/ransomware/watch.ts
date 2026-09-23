import "server-only"
import { and, desc, eq, gte, isNull, sql, type SQL } from "drizzle-orm"
import { getDb } from "@/db"
import { ransomwareNotifications, ransomwareVictims, ransomwareWatches } from "@/db/schema"
import { countryName, sectorLabel } from "@/lib/ransomware/meta"

// Watchlist + notifications for the Ransomware Tracker. A user saves a slice of
// the feed (any of country / sector / group); new victims matching it raise a
// bell alert. Degrades to empty before the tables exist (until a dev restart).

export type WatchInput = { country?: string; sector?: string; group?: string; groupName?: string }

export type RansomwareWatch = {
  id: string
  country: string | null
  sector: string | null
  groupSlug: string | null
  groupName: string | null
  label: string
  createdAt: string
  matchCount: number
  unread: number
}

export type RansomwareNotification = {
  id: string
  victimId: string
  victim: string
  groupName: string
  country: string | null
  sector: string | null
  watchLabel: string | null
  read: boolean
  createdAt: string
}

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

function normalize(input: WatchInput) {
  return {
    country: input.country?.trim().toUpperCase() || null,
    sector: input.sector?.trim() || null,
    groupSlug: input.group?.trim() || null,
    groupName: input.group ? input.groupName?.trim() || input.group : null,
  }
}

function labelFor(w: { country: string | null; sector: string | null; groupName: string | null }): string {
  const parts = [
    w.groupName,
    w.sector ? sectorLabel(w.sector) : null,
    w.country ? countryName(w.country) : null,
  ].filter(Boolean)
  return parts.length ? parts.join(" · ") : "All ransomware activity"
}

// The victim clauses a watch matches on (excluding the created-at cutoff).
function matchClauses(w: { country: string | null; sector: string | null; groupSlug: string | null }): SQL[] {
  const c: SQL[] = []
  if (w.country) c.push(eq(ransomwareVictims.country, w.country))
  if (w.sector) c.push(eq(ransomwareVictims.sector, w.sector))
  if (w.groupSlug) c.push(eq(ransomwareVictims.groupSlug, w.groupSlug))
  return c
}

export async function watchExists(userId: string, input: WatchInput): Promise<boolean> {
  return safe(async () => {
    const n = normalize(input)
    const db = await getDb()
    const [row] = await db
      .select({ id: ransomwareWatches.id })
      .from(ransomwareWatches)
      .where(
        and(
          eq(ransomwareWatches.userId, userId),
          n.country ? eq(ransomwareWatches.country, n.country) : isNull(ransomwareWatches.country),
          n.sector ? eq(ransomwareWatches.sector, n.sector) : isNull(ransomwareWatches.sector),
          n.groupSlug ? eq(ransomwareWatches.groupSlug, n.groupSlug) : isNull(ransomwareWatches.groupSlug)
        )
      )
      .limit(1)
    return Boolean(row)
  }, false)
}

export async function addWatch(userId: string, input: WatchInput): Promise<boolean> {
  const n = normalize(input)
  if (!n.country && !n.sector && !n.groupSlug) return false
  return safe(async () => {
    if (await watchExists(userId, input)) return true
    const db = await getDb()
    await db.insert(ransomwareWatches).values({
      userId,
      country: n.country,
      sector: n.sector,
      groupSlug: n.groupSlug,
      groupName: n.groupName,
      label: labelFor(n),
    })
    return true
  }, false)
}

export async function removeWatch(userId: string, id: string): Promise<void> {
  await safe(async () => {
    const db = await getDb()
    await db.delete(ransomwareWatches).where(and(eq(ransomwareWatches.userId, userId), eq(ransomwareWatches.id, id)))
  }, undefined)
}

/** Remove a watch identified by its dimensions (used by the toggle buttons). */
export async function removeWatchByFacets(userId: string, input: WatchInput): Promise<void> {
  const n = normalize(input)
  await safe(async () => {
    const db = await getDb()
    await db
      .delete(ransomwareWatches)
      .where(
        and(
          eq(ransomwareWatches.userId, userId),
          n.country ? eq(ransomwareWatches.country, n.country) : isNull(ransomwareWatches.country),
          n.sector ? eq(ransomwareWatches.sector, n.sector) : isNull(ransomwareWatches.sector),
          n.groupSlug ? eq(ransomwareWatches.groupSlug, n.groupSlug) : isNull(ransomwareWatches.groupSlug)
        )
      )
  }, undefined)
}

/** Create notifications for new victims matching the user's watches. Bounded. */
async function reconcile(userId: string): Promise<void> {
  const db = await getDb()
  const watches = await db.select().from(ransomwareWatches).where(eq(ransomwareWatches.userId, userId))
  if (!watches.length) return

  const existing = await db
    .select({ victimId: ransomwareNotifications.victimId })
    .from(ransomwareNotifications)
    .where(eq(ransomwareNotifications.userId, userId))
  const seen = new Set(existing.map((r) => r.victimId))

  const fresh = new Map<string, typeof ransomwareNotifications.$inferInsert>()
  for (const w of watches) {
    const rows = await db
      .select({
        id: ransomwareVictims.id,
        victim: ransomwareVictims.victim,
        groupName: ransomwareVictims.groupName,
        country: ransomwareVictims.country,
        sector: ransomwareVictims.sector,
        discovered: ransomwareVictims.discovered,
      })
      .from(ransomwareVictims)
      .where(and(...matchClauses(w), gte(ransomwareVictims.discovered, w.createdAt)))
      .orderBy(desc(ransomwareVictims.discovered))
      .limit(50)
    for (const r of rows) {
      if (seen.has(r.id) || fresh.has(r.id)) continue
      fresh.set(r.id, {
        userId,
        victimId: r.id,
        victim: r.victim,
        groupName: r.groupName,
        country: r.country,
        sector: r.sector,
        watchLabel: w.label,
        discovered: r.discovered,
      })
    }
  }
  if (fresh.size) {
    await db.insert(ransomwareNotifications).values([...fresh.values()]).onConflictDoNothing()
  }
}

export async function notificationsView(
  userId: string,
  limit = 12
): Promise<{ items: RansomwareNotification[]; unread: number }> {
  return safe(
    async () => {
      await reconcile(userId)
      const db = await getDb()
      const rows = await db
        .select()
        .from(ransomwareNotifications)
        .where(eq(ransomwareNotifications.userId, userId))
        .orderBy(desc(ransomwareNotifications.createdAt))
        .limit(limit)
      const [{ count } = { count: 0 }] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(ransomwareNotifications)
        .where(and(eq(ransomwareNotifications.userId, userId), isNull(ransomwareNotifications.readAt)))
      return {
        unread: Number(count) || 0,
        items: rows.map((r) => ({
          id: r.id,
          victimId: r.victimId,
          victim: r.victim,
          groupName: r.groupName,
          country: r.country,
          sector: r.sector,
          watchLabel: r.watchLabel,
          read: r.readAt !== null,
          createdAt: r.createdAt.toISOString(),
        })),
      }
    },
    { items: [], unread: 0 }
  )
}

export async function markAllRead(userId: string): Promise<void> {
  await safe(async () => {
    const db = await getDb()
    await db
      .update(ransomwareNotifications)
      .set({ readAt: new Date() })
      .where(and(eq(ransomwareNotifications.userId, userId), isNull(ransomwareNotifications.readAt)))
  }, undefined)
}

export async function listWatches(userId: string): Promise<RansomwareWatch[]> {
  return safe(
    async () => {
      const db = await getDb()
      const watches = await db
        .select()
        .from(ransomwareWatches)
        .where(eq(ransomwareWatches.userId, userId))
        .orderBy(desc(ransomwareWatches.createdAt))
      if (!watches.length) return []

      const unreadRows = await db
        .select({ label: ransomwareNotifications.watchLabel, count: sql<number>`cast(count(*) as int)` })
        .from(ransomwareNotifications)
        .where(and(eq(ransomwareNotifications.userId, userId), isNull(ransomwareNotifications.readAt)))
        .groupBy(ransomwareNotifications.watchLabel)
      const unreadByLabel = new Map(unreadRows.map((r) => [r.label ?? "", Number(r.count) || 0]))

      const out: RansomwareWatch[] = []
      for (const w of watches) {
        const [{ n } = { n: 0 }] = await db
          .select({ n: sql<number>`cast(count(*) as int)` })
          .from(ransomwareVictims)
          .where(and(...matchClauses(w)))
        out.push({
          id: w.id,
          country: w.country,
          sector: w.sector,
          groupSlug: w.groupSlug,
          groupName: w.groupName,
          label: w.label,
          createdAt: w.createdAt.toISOString(),
          matchCount: n ?? 0,
          unread: unreadByLabel.get(w.label) ?? 0,
        })
      }
      return out
    },
    []
  )
}
