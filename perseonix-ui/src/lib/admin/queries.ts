import "server-only"
import { and, asc, count, desc, eq, gt, ilike, inArray, or, sql } from "drizzle-orm"
import { notFound } from "next/navigation"
import { z } from "zod"
import { getDb } from "@/db"
import {
  auditLogs,
  loginAttempts,
  modules,
  organizations,
  sessions,
  userModules,
  users,
} from "@/db/schema"
import { requireAdmin } from "@/lib/auth/dal"
import { daysUntil, termStatus, todayIso } from "@/lib/customers"

// Every query here re-checks the admin role, so no caller can forget to.

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`)
}

async function modulesByUser(userIds: string[]) {
  const byUser = new Map<string, { key: string; name: string }[]>()
  if (userIds.length === 0) return byUser
  const db = await getDb()
  const grants = await db
    .select({ userId: userModules.userId, key: modules.key, name: modules.name })
    .from(userModules)
    .innerJoin(modules, eq(modules.key, userModules.moduleKey))
    .where(inArray(userModules.userId, userIds))
    .orderBy(asc(modules.sortOrder))
  for (const grant of grants) {
    const list = byUser.get(grant.userId) ?? []
    list.push({ key: grant.key, name: grant.name })
    byUser.set(grant.userId, list)
  }
  return byUser
}

/** Users with their company and plan; `query` matches name, email or company name. */
export async function listUsers(query = "") {
  await requireAdmin()
  const db = await getDb()
  const pattern = `%${escapeLike(query)}%`

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      organizationId: users.organizationId,
      organizationName: organizations.name,
      plan: organizations.plan,
      endsAt: organizations.endsAt,
      seatLimit: organizations.seatLimit,
    })
    .from(users)
    .leftJoin(organizations, eq(organizations.id, users.organizationId))
    .where(
      query
        ? or(
            ilike(users.name, pattern),
            ilike(users.email, pattern),
            ilike(organizations.name, pattern)
          )
        : undefined
    )
    .orderBy(asc(users.name))

  const grants = await modulesByUser(rows.map((row) => row.id))
  return rows.map((row) => ({ ...row, modules: grants.get(row.id) ?? [] }))
}

export async function getUserDetail(id: string) {
  await requireAdmin()
  if (!z.uuid().safeParse(id).success) notFound()
  const db = await getDb()

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      organizationId: users.organizationId,
      organizationName: organizations.name,
      organizationPlan: organizations.plan,
      organizationEndsAt: organizations.endsAt,
      mustChangePassword: users.mustChangePassword,
      lastLoginAt: users.lastLoginAt,
      passwordChangedAt: users.passwordChangedAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(organizations, eq(organizations.id, users.organizationId))
    .where(eq(users.id, id))
    .limit(1)
  if (!user) notFound()

  const grants = await db
    .select({ key: userModules.moduleKey })
    .from(userModules)
    .where(eq(userModules.userId, id))
  const [activeSessions] = await db
    .select({ total: count() })
    .from(sessions)
    .where(and(eq(sessions.userId, id), gt(sessions.expiresAt, new Date())))
  const activity = await db
    .select()
    .from(auditLogs)
    .where(or(eq(auditLogs.targetId, id), eq(auditLogs.actorId, id)))
    .orderBy(desc(auditLogs.createdAt))
    .limit(8)

  return {
    ...user,
    moduleKeys: grants.map((g) => g.key),
    activeSessions: activeSessions?.total ?? 0,
    activity,
  }
}

const customerColumns = {
  id: organizations.id,
  name: organizations.name,
  slug: organizations.slug,
  plan: organizations.plan,
  startsAt: organizations.startsAt,
  endsAt: organizations.endsAt,
  seatLimit: organizations.seatLimit,
  contactName: organizations.contactName,
  contactEmail: organizations.contactEmail,
  notes: organizations.notes,
  createdAt: organizations.createdAt,
}

export async function listCustomers() {
  await requireAdmin()
  const db = await getDb()
  return db
    .select({
      ...customerColumns,
      userCount: count(users.id),
      activeUsers: sql<number>`count(${users.id}) filter (where ${users.status} = 'active')`.mapWith(
        Number
      ),
    })
    .from(organizations)
    .leftJoin(users, eq(users.organizationId, organizations.id))
    .groupBy(organizations.id)
    .orderBy(asc(organizations.name))
}

/** Compact company list for pickers. */
export async function listCompanyOptions() {
  await requireAdmin()
  const db = await getDb()
  return db
    .select({
      id: organizations.id,
      name: organizations.name,
      plan: organizations.plan,
      endsAt: organizations.endsAt,
    })
    .from(organizations)
    .orderBy(asc(organizations.name))
}

export async function getCustomerDetail(id: string) {
  await requireAdmin()
  if (!z.uuid().safeParse(id).success) notFound()
  const db = await getDb()

  const [customer] = await db
    .select(customerColumns)
    .from(organizations)
    .where(eq(organizations.id, id))
    .limit(1)
  if (!customer) notFound()

  const members = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .where(eq(users.organizationId, id))
    .orderBy(asc(users.name))
  const grants = await modulesByUser(members.map((m) => m.id))

  const activity = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.targetId, id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(8)

  return {
    ...customer,
    users: members.map((m) => ({ ...m, modules: grants.get(m.id) ?? [] })),
    activity,
  }
}

export async function listModules() {
  await requireAdmin()
  const db = await getDb()
  return db
    .select({ key: modules.key, name: modules.name, description: modules.description })
    .from(modules)
    .where(eq(modules.isActive, true))
    .orderBy(asc(modules.sortOrder))
}

export async function listAuditLogs(limit = 200) {
  await requireAdmin()
  const db = await getDb()
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit)
}

export async function getAdminOverview() {
  await requireAdmin()
  const db = await getDb()
  const now = new Date()
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const total = async (query: Promise<{ total: number }[]>) => (await query)[0]?.total ?? 0

  const [allUsers, activeUsers, activeSessions, failedLogins24h] = await Promise.all([
    total(db.select({ total: count() }).from(users)),
    total(db.select({ total: count() }).from(users).where(eq(users.status, "active"))),
    total(db.select({ total: count() }).from(sessions).where(gt(sessions.expiresAt, now))),
    total(
      db
        .select({ total: count() })
        .from(loginAttempts)
        .where(and(eq(loginAttempts.success, false), gt(loginAttempts.createdAt, dayAgo)))
    ),
  ])

  const customers = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      plan: organizations.plan,
      endsAt: organizations.endsAt,
    })
    .from(organizations)

  const today = todayIso()
  const withTerm = customers.map((c) => ({ ...c, term: termStatus(c.plan, c.endsAt, today) }))
  // Anything ending within 30 days, plus terms that lapsed in the last 30.
  const deadlines = withTerm
    .filter((c) => c.endsAt && Math.abs(daysUntil(c.endsAt, today)) <= 30)
    .sort((a, b) => (a.endsAt ?? "").localeCompare(b.endsAt ?? ""))
    .slice(0, 8)

  const moduleUsage = await db
    .select({
      key: modules.key,
      name: modules.name,
      description: modules.description,
      grants: count(userModules.userId),
    })
    .from(modules)
    .leftJoin(userModules, eq(userModules.moduleKey, modules.key))
    .groupBy(modules.key)
    .orderBy(asc(modules.sortOrder))

  const recentAudit = await db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(8)

  return {
    users: allUsers,
    activeUsers,
    activeSessions,
    failedLogins24h,
    licensedCustomers: withTerm.filter((c) => c.plan === "licensed").length,
    activePocs: withTerm.filter((c) => c.plan === "poc" && c.term.tone !== "ended").length,
    endingSoon: withTerm.filter((c) => c.term.tone === "ending").length,
    deadlines,
    modules: moduleUsage,
    recentAudit,
  }
}
