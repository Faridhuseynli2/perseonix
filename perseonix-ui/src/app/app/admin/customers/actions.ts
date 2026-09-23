"use server"

import { and, count, eq, inArray, like } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { notFound, redirect } from "next/navigation"
import { z } from "zod"
import { getDb } from "@/db"
import { modules, organizations, userModules, users } from "@/db/schema"
import type { ActionState } from "@/lib/action-state"
import { recordAudit } from "@/lib/audit"
import { requireAdmin } from "@/lib/auth/dal"
import { generateTemporaryPassword, hashPassword } from "@/lib/auth/password"
import { isUniqueViolation } from "@/lib/db-errors"
import { getLoginUrl } from "@/lib/request"
import { customerSchema, formModules, readCustomerForm } from "@/lib/validation"

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "customer"
  )
}

function parseCustomerId(customerId: string) {
  if (!z.uuid().safeParse(customerId).success) notFound()
  return customerId
}

/**
 * Creates the company and, unless opted out, a sign-in account for its primary
 * contact in the same transaction. The generated password is returned once.
 */
export async function createCustomer(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin()
  const raw = readCustomerForm(formData)
  const createAccount = formData.get("createAccount") === "on"
  const moduleKeys = formModules(formData)
  const values = { ...raw, createAccount: createAccount ? "on" : "", modules: moduleKeys }

  const parsed = customerSchema.safeParse(raw)
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values }
  }
  const input = parsed.data

  const db = await getDb()

  let account: { name: string; email: string } | null = null
  if (createAccount) {
    const fieldErrors: Record<string, string[]> = {}
    if (!input.contactName || input.contactName.length < 2) {
      fieldErrors.contactName = ["Enter the contact's name to create their account."]
    }
    if (!input.contactEmail) {
      fieldErrors.contactEmail = ["Enter the contact's email to create their account."]
    }
    if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values }
    account = { name: input.contactName as string, email: input.contactEmail as string }

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, account.email))
      .limit(1)
    if (existing) {
      return { fieldErrors: { contactEmail: ["A user with this email already exists."] }, values }
    }
    if (moduleKeys.length > 0) {
      const found = await db
        .select({ key: modules.key })
        .from(modules)
        .where(and(inArray(modules.key, moduleKeys), eq(modules.isActive, true)))
      if (found.length !== moduleKeys.length) {
        return { error: "One or more selected modules are unavailable.", values }
      }
    }
  }

  const base = slugify(input.name)
  const taken = new Set(
    (
      await db
        .select({ slug: organizations.slug })
        .from(organizations)
        .where(like(organizations.slug, `${base}%`))
    ).map((row) => row.slug)
  )
  let slug = base
  for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`

  const password = account ? generateTemporaryPassword() : null
  const passwordHash = password ? await hashPassword(password) : null

  let result: { customerId: string; userId: string | null }
  try {
    result = await db.transaction(async (tx) => {
      const [customer] = await tx
        .insert(organizations)
        .values({ ...input, slug })
        .returning({ id: organizations.id })

      if (!account || !passwordHash) return { customerId: customer.id, userId: null }

      const [user] = await tx
        .insert(users)
        .values({
          name: account.name,
          email: account.email,
          role: "user",
          organizationId: customer.id,
          passwordHash,
          mustChangePassword: true,
        })
        .returning({ id: users.id })
      if (moduleKeys.length > 0) {
        await tx.insert(userModules).values(
          moduleKeys.map((moduleKey) => ({ userId: user.id, moduleKey, grantedById: admin.id }))
        )
      }
      return { customerId: customer.id, userId: user.id }
    })
  } catch (error) {
    if (isUniqueViolation(error, "users_email_key")) {
      return { fieldErrors: { contactEmail: ["A user with this email already exists."] }, values }
    }
    if (isUniqueViolation(error, "organizations_slug_key")) {
      return { error: "That company was just created. Refresh and try again.", values }
    }
    throw error
  }

  await recordAudit({
    actor: admin,
    action: "customer.created",
    target: { type: "organization", id: result.customerId, label: input.name },
    metadata: {
      plan: input.plan,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      seatLimit: input.seatLimit,
    },
  })
  if (account && result.userId) {
    await recordAudit({
      actor: admin,
      action: "user.created",
      target: { type: "user", id: result.userId, label: account.email },
      metadata: { role: "user", modules: moduleKeys, organizationId: result.customerId },
    })
  }
  revalidatePath("/app/admin", "layout")

  return {
    success: account
      ? `${input.name} created with a sign-in account for ${account.name}.`
      : `${input.name} created. Add users from its page when you're ready.`,
    created: { id: result.customerId, label: input.name },
    credentials:
      account && password
        ? {
            name: account.name,
            email: account.email,
            password,
            loginUrl: await getLoginUrl(),
            mustChangePassword: true,
          }
        : undefined,
  }
}

export async function updateCustomer(
  customerId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin()
  const id = parseCustomerId(customerId)
  const raw = readCustomerForm(formData)

  const parsed = customerSchema.safeParse(raw)
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values: raw }
  }
  const input = parsed.data

  const db = await getDb()
  const [current] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, id))
    .limit(1)
  if (!current) notFound()

  if (input.seatLimit !== null) {
    const [row] = await db
      .select({ total: count() })
      .from(users)
      .where(
        and(eq(users.organizationId, id), eq(users.status, "active"), eq(users.role, "user"))
      )
    const active = row?.total ?? 0
    if (active > input.seatLimit) {
      return {
        fieldErrors: {
          seatLimit: [`${active} users are active. Disable some before lowering the limit.`],
        },
        values: raw,
      }
    }
  }

  await db.update(organizations).set(input).where(eq(organizations.id, id))

  const changes: Record<string, { from: unknown; to: unknown }> = {}
  for (const field of Object.keys(input) as (keyof typeof input)[]) {
    if (current[field] !== input[field]) {
      changes[field] = { from: current[field], to: input[field] }
    }
  }
  await recordAudit({
    actor: admin,
    action: current.plan !== input.plan ? "customer.plan_changed" : "customer.updated",
    target: { type: "organization", id, label: input.name },
    metadata: { changes },
  })
  revalidatePath("/app/admin", "layout")
  return {
    success:
      current.plan === "poc" && input.plan === "licensed"
        ? "Converted to a licensed customer."
        : "Changes saved.",
  }
}

/** Only companies without users can be deleted; the button is disabled otherwise. */
export async function deleteCustomer(customerId: string) {
  const admin = await requireAdmin()
  const id = parseCustomerId(customerId)

  const db = await getDb()
  const [customer] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, id))
    .limit(1)
  if (!customer) notFound()

  const [{ members }] = await db
    .select({ members: count() })
    .from(users)
    .where(eq(users.organizationId, id))
  if (members > 0) return

  await db.delete(organizations).where(eq(organizations.id, id))
  await recordAudit({
    actor: admin,
    action: "customer.deleted",
    target: { type: "organization", id, label: customer.name },
  })
  revalidatePath("/app/admin", "layout")
  redirect("/app/admin/customers?notice=deleted")
}
