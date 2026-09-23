"use client"

import { useId, useRef, useState } from "react"
import { Eye, EyeOff, Loader2, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react"

type Result =
  | { status: "safe" }
  | { status: "pwned"; count: number }
  | { status: "error" }

// SHA-1 of the password, hex uppercase — computed in the browser via Web Crypto.
async function sha1Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()
}

export function PasswordCheck() {
  const id = useId()
  const [value, setValue] = useState("")
  const [show, setShow] = useState(false)
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function run(e: React.FormEvent) {
    e.preventDefault()
    const pw = value
    if (!pw || pending) return
    setPending(true)
    setResult(null)
    try {
      if (!crypto?.subtle) throw new Error("no-subtle")
      const hash = await sha1Hex(pw)
      const prefix = hash.slice(0, 5)
      const suffix = hash.slice(5)
      // k-anonymity: only the first 5 hash chars ever leave the browser.
      const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: { "Add-Padding": "true" },
      })
      if (!res.ok) throw new Error("range-failed")
      const body = await res.text()
      let count = 0
      for (const line of body.split("\n")) {
        const [suf, cnt] = line.trim().split(":")
        if (suf === suffix) {
          count = Number(cnt) || 0
          break
        }
      }
      setResult(count > 0 ? { status: "pwned", count } : { status: "safe" })
    } catch {
      setResult({ status: "error" })
    } finally {
      setPending(false)
      // Don't keep the secret around after the check.
      setValue("")
      setShow(false)
    }
  }

  return (
    <section className="rounded-2xl border border-ink/[0.07] bg-navy-800/60 p-6 lg:p-7">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-ink/10 bg-navy-700 text-glow">
          <ShieldQuestion className="size-4.5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-ink">Password check</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            See if a password has appeared in a known breach. It is hashed on your device —
            only the first 5 characters of the hash are sent, never the password itself.
          </p>
        </div>
      </div>

      <form onSubmit={run} className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            ref={inputRef}
            id={`${id}-pw`}
            type={show ? "text" : "password"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="Type a password to test"
            className="h-10 w-full rounded-md border border-ink/10 bg-navy-900/60 pr-10 pl-3 text-sm text-ink placeholder:text-muted-foreground/60 outline-none focus:border-glow/60 focus:ring-2 focus:ring-glow/20"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:text-ink"
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <button
          type="submit"
          disabled={pending || !value}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-halo-brand transition-colors hover:bg-brand/90 disabled:opacity-50"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          {pending ? "Checking…" : "Check"}
        </button>
      </form>

      {result?.status === "pwned" && (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-sev-critical/30 bg-sev-critical/10 px-4 py-3">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-sev-critical" />
          <div>
            <p className="text-sm font-semibold text-ink">
              Found in {result.count.toLocaleString("en-US")} breach
              {result.count === 1 ? "" : "es"}.
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              This password is public. If you use it anywhere, change it now and never reuse it.
            </p>
          </div>
        </div>
      )}
      {result?.status === "safe" && (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-ok/30 bg-ok/10 px-4 py-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-ok" />
          <div>
            <p className="text-sm font-semibold text-ink">Not found in known breaches.</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Good — but &quot;not seen yet&quot; is not &quot;strong&quot;. Use a long, unique
              password and a manager.
            </p>
          </div>
        </div>
      )}
      {result?.status === "error" && (
        <p className="mt-4 rounded-lg border border-ink/10 bg-navy-900/50 px-4 py-3 text-sm text-muted-foreground">
          Couldn&apos;t reach the breach service. Check your connection and try again.
        </p>
      )}
    </section>
  )
}
