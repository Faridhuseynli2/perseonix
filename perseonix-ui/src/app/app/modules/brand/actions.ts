"use server"

import { revalidatePath } from "next/cache"
import { recordAudit } from "@/lib/audit"
import { requireModule } from "@/lib/auth/dal"
import { BRAND_MODULE_KEY } from "@/lib/brand/meta"
import {
  addAsset,
  captureScreenshot,
  removeAsset,
  runDueScans,
  scanAsset,
  setDetectionStatus,
  setSchedule,
  storeReady,
  type ScanOutcome,
} from "@/lib/brand/store"

const NOT_READY = "Restart the dev server once to create the Brand Protection tables, then try again."

export type AddResult = { ok: boolean; error?: string }

export async function addProtectedDomain(input: string): Promise<AddResult> {
  const { user } = await requireModule(BRAND_MODULE_KEY)
  if (!(await storeReady())) return { ok: false, error: NOT_READY }
  const res = await addAsset(user, input)
  if (res.ok) {
    await recordAudit({
      actor: user,
      action: "brand.domain_added",
      target: { type: "brand_asset", id: input, label: input },
    })
    revalidatePath("/app/modules/brand")
  }
  return res
}

export async function removeProtectedDomain(id: string): Promise<void> {
  const { user } = await requireModule(BRAND_MODULE_KEY)
  await removeAsset(user, id)
  revalidatePath("/app/modules/brand")
  revalidatePath("/app", "layout")
}

export async function scanProtectedDomain(assetId: string): Promise<ScanOutcome> {
  const { user } = await requireModule(BRAND_MODULE_KEY)
  if (!(await storeReady())) return { ok: false, findings: 0, newFindings: 0, error: NOT_READY }
  const result = await scanAsset(user, assetId)
  await recordAudit({
    actor: user,
    action: result.ok ? "brand.scan" : "brand.scan_failed",
    target: { type: "brand_asset", id: assetId },
    metadata: { findings: result.findings, newFindings: result.newFindings, ...(result.error ? { error: result.error } : {}) },
  })
  revalidatePath("/app/modules/brand")
  revalidatePath("/app", "layout")
  return result
}

export async function setDetectionStatusAction(id: string, status: string): Promise<void> {
  const { user } = await requireModule(BRAND_MODULE_KEY)
  await setDetectionStatus(user, id, status)
  revalidatePath("/app/modules/brand")
  revalidatePath(`/app/modules/brand/detections/${id}`)
  revalidatePath("/app", "layout")
}

/** Set an asset's automatic rescan cadence (hours), or null for manual only. */
export async function setScheduleAction(assetId: string, hours: number | null): Promise<void> {
  const { user } = await requireModule(BRAND_MODULE_KEY)
  await setSchedule(user, assetId, hours)
  revalidatePath("/app/modules/brand")
}

/** Capture a sandbox screenshot of a suspected lookalike site. */
export async function captureScreenshotAction(detectionId: string): Promise<{ ok: boolean; error?: string }> {
  const { user } = await requireModule(BRAND_MODULE_KEY)
  const res = await captureScreenshot(user, detectionId)
  if (res.ok) revalidatePath(`/app/modules/brand/detections/${detectionId}`)
  return res
}

/** Background trigger for due scheduled scans (called by the dashboard poller). */
export async function runDueScansAction(): Promise<{ ran: number; newFindings: number }> {
  const { user } = await requireModule(BRAND_MODULE_KEY)
  if (!(await storeReady())) return { ran: 0, newFindings: 0 }
  const res = await runDueScans(user)
  if (res.ran > 0) {
    revalidatePath("/app/modules/brand")
    revalidatePath("/app", "layout")
  }
  return res
}
