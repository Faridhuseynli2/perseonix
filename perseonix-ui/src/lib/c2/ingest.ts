import "server-only"
import { sql } from "drizzle-orm"
import { getDb } from "@/db"
import { c2Ingestions, c2Servers, c2Snapshots } from "@/db/schema"
import { loadConnectorRuntime } from "@/lib/connectors/service"
import { C2_CATALOG } from "@/lib/c2/catalog"
import { fetchFeodo, type C2Endpoint } from "@/lib/c2/sources/feodo"
import { shodanC2Enabled, shodanCount, shodanSearch } from "@/lib/c2/sources/shodan"

export type C2IngestResult = {
  ok: boolean
  endpointsSeen: number
  endpointsAdded: number
  softwareCounted: number
  message?: string
}

type Db = Awaited<ReturnType<typeof getDb>>

const today = () => new Date().toISOString().slice(0, 10)

/** How many credit-spending SEARCH queries to run per cycle (rotates hourly). */
const SEARCH_PER_RUN = 3

async function upsertEndpoints(db: Db, eps: C2Endpoint[]): Promise<number> {
  let added = 0
  for (const e of eps) {
    const first = e.firstSeen ? new Date(e.firstSeen) : new Date()
    const last = e.lastSeen ? new Date(e.lastSeen) : new Date()
    const res = await db
      .insert(c2Servers)
      .values({
        ip: e.ip,
        port: e.port,
        software: e.software,
        softwareName: e.softwareName,
        category: e.category,
        malware: e.malware,
        tags: e.tags,
        country: e.country,
        asn: e.asn,
        asName: e.asName,
        hostname: e.hostname,
        risk: e.risk,
        source: e.source,
        status: e.status,
        firstSeen: first,
        lastSeen: last,
      })
      .onConflictDoUpdate({
        target: [c2Servers.ip, c2Servers.port, c2Servers.software],
        set: {
          status: e.status,
          lastSeen: last,
          asName: e.asName,
          country: e.country,
          hostname: e.hostname,
          malware: e.malware,
          updatedAt: new Date(),
        },
      })
      .returning({ inserted: sql<boolean>`(xmax = 0)` })
    if (res[0]?.inserted) added++
  }
  return added
}

export async function runC2Ingestion(): Promise<C2IngestResult> {
  const db = await getDb()
  await loadConnectorRuntime()

  let endpointsSeen = 0
  let endpointsAdded = 0
  let softwareCounted = 0
  const notes: string[] = []

  // 1) Feodo — free botnet C2 (always).
  try {
    const feodo = await fetchFeodo()
    endpointsSeen += feodo.length
    endpointsAdded += await upsertEndpoints(db, feodo)
    notes.push(`feodo ${feodo.length}`)
  } catch (e) {
    notes.push(`feodo failed: ${e instanceof Error ? e.message : "error"}`)
  }

  // 2) Shodan COUNT for every catalog entry — free, powers the leaderboard/chart.
  if (shodanC2Enabled()) {
    const day = today()
    for (const def of C2_CATALOG) {
      try {
        const count = await shodanCount(def.query)
        if (count == null) continue
        softwareCounted++
        await db
          .insert(c2Snapshots)
          .values({ day, software: def.key, softwareName: def.name, category: def.category, tags: def.tags, count })
          .onConflictDoUpdate({
            target: [c2Snapshots.day, c2Snapshots.software],
            set: { count, softwareName: def.name, category: def.category, tags: def.tags },
          })
      } catch {
        /* skip a single query */
      }
    }

    // 3) Shodan SEARCH for a rotating subset — spends credits, so keep it small.
    const searchDefs = C2_CATALOG.filter((d) => d.search)
    if (searchDefs.length) {
      const hour = new Date().getUTCHours()
      const start = (hour * SEARCH_PER_RUN) % searchDefs.length
      const picks = Array.from({ length: Math.min(SEARCH_PER_RUN, searchDefs.length) }, (_, i) => searchDefs[(start + i) % searchDefs.length])
      for (const def of picks) {
        try {
          const eps = await shodanSearch(def)
          endpointsSeen += eps.length
          endpointsAdded += await upsertEndpoints(db, eps)
        } catch {
          /* skip a single search */
        }
      }
      notes.push(`shodan search: ${picks.map((p) => p.key).join(",")}`)
    }
  } else {
    notes.push("shodan disabled")
  }

  const ok = endpointsSeen > 0 || softwareCounted > 0
  await db.insert(c2Ingestions).values({
    status: ok ? "ok" : "error",
    endpointsSeen,
    endpointsAdded,
    softwareCounted,
    message: notes.join(" · ").slice(0, 500),
  })

  return { ok, endpointsSeen, endpointsAdded, softwareCounted, message: notes.join(" · ") }
}
