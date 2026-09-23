import "server-only"
import { and, count, eq, gt, max } from "drizzle-orm"
import { getDb } from "@/db"
import { loginAttempts } from "@/db/schema"

const WINDOW_MS = 15 * 60 * 1000
const MAX_FAILURES_PER_ACCOUNT = 5
const MAX_FAILURES_PER_IP = 20

/**
 * Records an attempt as failed *before* the password is checked, so parallel
 * requests can't all slip past the lockout while scrypt runs. Mark it
 * successful with `markLoginAttemptSucceeded` once the password verifies.
 */
export async function beginLoginAttempt(email: string, ipAddress: string | null) {
  const db = await getDb()
  const [attempt] = await db
    .insert(loginAttempts)
    .values({ email, ipAddress, success: false })
    .returning({ id: loginAttempts.id })
  return attempt.id
}

export async function markLoginAttemptSucceeded(attemptId: string) {
  const db = await getDb()
  await db.update(loginAttempts).set({ success: true }).where(eq(loginAttempts.id, attemptId))
}

/**
 * Call after `beginLoginAttempt`: the pending attempt counts as a failure, so the
 * sixth attempt inside the window is the first one refused.
 * Returns when the caller may try again, or null if the attempt may proceed.
 */
export async function getLoginLockout(
  email: string,
  ipAddress: string | null
): Promise<Date | null> {
  const db = await getDb()
  const windowStart = new Date(Date.now() - WINDOW_MS)

  // A successful sign-in clears the account's failure streak.
  const [lastSuccess] = await db
    .select({ at: max(loginAttempts.createdAt) })
    .from(loginAttempts)
    .where(and(eq(loginAttempts.email, email), eq(loginAttempts.success, true)))
  const since =
    lastSuccess?.at && lastSuccess.at > windowStart ? lastSuccess.at : windowStart

  const [account] = await db
    .select({ failures: count(), latest: max(loginAttempts.createdAt) })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.email, email),
        eq(loginAttempts.success, false),
        gt(loginAttempts.createdAt, since)
      )
    )
  if (account && account.failures > MAX_FAILURES_PER_ACCOUNT && account.latest) {
    return new Date(account.latest.getTime() + WINDOW_MS)
  }

  if (ipAddress) {
    const [ip] = await db
      .select({ failures: count(), latest: max(loginAttempts.createdAt) })
      .from(loginAttempts)
      .where(
        and(
          eq(loginAttempts.ipAddress, ipAddress),
          eq(loginAttempts.success, false),
          gt(loginAttempts.createdAt, windowStart)
        )
      )
    if (ip && ip.failures > MAX_FAILURES_PER_IP && ip.latest) {
      return new Date(ip.latest.getTime() + WINDOW_MS)
    }
  }

  return null
}

export function lockoutMessage(lockedUntil: Date) {
  const minutes = Math.max(1, Math.ceil((lockedUntil.getTime() - Date.now()) / 60_000))
  return `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`
}
