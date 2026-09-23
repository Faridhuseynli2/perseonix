"use client"

import { useActionState, useState } from "react"
import Link from "next/link"
import { CredentialsCard } from "@/components/admin/credentials-card"
import { FieldError, Notice, fieldClass } from "@/components/admin/ui"
import { Button, buttonVariants } from "@/components/ui/button"
import type { ActionState } from "@/lib/action-state"
import type { CustomerPlan } from "@/lib/customers"
import { cn } from "@/lib/utils"

type CustomerDefaults = {
  name: string
  plan: CustomerPlan
  startsAt: string
  endsAt: string | null
  seatLimit: number | null
  contactName: string | null
  contactEmail: string | null
  notes: string | null
}

type CustomerFormProps = {
  mode: "create" | "edit"
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
  defaults: CustomerDefaults
  /** Module catalog for the primary contact's account (create mode only). */
  modules?: { key: string; name: string }[]
}

const planOptions: { value: CustomerPlan; title: string; body: string }[] = [
  {
    value: "poc",
    title: "Proof of concept",
    body: "Time-boxed evaluation. Users lose access after the end date; convert it to Licensed when the deal closes.",
  },
  {
    value: "licensed",
    title: "Licensed",
    body: "Paying customer. Track the contract term and renewal date.",
  },
]

const labelClass = "text-xs font-medium text-foreground/80"
const initialState: ActionState = {}

export function CustomerForm(props: CustomerFormProps) {
  // "Create another customer" remounts the form with a fresh action state.
  const [instance, setInstance] = useState(0)
  return (
    <CustomerFormFlow
      key={instance}
      {...props}
      onCreateAnother={() => setInstance((n) => n + 1)}
    />
  )
}

function CustomerFormFlow({
  mode,
  action,
  defaults,
  modules = [],
  onCreateAnother,
}: CustomerFormProps & { onCreateAnother: () => void }) {
  const [state, formAction, pending] = useActionState(action, initialState)
  const errors = state.fieldErrors ?? {}
  const echoed = state.values

  // After a failed save the form resets to these, so echoed input wins over defaults.
  const value = (key: keyof CustomerDefaults) => {
    const typed = echoed?.[key]
    if (typeof typed === "string") return typed
    const fallback = defaults[key]
    return fallback === null ? "" : String(fallback)
  }

  const initialPlan = value("plan") as CustomerPlan
  const [plan, setPlan] = useState<CustomerPlan>(initialPlan)
  const [createAccount, setCreateAccount] = useState(
    echoed ? echoed.createAccount === "on" : true
  )
  const selectedModules = Array.isArray(echoed?.modules)
    ? echoed.modules
    : modules.map((m) => m.key)

  if (mode === "create" && state.created) {
    return (
      <div className="grid gap-5">
        {state.success && <Notice tone="success">{state.success}</Notice>}
        {state.credentials && (
          <CredentialsCard
            credentials={state.credentials}
            title={`Sign-in details for ${state.credentials.name}`}
          />
        )}
        <div className="flex flex-wrap justify-end gap-3 border-t border-ink/[0.06] pt-5">
          <Button
            type="button"
            variant="ghost"
            onClick={onCreateAnother}
            className="h-10 rounded-md px-4"
          >
            Create another customer
          </Button>
          <Link
            href={`/app/admin/customers/${state.created.id}`}
            className={cn(buttonVariants(), "h-10 rounded-md px-5")}
          >
            Open {state.created.label}
          </Link>
        </div>
      </div>
    )
  }

  const contactRequired = mode === "create" && createAccount

  return (
    <form action={formAction} className="grid gap-7">
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.success && <Notice tone="success">{state.success}</Notice>}

      <div className="grid gap-2">
        <label htmlFor="customer-name" className={labelClass}>
          Company name
        </label>
        <input
          id="customer-name"
          name="name"
          autoComplete="organization"
          required
          placeholder="Acme Bank"
          defaultValue={value("name")}
          aria-invalid={errors.name ? true : undefined}
          className={fieldClass}
        />
        <FieldError messages={errors.name} />
      </div>

      <fieldset className="grid gap-2">
        <legend className={labelClass}>Plan</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {planOptions.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer gap-3 rounded-lg border border-ink/10 bg-navy-900/40 p-4 transition-colors hover:border-ink/20 has-checked:border-brand/50 has-checked:bg-brand/[0.08]"
            >
              <input
                type="radio"
                name="plan"
                value={option.value}
                defaultChecked={initialPlan === option.value}
                onChange={() => setPlan(option.value)}
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
        <FieldError messages={errors.plan} />
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="grid content-start gap-2">
          <label htmlFor="startsAt" className={labelClass}>
            {plan === "poc" ? "POC starts" : "License starts"}
          </label>
          <input
            id="startsAt"
            name="startsAt"
            type="date"
            required
            defaultValue={value("startsAt")}
            aria-invalid={errors.startsAt ? true : undefined}
            className={fieldClass}
          />
          <FieldError messages={errors.startsAt} />
        </div>
        <div className="grid content-start gap-2">
          <label htmlFor="endsAt" className={labelClass}>
            {plan === "poc" ? "POC ends" : "Renewal date (optional)"}
          </label>
          <input
            id="endsAt"
            name="endsAt"
            type="date"
            required={plan === "poc"}
            defaultValue={value("endsAt")}
            aria-invalid={errors.endsAt ? true : undefined}
            className={fieldClass}
          />
          <FieldError messages={errors.endsAt} />
        </div>
        <div className="grid content-start gap-2">
          <label htmlFor="seatLimit" className={labelClass}>
            Seat limit
          </label>
          <input
            id="seatLimit"
            name="seatLimit"
            type="number"
            min={1}
            inputMode="numeric"
            placeholder="Unlimited"
            defaultValue={value("seatLimit")}
            aria-invalid={errors.seatLimit ? true : undefined}
            className={fieldClass}
          />
          <FieldError messages={errors.seatLimit} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid content-start gap-2">
          <label htmlFor="contactName" className={labelClass}>
            Primary contact{contactRequired && " (gets the first account)"}
          </label>
          <input
            id="contactName"
            name="contactName"
            autoComplete="off"
            required={contactRequired}
            placeholder="Jane Doe"
            defaultValue={value("contactName")}
            aria-invalid={errors.contactName ? true : undefined}
            className={fieldClass}
          />
          <FieldError messages={errors.contactName} />
        </div>
        <div className="grid content-start gap-2">
          <label htmlFor="contactEmail" className={labelClass}>
            Contact email{contactRequired && " (their sign-in)"}
          </label>
          <input
            id="contactEmail"
            name="contactEmail"
            type="email"
            autoComplete="off"
            required={contactRequired}
            placeholder="jane.doe@acme.com"
            defaultValue={value("contactEmail")}
            aria-invalid={errors.contactEmail ? true : undefined}
            className={fieldClass}
          />
          <FieldError messages={errors.contactEmail} />
        </div>
      </div>

      {mode === "create" && (
        <fieldset className="grid gap-4 rounded-lg border border-ink/[0.07] bg-navy-900/30 p-4">
          <legend className="sr-only">Customer account</legend>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              name="createAccount"
              checked={createAccount}
              onChange={(e) => setCreateAccount(e.target.checked)}
              className="mt-0.5 size-4 accent-brand"
            />
            <span>
              <span className="block text-sm font-medium text-ink">
                Create a sign-in account for the primary contact
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                Uses the contact name and email above. A secure temporary password is generated
                and shown once on the next screen, ready to send to the customer.
              </span>
            </span>
          </label>
          {createAccount && modules.length > 0 && (
            <div className="grid gap-2 pl-7">
              <p className="text-xs font-medium text-foreground/80">Modules for this account</p>
              {modules.map((m) => (
                <label key={m.key} className="flex items-center gap-2.5 text-sm text-foreground/85">
                  <input
                    type="checkbox"
                    name="modules"
                    value={m.key}
                    defaultChecked={selectedModules.includes(m.key)}
                    className="size-4 accent-brand"
                  />
                  {m.name}
                  <span className="rounded bg-ink/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground uppercase">
                    {m.key}
                  </span>
                </label>
              ))}
            </div>
          )}
        </fieldset>
      )}

      <div className="grid gap-2">
        <label htmlFor="notes" className={labelClass}>
          Internal notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Success criteria, account owner, commercial notes…"
          defaultValue={value("notes")}
          aria-invalid={errors.notes ? true : undefined}
          className={cn(fieldClass, "h-auto py-2.5")}
        />
        <FieldError messages={errors.notes} />
      </div>

      <div className="flex justify-end gap-3 border-t border-ink/[0.06] pt-5">
        {mode === "create" && (
          <Link
            href="/app/admin/customers"
            className={cn(buttonVariants({ variant: "ghost" }), "h-10 rounded-md px-4")}
          >
            Cancel
          </Link>
        )}
        <Button type="submit" disabled={pending} className="h-10 rounded-md px-5">
          {pending
            ? "Saving…"
            : mode === "create"
              ? createAccount
                ? "Create customer & account"
                : "Create customer"
              : "Save changes"}
        </Button>
      </div>
    </form>
  )
}
