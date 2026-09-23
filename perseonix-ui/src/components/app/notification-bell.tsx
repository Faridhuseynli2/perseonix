"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { Bell, FolderKanban, Radar, ShieldAlert, Skull, VenetianMask } from "lucide-react"
import { markAllNotificationsRead } from "@/app/app/notifications/actions"
import type { BellItem } from "@/lib/notifications/feed"
import { cn } from "@/lib/utils"

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  const wk = Math.floor(day / 7)
  if (wk < 5) return `${wk}w ago`
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

export function NotificationBell({ items, unread }: { items: BellItem[]; unread: number }) {
  const [open, setOpen] = useState(false)
  const [cleared, setCleared] = useState(false)
  const [prevUnread, setPrevUnread] = useState(unread)
  const [, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  // When the layout re-renders with fresh data, drop the optimistic clear so the
  // badge reflects the real unread count (adjusting state during render — no effect).
  if (unread !== prevUnread) {
    setPrevUnread(unread)
    setCleared(false)
  }
  const count = cleared ? 0 : unread

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  function toggle() {
    const next = !open
    setOpen(next)
    if (next && count > 0) {
      setCleared(true)
      startTransition(() => markAllNotificationsRead())
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
        aria-expanded={open}
        className={cn(
          "relative inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-ink/[0.04] hover:text-ink",
          open && "bg-ink/[0.06] text-ink"
        )}
      >
        <Bell className="size-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid min-w-[18px] place-items-center rounded-full bg-sev-critical px-1 font-mono text-[10px] font-semibold text-white ring-2 ring-navy-900">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-ink/10 bg-navy-900/95 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-ink/[0.08] px-4 py-3">
            <div className="flex items-center gap-2">
              <Radar className="size-4 text-glow" />
              <span className="text-sm font-semibold text-ink">Threat alerts</span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[10px] tracking-wide uppercase">
              <Link href="/app/modules/adversaries/watchlist" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-glow">
                Actors
              </Link>
              <Link href="/app/modules/ransomware/watchlist" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-sev-critical">
                Ransomware
              </Link>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Bell className="mx-auto size-6 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-foreground/80">No alerts yet</p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Watch a threat actor or a ransomware slice (group, sector or country) to get alerted on new activity.
              </p>
            </div>
          ) : (
            <ul className="max-h-[min(70vh,460px)] divide-y divide-ink/[0.05] overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex gap-3 px-4 py-3 transition-colors hover:bg-ink/[0.04]",
                      !n.read &&
                        (n.kind === "ransomware"
                          ? "bg-sev-critical/[0.05]"
                          : n.kind === "brand"
                            ? "bg-signal/[0.05]"
                            : n.kind === "case"
                              ? "bg-brand/[0.06]"
                              : "bg-glow/[0.04]")
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "mt-0.5 grid size-6 shrink-0 place-items-center rounded-md ring-1 ring-inset",
                        n.kind === "ransomware"
                          ? "bg-sev-critical/10 text-sev-critical ring-sev-critical/20"
                          : n.kind === "brand"
                            ? "bg-signal/10 text-signal ring-signal/20"
                            : "bg-brand/10 text-glow ring-brand/20"
                      )}
                    >
                      {n.kind === "ransomware" ? (
                        <Skull className="size-3.5" />
                      ) : n.kind === "brand" ? (
                        <ShieldAlert className="size-3.5" />
                      ) : n.kind === "case" ? (
                        <FolderKanban className="size-3.5" />
                      ) : (
                        <VenetianMask className="size-3.5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2">
                        <span className="truncate text-[13px] font-semibold text-ink" title={n.title}>
                          {n.title}
                        </span>
                        {!n.read && (
                          <span
                            aria-hidden
                            className={cn(
                              "size-1.5 shrink-0 rounded-full",
                              n.kind === "ransomware" ? "bg-sev-critical" : n.kind === "brand" ? "bg-signal" : "bg-glow"
                              // case + adversary share the glow dot
                            )}
                          />
                        )}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">{n.sub}</p>
                      <p className="mt-1 flex items-center gap-1.5 font-mono text-[10px] tracking-wide text-muted-foreground/60 uppercase">
                        <span>{n.tag}</span>
                        <span aria-hidden>·</span>
                        <span className="normal-case">{timeAgo(n.createdAt)}</span>
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
