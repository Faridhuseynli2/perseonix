import "server-only"
import { createHash, randomBytes } from "node:crypto"
import { and, eq, lt, ne } from "drizzle-orm"
import { cookies } from "next/headers"
import { getDb } from "@/db"
import { sessions } from "@/db/schema"
import { SESSION_COOKIE } from "@/lib/auth/constants"
import { isSecureRequest } from "@/lib/request"

const SESSION_TTL_MS = 12 * 60 * 60 * 1000

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

export async function createSession(
  userId: string,
  meta: { ipAddress: string | null; userAgent: string | null }
) {
  const token = randomBytes(32).toString("base64url")
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  const db = await getDb()

  // Opportunistically clear this user's expired sessions.
  await db
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, new Date())))
  await db.insert(sessions).values({
    id: hashSessionToken(token),
    userId,
    expiresAt,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  })

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: await isSecureRequest(),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  })
}

/** The database id of the current request's session, if it carries a cookie. */
export async function getSessionId() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  return token ? hashSessionToken(token) : null
}

export async function deleteCurrentSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (token) {
    const db = await getDb()
    await db.delete(sessions).where(eq(sessions.id, hashSessionToken(token)))
  }
  cookieStore.delete(SESSION_COOKIE)
}

export async function deleteUserSessions(
  userId: string,
  options: { exceptSessionId?: string } = {}
) {
  const db = await getDb()
  await db
    .delete(sessions)
    .where(
      options.exceptSessionId
        ? and(eq(sessions.userId, userId), ne(sessions.id, options.exceptSessionId))
        : eq(sessions.userId, userId)
    )
}
