"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, X } from "lucide-react"
import { createIncidentAction } from "@/app/app/modules/intel/news/incidents/actions"
import { INCIDENT_SEVERITIES, INCIDENT_SEVERITY_LABEL, slaLabel } from "@/lib/intel/incidents-meta"

export function NewIncidentButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [severity, setSeverity] = useState<string>("medium")
  const [articleUrl, setArticleUrl] = useState("")
  const [summary, setSummary] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function submit() {
    if (!title.trim()) {
      setError("Give the incident a title.")
      return
    }
    setError(null)
    start(async () => {
      const res = await createIncidentAction({
        title,
        severity,
        articleUrl: articleUrl || undefined,
        summary: summary || undefined,
      })
      if (!res.ok || !res.incidentId) {
        setError(res.error ?? "Could not open the incident.")
        return
      }
      setOpen(false)
      setTitle("")
      setArticleUrl("")
      setSummary("")
      router.push(`/app/modules/intel/news/incidents/${res.incidentId}`)
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
        New incident
      </button>
    )
  }

  return (
    <div className="w-full rounded-lg border border-ink/[0.09] bg-navy-900/60 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">Open an incident</p>
        <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-ink">
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-3 grid gap-3">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title — e.g. Active exploitation of CVE-2026-1234 in the wild"
          className="h-10 w-full rounded-md border border-ink/10 bg-navy-950/50 px-3 text-sm text-ink placeholder:text-muted-foreground/60 outline-none focus:border-glow/60 focus:ring-2 focus:ring-glow/20"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block font-mono text-[10px] tracking-wider text-muted-foreground/70 uppercase">
              Severity → SLA
            </label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="h-10 w-full rounded-md border border-ink/10 bg-navy-950/50 px-3 text-sm text-ink outline-none focus:border-glow/60"
            >
              {INCIDENT_SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {INCIDENT_SEVERITY_LABEL[s]} — respond within {slaLabel(s)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] tracking-wider text-muted-foreground/70 uppercase">
              Source link (optional)
            </label>
            <input
              value={articleUrl}
              onChange={(e) => setArticleUrl(e.target.value)}
              placeholder="https://…"
              className="h-10 w-full rounded-md border border-ink/10 bg-navy-950/50 px-3 font-mono text-sm text-ink placeholder:text-muted-foreground/60 outline-none focus:border-glow/60 focus:ring-2 focus:ring-glow/20"
            />
          </div>
        </div>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          placeholder="What's the situation? Why does it warrant investigation?"
          className="w-full resize-y rounded-md border border-ink/10 bg-navy-950/50 px-3 py-2 text-sm text-ink placeholder:text-muted-foreground/60 outline-none focus:border-glow/60 focus:ring-2 focus:ring-glow/20"
        />
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
            {pending ? "Opening…" : "Open incident"}
          </button>
        </div>
      </div>
    </div>
  )
}
