import "server-only"
import { cache } from "react"
import { and, asc, eq } from "drizzle-orm"
import { notFound, redirect } from "next/navigation"
import { getDb } from "@/db"
import { modules, organizations, sessions, userModules, users } from "@/db/schema"
import type { UserRole } from "@/db/schema"
import { getSessionId } from "@/lib/auth/session"
import { evaluationEnded } from "@/lib/customers"
import type { Theme } from "@/lib/theme"

export type ModuleSummary = { key: string; name: string; description: string }

/** True when a query failed because a column doesn't exist yet (Postgres 42703) —
 *  i.e. a migration was added in code but the running DB hasn't applied it. */
function isUndefinedColumn(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const e = error as { code?: string; cause?: unknown; message?: string }
  if (e.code === "42703") return true
  if (typeof e.message === "string" && /column .* does not exist/i.test(e.message)) return true
  return isUndefinedColumn(e.cause)
}

export type CurrentUser = {
  id: string
  email: string
  name: string
  role: UserRole
  organizationId: string | null
  organizationName: string | null
  mustChangePassword: boolean
  theme: Theme
  timezone: string
  sessionId: string
  /** Modules this user may open. Administrators get every active module. */
  modules: ModuleSummary[]
}

type SessionResolution =
  | { status: "ok"; user: CurrentUser }
  | { status: "suspended" } // valid session, but the company's POC has ended
  | { status: "none" }

const resolveSession = cache(async (): Promise<SessionResolution> => {
  const sessionId = await getSessionId()
  if (!sessionId) return { status: "none" }

  const db = await getDb()
  const baseColumns = {
    id: users.id,
    email: users.email,
    name: users.name,
    role: users.role,
    status: users.status,
    mustChangePassword: users.mustChangePassword,
    theme: users.theme,
    organizationId: users.organizationId,
    organizationName: organizations.name,
    plan: organizations.plan,
    endsAt: organizations.endsAt,
    expiresAt: sessions.expiresAt,
  }
  const querySession = (withTimezone: boolean) =>
    db
      .select(withTimezone ? { ...baseColumns, timezone: users.timezone } : baseColumns)
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .leftJoin(organizations, eq(organizations.id, users.organizationId))
      .where(eq(sessions.id, sessionId))
      .limit(1)

  // `timezone` (migration 0023) may not exist yet on a server that hasn't been
  // restarted since it was added. Core auth can't degrade to empty, so tolerate
  // the missing column and fall back to UTC instead of hard-crashing every page.
  let row: Awaited<ReturnType<typeof querySession>>[number] & { timezone?: string }
  try {
    ;[row] = await querySession(true)
  } catch (error) {
    if (!isUndefinedColumn(error)) throw error
    ;[row] = await querySession(false)
  }
  const timezone = row?.timezone ?? "UTC"

  if (!row || row.status !== "active" || row.expiresAt.getTime() <= Date.now()) {
    return { status: "none" }
  }
  if (row.role === "user" && row.plan && evaluationEnded(row.plan, row.endsAt)) {
    return { status: "suspended" }
  }

  const columns = {
    key: modules.key,
    name: modules.name,
    description: modules.description,
  }
  const available =
    row.role === "admin"
      ? await db
          .select(columns)
          .from(modules)
          .where(eq(modules.isActive, true))
          .orderBy(asc(modules.sortOrder))
      : await db
          .select(columns)
          .from(userModules)
          .innerJoin(modules, eq(modules.key, userModules.moduleKey))
          .where(and(eq(userModules.userId, row.id), eq(modules.isActive, true)))
          .orderBy(asc(modules.sortOrder))

  return {
    status: "ok",
    user: {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      organizationId: row.organizationId,
      organizationName: row.organizationName,
      mustChangePassword: row.mustChangePassword,
      theme: row.theme,
      timezone,
      sessionId,
      modules: available,
    },
  }
})

/** The signed-in user, or null — including when their company's POC has ended. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const resolution = await resolveSession()
  return resolution.status === "ok" ? resolution.user : null
})

export async function requireUser(): Promise<CurrentUser> {
  const resolution = await resolveSession()
  if (resolution.status === "suspended") redirect("/login?reason=evaluation-ended")
  if (resolution.status !== "ok") redirect("/login")

  return resolution.user
}

/** Admin-only areas answer 404 to everyone else so their existence isn't disclosed. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser()
  if (user.role !== "admin") notFound()
  return user
}

export async function requireModule(moduleKey: string) {
  const user = await requireUser()
  const licensed = user.modules.find((m) => m.key === moduleKey)
  if (!licensed) notFound()
  return { user, module: licensed }
}
