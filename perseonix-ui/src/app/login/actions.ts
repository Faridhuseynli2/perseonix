"use server"

import { eq } from "drizzle-orm"
import { redirect } from "next/navigation"
import { getDb } from "@/db"
import { organizations, users } from "@/db/schema"
import { recordAudit } from "@/lib/audit"
import { getDummyHash, verifyPassword } from "@/lib/auth/password"
import {
  beginLoginAttempt,
  getLoginLockout,
  lockoutMessage,
  markLoginAttemptSucceeded,
} from "@/lib/auth/rate-limit"
import { createSession } from "@/lib/auth/session"
import { evaluationEnded, formatDate } from "@/lib/customers"
import { getRequestMeta } from "@/lib/request"
import { formText } from "@/lib/validation"

export type LoginState = { error?: string; email?: string }

/** Only portal paths are allowed as post-login destinations. */
function safeNextPath(value: string) {
  const isPortalPath = value === "/app" || value.startsWith("/app/")
  if (!isPortalPath || value.includes("\\")) return null
  return value
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = formText(formData, "email").trim().toLowerCase()
  const password = formText(formData, "password")
  const next = safeNextPath(formText(formData, "next"))

  if (!email || !password) {
    return { error: "Enter your email and password.", email }
  }

  const meta = await getRequestMeta()
  const attemptId = await beginLoginAttempt(email, meta.ipAddress)
  const lockedUntil = await getLoginLockout(email, meta.ipAddress)
  if (lockedUntil) return { error: lockoutMessage(lockedUntil), email }

  const db = await getDb()
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)

  // Always run a full hash comparison so timing doesn't reveal which emails exist.
  const valid = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()))

  if (!user || !valid || user.status !== "active") {
    return { error: "Invalid email or password.", email }
  }
  await markLoginAttemptSucceeded(attemptId)

  // Only revealed after a correct password, so it can't be used to probe accounts.
  if (user.role === "user" && user.organizationId) {
    const [company] = await db
      .select({ plan: organizations.plan, endsAt: organizations.endsAt })
      .from(organizations)
      .where(eq(organizations.id, user.organizationId))
      .limit(1)
    if (company && evaluationEnded(company.plan, company.endsAt)) {
      await recordAudit({
        actor: user,
        action: "auth.login_blocked",
        target: { type: "user", id: user.id, label: user.email },
        metadata: { reason: "evaluation_ended", endsAt: company.endsAt },
      })
      return {
        error: `Your company's Perseonix Corvael evaluation ended on ${formatDate(company.endsAt)}. Contact your Perseonix account team to extend access.`,
        email,
      }
    }
  }

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id))
  await createSession(user.id, meta)
  await recordAudit({
    actor: user,
    action: "auth.login",
    target: { type: "user", id: user.id, label: user.email },
  })

  redirect(user.mustChangePassword ? "/change-password" : (next ?? "/app"))
}
