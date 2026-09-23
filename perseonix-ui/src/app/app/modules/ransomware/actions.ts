"use server"

import { revalidatePath } from "next/cache"
import { recordAudit } from "@/lib/audit"
import { requireAdmin, requireModule } from "@/lib/auth/dal"
import { connectorActive, connectorKey, loadConnectorRuntime } from "@/lib/connectors/service"
import { runIngestion, type IngestResult } from "@/lib/ransomware/ingest"
import { storeReady } from "@/lib/ransomware/data"
import { RANSOMWARE_MODULE_KEY, RANSOMWARE_SOURCE_ID } from "@/lib/ransomware/meta"
import { addWatch, removeWatch, removeWatchByFacets, type WatchInput } from "@/lib/ransomware/watch"

const NOT_READY =
  "Restart the dev server once to create the ransomware tables, then run the refresh."

export type RefreshResult = IngestResult

/**
 * Manual data refresh. Admin-only (it rewrites shared data). Pulls the source
 * configured in Connectors; the free tier needs no key. In the demo this is the
 * trigger the operator clicks; a scheduled job replaces it in production.
 */
export async function refreshRansomware(): Promise<RefreshResult> {
  const admin = await requireAdmin()

  if (!(await storeReady())) {
    return { ok: false, groupsSeen: 0, victimsSeen: 0, victimsAdded: 0, message: NOT_READY }
  }

  await loadConnectorRuntime()
  if (!connectorActive(RANSOMWARE_SOURCE_ID)) {
    return {
      ok: false,
      groupsSeen: 0,
      victimsSeen: 0,
      victimsAdded: 0,
      message: "The Ransomware.live connector is disabled. Enable it in admin → Connectors.",
    }
  }

  const result = await runIngestion({
    apiKey: connectorKey(RANSOMWARE_SOURCE_ID),
    ranById: admin.id,
  })

  await recordAudit({
    actor: admin,
    action: result.ok ? "ransomware.refresh" : "ransomware.refresh_failed",
    target: { type: "module", id: "ransomware", label: "Ransomware Tracker" },
    metadata: {
      groupsSeen: result.groupsSeen,
      victimsSeen: result.victimsSeen,
      victimsAdded: result.victimsAdded,
      ...(result.message ? { message: result.message } : {}),
    },
  })

  revalidatePath("/app/modules/ransomware")
  revalidatePath("/app/modules/ransomware/victims")
  revalidatePath("/app/modules/ransomware/groups")
  return result
}

export type WatchToggleResult = { ok: boolean; watching: boolean }

/** Save the current slice (country/sector/group) as a watch. */
export async function addRansomwareWatch(input: WatchInput): Promise<WatchToggleResult> {
  const { user } = await requireModule(RANSOMWARE_MODULE_KEY)
  const ok = await addWatch(user.id, input)
  revalidatePath("/app", "layout")
  revalidatePath("/app/modules/ransomware/watchlist")
  return { ok, watching: ok }
}

export async function removeRansomwareWatchByFacets(input: WatchInput): Promise<WatchToggleResult> {
  const { user } = await requireModule(RANSOMWARE_MODULE_KEY)
  await removeWatchByFacets(user.id, input)
  revalidatePath("/app", "layout")
  revalidatePath("/app/modules/ransomware/watchlist")
  return { ok: true, watching: false }
}

/** Form-friendly unwatch by id (returns void) for the watchlist page. */
export async function removeRansomwareWatchForm(id: string): Promise<void> {
  const { user } = await requireModule(RANSOMWARE_MODULE_KEY)
  await removeWatch(user.id, id)
  revalidatePath("/app", "layout")
  revalidatePath("/app/modules/ransomware/watchlist")
}
