import "server-only"
import { and, count, desc, eq, gte } from "drizzle-orm"
import { notFound } from "next/navigation"
import { z } from "zod"
import { getDb } from "@/db"
import { investigations, organizations, users } from "@/db/schema"
import type { CurrentUser } from "@/lib/auth/dal"
import type { Target } from "@/lib/investigate/target"
import type { InvestigationReport } from "@/lib/investigate/types"

/** Investigations per customer company per UTC day. Administrators are unlimited. */
export const DAILY_LIMIT = Math.max(1, Number(process.env.INVESTIGATION_DAILY_LIMIT) || 200)
const PER_MINUTE_LIMIT = 10

// Customer users share their company's investigations; administrators see all.
function visibleTo(user: CurrentUser) {
  if (user.role === "admin") return undefined
  return user.organizationId
    ? eq(investigations.organizationId, user.organizationId)
    : eq(investigations.userId, user.id)
}

function quotaScope(user: CurrentUser) {
  return user.role !== "admin" && user.organizationId
    ? eq(investigations.organizationId, user.organizationId)
    : eq(investigations.userId, user.id)
}

function startOfUtcDay() {
  const date = new Date()
  date.setUTCHours(0, 0, 0, 0)
  return date
}

export async function getInvestigationUsage(user: CurrentUser) {
  const db = await getDb()
  const [row] = await db
    .select({ total: count() })
    .from(investigations)
    .where(and(quotaScope(user), gte(investigations.createdAt, startOfUtcDay())))
  return { used: row?.total ?? 0, limit: user.role === "admin" ? null : DAILY_LIMIT }
}

/** Returns a message explaining why the user can't investigate right now, or null. */
export async function checkInvestigationLimits(user: CurrentUser) {
  const db = await getDb()
  const [recent] = await db
    .select({ total: count() })
    .from(investigations)
    .where(
      and(
        eq(investigations.userId, user.id),
        gte(investigations.createdAt, new Date(Date.now() - 60_000))
      )
    )
  if ((recent?.total ?? 0) >= PER_MINUTE_LIMIT) {
    return "You're investigating very quickly. Wait a minute and try again."
  }

  const usage = await getInvestigationUsage(user)
  if (usage.limit !== null && usage.used >= usage.limit) {
    return `Your company has used all ${usage.limit} investigations for today. The limit resets at 00:00 UTC.`
  }
  return null
}

export async function saveInvestigation(user: CurrentUser, target: Target, report: InvestigationReport) {
  const db = await getDb()
  const findings = report.signals.filter((signal) => signal.severity !== "info")
  const [row] = await db
    .insert(investigations)
    .values({
      organizationId: user.role === "admin" ? null : user.organizationId,
      userId: user.id,
      input: target.input.slice(0, 2048),
      query: target.value,
      kind: target.kind,
      verdict: report.verdict,
      signalCount: findings.length,
      topSignal: (findings[0] ?? report.signals[0])?.title ?? null,
      report,
      durationMs: report.tookMs,
    })
    .returning({ id: investigations.id })
  return row.id
}

export async function listRecentInvestigations(user: CurrentUser, limit = 25) {
  const db = await getDb()
  return db
    .select({
      id: investigations.id,
      query: investigations.query,
      kind: investigations.kind,
      verdict: investigations.verdict,
      signalCount: investigations.signalCount,
      topSignal: investigations.topSignal,
      createdAt: investigations.createdAt,
      userName: users.name,
      organizationName: organizations.name,
    })
    .from(investigations)
    .leftJoin(users, eq(users.id, investigations.userId))
    .leftJoin(organizations, eq(organizations.id, investigations.organizationId))
    .where(visibleTo(user))
    .orderBy(desc(investigations.createdAt))
    .limit(limit)
}

/** An investigation the user may see; anything else is a 404. */
export async function getInvestigation(user: CurrentUser, id: string) {
  if (!z.uuid().safeParse(id).success) notFound()
  const db = await getDb()
  const [row] = await db
    .select({
      id: investigations.id,
      input: investigations.input,
      query: investigations.query,
      kind: investigations.kind,
      verdict: investigations.verdict,
      report: investigations.report,
      durationMs: investigations.durationMs,
      createdAt: investigations.createdAt,
      userName: users.name,
      organizationName: organizations.name,
    })
    .from(investigations)
    .leftJoin(users, eq(users.id, investigations.userId))
    .leftJoin(organizations, eq(organizations.id, investigations.organizationId))
    .where(and(eq(investigations.id, id), visibleTo(user)))
    .limit(1)
  if (!row) notFound()
  return row
}
