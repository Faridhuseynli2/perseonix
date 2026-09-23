import "server-only"
import { and, eq } from "drizzle-orm"
import { getDb } from "@/db"
import { relevanceProfiles } from "@/db/schema"
import type { RelevanceProfile } from "@/lib/adversaries/relevance"
import type { SectorKey } from "@/lib/intel/taxonomy"

// Persistence for relevance profiles. Degrades to "no profile" before the table
// exists (until a dev-server restart).

export type ProfileScope = "user" | "org"

export type ProfileSet = {
  personal: RelevanceProfile | null
  org: RelevanceProfile | null
  effective: RelevanceProfile | null
  effectiveSource: ProfileScope | "none"
}

function isMissingTable(error: unknown): boolean {
  for (let cur: unknown = error, d = 0; cur && d < 6; d++) {
    if (typeof cur !== "object") break
    const r = cur as { code?: unknown; message?: unknown; cause?: unknown }
    if (r.code === "42P01" || r.code === "42703") return true
    if (typeof r.message === "string" && /relevance_profiles/.test(r.message) && /does not exist|no such table/.test(r.message)) return true
    cur = r.cause
  }
  return false
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (isMissingTable(error)) return fallback
    throw error
  }
}

async function read(scope: ProfileScope, ownerId: string): Promise<RelevanceProfile | null> {
  const db = await getDb()
  const [row] = await db
    .select()
    .from(relevanceProfiles)
    .where(and(eq(relevanceProfiles.scope, scope), eq(relevanceProfiles.ownerId, ownerId)))
    .limit(1)
  if (!row) return null
  return { sectors: (row.sectors ?? []) as SectorKey[], country: row.country ?? undefined }
}

export async function getProfiles(user: { id: string; organizationId: string | null }): Promise<ProfileSet> {
  return safe(
    async () => {
      const personal = await read("user", user.id)
      const org = user.organizationId ? await read("org", user.organizationId) : null
      const effective = personal ?? org
      return {
        personal,
        org,
        effective,
        effectiveSource: personal ? "user" : org ? "org" : "none",
      }
    },
    { personal: null, org: null, effective: null, effectiveSource: "none" }
  )
}

export async function saveProfile(
  scope: ProfileScope,
  ownerId: string,
  profile: RelevanceProfile,
  updatedById: string
): Promise<boolean> {
  return safe(async () => {
    const db = await getDb()
    await db
      .insert(relevanceProfiles)
      .values({ scope, ownerId, sectors: profile.sectors, country: profile.country ?? null, updatedById })
      .onConflictDoUpdate({
        target: [relevanceProfiles.scope, relevanceProfiles.ownerId],
        set: { sectors: profile.sectors, country: profile.country ?? null, updatedById, updatedAt: new Date() },
      })
    return true
  }, false)
}

export async function clearProfile(scope: ProfileScope, ownerId: string): Promise<void> {
  await safe(async () => {
    const db = await getDb()
    await db
      .delete(relevanceProfiles)
      .where(and(eq(relevanceProfiles.scope, scope), eq(relevanceProfiles.ownerId, ownerId)))
  }, undefined)
}
