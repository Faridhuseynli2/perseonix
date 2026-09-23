import "server-only"
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm"
import { getDb } from "@/db"
import { brandNotifications, brandScans, phishingDetections, protectedAssets } from "@/db/schema"
import { autoOpenCasesForDetections } from "@/lib/brand/cases"
import { isValidDomain, normalizeDomain, registrableDomain } from "@/lib/brand/domain"
import { ownerOf } from "@/lib/brand/owner"
import type { Actor, Owner } from "@/lib/brand/owner"
import { runScan } from "@/lib/brand/scan"
import { saveBrandCapture } from "@/lib/brand/screenshot-store"
import { capturePage, sandboxEnabled } from "@/lib/investigate/sandbox/capture"

// Persistence + orchestration for Brand Protection. Owner is the organization
// (company-wide) or the user (org-less admins). Degrades to empty before the
// tables exist (until a dev-server restart).

export { ownerOf }
export type { Actor, Owner }

export type AssetRow = {
  id: string
  domain: string
  enabled: boolean
  lastScanAt: string | null
  scanIntervalHours: number | null
  detectionCount: number
  newCount: number
}
export type DetectionRow = {
  id: string
  assetId: string
  assetDomain: string
  domain: string
  kind: string
  source: string
  resolves: boolean
  ips: string[]
  hasMx: boolean
  hasCert: boolean
  punycode: boolean
  keyword: string | null
  similarity: number
  score: number
  severity: string
  issuer: string | null
  status: string
  firstSeen: string | null
  screenshotAt: string | null
  offlineAt: string | null
  detectedAt: string
}

function isSchemaNotReady(error: unknown): boolean {
  for (let cur: unknown = error, d = 0; cur && d < 6; d++) {
    if (typeof cur !== "object") break
    const r = cur as { code?: unknown; message?: unknown; cause?: unknown }
    if (r.code === "42P01" || r.code === "42703") return true
    if (typeof r.message === "string" && /protected_assets|phishing_detections|brand_/.test(r.message) && /does not exist|no such/.test(r.message)) return true
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

export async function storeReady(): Promise<boolean> {
  return safe(async () => {
    const db = await getDb()
    await db.select({ id: protectedAssets.id }).from(protectedAssets).limit(1)
    return true
  }, false)
}

export async function listAssets(user: Actor): Promise<AssetRow[]> {
  return safe(
    async () => {
      const db = await getDb()
      const { ownerId } = ownerOf(user)
      const assets = await db
        .select()
        .from(protectedAssets)
        .where(eq(protectedAssets.ownerId, ownerId))
        .orderBy(desc(protectedAssets.createdAt))
      if (!assets.length) return []

      const counts = await db
        .select({
          assetId: phishingDetections.assetId,
          total: sql<number>`cast(count(*) as int)`,
          fresh: sql<number>`cast(count(*) filter (where ${phishingDetections.status} = 'new') as int)`,
        })
        .from(phishingDetections)
        .where(inArray(phishingDetections.assetId, assets.map((a) => a.id)))
        .groupBy(phishingDetections.assetId)
      const byId = new Map(counts.map((c) => [c.assetId, c]))

      return assets.map((a) => ({
        id: a.id,
        domain: a.domain,
        enabled: a.enabled,
        lastScanAt: a.lastScanAt ? a.lastScanAt.toISOString() : null,
        scanIntervalHours: a.scanIntervalHours,
        detectionCount: byId.get(a.id)?.total ?? 0,
        newCount: byId.get(a.id)?.fresh ?? 0,
      }))
    },
    []
  )
}

export async function addAsset(user: Actor, input: string): Promise<{ ok: boolean; error?: string }> {
  const domain = registrableDomain(normalizeDomain(input))
  if (!isValidDomain(domain)) return { ok: false, error: "Enter a valid domain, e.g. yourcompany.com" }
  return safe<{ ok: boolean; error?: string }>(
    async () => {
      const db = await getDb()
      const { ownerId, ownerType } = ownerOf(user)
      await db
        .insert(protectedAssets)
        .values({ ownerId, ownerType, createdById: user.id, domain })
        .onConflictDoNothing()
      return { ok: true }
    },
    { ok: false, error: "Restart the dev server once to enable Brand Protection, then retry." }
  )
}

export async function removeAsset(user: Actor, id: string): Promise<void> {
  await safe(async () => {
    const db = await getDb()
    const { ownerId } = ownerOf(user)
    await db.delete(protectedAssets).where(and(eq(protectedAssets.id, id), eq(protectedAssets.ownerId, ownerId)))
  }, undefined)
}

async function ownsAsset(db: Awaited<ReturnType<typeof getDb>>, user: Actor, id: string) {
  const { ownerId } = ownerOf(user)
  const [row] = await db.select().from(protectedAssets).where(and(eq(protectedAssets.id, id), eq(protectedAssets.ownerId, ownerId))).limit(1)
  return row ?? null
}

export type ScanOutcome = { ok: boolean; findings: number; newFindings: number; error?: string }

/** Run a scan for one asset and persist the detections. */
export async function scanAsset(user: Actor, assetId: string): Promise<ScanOutcome> {
  const db = await getDb()
  const asset = await ownsAsset(db, user, assetId).catch(() => null)
  if (!asset) return { ok: false, findings: 0, newFindings: 0, error: "Asset not found." }

  try {
    const result = await runScan(asset.domain)
    let newFindings = 0
    const newDetectionIds: string[] = []

    for (const f of result.findings) {
      const inserted = await db
        .insert(phishingDetections)
        .values({
          assetId,
          domain: f.domain,
          kind: f.kind,
          source: f.source,
          resolves: f.resolves,
          ips: f.ips,
          hasMx: f.hasMx,
          hasCert: f.hasCert,
          punycode: f.punycode,
          keyword: f.keyword,
          similarity: Math.round(f.similarity * 100),
          score: f.score,
          severity: f.severity,
          issuer: f.issuer,
          firstSeen: f.firstSeen ? new Date(f.firstSeen) : null,
        })
        .onConflictDoNothing()
        .returning({ id: phishingDetections.id })
      if (inserted.length) {
        newFindings++
        if (f.severity !== "low") newDetectionIds.push(inserted[0].id)
      } else {
        // Refresh evidence + keep the analyst's triage status.
        await db
          .update(phishingDetections)
          .set({
            resolves: f.resolves, ips: f.ips, hasMx: f.hasMx, hasCert: f.hasCert,
            score: f.score, severity: f.severity, keyword: f.keyword, lastSeenAt: new Date(),
          })
          .where(and(eq(phishingDetections.assetId, assetId), eq(phishingDetections.domain, f.domain)))
      }
    }

    // Takedown detection: previously-live lookalikes no longer found are marked offline.
    const foundSet = new Set(result.findings.map((f) => f.domain))
    const prevActive = await db
      .select({ id: phishingDetections.id, domain: phishingDetections.domain })
      .from(phishingDetections)
      .where(and(eq(phishingDetections.assetId, assetId), eq(phishingDetections.resolves, true), isNull(phishingDetections.offlineAt)))
    const offlineIds = prevActive.filter((p) => !foundSet.has(p.domain)).map((p) => p.id)
    if (offlineIds.length) {
      await db
        .update(phishingDetections)
        .set({ resolves: false, offlineAt: new Date() })
        .where(inArray(phishingDetections.id, offlineIds))
    }

    const nextScanAt = asset.scanIntervalHours ? new Date(Date.now() + asset.scanIntervalHours * 3_600_000) : null
    await db.update(protectedAssets).set({ lastScanAt: new Date(), nextScanAt }).where(eq(protectedAssets.id, assetId))
    await db.insert(brandScans).values({
      assetId,
      screened: result.stats.screened,
      resolving: result.stats.resolving,
      certs: result.stats.certs,
      findings: result.findings.length,
      newFindings,
      status: "ok",
      ranById: user.id,
    })

    // Alert the acting user about new high/medium detections.
    if (newDetectionIds.length) {
      const rows = await db.select().from(phishingDetections).where(inArray(phishingDetections.id, newDetectionIds))
      await db
        .insert(brandNotifications)
        .values(rows.map((r) => ({ userId: user.id, detectionId: r.id, domain: r.domain, assetDomain: asset.domain, severity: r.severity })))
        .onConflictDoNothing()

      // Auto-open incident cases for the highest-risk (high) new lookalikes, and
      // alert the team. Best-effort — a case failure must never fail the scan.
      await autoOpenCasesForDetections(
        db,
        user,
        { id: assetId, domain: asset.domain },
        rows.map((r) => ({ id: r.id, domain: r.domain, severity: r.severity, score: r.score })),
      ).catch(() => 0)
    }

    return { ok: true, findings: result.findings.length, newFindings }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scan failed."
    await db.insert(brandScans).values({ assetId, status: "error", message, ranById: user.id }).catch(() => {})
    return { ok: false, findings: 0, newFindings: 0, error: message }
  }
}

export async function listDetections(
  user: Actor,
  filter: { status?: string; severity?: string } = {}
): Promise<DetectionRow[]> {
  return safe(
    async () => {
      const db = await getDb()
      const { ownerId } = ownerOf(user)
      const clauses = [eq(protectedAssets.ownerId, ownerId)]
      if (filter.status) clauses.push(eq(phishingDetections.status, filter.status))
      if (filter.severity) clauses.push(eq(phishingDetections.severity, filter.severity))
      const rows = await db
        .select({ d: phishingDetections, assetDomain: protectedAssets.domain })
        .from(phishingDetections)
        .innerJoin(protectedAssets, eq(protectedAssets.id, phishingDetections.assetId))
        .where(and(...clauses))
        .orderBy(desc(phishingDetections.score), desc(phishingDetections.detectedAt))
        .limit(300)
      return rows.map(({ d, assetDomain }) => ({
        id: d.id, assetId: d.assetId, assetDomain, domain: d.domain, kind: d.kind, source: d.source,
        resolves: d.resolves, ips: d.ips ?? [], hasMx: d.hasMx, hasCert: d.hasCert, punycode: d.punycode,
        keyword: d.keyword, similarity: d.similarity, score: d.score, severity: d.severity, issuer: d.issuer,
        status: d.status, firstSeen: d.firstSeen ? d.firstSeen.toISOString() : null,
        screenshotAt: d.screenshotAt ? d.screenshotAt.toISOString() : null,
        offlineAt: d.offlineAt ? d.offlineAt.toISOString() : null,
        detectedAt: d.detectedAt.toISOString(),
      }))
    },
    []
  )
}

export async function getDetection(user: Actor, id: string): Promise<DetectionRow | null> {
  return safe(async () => {
    const db = await getDb()
    const { ownerId } = ownerOf(user)
    const [row] = await db
      .select({ d: phishingDetections, assetDomain: protectedAssets.domain })
      .from(phishingDetections)
      .innerJoin(protectedAssets, eq(protectedAssets.id, phishingDetections.assetId))
      .where(and(eq(phishingDetections.id, id), eq(protectedAssets.ownerId, ownerId)))
      .limit(1)
    if (!row) return null
    const { d, assetDomain } = row
    return {
      id: d.id, assetId: d.assetId, assetDomain, domain: d.domain, kind: d.kind, source: d.source,
      resolves: d.resolves, ips: d.ips ?? [], hasMx: d.hasMx, hasCert: d.hasCert, punycode: d.punycode,
      keyword: d.keyword, similarity: d.similarity, score: d.score, severity: d.severity, issuer: d.issuer,
      status: d.status, firstSeen: d.firstSeen ? d.firstSeen.toISOString() : null,
      screenshotAt: d.screenshotAt ? d.screenshotAt.toISOString() : null,
      offlineAt: d.offlineAt ? d.offlineAt.toISOString() : null,
      detectedAt: d.detectedAt.toISOString(),
    }
  }, null)
}

export async function brandStats(user: Actor) {
  return safe(
    async () => {
      const db = await getDb()
      const { ownerId } = ownerOf(user)
      const [row = { total: 0, high: 0, fresh: 0, malicious: 0 }] = await db
        .select({
          total: sql<number>`cast(count(*) as int)`,
          high: sql<number>`cast(count(*) filter (where ${phishingDetections.severity} = 'high') as int)`,
          fresh: sql<number>`cast(count(*) filter (where ${phishingDetections.status} = 'new') as int)`,
          malicious: sql<number>`cast(count(*) filter (where ${phishingDetections.status} = 'malicious') as int)`,
        })
        .from(phishingDetections)
        .innerJoin(protectedAssets, eq(protectedAssets.id, phishingDetections.assetId))
        .where(eq(protectedAssets.ownerId, ownerId))
      return row
    },
    { total: 0, high: 0, fresh: 0, malicious: 0 }
  )
}

export async function setDetectionStatus(user: Actor, id: string, status: string): Promise<void> {
  await safe(async () => {
    const db = await getDb()
    const { ownerId } = ownerOf(user)
    // Ensure the detection belongs to one of the user's assets.
    const [row] = await db
      .select({ id: phishingDetections.id })
      .from(phishingDetections)
      .innerJoin(protectedAssets, eq(protectedAssets.id, phishingDetections.assetId))
      .where(and(eq(phishingDetections.id, id), eq(protectedAssets.ownerId, ownerId)))
      .limit(1)
    if (!row) return
    await db.update(phishingDetections).set({ status }).where(eq(phishingDetections.id, id))
  }, undefined)
}

// ---- Bell notifications ----

export type BrandNotification = {
  id: string
  detectionId: string
  domain: string
  assetDomain: string
  severity: string
  read: boolean
  createdAt: string
}

/** Lazily create notifications for the user for new high/medium detections on
 *  their assets, then return the recent set + unread count. */
export async function notificationsView(user: Actor, limit = 12): Promise<{ items: BrandNotification[]; unread: number }> {
  return safe(
    async () => {
      const db = await getDb()
      const { ownerId } = ownerOf(user)
      const assets = await db.select({ id: protectedAssets.id, domain: protectedAssets.domain }).from(protectedAssets).where(eq(protectedAssets.ownerId, ownerId))
      if (assets.length) {
        const assetIds = assets.map((a) => a.id)
        const domainById = new Map(assets.map((a) => [a.id, a.domain]))
        const dets = await db
          .select({ id: phishingDetections.id, assetId: phishingDetections.assetId, domain: phishingDetections.domain, severity: phishingDetections.severity })
          .from(phishingDetections)
          .where(and(inArray(phishingDetections.assetId, assetIds), inArray(phishingDetections.severity, ["high", "medium"])))
          .orderBy(desc(phishingDetections.detectedAt))
          .limit(200)
        if (dets.length) {
          const existing = await db.select({ detectionId: brandNotifications.detectionId }).from(brandNotifications).where(eq(brandNotifications.userId, user.id))
          const seen = new Set(existing.map((e) => e.detectionId))
          const fresh = dets.filter((d) => !seen.has(d.id))
          if (fresh.length) {
            await db
              .insert(brandNotifications)
              .values(fresh.map((d) => ({ userId: user.id, detectionId: d.id, domain: d.domain, assetDomain: domainById.get(d.assetId) ?? "", severity: d.severity })))
              .onConflictDoNothing()
          }
        }
      }

      const rows = await db.select().from(brandNotifications).where(eq(brandNotifications.userId, user.id)).orderBy(desc(brandNotifications.createdAt)).limit(limit)
      const [{ count } = { count: 0 }] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(brandNotifications)
        .where(and(eq(brandNotifications.userId, user.id), isNull(brandNotifications.readAt)))
      return {
        unread: Number(count) || 0,
        items: rows.map((r) => ({ id: r.id, detectionId: r.detectionId, domain: r.domain, assetDomain: r.assetDomain, severity: r.severity, read: r.readAt !== null, createdAt: r.createdAt.toISOString() })),
      }
    },
    { items: [], unread: 0 }
  )
}

export async function markAllRead(userId: string): Promise<void> {
  await safe(async () => {
    const db = await getDb()
    await db.update(brandNotifications).set({ readAt: new Date() }).where(and(eq(brandNotifications.userId, userId), isNull(brandNotifications.readAt)))
  }, undefined)
}

// ---- Scheduling ----

/** Set (or clear, with null) an asset's automatic rescan cadence in hours. */
export async function setSchedule(user: Actor, assetId: string, hours: number | null): Promise<void> {
  await safe(async () => {
    const db = await getDb()
    const asset = await ownsAsset(db, user, assetId)
    if (!asset) return
    const nextScanAt = hours ? new Date(Date.now() + hours * 3_600_000) : null
    await db.update(protectedAssets).set({ scanIntervalHours: hours, nextScanAt }).where(eq(protectedAssets.id, assetId))
  }, undefined)
}

/** Run scans for the owner's assets whose scheduled time has passed. Bounded so a
 *  single trigger never runs long; the rest run on the next tick. */
export async function runDueScans(user: Actor, max = 1): Promise<{ ran: number; newFindings: number }> {
  return safe(
    async () => {
      const db = await getDb()
      const { ownerId } = ownerOf(user)
      const now = Date.now()
      const rows = await db
        .select()
        .from(protectedAssets)
        .where(and(eq(protectedAssets.ownerId, ownerId), eq(protectedAssets.enabled, true)))
      const dueIds = rows
        .filter((a) => a.scanIntervalHours && a.nextScanAt && a.nextScanAt.getTime() <= now)
        .slice(0, max)
        .map((a) => a.id)
      let ran = 0
      let newFindings = 0
      for (const id of dueIds) {
        const res = await scanAsset(user, id)
        if (res.ok) {
          ran++
          newFindings += res.newFindings
        }
      }
      return { ran, newFindings }
    },
    { ran: 0, newFindings: 0 }
  )
}

// ---- Screenshot ----

export async function captureScreenshot(user: Actor, detectionId: string): Promise<{ ok: boolean; error?: string }> {
  if (!sandboxEnabled()) return { ok: false, error: "Sandbox capture is disabled." }
  const detection = await getDetection(user, detectionId)
  if (!detection) return { ok: false, error: "Detection not found." }
  try {
    const result = await capturePage([`https://${detection.domain}`, `http://${detection.domain}`])
    if (!result.screenshot) return { ok: false, error: "The site could not be rendered." }
    await saveBrandCapture(detectionId, result.screenshot)
    const db = await getDb()
    await db.update(phishingDetections).set({ screenshotAt: new Date() }).where(eq(phishingDetections.id, detectionId))
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Capture failed." }
  }
}
