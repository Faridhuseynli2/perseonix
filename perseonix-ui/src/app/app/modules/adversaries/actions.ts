"use server"

import { revalidatePath } from "next/cache"
import { requireModule } from "@/lib/auth/dal"
import { ADVERSARIES_MODULE_KEY } from "@/lib/adversaries/meta"
import { follow, markAllRead, markRead, unfollow, watchStoreReady } from "@/lib/adversaries/watch"

const NOT_READY = "Restart the dev server once to finish setting up the watchlist, then try again."

export type WatchResult = { ok: boolean; watching?: boolean; error?: string }

/** Start following a threat actor and seed its alerts. `name` supports OSINT-only actors. */
export async function followActor(slug: string, name?: string): Promise<WatchResult> {
  const { user } = await requireModule(ADVERSARIES_MODULE_KEY)
  if (!(await watchStoreReady())) return { ok: false, error: NOT_READY }

  const ok = await follow(user.id, slug, name)
  if (!ok) return { ok: false, error: "Unknown threat actor." }
  // Revalidate the whole app segment so the header bell reflects the new alerts.
  revalidatePath("/app", "layout")
  return { ok: true, watching: true }
}

export async function unfollowActor(slug: string): Promise<WatchResult> {
  const { user } = await requireModule(ADVERSARIES_MODULE_KEY)
  if (!(await watchStoreReady())) return { ok: false, error: NOT_READY }

  await unfollow(user.id, slug)
  revalidatePath("/app", "layout")
  return { ok: true, watching: false }
}

/** Form-friendly unfollow (returns void) for the watchlist page. */
export async function unwatchActorForm(slug: string): Promise<void> {
  await unfollowActor(slug)
}

export async function markAllNotificationsRead(): Promise<void> {
  const { user } = await requireModule(ADVERSARIES_MODULE_KEY)
  if (!(await watchStoreReady())) return
  await markAllRead(user.id)
  revalidatePath("/app", "layout")
}

export async function markNotificationsRead(ids: string[]): Promise<void> {
  const { user } = await requireModule(ADVERSARIES_MODULE_KEY)
  if (!(await watchStoreReady())) return
  await markRead(user.id, ids)
  revalidatePath("/app", "layout")
}
