"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, ChevronDown, X } from "lucide-react"
import { COUNTRIES, COUNTRY_BY_CODE } from "@/lib/intel/taxonomy"
import { cn } from "@/lib/utils"

export function CountryCombobox({
  value,
  onChange,
}: {
  value: string
  onChange: (code: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedName = value ? COUNTRY_BY_CODE[value]?.name ?? "" : ""

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return COUNTRIES.slice(0, 10)
    return COUNTRIES.filter((c) => {
      if (c.code.toLowerCase() === q) return true
      if (c.name.toLowerCase().includes(q)) return true
      return (c.aliases ?? []).some((a) => a.includes(q))
    }).slice(0, 10)
  }, [query])

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [open])

  function close() {
    setOpen(false)
    setQuery("")
  }

  function pick(code: string) {
    onChange(code)
    close()
    inputRef.current?.blur()
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setOpen(true)
      setActive((a) => Math.min(a + 1, matches.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const m = matches[active]
      if (m) pick(m.code)
    } else if (e.key === "Escape") {
      close()
    }
  }

  return (
    <div ref={ref} className="relative w-64">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="country-combobox-list"
          aria-autocomplete="list"
          value={open ? query : selectedName}
          placeholder="Anywhere — type to search…"
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setActive(0)
          }}
          onFocus={() => {
            setOpen(true)
            setQuery("")
            setActive(0)
          }}
          onKeyDown={onKey}
          className="h-10 w-full rounded-md border border-ink/12 bg-navy-950/60 pr-14 pl-3 font-mono text-[13px] text-ink outline-none transition-colors hover:border-ink/25 focus-visible:border-glow/60 focus-visible:ring-2 focus-visible:ring-glow/20"
        />
        <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
          {value && (
            <button
              type="button"
              aria-label="Clear country"
              onMouseDown={(e) => {
                e.preventDefault()
                onChange("")
                close()
              }}
              className="grid size-5 place-items-center rounded text-muted-foreground hover:text-ink"
            >
              <X className="size-3.5" />
            </button>
          )}
          <ChevronDown className="size-4 text-muted-foreground" />
        </div>
      </div>

      {open && (
        <ul id="country-combobox-list" role="listbox" className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-ink/12 bg-navy-900/95 py-1 shadow-2xl backdrop-blur-md">
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted-foreground">No country found</li>
          ) : (
            matches.map((c, i) => (
              <li key={c.code} role="option" aria-selected={value === c.code}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    pick(c.code)
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] transition-colors",
                    i === active ? "bg-ink/[0.06] text-ink" : "text-foreground/85"
                  )}
                >
                  <span className="truncate">{c.name}</span>
                  {value === c.code && <Check className="size-3.5 shrink-0 text-glow" />}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
