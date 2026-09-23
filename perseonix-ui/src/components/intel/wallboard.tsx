"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Maximize2, Minimize2, Radar, X } from "lucide-react"
import { LiveClock } from "@/components/intel/live-clock"

/** Full-screen SOC wallboard shell — covers the app chrome, adds a fullscreen
 *  toggle + exit, for putting the live view on a big TV during demos. The board
 *  content is passed in as children (built server-side). */
export function Wallboard({ children, tz = "UTC" }: { children: React.ReactNode; tz?: string }) {
  const [fs, setFs] = useState(false)

  useEffect(() => {
    const onChange = () => setFs(Boolean(document.fullscreenElement))
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {})
    else document.exitFullscreen?.().catch(() => {})
  }

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-navy-950">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-ink/10 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <Radar className="size-5 text-glow" />
          <span className="font-mono text-[13px] font-semibold tracking-[0.22em] text-ink uppercase">
            Perseonix Corvael<span className="text-muted-foreground/40">{" // "}</span>Threat Wall
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-glow uppercase">
            <span aria-hidden className="size-2 rounded-full bg-glow motion-safe:animate-beacon" /> Live
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-base">
            <LiveClock tz={tz} />
          </span>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-ink/12 bg-ink/[0.03] px-3 font-mono text-[10px] tracking-wide text-foreground/85 uppercase transition-colors hover:bg-ink/[0.07] hover:text-ink"
          >
            {fs ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            {fs ? "Exit fullscreen" : "Fullscreen"}
          </button>
          <Link
            href="/app/modules/intel"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-ink/12 px-3 font-mono text-[10px] tracking-wide text-muted-foreground uppercase transition-colors hover:text-ink"
          >
            <X className="size-3.5" /> Exit
          </Link>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-4">{children}</div>
    </div>
  )
}
