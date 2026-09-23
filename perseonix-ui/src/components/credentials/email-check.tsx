"use client"

import Link from "next/link"
import { useActionState } from "react"
import { Loader2, MailCheck, MailWarning, Search } from "lucide-react"
import { checkEmail, type EmailCheckState } from "@/app/app/modules/credentials/actions"
import { SENSITIVE_DATA_CLASSES } from "@/lib/credentials/meta"

const initial: EmailCheckState = {}

function fmtDate(d: string) {
  if (!d) return "unknown date"
  const dt = new Date(d)
  return Number.isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString("en-US", { year: "numeric", month: "short" })
}

export function EmailCheck({ isAdmin }: { isAdmin: boolean }) {
  const [state, action, pending] = useActionState(checkEmail, initial)
  const r = state.result

  return (
    <section className="rounded-2xl border border-ink/[0.07] bg-navy-800/60 p-6 lg:p-7">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-ink/10 bg-navy-700 text-glow">
          <Search className="size-4.5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-ink">Email breach check</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            See which known breaches an email address appears in, and what data leaked. We show
            the breach and the type of data — never a plaintext password.
          </p>
        </div>
      </div>

      <form action={action} className="mt-5 flex flex-wrap items-center gap-2">
        <input
          name="email"
          type="email"
          defaultValue={state.email}
          autoComplete="off"
          spellCheck={false}
          placeholder="name@company.com"
          className="h-10 min-w-0 flex-1 rounded-md border border-ink/10 bg-navy-900/60 px-3 text-sm text-ink placeholder:text-muted-foreground/60 outline-none focus:border-glow/60 focus:ring-2 focus:ring-glow/20"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-halo-brand transition-colors hover:bg-brand/90 disabled:opacity-50"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          {pending ? "Checking…" : "Check"}
        </button>
      </form>

      {state.error && <p className="mt-3 text-sm text-sev-critical">{state.error}</p>}

      {r?.status === "no_key" && (
        <div className="mt-4 rounded-lg border border-ink/10 bg-navy-900/50 px-4 py-3 text-sm text-muted-foreground">
          {isAdmin ? (
            <>
              Email breach lookups need a Have I Been Pwned API key. Add one in{" "}
              <Link href="/app/admin/connectors" className="text-glow hover:underline">
                Connectors
              </Link>{" "}
              to enable this. Password checks work without a key.
            </>
          ) : (
            <>Email breach lookups aren&apos;t enabled yet. The password check above works now.</>
          )}
        </div>
      )}
      {r?.status === "bad_key" && (
        <p className="mt-4 rounded-lg border border-sev-high/30 bg-sev-high/10 px-4 py-3 text-sm text-ink">
          The configured HIBP API key was rejected. An administrator should check it in Connectors.
        </p>
      )}
      {r?.status === "rate_limited" && (
        <p className="mt-4 rounded-lg border border-sev-medium/30 bg-sev-medium/10 px-4 py-3 text-sm text-ink">
          Rate limit reached{r.retryAfter ? ` — try again in ${r.retryAfter}s` : ""}. HIBP limits
          how often lookups can run.
        </p>
      )}
      {r?.status === "error" && (
        <p className="mt-4 rounded-lg border border-ink/10 bg-navy-900/50 px-4 py-3 text-sm text-muted-foreground">
          Couldn&apos;t complete the lookup. Please try again.
        </p>
      )}
      {r?.status === "clean" && (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-ok/30 bg-ok/10 px-4 py-3">
          <MailCheck className="mt-0.5 size-5 shrink-0 text-ok" />
          <div>
            <p className="text-sm font-semibold text-ink">
              No known breaches for {state.email}.
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              This only covers breaches HIBP has indexed. Keep using unique passwords and MFA.
            </p>
          </div>
        </div>
      )}

      {r?.status === "found" &&
        (() => {
          const pwBreaches = r.breaches.filter((b) => b.dataClasses.includes("Passwords"))
          return (
        <div className="mt-4">
          <div className="rounded-t-lg border border-sev-critical/30 bg-sev-critical/10 px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <MailWarning className="size-5 shrink-0 text-sev-critical" />
              {state.email} appears in {r.breaches.length} breach
              {r.breaches.length === 1 ? "" : "es"}.
            </p>
            <p className="mt-1.5 pl-7 text-sm text-ink">
              {pwBreaches.length > 0 ? (
                <>
                  <span className="font-semibold text-sev-critical">
                    A password leaked in {pwBreaches.length} of them
                  </span>{" "}
                  — change it everywhere you used it, and turn on 2-step verification.
                </>
              ) : (
                <span className="text-muted-foreground">
                  No plaintext passwords in these breaches, but other data was exposed. Stay
                  cautious of phishing.
                </span>
              )}
            </p>
          </div>
          <ul className="divide-y divide-ink/[0.06] rounded-b-lg border border-t-0 border-ink/10">
            {r.breaches.map((b) => {
              const sensitive = b.dataClasses.filter((d) => SENSITIVE_DATA_CLASSES.has(d))
              return (
                <li key={b.name} className="bg-navy-900/40 px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="text-sm font-semibold text-ink">
                      {b.title}
                      {b.domain && (
                        <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                          {b.domain}
                        </span>
                      )}
                    </p>
                    <span className="font-mono text-xs text-muted-foreground">
                      {fmtDate(b.breachDate)} · {b.pwnCount.toLocaleString("en-US")} accounts
                    </span>
                  </div>
                  {b.dataClasses.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {b.dataClasses.map((d) => {
                        const hot = SENSITIVE_DATA_CLASSES.has(d)
                        return (
                          <li
                            key={d}
                            className={
                              hot
                                ? "rounded border border-sev-critical/40 bg-sev-critical/10 px-1.5 py-0.5 font-mono text-[11px] text-sev-critical"
                                : "rounded border border-ink/10 bg-ink/[0.03] px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
                            }
                          >
                            {d}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                  {sensitive.length > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Credentials were exposed here — reset this password everywhere it was used.
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
          )
        })()}
    </section>
  )
}
