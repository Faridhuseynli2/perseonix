"use client"

import { useActionState } from "react"
import { Notice, fieldClass } from "@/components/admin/ui"
import { Button } from "@/components/ui/button"
import type { ActionState } from "@/lib/action-state"

const initialState: ActionState = {}

export function DeleteUserForm({
  action,
  email,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
  email: string
}) {
  const [state, formAction, pending] = useActionState(action, initialState)

  return (
    <form action={formAction} className="grid gap-3">
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <label htmlFor="confirmEmail" className="text-xs text-muted-foreground">
        Type <span className="font-mono text-foreground">{email}</span> to confirm.
      </label>
      <input
        id="confirmEmail"
        name="confirmEmail"
        autoComplete="off"
        spellCheck={false}
        required
        className={fieldClass}
      />
      <Button type="submit" variant="destructive" disabled={pending} className="h-10 rounded-md">
        {pending ? "Deleting…" : "Delete user permanently"}
      </Button>
    </form>
  )
}
