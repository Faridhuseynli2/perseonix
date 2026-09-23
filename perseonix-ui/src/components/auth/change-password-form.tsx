"use client"

import { useActionState } from "react"
import Link from "next/link"
import { changePassword } from "@/app/change-password/actions"
import { FieldError, Notice, fieldClass } from "@/components/admin/ui"
import { Button, buttonVariants } from "@/components/ui/button"
import type { ActionState } from "@/lib/action-state"
import { PASSWORD_MIN_LENGTH } from "@/lib/validation"
import { cn } from "@/lib/utils"

const initialState: ActionState = {}

const fields = [
  { name: "currentPassword", label: "Current password", autoComplete: "current-password" },
  {
    name: "newPassword",
    label: "New password",
    autoComplete: "new-password",
    hint: `At least ${PASSWORD_MIN_LENGTH} characters. A passphrase of several words works well.`,
  },
  { name: "confirmPassword", label: "Confirm new password", autoComplete: "new-password" },
] as const

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, initialState)
  const errors = state.fieldErrors ?? {}

  return (
    <form action={formAction} className="grid gap-5">
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {fields.map((field) => (
        <div key={field.name} className="grid gap-2">
          <label htmlFor={field.name} className="text-xs font-medium text-foreground/80">
            {field.label}
          </label>
          <input
            id={field.name}
            name={field.name}
            type="password"
            autoComplete={field.autoComplete}
            required
            aria-invalid={errors[field.name] ? true : undefined}
            className={fieldClass}
          />
          {"hint" in field && (
            <p className="text-xs text-muted-foreground">{field.hint}</p>
          )}
          <FieldError messages={errors[field.name]} />
        </div>
      ))}

      <div className="mt-1 flex gap-3">
        <Link
          href="/app"
          className={cn(buttonVariants({ variant: "ghost" }), "h-10 flex-1 rounded-md")}
        >
          Cancel
        </Link>
        <Button
          type="submit"
          disabled={pending}
          className="h-10 flex-1 rounded-md shadow-halo-brand hover:bg-brand/90"
        >
          {pending ? "Saving…" : "Update password"}
        </Button>
      </div>
    </form>
  )
}
