"use client"

import { useState, type ReactNode } from "react"
import { Check, Copy, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Credentials } from "@/lib/action-state"

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** Shows freshly generated sign-in details once, ready to hand to the user. */
export function CredentialsCard({
  credentials,
  title,
  children,
}: {
  credentials: Credentials
  title: string
  /** Follow-up actions, rendered next to the copy button. */
  children?: ReactNode
}) {
  const [copied, setCopied] = useState<"all" | "password" | "failed" | null>(null)

  const handoff = [
    `Perseonix Corvael access for ${credentials.name}`,
    "",
    `Sign in: ${credentials.loginUrl}`,
    `Email: ${credentials.email}`,
    `Temporary password: ${credentials.password}`,
    ...(credentials.mustChangePassword
      ? ["", "You'll be asked to choose your own password when you first sign in."]
      : []),
  ].join("\n")

  const copy = async (what: "all" | "password") => {
    const ok = await copyToClipboard(what === "all" ? handoff : credentials.password)
    setCopied(ok ? what : "failed")
  }

  return (
    <section
      aria-label="Sign-in credentials"
      className="overflow-hidden rounded-xl border border-ok/25 bg-ok/[0.05]"
    >
      <header className="flex items-start gap-3 border-b border-ok/15 px-5 py-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-ok/10 ring-1 ring-ok/25">
          <KeyRound className="size-4 text-ok" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <p className="mt-0.5 text-xs text-ok/80">
            Shown only once — copy it now and send it to the user through a secure channel.
          </p>
        </div>
      </header>

      <dl className="grid gap-3 px-5 py-4 text-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <dt className="text-muted-foreground">Sign-in URL</dt>
          <dd className="font-mono text-xs break-all text-foreground/90">{credentials.loginUrl}</dd>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <dt className="text-muted-foreground">Email</dt>
          <dd className="break-all text-foreground/90">{credentials.email}</dd>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <dt className="text-muted-foreground">Temporary password</dt>
          <dd className="flex items-center gap-2">
            <code className="rounded-md bg-navy-950/70 px-3 py-1.5 font-mono text-base tracking-wider text-ink ring-1 ring-ink/10 select-all">
              {credentials.password}
            </code>
            <Button
              type="button"
              variant="outline"
              aria-label={copied === "password" ? "Password copied" : "Copy password"}
              onClick={() => copy("password")}
              className="size-9 rounded-md border-ink/10 bg-ink/[0.03] hover:bg-ink/[0.07]"
            >
              {copied === "password" ? <Check className="text-ok" /> : <Copy />}
            </Button>
          </dd>
        </div>
        {credentials.mustChangePassword && (
          <p className="text-xs text-muted-foreground">
            The user must choose their own password at first sign-in.
          </p>
        )}
      </dl>

      <div className="flex flex-wrap items-center gap-3 border-t border-ok/15 px-5 py-4">
        <Button type="button" onClick={() => copy("all")} className="h-9 gap-2 rounded-md px-4">
          {copied === "all" ? <Check /> : <Copy />}
          {copied === "all" ? "Copied" : "Copy sign-in details"}
        </Button>
        {copied === "failed" && (
          <span className="text-xs text-signal">
            Couldn&apos;t reach the clipboard — select the password and copy it manually.
          </span>
        )}
        {children && <div className="ml-auto flex flex-wrap gap-2">{children}</div>}
      </div>
    </section>
  )
}
