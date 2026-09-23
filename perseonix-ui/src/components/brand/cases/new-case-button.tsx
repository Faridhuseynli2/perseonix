"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, X } from "lucide-react"
import { createCaseAction } from "@/app/app/modules/brand/cases/actions"
import { CASE_SEVERITIES, CASE_SEVERITY_LABEL } from "@/lib/brand/cases-meta"

export function NewCaseButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [severity, setSeverity] = useState<string>("medium")
  const [domain, setDomain] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function submit() {
    if (!title.trim()) {
      setError("Give the case a title.")
      return
    }
    setError(null)
    start(async () => {
      const res = await createCaseAction({ title, severity, domain: domain || undefined })
      if (!res.ok || !res.caseId) {
        setError(res.error ?? "Could not open the case.")
        return
      }
      setOpen(false)
      setTitle("")
      setDomain("")
      router.push(`/app/modules/brand/cases/${res.caseId}`)
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand/90"
      >
        <Plus className="size-4" />
        New case
      </button>
    )
  }

  return (
    <div className="w-full rounded-lg border border-ink/[0.09] bg-navy-900/60 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">Open a case</p>
        <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-ink">
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-3 grid gap-3">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title — e.g. Phishing kit hosted on paypa1-login.com"
          className="h-10 w-full rounded-md border border-ink/10 bg-navy-950/50 px-3 text-sm text-ink placeholder:text-muted-foreground/60 outline-none focus:border-glow/60 focus:ring-2 focus:ring-glow/20"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block font-mono text-[10px] tracking-wider text-muted-foreground/70 uppercase">
              Severity
            </label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="h-10 w-full rounded-md border border-ink/10 bg-navy-950/50 px-3 text-sm text-ink outline-none focus:border-glow/60"
            >
              {CASE_SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {CASE_SEVERITY_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] tracking-wider text-muted-foreground/70 uppercase">
              Related domain (optional)
            </label>
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="paypa1-login.com"
              className="h-10 w-full rounded-md border border-ink/10 bg-navy-950/50 px-3 font-mono text-sm text-ink placeholder:text-muted-foreground/60 outline-none focus:border-glow/60 focus:ring-2 focus:ring-glow/20"
            />
          </div>
        </div>
        {error && <p className="text-xs text-sev-critical">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-9 items-center rounded-md border border-ink/10 px-3 text-sm text-muted-foreground hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand/90 disabled:opacity-50"
          >
            {pending ? "Opening…" : "Open case"}
          </button>
        </div>
      </div>
    </div>
  )
}
