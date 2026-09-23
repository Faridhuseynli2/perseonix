"use server"

import { and, count, eq, inArray, ne } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { notFound, redirect } from "next/navigation"
import { z } from "zod"
import { getDb, type Database } from "@/db"
import { modules, organizations, userModules, users } from "@/db/schema"
import type { ActionState } from "@/lib/action-state"
import { recordAudit } from "@/lib/audit"
import { requireAdmin } from "@/lib/auth/dal"
import { generateTemporaryPassword, hashPassword } from "@/lib/auth/password"
import { deleteUserSessions } from "@/lib/auth/session"
import { isUniqueViolation } from "@/lib/db-errors"
import { getLoginUrl } from "@/lib/request"
import {
  createUserSchema,
  echoUserForm,
  formText,
  readUserForm,
  userProfileSchema,
} from "@/lib/validation"

const EMAIL_TAKEN = "A user with this email already exists."
const LAST_ADMIN = "At least one active administrator is required."
const COMPANY_REQUIRED = "Choose the customer company this user belongs to."

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0]

function parseUserId(userId: string) {
  if (!z.uuid().safeParse(userId).success) notFound()
  return userId
}

async function findUser(db: Database, id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  if (!user) notFound()
  return user
}

/**
 * Locks the active admin rows for the rest of the transaction and returns how
 * many there are, so two admins can't demote each other at the same moment.
 */
async function lockActiveAdmins(tx: Tx) {
  const rows = await tx
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.status, "active")))
    .for("update")
  return rows.length
}

async function checkReferences(
  db: Database,
  organizationId: string | null,
  moduleKeys: string[]
): Promise<ActionState["fieldErrors"] | null> {
  if (organizationId) {
    const [org] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1)
    if (!org) return { organizationId: ["This company no longer exists."] }
  }
  if (moduleKeys.length > 0) {
    const found = await db
      .select({ key: modules.key })
      .from(modules)
      .where(and(inArray(modules.key, moduleKeys), eq(modules.isActive, true)))
    if (found.length !== moduleKeys.length) {
      return { modules: ["One or more selected modules are unavailable."] }
    }
  }
  return null
}

/** Returns an error message when the company has no free seat for another active user. */
async function seatError(db: Database, organizationId: string, excludeUserId?: string) {
  const [org] = await db
    .select({ name: organizations.name, seatLimit: organizations.seatLimit })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1)
  if (!org?.seatLimit) return null

  const [row] = await db
    .select({ total: count() })
    .from(users)
    .where(
      and(
        eq(users.organizationId, organizationId),
        eq(users.status, "active"),
        excludeUserId ? ne(users.id, excludeUserId) : undefined
      )
    )
  if ((row?.total ?? 0) < org.seatLimit) return null
  return `${org.name} has used all ${org.seatLimit} seats. Raise its seat limit or disable another user first.`
}

export async function createUser(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin()
  const raw = readUserForm(formData)
  const values = echoUserForm(raw)

  const parsed = createUserSchema.safeParse(raw)
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values }
  }
  const input = parsed.data
  if (input.role === "user" && !input.organizationId) {
    return { fieldErrors: { organizationId: [COMPANY_REQUIRED] }, values }
  }

  const db = await getDb()
  const referenceErrors = await checkReferences(db, input.organizationId, input.modules)
  if (referenceErrors) return { fieldErrors: referenceErrors, values }
  if (input.role === "user" && input.organizationId) {
    const seats = await seatError(db, input.organizationId)
    if (seats) return { fieldErrors: { organizationId: [seats] }, values }
  }

  const password = generateTemporaryPassword()
  const passwordHash = await hashPassword(password)
  let userId: string
  try {
    userId = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(users)
        .values({
          name: input.name,
          email: input.email,
          role: input.role,
          organizationId: input.organizationId,
          passwordHash,
          mustChangePassword: input.mustChangePassword,
        })
        .returning({ id: users.id })
      if (input.modules.length > 0) {
        await tx.insert(userModules).values(
          input.modules.map((moduleKey) => ({
            userId: created.id,
            moduleKey,
            grantedById: admin.id,
          }))
        )
      }
      return created.id
    })
  } catch (error) {
    if (isUniqueViolation(error, "users_email_key")) {
      return { fieldErrors: { email: [EMAIL_TAKEN] }, values }
    }
    throw error
  }

  await recordAudit({
    actor: admin,
    action: "user.created",
    target: { type: "user", id: userId, label: input.email },
    metadata: {
      role: input.role,
      modules: input.modules,
      organizationId: input.organizationId,
    },
  })
  revalidatePath("/app/admin", "layout")
  return {
    success: "User created.",
    created: { id: userId, label: input.name },
    credentials: {
      name: input.name,
      email: input.email,
      password,
      loginUrl: await getLoginUrl(),
      mustChangePassword: input.mustChangePassword,
    },
  }
}

export async function updateUser(
  userId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin()
  const id = parseUserId(userId)
  const raw = readUserForm(formData)
  const values = echoUserForm(raw)

  const parsed = userProfileSchema.safeParse(raw)
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values }
  }
  const input = parsed.data
  if (input.role === "user" && !input.organizationId) {
    return { fieldErrors: { organizationId: [COMPANY_REQUIRED] }, values }
  }

  const db = await getDb()
  const target = await findUser(db, id)

  if (target.id === admin.id && input.role !== "admin") {
    return { error: "You can't remove your own administrator role.", values }
  }

  const referenceErrors = await checkReferences(db, input.organizationId, input.modules)
  if (referenceErrors) return { fieldErrors: referenceErrors, values }

  const takesNewSeat =
    input.role === "user" &&
    target.status === "active" &&
    input.organizationId !== null &&
    (input.organizationId !== target.organizationId || target.role !== "user")
  if (takesNewSeat && input.organizationId) {
    const seats = await seatError(db, input.organizationId, id)
    if (seats) return { fieldErrors: { organizationId: [seats] }, values }
  }

  let result: { granted: string[]; revoked: string[] } | { error: string }
  try {
    result = await db.transaction(async (tx) => {
      const demotingAdmin =
        target.role === "admin" && input.role !== "admin" && target.status === "active"
      if (demotingAdmin && (await lockActiveAdmins(tx)) <= 1) {
        return { error: LAST_ADMIN }
      }

      const current = (
        await tx
          .select({ key: userModules.moduleKey })
          .from(userModules)
          .where(eq(userModules.userId, id))
      ).map((row) => row.key)
      const granted = input.modules.filter((key) => !current.includes(key))
      const revoked = current.filter((key) => !input.modules.includes(key))

      await tx
        .update(users)
        .set({
          name: input.name,
          email: input.email,
          role: input.role,
          organizationId: input.organizationId,
        })
        .where(eq(users.id, id))
      if (revoked.length > 0) {
        await tx
          .delete(userModules)
          .where(and(eq(userModules.userId, id), inArray(userModules.moduleKey, revoked)))
      }
      if (granted.length > 0) {
        await tx
          .insert(userModules)
          .values(granted.map((moduleKey) => ({ userId: id, moduleKey, grantedById: admin.id })))
          .onConflictDoNothing()
      }
      return { granted, revoked }
    })
  } catch (error) {
    if (isUniqueViolation(error, "users_email_key")) {
      return { fieldErrors: { email: [EMAIL_TAKEN] }, values }
    }
    throw error
  }
  if ("error" in result) return { error: result.error, values }

  const changes: Record<string, { from: unknown; to: unknown }> = {}
  for (const field of ["name", "email", "role", "organizationId"] as const) {
    if (target[field] !== input[field]) {
      changes[field] = { from: target[field], to: input[field] }
    }
  }
  await recordAudit({
    actor: admin,
    action: "user.updated",
    target: { type: "user", id, label: input.email },
    metadata: { changes, modulesGranted: result.granted, modulesRevoked: result.revoked },
  })
  revalidatePath("/app", "layout")
  return { success: "Changes saved." }
}

/** Generates a new temporary password and returns it once for the admin to hand over. */
export async function resetUserPassword(
  userId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin()
  const id = parseUserId(userId)
  const mustChangePassword = formData.get("mustChangePassword") === "on"

  const db = await getDb()
  const target = await findUser(db, id)
  if (target.id === admin.id) {
    return { error: "Use Change password to update your own password." }
  }

  const password = generateTemporaryPassword()
  await db
    .update(users)
    .set({
      passwordHash: await hashPassword(password),
      mustChangePassword,
      passwordChangedAt: new Date(),
    })
    .where(eq(users.id, id))
  await deleteUserSessions(id)

  await recordAudit({
    actor: admin,
    action: "user.password_reset",
    target: { type: "user", id, label: target.email },
    metadata: { mustChangePassword },
  })
  revalidatePath("/app/admin", "layout")
  return {
    success: "Password reset. The user was signed out of every session.",
    credentials: {
      name: target.name,
      email: target.email,
      password,
      loginUrl: await getLoginUrl(),
      mustChangePassword,
    },
  }
}

export async function setUserStatus(userId: string, status: string) {
  const admin = await requireAdmin()
  const id = parseUserId(userId)
  if (status !== "active" && status !== "disabled") return

  const db = await getDb()
  const target = await findUser(db, id)
  if (target.id === admin.id || target.status === status) return

  // Re-enabling a customer user takes a seat again.
  if (status === "active" && target.role === "user" && target.organizationId) {
    if (await seatError(db, target.organizationId, id)) return
  }

  const applied = await db.transaction(async (tx) => {
    if (status === "disabled" && target.role === "admin" && (await lockActiveAdmins(tx)) <= 1) {
      return false
    }
    await tx.update(users).set({ status }).where(eq(users.id, id))
    return true
  })
  if (!applied) return
  if (status === "disabled") await deleteUserSessions(id)

  await recordAudit({
    actor: admin,
    action: status === "disabled" ? "user.disabled" : "user.enabled",
    target: { type: "user", id, label: target.email },
  })
  revalidatePath("/app/admin", "layout")
}

export async function deleteUser(
  userId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin()
  const id = parseUserId(userId)
  const db = await getDb()
  const target = await findUser(db, id)

  if (target.id === admin.id) return { error: "You can't delete your own account." }
  if (formText(formData, "confirmEmail").trim().toLowerCase() !== target.email) {
    return { error: "Type the user's email exactly to confirm." }
  }

  const deleted = await db.transaction(async (tx) => {
    if (target.role === "admin" && target.status === "active" && (await lockActiveAdmins(tx)) <= 1) {
      return false
    }
    await tx.delete(users).where(and(eq(users.id, id), ne(users.id, admin.id)))
    return true
  })
  if (!deleted) return { error: LAST_ADMIN }

  await recordAudit({
    actor: admin,
    action: "user.deleted",
    target: { type: "user", id, label: target.email },
    metadata: { role: target.role },
  })
  revalidatePath("/app/admin", "layout")
  redirect("/app/admin/users?notice=deleted")
}
