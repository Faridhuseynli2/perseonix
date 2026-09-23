import { z } from "zod"

export const PASSWORD_MIN_LENGTH = 12

const emailField = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .pipe(z.email("Enter a valid email address.").max(254, "Email is too long."))

export const passwordField = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(128, "Use 128 characters or fewer.")

export const userProfileSchema = z.object({
  name: z.string().trim().min(2, "Enter the user's full name.").max(120, "Name is too long."),
  email: emailField,
  role: z.enum(["admin", "user"], "Choose a role."),
  organizationId: z
    .string()
    .transform((value) => value || null)
    .pipe(z.uuid("Choose a valid company.").nullable()),
  modules: z.array(z.string().max(64)).max(50),
})

// Passwords for new accounts are generated on the server, never typed by the admin.
export const createUserSchema = userProfileSchema.extend({
  mustChangePassword: z.boolean(),
})

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export const customerSchema = z
  .object({
    name: z.string().trim().min(2, "Enter the company name.").max(120, "Name is too long."),
    plan: z.enum(["poc", "licensed"], "Choose a plan."),
    startsAt: z.string().regex(ISO_DATE, "Enter a start date."),
    endsAt: z
      .string()
      .refine((v) => v === "" || ISO_DATE.test(v), "Enter a valid date.")
      .transform((v) => v || null),
    seatLimit: z
      .string()
      .trim()
      .refine(
        (v) => v === "" || (/^\d{1,6}$/.test(v) && Number(v) >= 1),
        "Enter a whole number of seats, or leave empty for unlimited."
      )
      .transform((v) => (v ? Number(v) : null)),
    contactName: z
      .string()
      .trim()
      .max(120, "Name is too long.")
      .transform((v) => v || null),
    contactEmail: z
      .string()
      .transform((v) => v.trim().toLowerCase())
      .refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email address.")
      .transform((v) => v || null),
    notes: z
      .string()
      .trim()
      .max(2000, "Notes are too long.")
      .transform((v) => v || null),
  })
  .superRefine((data, ctx) => {
    if (data.plan === "poc" && !data.endsAt) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "A POC needs an end date." })
    }
    if (data.endsAt && data.endsAt < data.startsAt) {
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "The end date must be on or after the start date.",
      })
    }
  })

export function formText(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" ? value : ""
}

export function readUserForm(formData: FormData) {
  return {
    name: formText(formData, "name"),
    email: formText(formData, "email"),
    role: formText(formData, "role"),
    organizationId: formText(formData, "organizationId"),
    modules: formModules(formData),
    mustChangePassword: formData.get("mustChangePassword") === "on",
  }
}

export function formModules(formData: FormData) {
  return [
    ...new Set(formData.getAll("modules").filter((v): v is string => typeof v === "string")),
  ]
}

/** Everything the admin typed, for re-filling the form after a failed save. */
export function echoUserForm(raw: ReturnType<typeof readUserForm>) {
  return {
    name: raw.name,
    email: raw.email,
    role: raw.role,
    organizationId: raw.organizationId,
    modules: raw.modules,
    mustChangePassword: raw.mustChangePassword ? "on" : "",
  }
}

export function readCustomerForm(formData: FormData) {
  return {
    name: formText(formData, "name"),
    plan: formText(formData, "plan"),
    startsAt: formText(formData, "startsAt"),
    endsAt: formText(formData, "endsAt"),
    seatLimit: formText(formData, "seatLimit"),
    contactName: formText(formData, "contactName"),
    contactEmail: formText(formData, "contactEmail"),
    notes: formText(formData, "notes"),
  }
}
