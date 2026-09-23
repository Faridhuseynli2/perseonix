"use client"

import { useState, useTransition } from "react"
import { Check } from "lucide-react"
import { updateTheme } from "@/app/app/settings/actions"
import { Notice } from "@/components/admin/ui"
import { THEMES, type Theme } from "@/lib/theme"
import { cn } from "@/lib/utils"

/** Repaints the portal immediately; the saved setting re-renders the same value. */
function applyTheme(theme: Theme) {
  document.querySelector<HTMLElement>("[data-app-theme]")?.setAttribute("data-theme", theme)
}

/** A miniature portal drawn with the real theme tokens of `theme`. */
function ThemePreview({ theme }: { theme: Theme }) {
  return (
    <span
      data-theme={theme}
      aria-hidden
      className="block overflow-hidden rounded-lg border border-ink/10 bg-navy-850"
    >
      <span className="flex h-32">
        <span className="flex w-1/4 flex-col gap-1.5 border-r border-ink/[0.06] bg-navy-900 p-2.5">
          <span className="h-1.5 w-8 rounded-full bg-ink/70" />
          <span className="mt-3 h-1.5 w-full rounded-full bg-brand" />
          <span className="h-1.5 w-3/4 rounded-full bg-ink/15" />
          <span className="h-1.5 w-2/3 rounded-full bg-ink/15" />
        </span>
        <span className="flex flex-1 flex-col gap-2 p-2.5">
          <span className="h-2 w-1/3 rounded-full bg-ink/60" />
          <span className="grid flex-1 grid-cols-3 gap-1.5">
            <span className="col-span-2 rounded-md border border-ink/[0.08] bg-navy-800 p-1.5">
              <span className="block h-1.5 w-1/2 rounded-full bg-glow/80" />
              <span className="mt-1.5 block h-1 w-3/4 rounded-full bg-ink/10" />
            </span>
            <span className="rounded-md border border-ink/[0.08] bg-navy-800 p-1.5">
              <span className="block h-1.5 w-2/3 rounded-full bg-signal/90" />
            </span>
            <span className="col-span-3 rounded-md border border-ink/[0.08] bg-navy-800 p-1.5">
              <span className="block h-1 w-1/3 rounded-full bg-ink/15" />
            </span>
          </span>
        </span>
      </span>
    </span>
  )
}

export function ThemePicker({ current }: { current: Theme }) {
  const [selected, setSelected] = useState<Theme>(current)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function choose(theme: Theme) {
    if (theme === selected) return
    const previous = selected
    setSelected(theme)
    setError(null)
    applyTheme(theme)
    startTransition(async () => {
      const result = await updateTheme(theme)
      if (result.error) {
        setSelected(previous)
        applyTheme(previous)
        setError(result.error)
      }
    })
  }

  return (
    <div className="grid gap-5">
      {error && <Notice tone="error">{error}</Notice>}
      <fieldset>
        <legend className="sr-only">Theme</legend>
        <div className="grid gap-4 md:grid-cols-3">
          {THEMES.map((theme) => {
            const checked = selected === theme.value
            return (
              <label
                key={theme.value}
                className={cn(
                  "cursor-pointer rounded-xl border p-3 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/40",
                  checked ? "border-brand bg-brand/[0.06]" : "border-ink/10 hover:border-ink/25"
                )}
              >
                <input
                  type="radio"
                  name="theme"
                  value={theme.value}
                  checked={checked}
                  onChange={() => choose(theme.value)}
                  className="sr-only"
                />
                <ThemePreview theme={theme.value} />
                <span className="mt-4 flex items-start justify-between gap-3 px-1 pb-1">
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm font-medium text-ink">
                      {theme.label}
                      {theme.badge && (
                        <span className="rounded bg-brand/10 px-1.5 py-0.5 font-mono text-[10px] text-glow uppercase">
                          {theme.badge}
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                      {theme.description}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full border",
                      checked
                        ? "border-brand bg-brand text-primary-foreground"
                        : "border-ink/25"
                    )}
                  >
                    {checked && <Check className="size-3" />}
                  </span>
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>
      <p aria-live="polite" className="text-xs text-muted-foreground">
        {pending ? "Saving…" : "Changes apply instantly and are saved to your account."}
      </p>
    </div>
  )
}
