import "server-only"
import { sql } from "drizzle-orm"
import { getDb } from "@/db"
import { ransomwareGroups, ransomwareIngestions, ransomwareVictims } from "@/db/schema"
import { resolveGroupSlug } from "@/lib/adversaries/data"
import { fetchGroups, fetchRecentVictims, type RawGroup } from "@/lib/ransomware/sources/ransomware-live"

export type IngestResult = {
  ok: boolean
  groupsSeen: number
  victimsSeen: number
  victimsAdded: number
  message?: string
}

/**
 * Pull the latest roster + recent victim claims and upsert them. Idempotent:
 * groups are updated in place, victims deduped on (group, victim, discovered),
 * so re-running only adds genuinely new claims. Records an ingestion log row.
 */
export async function runIngestion(opts: {
  apiKey?: string | null
  ranById?: string | null
} = {}): Promise<IngestResult> {
  const db = await getDb()
  const source = opts.apiKey ? "ransomware.live (pro)" : "ransomware.live (free)"

  try {
    // Different endpoints — safe to call back-to-back (limit is per-endpoint).
    const [groups, victims] = await Promise.all([
      fetchGroups({ apiKey: opts.apiKey }),
      fetchRecentVictims({ apiKey: opts.apiKey }),
    ])

    // Make sure every group referenced by a victim has a row, even if it's not
    // in the roster response.
    const groupBySlug = new Map<string, RawGroup>()
    for (const g of groups) groupBySlug.set(g.slug, g)
    for (const v of victims) {
      if (!groupBySlug.has(v.groupSlug)) {
        groupBySlug.set(v.groupSlug, {
          slug: v.groupSlug,
          name: v.groupName,
          aliases: [],
          description: null,
          tools: [],
          sourceRef: null,
          addedDate: null,
        })
      }
    }

    for (const g of groupBySlug.values()) {
      await db
        .insert(ransomwareGroups)
        .values({
          slug: g.slug,
          name: g.name,
          aliases: g.aliases,
          description: g.description,
          tools: g.tools,
          firstSeen: g.addedDate,
          adversarySlug: resolveGroupSlug(g.name) ?? null,
          sourceRef: g.sourceRef,
        })
        .onConflictDoUpdate({
          target: ransomwareGroups.slug,
          set: {
            name: g.name,
            aliases: g.aliases,
            description: g.description,
            tools: g.tools,
            adversarySlug: resolveGroupSlug(g.name) ?? null,
            sourceRef: g.sourceRef,
            updatedAt: new Date(),
          },
        })
    }

    // Count before/after so "victimsAdded" reflects genuinely new rows, while
    // still upserting so existing rows get enriched with fresh detail fields.
    const [{ before = 0 } = {}] = await db
      .select({ before: sql<number>`cast(count(*) as int)` })
      .from(ransomwareVictims)

    for (const v of victims) {
      const values = {
        groupSlug: v.groupSlug,
        groupName: v.groupName,
        victim: v.victim,
        country: v.country,
        sector: v.sector,
        domain: v.domain,
        description: v.description,
        ransom: v.ransom,
        dataSize: v.dataSize,
        pressSource: v.pressSource,
        pressSummary: v.pressSummary,
        infostealer: v.infostealer,
        attackDate: v.attackDate,
        sourceRef: v.sourceRef,
      }
      await db
        .insert(ransomwareVictims)
        .values({ ...values, discovered: v.discovered })
        .onConflictDoUpdate({
          target: [ransomwareVictims.groupSlug, ransomwareVictims.victim, ransomwareVictims.discovered],
          set: values,
        })
    }

    const [{ after = 0 } = {}] = await db
      .select({ after: sql<number>`cast(count(*) as int)` })
      .from(ransomwareVictims)
    const victimsAdded = Math.max(0, after - before)

    // Refresh per-group victim count and last-seen from the stored claims.
    await db.execute(sql`
      UPDATE ${ransomwareGroups} AS g SET
        victim_count = COALESCE(v.cnt, 0),
        last_seen = v.last_seen
      FROM (
        SELECT group_slug, COUNT(*)::int AS cnt, MAX(discovered) AS last_seen
        FROM ${ransomwareVictims} GROUP BY group_slug
      ) AS v
      WHERE g.slug = v.group_slug
    `)

    await db.insert(ransomwareIngestions).values({
      source,
      groupsSeen: groupBySlug.size,
      victimsSeen: victims.length,
      victimsAdded,
      status: "ok",
      ranById: opts.ranById ?? null,
    })

    return { ok: true, groupsSeen: groupBySlug.size, victimsSeen: victims.length, victimsAdded }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ingestion failed."
    await db
      .insert(ransomwareIngestions)
      .values({ source, status: "error", message, ranById: opts.ranById ?? null })
      .catch(() => {})
    return { ok: false, groupsSeen: 0, victimsSeen: 0, victimsAdded: 0, message }
  }
}
