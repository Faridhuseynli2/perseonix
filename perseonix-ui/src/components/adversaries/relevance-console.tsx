"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Building2, Check, Loader2, Save, Trash2, User } from "lucide-react"
import {
  clearRelevanceProfile,
  saveRelevanceProfile,
} from "@/app/app/modules/adversaries/relevance-actions"
import { CountryCombobox } from "@/components/adversaries/country-combobox"
import { SECTORS } from "@/lib/intel/taxonomy"
import { cn } from "@/lib/utils"

type Props = {
  sectors: string[]
  country: string
  canOrg: boolean
  savedSource: "user" | "org" | "none"
}

export function RelevanceConsole({ sectors, country, canOrg, savedSource }: Props) {
  const router = useRouter()
  const [sel, setSel] = useState<string[]>(sectors)
  const [ctry, setCtry] = useState(country)
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  function navigate(nextSectors: string[], nextCountry: string) {
    const p = new URLSearchParams()
    if (nextSectors.length) p.set("sectors", nextSectors.join(","))
    if (nextCountry) p.set("country", nextCountry)
    const s = p.toString()
    router.push(`/app/modules/adversaries/relevance${s ? `?${s}` : ""}`, { scroll: false })
  }

  function toggleSector(key: string) {
    const next = sel.includes(key) ? sel.filter((s) => s !== key) : [...sel, key]
    setSel(next)
    navigate(next, ctry)
  }

  function changeCountry(value: string) {
    setCtry(value)
    navigate(sel, value)
  }

  function save(scope: "user" | "org") {
    setMsg(null)
    start(async () => {
      const res = await saveRelevanceProfile({ scope, sectors: sel, country: ctry || undefined })
      setMsg(res.ok ? (scope === "org" ? "Saved as organization default." : "Saved to your profile.") : res.error ?? "Save failed.")
      if (res.ok) router.refresh()
    })
  }

  function clearSaved(scope: "user" | "org") {
    start(async () => {
      await clearRelevanceProfile(scope)
      router.refresh()
    })
  }

  return (
    <section className="rounded-lg border border-ink/[0.09] bg-navy-900/50 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-mono text-[11px] font-semibold tracking-[0.16em] text-ink uppercase">Your profile</h2>
        {savedSource !== "none" && (
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-wide text-glow uppercase">
            <Check className="size-3" />
            {savedSource === "org" ? "Org default active" : "Personal profile active"}
          </span>
        )}
      </div>

      <p className="mt-3 font-mono text-[10px] tracking-[0.14em] text-muted-foreground/60 uppercase">Your sectors</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {SECTORS.map((s) => {
          const on = sel.includes(s.key)
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => toggleSector(s.key)}
              aria-pressed={on}
              className={cn(
                "rounded-md border px-2.5 py-1.5 text-xs transition-colors",
                on
                  ? "border-glow/50 bg-glow/10 text-glow"
                  : "border-ink/12 text-muted-foreground hover:border-ink/25 hover:text-ink"
              )}
            >
              {s.label}
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-4">
        <div className="grid gap-1">
          <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground/60 uppercase">Your country</span>
          <CountryCombobox value={ctry} onChange={changeCountry} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => save("user")}
            disabled={pending}
            className="inline-flex h-10 items-center gap-1.5 rounded-md bg-brand px-3.5 text-sm font-medium text-white transition-colors hover:bg-brand/90 disabled:opacity-70"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <User className="size-4" />}
            Save to my profile
          </button>
          {canOrg && (
            <button
              type="button"
              onClick={() => save("org")}
              disabled={pending}
              className="inline-flex h-10 items-center gap-1.5 rounded-md border border-ink/12 px-3.5 text-sm text-foreground/85 transition-colors hover:bg-ink/[0.04] hover:text-ink disabled:opacity-70"
            >
              <Building2 className="size-4" />
              Save for organization
            </button>
          )}
          {savedSource !== "none" && (
            <button
              type="button"
              onClick={() => clearSaved(savedSource === "org" ? "org" : "user")}
              disabled={pending}
              className="inline-flex h-10 items-center gap-1.5 rounded-md border border-ink/10 px-3 text-sm text-muted-foreground transition-colors hover:border-sev-critical/30 hover:text-alert disabled:opacity-70"
            >
              <Trash2 className="size-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {msg && <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-ok"><Save className="size-3.5" />{msg}</p>}
    </section>
  )
}
