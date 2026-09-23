"use client"

import { useActionState } from "react"
import { ArrowRight, KeyRound, User } from "lucide-react"
import { login, type LoginState } from "@/app/login/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const fieldClass =
  "h-10 border-white/10 bg-navy-900/60 pl-9 placeholder:text-muted-foreground/60 focus-visible:border-glow/60 focus-visible:ring-glow/20"

const initialState: LoginState = {}

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(login, initialState)

  return (
    <form action={formAction} className="grid gap-5">
      {next && <input type="hidden" name="next" value={next} />}

      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-sev-critical/30 bg-sev-critical/10 px-3 py-2.5 text-sm text-sev-critical"
        >
          {state.error}
        </p>
      )}

      <div className="grid gap-2">
        <Label htmlFor="email" className="text-xs text-foreground/80">
          Email
        </Label>
        <div className="relative">
          <User
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            placeholder="analyst@company.com"
            defaultValue={state.email}
            required
            className={fieldClass}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password" className="text-xs text-foreground/80">
          Password
        </Label>
        <div className="relative">
          <KeyRound
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••••••"
            required
            className={fieldClass}
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="mt-1 h-10 w-full gap-2 rounded-md shadow-halo-brand hover:bg-brand/90 hover:shadow-halo-brand-lg"
      >
        {pending ? "Signing in…" : "Sign in"}
        {!pending && <ArrowRight />}
      </Button>
    </form>
  )
}
