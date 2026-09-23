"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, CornerDownLeft, Gauge, LayoutGrid, Search, Target } from "lucide-react"
import { cn } from "@/lib/utils"

type Cmd = { id: string; label: string; group: string; href: string; keywords?: string; dynamic?: boolean }

// Per-module sub-pages, keyed by module key. Only shown if the user has it.
const MODULE_PAGES: Record<string, { label: string; path: string }[]> = {
  adversaries: [
    { label: "Adversary Intelligence", path: "" },
    { label: "Threat activity feed", path: "/activity" },
    { label: "Your threat landscape", path: "/relevance" },
    { label: "Adversary watchlist", path: "/watchlist" },
  ],
  ransomware: [
    { label: "Ransomware Command", path: "" },
    { label: "Ransomware victims", path: "/victims" },
    { label: "Ransomware groups", path: "/groups" },
    { label: "Ransomware watchlist", path: "/watchlist" },
  ],
  brand: [{ label: "Brand Protection", path: "" }],
  investigate: [{ label: "Threat Investigation", path: "" }],
  asm: [{ label: "Attack Surface Management", path: "" }],
}

const ADMIN: Cmd[] = [
  { id: "a-overview", label: "Admin overview", group: "Management", href: "/app/admin", keywords: "admin" },
  { id: "a-customers", label: "Customers", group: "Management", href: "/app/admin/customers", keywords: "org companies" },
  { id: "a-users", label: "Users", group: "Management", href: "/app/admin/users", keywords: "accounts" },
  { id: "a-connectors", label: "Connectors", group: "Management", href: "/app/admin/connectors", keywords: "api keys integrations" },
  { id: "a-audit", label: "Audit log", group: "Management", href: "/app/admin/audit", keywords: "audit history" },
]

const GROUP_ICON: Record<string, typeof Search> = {
  Workspace: LayoutGrid,
  Modules: Target,
  Management: Gauge,
  Search: Search,
}

export function CommandMenu({
  modules,
  role,
}: {
  modules: { key: string; name: string }[]
  role: "admin" | "user"
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const commands = useMemo<Cmd[]>(() => {
    const base: Cmd[] = [
      { id: "w-overview", label: "Overview", group: "Workspace", href: "/app", keywords: "home dashboard" },
      { id: "w-settings", label: "Settings", group: "Workspace", href: "/app/settings", keywords: "theme profile" },
    ]
    for (const m of modules) {
      const pages = MODULE_PAGES[m.key] ?? [{ label: m.name, path: "" }]
      for (const p of pages) {
        base.push({
          id: `m-${m.key}${p.path}`,
          label: p.label,
          group: "Modules",
          href: `/app/modules/${m.key}${p.path}`,
          keywords: m.name,
        })
      }
    }
    if (role === "admin") base.push(...ADMIN)
    return base
  }, [modules, role])

  const results = useMemo<Cmd[]>(() => {
    const q = query.trim().toLowerCase()
    const dyn: Cmd[] = []
    if (q) {
      const has = (k: string) => modules.some((m) => m.key === k)
      if (has("ransomware")) dyn.push({ id: "s-rw", label: `Search ransomware victims: “${query.trim()}”`, group: "Search", href: `/app/modules/ransomware/victims?q=${encodeURIComponent(query.trim())}`, dynamic: true })
      if (has("adversaries")) dyn.push({ id: "s-adv", label: `Search threat actors: “${query.trim()}”`, group: "Search", href: `/app/modules/adversaries?q=${encodeURIComponent(query.trim())}`, dynamic: true })
    }
    const filtered = commands.filter((c) => {
      if (!q) return true
      return `${c.label} ${c.group} ${c.keywords ?? ""}`.toLowerCase().includes(q)
    })
    return [...dyn, ...filtered]
  }, [commands, query, modules])

  // Clamp active index to results (adjust during render — no effect).
  const [prevLen, setPrevLen] = useState(results.length)
  if (results.length !== prevLen) {
    setPrevLen(results.length)
    if (active > results.length - 1) setActive(0)
  }

  useEffect(() => {
    function openMenu() {
      setQuery("")
      setActive(0)
      setOpen(true)
    }
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        if (open) setOpen(false)
        else openMenu()
      }
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("perseonix:open-command", openMenu)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("perseonix:open-command", openMenu)
    }
  }, [open])

  // Focus the input when the menu opens (no state writes — safe in an effect).
  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  function go(cmd: Cmd | undefined) {
    if (!cmd) return
    setOpen(false)
    router.push(cmd.href)
  }

  if (!open) return null

  // Group results in display order.
  const groups: { name: string; items: Cmd[] }[] = []
  for (const r of results) {
    const g = groups.find((x) => x.name === r.group)
    if (g) g.items.push(r)
    else groups.push({ name: r.group, items: [r] })
  }
  const flat = results // active index maps to this

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-navy-950/70 px-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false)
      }}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-ink/12 bg-navy-900/95 shadow-2xl">
        <div className="flex items-center gap-3 border-b border-ink/[0.08] px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault()
                setActive((a) => Math.min(a + 1, flat.length - 1))
              } else if (e.key === "ArrowUp") {
                e.preventDefault()
                setActive((a) => Math.max(a - 1, 0))
              } else if (e.key === "Enter") {
                e.preventDefault()
                go(flat[active])
              } else if (e.key === "Escape") {
                setOpen(false)
              }
            }}
            placeholder="Search modules, actions, victims, actors…"
            className="h-13 w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-muted-foreground/60"
          />
          <kbd className="hidden shrink-0 rounded border border-ink/12 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/60 sm:block">ESC</kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto py-2">
          {flat.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No matches.</p>
          ) : (
            groups.map((group) => {
              const Icon = GROUP_ICON[group.name] ?? Target
              return (
                <div key={group.name} className="mb-1">
                  <p className="px-4 py-1.5 font-mono text-[10px] tracking-[0.14em] text-muted-foreground/50 uppercase">
                    {group.name}
                  </p>
                  {group.items.map((cmd) => {
                    const idx = flat.indexOf(cmd)
                    const isActive = idx === active
                    return (
                      <button
                        key={cmd.id}
                        type="button"
                        onMouseEnter={() => setActive(idx)}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          go(cmd)
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] transition-colors",
                          isActive ? "bg-ink/[0.06] text-ink" : "text-foreground/80 hover:bg-ink/[0.03]"
                        )}
                      >
                        <RowIcon group={group.name} dynamic={cmd.dynamic} />
                        <span className="min-w-0 flex-1 truncate">{cmd.label}</span>
                        {isActive && <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground/50" />}
                        {!isActive && <Icon className="size-3.5 shrink-0 text-muted-foreground/0" />}
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-ink/[0.08] px-4 py-2 font-mono text-[10px] text-muted-foreground/50">
          <span className="inline-flex items-center gap-1.5"><ArrowRight className="size-3 rotate-90" />/<ArrowRight className="size-3 -rotate-90" /> navigate · ↵ open</span>
          <span>Perseonix Command</span>
        </div>
      </div>
    </div>
  )
}

/** Topbar button that opens the command menu (⌘K). */
export function CommandTrigger() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("perseonix:open-command"))}
      aria-label="Open command menu"
      className="group flex h-9 w-full items-center gap-2 rounded-md border border-ink/10 bg-navy-900/60 px-3 text-sm text-muted-foreground transition-colors hover:border-glow/40 hover:text-ink md:w-72"
    >
      <Search className="size-4 shrink-0" />
      <span className="flex-1 truncate text-left text-[13px] text-muted-foreground/70">Search or jump to…</span>
      <kbd className="hidden shrink-0 rounded border border-ink/12 bg-ink/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/70 sm:block">⌘K</kbd>
    </button>
  )
}

function RowIcon({ group, dynamic }: { group: string; dynamic?: boolean }) {
  const Icon = dynamic ? Search : (GROUP_ICON[group] ?? Target)
  return <Icon className="size-4 shrink-0 text-muted-foreground" />
}
