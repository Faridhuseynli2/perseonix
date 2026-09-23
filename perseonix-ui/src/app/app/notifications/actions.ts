"use server"

import { revalidatePath } from "next/cache"
import { markAllRead as adversaryMarkAll } from "@/lib/adversaries/watch"
import { requireUser } from "@/lib/auth/dal"
import { markCasesRead } from "@/lib/brand/cases"
import { markAllRead as brandMarkAll } from "@/lib/brand/store"
import { markAllRead as ransomwareMarkAll } from "@/lib/ransomware/watch"

/** Mark every module's alerts read for the current user (bell opened). */
export async function markAllNotificationsRead(): Promise<void> {
  const user = await requireUser()
  await Promise.all([
    adversaryMarkAll(user.id),
    ransomwareMarkAll(user.id),
    brandMarkAll(user.id),
    markCasesRead(user.id),
  ])
  revalidatePath("/app", "layout")
}
