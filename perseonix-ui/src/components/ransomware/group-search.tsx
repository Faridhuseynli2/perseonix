"use client"

import { useRef } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"

export function GroupSearch({ value, resultCount }: { value: string; resultCount: number }) {
  const router = useRouter()
  const ref = useRef<HTMLInputElement>(null)

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const q = (ref.current?.value ?? "").trim()
    router.push(`/app/modules/ransomware/groups${q ? `?q=${encodeURIComponent(q)}` : ""}`)
  }

  return (
    <form onSubmit={submit} className="relative">
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted-foreground"
      />
      <input
        ref={ref}
        name="q"
        defaultValue={value}
        autoComplete="off"
        spellCheck={false}
        aria-label="Search ransomware groups"
        placeholder="Search ransomware groups by name…"
        className="h-11 w-full rounded-xl border border-ink/10 bg-navy-900/70 pr-28 pl-11 font-mono text-[13px] text-ink outline-none transition-colors placeholder:font-sans placeholder:text-muted-foreground/60 focus-visible:border-sev-critical/60 focus-visible:ring-3 focus-visible:ring-sev-critical/20"
      />
      <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 font-mono text-[10px] tracking-wider text-muted-foreground/60 uppercase">
        {resultCount} groups
      </span>
    </form>
  )
}
