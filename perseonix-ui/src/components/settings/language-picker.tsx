"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Globe, Loader2 } from "lucide-react"
import { updateLocale } from "@/app/app/settings/actions"
import { usePortalT } from "@/components/i18n/portal-i18n"
import { LOCALES, type Locale } from "@/lib/i18n/config"
import { cn } from "@/lib/utils"

const NATIVE: Record<Locale, string> = { en: "English", tr: "Türkçe", ru: "Русский" }
const ENGLISH_NAME: Record<Locale, string> = { en: "English", tr: "Turkish", ru: "Russian" }
const CODE: Record<Locale, string> = { en: "EN", tr: "TR", ru: "RU" }

export function LanguagePicker({ current }: { current: string }) {
  const router = useRouter()
  const { t } = usePortalT()
  const initial = (LOCALES as readonly string[]).includes(current) ? (current as Locale) : "en"
  const [selected, setSelected] = useState<Locale>(initial)
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const choose = (l: Locale) => {
    setSelected(l)
    setSaved(false)
    setError(null)
    startTransition(async () => {
      const res = await updateLocale(l)
      if (res.error) {
        setError(res.error)
        return
      }
      setSaved(true)
      router.refresh()
    })
  }

  const detect = () => {
    const nav = typeof navigator !== "undefined" ? navigator.language?.slice(0, 2).toLowerCase() : ""
    const match = (LOCALES as readonly string[]).includes(nav || "") ? (nav as Locale) : "en"
    choose(match)
  }

  return (
    <div className="grid gap-4">
      <ul className="grid gap-2">
        {LOCALES.map((l) => {
          const active = selected === l
          return (
            <li key={l}>
              <button
                type="button"
                onClick={() => choose(l)}
                aria-pressed={active}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                  active
                    ? "border-glow/40 bg-glow/[0.06]"
                    : "border-ink/[0.08] bg-navy-900/40 hover:border-ink/15 hover:bg-navy-900/70"
                )}
              >
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-lg font-mono text-[11px] font-semibold ring-1",
                    active ? "bg-glow/15 text-glow ring-glow/30" : "bg-ink/[0.04] text-muted-foreground ring-ink/10"
                  )}
                >
                  {CODE[l]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">{NATIVE[l]}</span>
                  <span className="block text-xs text-muted-foreground">{ENGLISH_NAME[l]}</span>
                </span>
                {active && (pending ? <Loader2 className="size-4 animate-spin text-glow" /> : <Check className="size-4 text-glow" />)}
              </button>
            </li>
          )
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={detect}
          className="inline-flex items-center gap-1.5 rounded-md border border-ink/12 bg-ink/[0.03] px-3 py-1.5 text-xs font-medium text-foreground/85 transition-colors hover:bg-ink/[0.07] hover:text-ink"
        >
          <Globe className="size-3.5 text-glow" />
          {t.settings.useDeviceLanguage}
        </button>
        <span className="font-mono text-[11px] text-muted-foreground/70">
          {error ? <span className="text-sev-critical">{error}</span> : saved ? t.settings.savedToAccount : t.settings.appliesAllDevices}
        </span>
      </div>
    </div>
  )
}
