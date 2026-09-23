import "server-only"
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm"
import { getDb } from "@/db"
import { adversaryNotifications, watchlist } from "@/db/schema"
import { getActorCampaigns, getGroup, type Campaign } from "@/lib/adversaries/data"
import { articlesMentioning } from "@/lib/intel/news"

/** Synthetic watch key for an actor tracked only via OSINT news (not in the curated APT DB). */
export function osintSlug(name: string): string {
  return "osint:" + name.trim().toLowerCase()
}
/** The names to match this watched actor against in the news graph (curated name + aliases, or the OSINT name). */
function watchNames(slug: string, fallbackName: string): string[] {
  const group = getGroup(slug)
  if (group) return [group.name, ...group.aliasNames]
  return [fallbackName]
}

// Watchlist + notifications for the Adversary Intelligence module. A user follows
// an actor; we seed alerts from that actor's known public reporting and surface
// any new reporting afterwards. All reads degrade gracefully before the tables
// exist (first run after the migration, until a dev-server restart) so the app
// never crashes — mirroring the connectors store.

export type WatchNotification = {
  id: string
  groupSlug: string
  groupName: string
  title: string
  vendor: string | null
  year: number | null
  url: string | null
  read: boolean
  createdAt: string
}

export type WatchedActor = {
  slug: string
  name: string
  since: string
  campaignCount: number
  lastYear: number | null
  unread: number
  image?: string
}

/**
 * True when a query failed only because a watch table isn't created yet. Drizzle
 * wraps the driver error, so we walk the cause chain and also check the Postgres
 * "undefined_table" code (42P01).
 */
function isMissingTable(error: unknown): boolean {
  const messages: string[] = []
  for (let current: unknown = error, depth = 0; current && depth < 6; depth++) {
    if (typeof current !== "object") break
    const record = current as { message?: unknown; code?: unknown; cause?: unknown }
    if (record.code === "42P01") return true
    if (typeof record.message === "string") messages.push(record.message)
    current = record.cause
  }
  const combined = messages.join(" ")
  return (
    /watchlist|adversary_notifications/i.test(combined) &&
    /does not exist|no such table/i.test(combined)
  )
}

/** False until the watch tables exist (i.e. after the first restart post-migration). */
export async function watchStoreReady(): Promise<boolean> {
  try {
    const db = await getDb()
    await db.select({ userId: watchlist.userId }).from(watchlist).limit(1)
    return true
  } catch (error) {
    if (isMissingTable(error)) return false
    throw error
  }
}

/** Slugs the user currently follows. */
export async function watchedSlugs(userId: string): Promise<Set<string>> {
  try {
    const db = await getDb()
    const rows = await db
      .select({ slug: watchlist.groupSlug })
      .from(watchlist)
      .where(eq(watchlist.userId, userId))
    return new Set(rows.map((r) => r.slug))
  } catch (error) {
    if (isMissingTable(error)) return new Set()
    throw error
  }
}

export async function isWatching(userId: string, slug: string): Promise<boolean> {
  try {
    const db = await getDb()
    const [row] = await db
      .select({ slug: watchlist.groupSlug })
      .from(watchlist)
      .where(and(eq(watchlist.userId, userId), eq(watchlist.groupSlug, slug)))
      .limit(1)
    return Boolean(row)
  } catch (error) {
    if (isMissingTable(error)) return false
    throw error
  }
}

// A campaign turned into a notification row. Latest-year reports arrive unread so
// following an actor immediately lights the bell with its most recent activity.
function campaignRow(userId: string, groupSlug: string, groupName: string, c: Campaign, read: boolean) {
  return {
    userId,
    groupSlug,
    groupName,
    refId: c.id,
    title: c.title,
    vendor: c.vendor,
    year: c.year,
    url: c.url,
    readAt: read ? new Date() : null,
  }
}

/**
 * Follow an actor and seed its alerts. Existing reporting is inserted so future
 * reconciliation only surfaces genuinely new reports; the most recent year stays
 * unread so the bell has something meaningful right away.
 */
// Turn a news article into a notification row (refId = news:<url> for idempotent dedupe).
function newsRow(
  userId: string,
  groupSlug: string,
  groupName: string,
  a: { url: string; title: string; source: string | null },
  read: boolean
) {
  return {
    userId,
    groupSlug,
    groupName,
    refId: `news:${a.url}`,
    title: a.title,
    vendor: a.source,
    year: null,
    url: a.url,
    readAt: read ? new Date() : null,
  }
}

/**
 * Follow an actor and seed its alerts. Works for curated APTs (seeds public reporting)
 * AND OSINT-only actors that only exist in the Threat News graph (name-keyed via osintSlug).
 * Existing items are seeded as read so following doesn't flood the bell; the most recent
 * signal stays unread. Future new news surfaces via reconcile().
 */
export async function follow(userId: string, slug: string, name?: string): Promise<boolean> {
  const group = getGroup(slug)
  const displayName = group?.name ?? name?.trim()
  if (!displayName) return false
  const db = await getDb()
  await db
    .insert(watchlist)
    .values({ userId, groupSlug: slug, groupName: displayName })
    .onConflictDoNothing()

  const campaigns = group ? getActorCampaigns(slug) : []
  const seeded: (ReturnType<typeof campaignRow> | ReturnType<typeof newsRow>)[] = []

  if (campaigns.length) {
    const latest = Math.max(...campaigns.map((c) => c.year))
    for (const c of campaigns) seeded.push(campaignRow(userId, slug, displayName, c, c.year !== latest))
  }

  // Seed from the news graph too. Newest article stays unread only if campaigns didn't provide an unread signal.
  const news = await articlesMentioning("actor", watchNames(slug, displayName), 25)
  const newestUrl = news[0]?.url
  for (const a of news) {
    const unread = !campaigns.length && a.url === newestUrl
    seeded.push(newsRow(userId, slug, displayName, a, !unread))
  }

  if (seeded.length) {
    await db.insert(adversaryNotifications).values(seeded).onConflictDoNothing()
  } else {
    await db
      .insert(adversaryNotifications)
      .values({
        userId,
        groupSlug: slug,
        groupName: displayName,
        refId: `welcome:${slug}`,
        title: `Now tracking ${displayName} — you'll be alerted on new activity.`,
      })
      .onConflictDoNothing()
  }
  return true
}

export async function unfollow(userId: string, slug: string): Promise<void> {
  const db = await getDb()
  await db
    .delete(watchlist)
    .where(and(eq(watchlist.userId, userId), eq(watchlist.groupSlug, slug)))
  // Drop that actor's alerts too, so the bell reflects only active follows.
  await db
    .delete(adversaryNotifications)
    .where(and(eq(adversaryNotifications.userId, userId), eq(adversaryNotifications.groupSlug, slug)))
}

/**
 * Insert alerts for any reporting on watched actors that has appeared since the
 * follow (e.g. after the campaign dataset is refreshed). Idempotent and cheap:
 * two selects, and an insert only when something is new.
 */
async function reconcile(userId: string, rows: { slug: string; name: string }[]): Promise<void> {
  if (!rows.length) return
  const db = await getDb()
  const existing = await db
    .select({ refId: adversaryNotifications.refId })
    .from(adversaryNotifications)
    .where(eq(adversaryNotifications.userId, userId))
  const seen = new Set(existing.map((r) => r.refId))

  const fresh: (ReturnType<typeof campaignRow> | ReturnType<typeof newsRow>)[] = []
  for (const { slug, name } of rows) {
    const group = getGroup(slug)
    // New curated public reporting.
    if (group) {
      for (const c of getActorCampaigns(slug)) {
        if (!seen.has(c.id)) fresh.push(campaignRow(userId, slug, group.name, c, false))
      }
    }
    // New Threat News mentions of this actor → unread alert (the cross-module signal).
    const news = await articlesMentioning("actor", watchNames(slug, name), 25)
    for (const a of news) {
      if (!seen.has(`news:${a.url}`)) fresh.push(newsRow(userId, slug, group?.name ?? name, a, false))
    }
  }
  if (fresh.length) {
    await db.insert(adversaryNotifications).values(fresh).onConflictDoNothing()
  }
}

/** Watched actors as {slug, name} — used to reconcile alerts (news needs the display name for OSINT actors). */
async function watchedRows(userId: string): Promise<{ slug: string; name: string }[]> {
  try {
    const db = await getDb()
    const rows = await db
      .select({ slug: watchlist.groupSlug, name: watchlist.groupName })
      .from(watchlist)
      .where(eq(watchlist.userId, userId))
    return rows
  } catch (error) {
    if (isMissingTable(error)) return []
    throw error
  }
}

/** Notifications for the bell, newest first, plus the unread count. */
export async function notificationsView(
  userId: string,
  limit = 12
): Promise<{ items: WatchNotification[]; unread: number }> {
  try {
    await reconcile(userId, await watchedRows(userId))

    const db = await getDb()
    const rows = await db
      .select()
      .from(adversaryNotifications)
      .where(eq(adversaryNotifications.userId, userId))
      .orderBy(desc(adversaryNotifications.createdAt))
      .limit(limit)

    const [{ count } = { count: 0 }] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(adversaryNotifications)
      .where(and(eq(adversaryNotifications.userId, userId), isNull(adversaryNotifications.readAt)))

    return {
      items: rows.map((r) => ({
        id: r.id,
        groupSlug: r.groupSlug,
        groupName: r.groupName,
        title: r.title,
        vendor: r.vendor,
        year: r.year,
        url: r.url,
        read: r.readAt !== null,
        createdAt: r.createdAt.toISOString(),
      })),
      unread: Number(count) || 0,
    }
  } catch (error) {
    if (isMissingTable(error)) return { items: [], unread: 0 }
    throw error
  }
}

export async function markAllRead(userId: string): Promise<void> {
  const db = await getDb()
  await db
    .update(adversaryNotifications)
    .set({ readAt: new Date() })
    .where(and(eq(adversaryNotifications.userId, userId), isNull(adversaryNotifications.readAt)))
}

export async function markRead(userId: string, ids: string[]): Promise<void> {
  if (!ids.length) return
  const db = await getDb()
  await db
    .update(adversaryNotifications)
    .set({ readAt: new Date() })
    .where(and(eq(adversaryNotifications.userId, userId), inArray(adversaryNotifications.id, ids)))
}

/** The user's followed actors with lightweight activity stats, newest follow first. */
export async function listWatchlist(userId: string): Promise<WatchedActor[]> {
  try {
    const db = await getDb()
    const rows = await db
      .select()
      .from(watchlist)
      .where(eq(watchlist.userId, userId))
      .orderBy(desc(watchlist.createdAt))

    if (!rows.length) return []

    // Unread counts per actor in one grouped query.
    const unreadRows = await db
      .select({
        slug: adversaryNotifications.groupSlug,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(adversaryNotifications)
      .where(and(eq(adversaryNotifications.userId, userId), isNull(adversaryNotifications.readAt)))
      .groupBy(adversaryNotifications.groupSlug)
    const unreadBySlug = new Map(unreadRows.map((r) => [r.slug, Number(r.count) || 0]))

    return rows.map((row) => {
      const campaigns = getActorCampaigns(row.groupSlug)
      const group = getGroup(row.groupSlug)
      return {
        slug: row.groupSlug,
        name: row.groupName,
        since: row.createdAt.toISOString(),
        campaignCount: campaigns.length,
        lastYear: campaigns.length ? Math.max(...campaigns.map((c) => c.year)) : null,
        unread: unreadBySlug.get(row.groupSlug) ?? 0,
        image: group?.image,
      }
    })
  } catch (error) {
    if (isMissingTable(error)) return []
    throw error
  }
}
