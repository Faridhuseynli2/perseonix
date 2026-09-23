"use server"

import { revalidatePath } from "next/cache"
import { requireModule } from "@/lib/auth/dal"
import { ADVERSARIES_MODULE_KEY } from "@/lib/adversaries/meta"
import { clearProfile, saveProfile, type ProfileScope } from "@/lib/adversaries/relevance-store"
import { follow, watchStoreReady } from "@/lib/adversaries/watch"
import { COUNTRY_BY_CODE, SECTORS, type SectorKey } from "@/lib/intel/taxonomy"

const VALID_SECTORS = new Set(SECTORS.map((s) => s.key))

export type SaveResult = { ok: boolean; error?: string }

function clean(input: { sectors: string[]; country?: string }) {
  const sectors = [...new Set(input.sectors)].filter((s): s is SectorKey => VALID_SECTORS.has(s as SectorKey)).slice(0, 12)
  const country = input.country && COUNTRY_BY_CODE[input.country] ? input.country : undefined
  return { sectors, country }
}

export async function saveRelevanceProfile(input: {
  scope: ProfileScope
  sectors: string[]
  country?: string
}): Promise<SaveResult> {
  const { user } = await requireModule(ADVERSARIES_MODULE_KEY)
  const profile = clean(input)
  if (!profile.sectors.length && !profile.country) return { ok: false, error: "Pick at least one sector or a country." }

  if (input.scope === "org") {
    if (!user.organizationId) return { ok: false, error: "You're not part of an organization." }
    const ok = await saveProfile("org", user.organizationId, profile, user.id)
    if (!ok) return { ok: false, error: "Restart the dev server once to enable profiles, then retry." }
  } else {
    const ok = await saveProfile("user", user.id, profile, user.id)
    if (!ok) return { ok: false, error: "Restart the dev server once to enable profiles, then retry." }
  }
  revalidatePath("/app/modules/adversaries", "layout")
  return { ok: true }
}

export async function clearRelevanceProfile(scope: ProfileScope): Promise<void> {
  const { user } = await requireModule(ADVERSARIES_MODULE_KEY)
  const ownerId = scope === "org" ? user.organizationId : user.id
  if (!ownerId) return
  await clearProfile(scope, ownerId)
  revalidatePath("/app/modules/adversaries", "layout")
}

/** Bulk-follow the top relevant actors (from the landscape page). */
export async function watchTopActors(slugs: string[]): Promise<{ ok: boolean; added: number }> {
  const { user } = await requireModule(ADVERSARIES_MODULE_KEY)
  if (!(await watchStoreReady())) return { ok: false, added: 0 }
  let added = 0
  for (const slug of slugs.slice(0, 25)) {
    if (await follow(user.id, slug)) added++
  }
  revalidatePath("/app", "layout")
  return { ok: true, added }
}
