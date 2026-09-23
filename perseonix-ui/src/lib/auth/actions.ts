"use server"

import { redirect } from "next/navigation"
import { recordAudit } from "@/lib/audit"
import { getCurrentUser } from "@/lib/auth/dal"
import { deleteCurrentSession } from "@/lib/auth/session"

export async function logout() {
  const user = await getCurrentUser()
  await deleteCurrentSession()
  if (user) {
    await recordAudit({
      actor: user,
      action: "auth.logout",
      target: { type: "user", id: user.id, label: user.email },
    })
  }
  redirect("/login")
}
