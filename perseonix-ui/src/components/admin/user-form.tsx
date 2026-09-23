"use client"

import { useActionState, useState } from "react"
import Link from "next/link"
import { KeyRound } from "lucide-react"
import { CredentialsCard } from "@/components/admin/credentials-card"
import { FieldError, Notice, fieldClass } from "@/components/admin/ui"
import { Button, buttonVariants } from "@/components/ui/button"
import type { ActionState } from "@/lib/action-state"
import { formatDate, type CustomerPlan } from "@/lib/customers"
import { cn } from "@/lib/utils"

type Role = "admin" | "user"

type CompanyOption = { id: string; name: string; plan: CustomerPlan; endsAt: string | null }

type UserFormProps = {
  mode: "create" | "edit"
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
  companies: CompanyOption[]
  modules: { key: string; name: string; description: string }[]
  defaults?: {
    name: string
    email: string
    role: Role
    organizationId: string | null
    modules: string[]
  }
  /** Editing your own account: the role can't be changed. */
  lockRole?: boolean
}

const roleOptions: { value: Role; title: string; body: string }[] = [
  {
    value: "user",
    title: "Customer user",
    body: "An employee of a customer company. Sees only the modules you grant.",
  },
  {
    value: "admin",
    title: "Administrator",
    body: "Perseonix staff with full access: every module, all customers, users and the audit log.",
  },
]

const labelClass = "text-xs font-medium text-foreground/80"
const initialState: ActionState = {}

function valueOf(values: ActionState["values"], key: string) {
  const value = values?.[key]
  return typeof value === "string" ? value : undefined
}

function companyLabel(company: CompanyOption) {
  if (!company.endsAt) return company.name
  return `${company.name} — ${company.plan === "poc" ? "POC ends" : "renews"} ${formatDate(company.endsAt)}`
}

export function UserForm(props: UserFormProps) {
  // "Add another user" remounts the form with a fresh action state.
  const [instance, setInstance] = useState(0)
  return (
    <UserFormFlow key={instance} {...props} onCreateAnother={() => setInstance((n) => n + 1)} />
  )
}

function UserFormFlow({
  mode,
  action,
  companies,
  modules,
  defaults,
  lockRole = false,
  onCreateAnother,
}: UserFormProps & { onCreateAnother: () => void }) {
  const [state, formAction, pending] = useActionState(action, initialState)
  const values = state.values
  const errors = state.fieldErrors ?? {}

  const initialRole = (valueOf(values, "role") ?? defaults?.role ?? "user") as Role
  const [role, setRole] = useState<Role>(initialRole)

  if (mode === "create" && state.created && state.credentials) {
    return (
      <CredentialsCard
        credentials={state.credentials}
        title={`${state.created.label} can now sign in`}
      >
        <Button
          type="button"
          variant="ghost"
          onClick={onCreateAnother}
          className="h-9 rounded-md px-4"
        >
          Add another user
        </Button>
        <Link
          href={`/app/admin/users/${state.created.id}`}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-9 rounded-md border-ink/10 bg-ink/[0.03] px-4 hover:bg-ink/[0.07]"
          )}
        >
          Open user
        </Link>
      </CredentialsCard>
    )
  }

  const selectedModules = Array.isArray(values?.modules)
    ? values.modules
    : (defaults?.modules ?? [])
  const pocs = companies.filter((c) => c.plan === "poc")
  const licensed = companies.filter((c) => c.plan === "licensed")

  return (
    <form action={formAction} className="grid gap-7">
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.success && <Notice tone="success">{state.success}</Notice>}

      <fieldset className="grid gap-2">
        <legend className={labelClass}>Account type</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {roleOptions.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer gap-3 rounded-lg border border-ink/10 bg-navy-900/40 p-4 transition-colors hover:border-ink/20 has-checked:border-brand/50 has-checked:bg-brand/[0.08]",
                lockRole && "cursor-not-allowed opacity-60 hover:border-ink/10"
              )}
            >
              <input
                type="radio"
                name="role"
                value={option.value}
                defaultChecked={initialRole === option.value}
                disabled={lockRole}
                onChange={() => setRole(option.value)}
                className="mt-0.5 size-4 accent-brand"
              />
              <span>
                <span className="block text-sm font-medium text-ink">{option.title}</span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  {option.body}
                </span>
              </span>
            </label>
          ))}
        </div>
        {lockRole && (
          <>
            {/* Disabled radios aren't submitted, so carry the role explicitly. */}
            <input type="hidden" name="role" value={initialRole} />
            <p className="text-xs text-muted-foreground">You can&apos;t change your own role.</p>
          </>
        )}
        <FieldError messages={errors.role} />
      </fieldset>

      <div className="grid gap-2">
        <label htmlFor="organizationId" className={labelClass}>
          Company
        </label>
        <select
          id="organizationId"
          name="organizationId"
          required={role === "user"}
          defaultValue={valueOf(values, "organizationId") ?? defaults?.organizationId ?? ""}
          aria-invalid={errors.organizationId ? true : undefined}
          className={fieldClass}
        >
          <option value="">
            {role === "admin" ? "None — Perseonix staff" : "Select the customer company…"}
          </option>
          {pocs.length > 0 && (
            <optgroup label="Proof of concept">
              {pocs.map((company) => (
                <option key={company.id} value={company.id}>
                  {companyLabel(company)}
                </option>
              ))}
            </optgroup>
          )}
          {licensed.length > 0 && (
            <optgroup label="Licensed customers">
              {licensed.map((company) => (
                <option key={company.id} value={company.id}>
                  {companyLabel(company)}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <p className="text-xs text-muted-foreground">
          {role === "admin"
            ? "Administrators are Perseonix staff and usually have no company."
            : "Customer users must belong to a company. Active users count against its seat limit."}
          {companies.length === 0 && (
            <>
              {" "}
              <Link href="/app/admin/customers/new" className="text-glow hover:text-ink">
                Create the first customer
              </Link>
              .
            </>
          )}
        </p>
        <FieldError messages={errors.organizationId} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid content-start gap-2">
          <label htmlFor="name" className={labelClass}>
            Full name
          </label>
          <input
            id="name"
            name="name"
            autoComplete="off"
            required
            defaultValue={valueOf(values, "name") ?? defaults?.name}
            aria-invalid={errors.name ? true : undefined}
            className={fieldClass}
          />
          <FieldError messages={errors.name} />
        </div>
        <div className="grid content-start gap-2">
          <label htmlFor="email" className={labelClass}>
            Work email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="off"
            required
            defaultValue={valueOf(values, "email") ?? defaults?.email}
            aria-invalid={errors.email ? true : undefined}
            className={fieldClass}
          />
          <FieldError messages={errors.email} />
        </div>
      </div>

      <fieldset className="grid gap-2">
        <legend className={labelClass}>Modules</legend>
        <p className="text-xs text-muted-foreground">
          {role === "admin"
            ? "Administrators automatically have access to every module."
            : "Choose which Perseonix Corvael modules this user can open."}
        </p>
        <div className="mt-1 grid gap-3">
          {modules.map((m) => (
            <label
              key={m.key}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-ink/10 bg-navy-900/40 p-4 transition-colors hover:border-ink/20 has-checked:border-brand/50 has-checked:bg-brand/[0.08]"
            >
              <input
                type="checkbox"
                name="modules"
                value={m.key}
                defaultChecked={selectedModules.includes(m.key)}
                className="mt-0.5 size-4 accent-brand"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-medium text-ink">
                  {m.name}
                  <span className="rounded bg-ink/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground uppercase">
                    {m.key}
                  </span>
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  {m.description}
                </span>
              </span>
            </label>
          ))}
        </div>
        <FieldError messages={errors.modules} />
      </fieldset>

      {mode === "create" && (
        <div className="grid gap-3 rounded-lg border border-ink/[0.07] bg-navy-900/30 p-4">
          <p className="flex items-start gap-2.5 text-sm text-foreground/85">
            <KeyRound aria-hidden className="mt-0.5 size-4 shrink-0 text-glow" />
            A secure temporary password is generated when you create the account. You&apos;ll see
            it once on the next screen, ready to copy and send.
          </p>
          <label className="flex items-center gap-2.5 text-sm text-foreground/85">
            <input
              type="checkbox"
              name="mustChangePassword"
              defaultChecked={values ? values.mustChangePassword === "on" : true}
              className="size-4 accent-brand"
            />
            Require a password change at first sign-in
          </label>
        </div>
      )}

      <div className="flex justify-end gap-3 border-t border-ink/[0.06] pt-5">
        {mode === "create" && (
          <Link
            href="/app/admin/users"
            className={cn(buttonVariants({ variant: "ghost" }), "h-10 rounded-md px-4")}
          >
            Cancel
          </Link>
        )}
        <Button type="submit" disabled={pending} className="h-10 rounded-md px-5">
          {pending
            ? "Saving…"
            : mode === "create"
              ? "Create user & generate password"
              : "Save changes"}
        </Button>
      </div>
    </form>
  )
}
