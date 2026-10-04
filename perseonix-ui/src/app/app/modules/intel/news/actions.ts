"use server"

import { revalidatePath } from "next/cache"
import { requireModule } from "@/lib/auth/dal"
import { INTEL_MODULE_KEY } from "@/lib/intel/connectors"
import { deleteSavedFilter, saveFilter } from "@/lib/intel/news"

const PATH = "/app/modules/intel/news"

export async function saveNewsFilterAction(name: string, query: Record<string, string[] | string>): Promise<void> {
  const { user } = await requireModule(INTEL_MODULE_KEY)
  const clean = name.trim()
  if (!clean) return
  await saveFilter(user.id, clean, query)
  revalidatePath(PATH)
}

export async function deleteNewsFilterAction(id: string): Promise<void> {
  const { user } = await requireModule(INTEL_MODULE_KEY)
  await deleteSavedFilter(user.id, id)
  revalidatePath(PATH)
}
