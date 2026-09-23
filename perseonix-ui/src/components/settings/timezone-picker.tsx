"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Clock, Loader2, MapPin } from "lucide-react"
import { updateTimezone } from "@/app/app/settings/actions"
import { formatInTimeZone, offsetLabel, timeZoneList } from "@/lib/timezone"
import { cn } from "@/lib/utils"

export function TimezonePicker({ current }: { current: string }) {
  const router = useRouter()
  const zones = useMemo(() => timeZoneList(), [])
  const [selected, setSelected] = useState(current || "UTC")
  const [query, setQuery] = useState("")
  const [now, setNow] = useState<string>("")
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Live preview clock in the selected timezone.
  useEffect(() => {
    const tick = () => setNow(formatInTimeZone(new Date(), selected, { hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short", day: "numeric", month: "short" }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [selected])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? zones.filter((z) => z.toLowerCase().includes(q)) : zones
    return list.slice(0, 400)
  }, [zones, query])

  const detect = () => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (tz) {
        setSelected(tz)
        setQuery("")
      }
    } catch {
      /* ignore */
    }
  }

  const save = () => {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const res = await updateTimezone(selected)
      if (res.error) {
        setError(res.error)
        return
      }
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 2500)
    })
  }

  return (
    <div className="flex flex-col gap-5">
      {/* live preview */}
      <div className="rounded-xl border border-ink/[0.08] bg-navy-900/50 p-5">
        <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-muted-foreground/60 uppercase">
          <Clock className="size-3.5 text-glow" /> Current time · {selected}
        </p>
        <p className="mt-2 font-mono text-2xl font-semibold text-ink tabular-nums">{now || "—"}</p>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">{offsetLabel(selected)}</p>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="tz-search" className="text-sm font-medium text-ink">
            Your timezone
          </label>
          <button
            type="button"
            onClick={detect}
            className="inline-flex items-center gap-1.5 rounded-md border border-ink/12 bg-ink/[0.03] px-2.5 py-1.5 text-[12px] text-foreground/85 transition-colors hover:border-glow/40 hover:text-ink"
          >
            <MapPin className="size-3.5 text-glow" /> Use my device timezone
          </button>
        </div>
        <input
          id="tz-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search — e.g. Baku, Istanbul, New York…"
          className="mt-2 h-10 w-full rounded-lg border border-ink/[0.1] bg-navy-900/50 px-3 text-sm text-ink placeholder:text-muted-foreground/50 focus:border-glow/40 focus:outline-none"
        />
        <ul className="mt-2 grid max-h-72 gap-0.5 overflow-y-auto rounded-lg border border-ink/[0.07] bg-navy-950/40 p-1.5">
          {filtered.map((z) => {
            const on = z === selected
            return (
              <li key={z}>
                <button
                  type="button"
                  onClick={() => setSelected(z)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors",
                    on ? "bg-glow/[0.1] text-glow" : "text-foreground/85 hover:bg-ink/[0.05]"
                  )}
                >
                  <span className="min-w-0 truncate">{z.replace(/_/g, " ")}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground/50">{offsetLabel(z)}</span>
                    {on && <Check className="size-3.5" />}
                  </span>
                </button>
              </li>
            )
          })}
          {filtered.length === 0 && <li className="px-2 py-6 text-center text-[13px] text-muted-foreground">No match.</li>}
        </ul>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending || selected === current}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand/90 disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : saved ? <Check className="size-4" /> : null}
          {saved ? "Saved" : "Save timezone"}
        </button>
        {selected !== current && !saved && <span className="text-[12px] text-muted-foreground">Unsaved change</span>}
        {error && <span className="text-[12px] text-alert">{error}</span>}
      </div>
    </div>
  )
}
