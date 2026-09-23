"use client"

import Link from "next/link"
import { useActionState } from "react"
import {
  Activity,
  Bug,
  KeyRound,
  Loader2,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react"
import { checkDomain, type DomainCheckState } from "@/app/app/modules/credentials/actions"

const initial: DomainCheckState = {}

function fmtDate(d: string | null) {
  if (!d) return "—"
  const dt = new Date(d)
  return Number.isNaN(dt.getTime())
    ? "—"
    : dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}
const n = (x: number) => x.toLocaleString("en-US")
const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

export function DomainExposure({ isAdmin }: { isAdmin: boolean }) {
  const [state, action, pending] = useActionState(checkDomain, initial)
  const s = state.stealer
  const b = state.breaches

  const stealerOk = s?.status === "ok" ? s : null
  const breachFound = b?.status === "found" ? b : null

  const employees = stealerOk?.employees ?? 0
  const withPw = breachFound?.accountsWithPasswords ?? 0
  const critical = employees > 0 || withPw > 0
  const anyFinding = Boolean(stealerOk && stealerOk.total > 0) || Boolean(breachFound)

  const maxOcc = stealerOk ? Math.max(1, ...stealerOk.apps.map((a) => a.occurrence)) : 1

  return (
    <section className="rounded-2xl border border-ink/[0.07] bg-navy-800/60 p-6 lg:p-7">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-ink/10 bg-navy-700 text-glow">
          <Activity className="size-4.5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-ink">Domain exposure monitor</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter a domain you own to see its exposed credentials — accounts caught in data breaches
            and devices infected by infostealer malware.
          </p>
        </div>
      </div>

      <form action={action} className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="domain"
            defaultValue={state.domain}
            autoComplete="off"
            spellCheck={false}
            placeholder="company.com"
            className="h-10 w-full rounded-md border border-ink/10 bg-navy-900/60 pr-3 pl-9 text-sm text-ink placeholder:text-muted-foreground/60 outline-none focus:border-glow/60 focus:ring-2 focus:ring-glow/20"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-halo-brand transition-colors hover:bg-brand/90 disabled:opacity-50"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          {pending ? "Scanning…" : "Scan domain"}
        </button>
      </form>
      {state.error && <p className="mt-3 text-sm text-sev-critical">{state.error}</p>}

      {(s || b) && (
        <div className="mt-5 space-y-5">
          {/* Verdict banner */}
          {anyFinding ? (
            <div
              className={
                critical
                  ? "flex items-start gap-3 rounded-lg border border-sev-critical/30 bg-sev-critical/10 px-4 py-3"
                  : "flex items-start gap-3 rounded-lg border border-sev-high/30 bg-sev-high/10 px-4 py-3"
              }
            >
              <ShieldAlert
                className={critical ? "mt-0.5 size-5 shrink-0 text-sev-critical" : "mt-0.5 size-5 shrink-0 text-sev-high"}
              />
              <p className="text-sm text-ink">
                <span className="font-semibold">
                  {state.domain} has exposed credentials.
                </span>{" "}
                {employees > 0
                  ? `${n(employees)} employee device(s) infected by infostealers — treat as urgent; those sessions and passwords are in criminal hands.`
                  : withPw > 0
                    ? `${n(withPw)} account(s) had a password exposed in breaches — force resets.`
                    : "Exposure found — review the details below."}
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-lg border border-ok/30 bg-ok/10 px-4 py-3">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-ok" />
              <p className="text-sm text-ink">
                <span className="font-semibold">No exposure found for {state.domain}.</span> Nothing
                in the infostealer or breach sources checked. Keep monitoring — this is a snapshot.
              </p>
            </div>
          )}

          {/* Stat tiles */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Employee logins stolen", value: stealerOk ? n(stealerOk.employees) : "—", hot: employees > 0, icon: Bug },
              { label: "Customer logins stolen", value: stealerOk ? n(stealerOk.users) : "—", hot: (stealerOk?.users ?? 0) > 0, icon: Users },
              { label: "Breached accounts", value: breachFound ? n(breachFound.accounts) : "—", hot: (breachFound?.accounts ?? 0) > 0, icon: Search },
              { label: "Accounts w/ password", value: breachFound ? n(breachFound.accountsWithPasswords) : "—", hot: withPw > 0, icon: KeyRound },
            ].map((t) => (
              <div key={t.label} className="rounded-xl border border-ink/[0.06] bg-navy-900/50 p-4">
                <t.icon className={t.hot ? "size-4 text-sev-critical" : "size-4 text-muted-foreground"} />
                <p className={t.hot ? "mt-3 text-2xl font-semibold tabular-nums text-sev-critical" : "mt-3 text-2xl font-semibold tabular-nums text-ink"}>
                  {t.value}
                </p>
                <p className="mt-1 text-xs leading-snug text-muted-foreground">{t.label}</p>
              </div>
            ))}
          </div>

          {/* Stealer-log detail */}
          {stealerOk && stealerOk.total > 0 && (
            <div className="rounded-xl border border-ink/10">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/[0.06] px-4 py-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Bug className="size-4 text-sev-critical" /> Infostealer exposure
                </p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  last staff {fmtDate(stealerOk.lastEmployee)} · last customer {fmtDate(stealerOk.lastUser)}
                </p>
              </div>
              {stealerOk.apps.length > 0 && (
                <div className="px-4 py-3">
                  <p className="mb-2 font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                    Most-affected services
                  </p>
                  <ul className="grid gap-1.5">
                    {stealerOk.apps.map((a) => (
                      <li key={a.url} className="flex items-center gap-3 text-sm">
                        <span className="w-40 shrink-0 truncate text-ink/90" title={a.url}>
                          {host(a.url)}
                        </span>
                        <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-ink/[0.06]">
                          <span
                            className="absolute inset-y-0 left-0 rounded-full bg-sev-high"
                            style={{ width: `${Math.round((a.occurrence / maxOcc) * 100)}%` }}
                          />
                        </span>
                        <span className="w-8 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums">
                          {a.occurrence}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="border-t border-ink/[0.06] px-4 py-2 text-[11px] text-muted-foreground">
                Source: Hudson Rock (infostealer logs).
              </p>
            </div>
          )}

          {/* Breach exposure detail */}
          <div className="rounded-xl border border-ink/10">
            <div className="border-b border-ink/[0.06] px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Search className="size-4 text-glow" /> Breach exposure
                <span className="font-normal text-muted-foreground">· Have I Been Pwned</span>
              </p>
            </div>
            <div className="px-4 py-3">
              {b?.status === "no_key" && (
                <p className="text-sm text-muted-foreground">
                  {isAdmin ? (
                    <>
                      Add a Have I Been Pwned API key in{" "}
                      <Link href="/app/admin/connectors" className="text-glow hover:underline">
                        Connectors
                      </Link>{" "}
                      to list every breached account on this domain. Infostealer results above work
                      without a key.
                    </>
                  ) : (
                    <>Breach exposure isn&apos;t enabled yet. Infostealer results above work now.</>
                  )}
                </p>
              )}
              {b?.status === "not_verified" && (
                <p className="text-sm text-muted-foreground">
                  Verify ownership of <span className="font-mono text-ink">{state.domain}</span> in
                  your Have I Been Pwned account, then re-scan to see every breached account.
                </p>
              )}
              {b?.status === "bad_key" && (
                <p className="text-sm text-sev-high">The HIBP API key was rejected — check it in Connectors.</p>
              )}
              {b?.status === "error" && (
                <p className="text-sm text-muted-foreground">Couldn&apos;t reach the breach source. Try again.</p>
              )}
              {b?.status === "clean" && (
                <p className="text-sm text-muted-foreground">No breached accounts found on this domain.</p>
              )}
              {breachFound && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-ink">{n(breachFound.accounts)}</span> accounts
                    across <span className="font-semibold text-ink">{breachFound.breaches.length}</span>{" "}
                    breaches ({n(breachFound.totalExposures)} total exposures).
                  </p>
                  <ul className="grid gap-1.5">
                    {breachFound.breaches.map((br) => (
                      <li
                        key={br.name}
                        className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-ink/[0.05] pb-1.5"
                      >
                        <span className="flex items-center gap-2 text-sm text-ink/90">
                          {br.title}
                          {br.hasPasswords && (
                            <span className="rounded border border-sev-critical/40 bg-sev-critical/10 px-1.5 py-0.5 font-mono text-[10px] text-sev-critical">
                              passwords
                            </span>
                          )}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground tabular-nums">
                          {n(br.accountCount)} accounts · {br.date ? br.date.slice(0, 4) : "—"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
