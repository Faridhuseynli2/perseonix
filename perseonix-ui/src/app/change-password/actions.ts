"use server"

import { eq } from "drizzle-orm"
import { redirect } from "next/navigation"
import { z } from "zod"
import { getDb } from "@/db"
import { users } from "@/db/schema"
import type { ActionState } from "@/lib/action-state"
import { recordAudit } from "@/lib/audit"
import { requireUser } from "@/lib/auth/dal"
import { hashPassword, verifyPassword } from "@/lib/auth/password"
import {
  beginLoginAttempt,
  getLoginLockout,
  lockoutMessage,
  markLoginAttemptSucceeded,
} from "@/lib/auth/rate-limit"
import { deleteUserSessions } from "@/lib/auth/session"
import { getRequestMeta } from "@/lib/request"
import { formText, passwordField } from "@/lib/validation"

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: passwordField,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "Choose a password different from your current one.",
    path: ["newPassword"],
  })

export async function changePassword(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser()

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formText(formData, "currentPassword"),
    newPassword: formText(formData, "newPassword"),
    confirmPassword: formText(formData, "confirmPassword"),
  })
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors }
  }

  // Guessing the current password from a stolen session is throttled like sign-in.
  const meta = await getRequestMeta()
  const attemptId = await beginLoginAttempt(user.email, meta.ipAddress)
  const lockedUntil = await getLoginLockout(user.email, meta.ipAddress)
  if (lockedUntil) return { error: lockoutMessage(lockedUntil) }

  const db = await getDb()
  const [row] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)
  if (!row || !(await verifyPassword(parsed.data.currentPassword, row.passwordHash))) {
    return { fieldErrors: { currentPassword: ["Current password is incorrect."] } }
  }
  await markLoginAttemptSucceeded(attemptId)

  await db
    .update(users)
    .set({
      passwordHash: await hashPassword(parsed.data.newPassword),
      mustChangePassword: false,
      passwordChangedAt: new Date(),
    })
    .where(eq(users.id, user.id))

  // Keep this device signed in; end every other session.
  await deleteUserSessions(user.id, { exceptSessionId: user.sessionId })
  await recordAudit({
    actor: user,
    action: "auth.password_changed",
    target: { type: "user", id: user.id, label: user.email },
  })

  redirect("/app")
}
