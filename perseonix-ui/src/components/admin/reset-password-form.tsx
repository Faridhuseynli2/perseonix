"use client"

import { useActionState, useState } from "react"
import { CredentialsCard } from "@/components/admin/credentials-card"
import { Notice } from "@/components/admin/ui"
import { Button } from "@/components/ui/button"
import type { ActionState } from "@/lib/action-state"

type ResetPasswordFormProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
}

const initialState: ActionState = {}

export function ResetPasswordForm(props: ResetPasswordFormProps) {
  // Remounting clears the one-time credentials once the admin is done with them.
  const [instance, setInstance] = useState(0)
  return (
    <ResetPasswordFlow key={instance} {...props} onDone={() => setInstance((n) => n + 1)} />
  )
}

function ResetPasswordFlow({ action, onDone }: ResetPasswordFormProps & { onDone: () => void }) {
  const [state, formAction, pending] = useActionState(action, initialState)

  if (state.credentials) {
    return (
      <CredentialsCard credentials={state.credentials} title="New temporary password">
        <Button type="button" variant="ghost" onClick={onDone} className="h-9 rounded-md px-4">
          Done
        </Button>
      </CredentialsCard>
    )
  }

  return (
    <form action={formAction} className="grid gap-4">
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Generates a new secure password, signs the user out everywhere, and shows the password
        once so you can send it to them.
      </p>
      <label className="flex items-center gap-2.5 text-sm text-foreground/85">
        <input type="checkbox" name="mustChangePassword" defaultChecked className="size-4 accent-brand" />
        Require a change at next sign-in
      </label>
      <Button
        type="submit"
        variant="outline"
        disabled={pending}
        className="h-10 rounded-md border-ink/10 bg-ink/[0.03] hover:bg-ink/[0.07]"
      >
        {pending ? "Generating…" : "Generate new password"}
      </Button>
    </form>
  )
}
