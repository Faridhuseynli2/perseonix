"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { getDb } from "@/db"
import { users } from "@/db/schema"
import { requireUser } from "@/lib/auth/dal"
import { isTheme } from "@/lib/theme"
import { isValidTimeZone } from "@/lib/timezone"

export async function updateTheme(theme: string): Promise<{ error?: string }> {
  const user = await requireUser()
  if (!isTheme(theme)) return { error: "That theme isn't available." }

  const db = await getDb()
  await db.update(users).set({ theme }).where(eq(users.id, user.id))
  revalidatePath("/app", "layout")
  return {}
}

export async function updateTimezone(tz: string): Promise<{ error?: string }> {
  const user = await requireUser()
  if (!isValidTimeZone(tz)) return { error: "That timezone isn't recognised." }

  const db = await getDb()
  try {
    await db.update(users).set({ timezone: tz }).where(eq(users.id, user.id))
  } catch (error) {
    // Column may not exist yet if the server hasn't restarted to apply migration
    // 0023 — don't surface a crash; the setting takes effect after the restart.
    const e = error as { code?: string; cause?: { code?: string } }
    if (e?.code === "42703" || e?.cause?.code === "42703") {
      return { error: "Timezone will be available after the next server restart." }
    }
    throw error
  }
  revalidatePath("/app", "layout")
  return {}
}
