"use client"

import { useEffect, useState } from "react"
import { LogoMark } from "@/components/brand/logo"
import { cn } from "@/lib/utils"

const STATUS = [
  "Establishing secure session",
  "Synchronizing threat feeds",
  "Loading intelligence modules",
  "Finalizing",
]

/** Full-screen, brand-first loading overlay shown during route transitions.
 *  Blurred navy backdrop, sonar-ringed crest, indeterminate progress and a
 *  cycling status line — an XDR-console feel. `exiting` fades it out. */
export function BrandLoader({ messages = STATUS, exiting = false }: { messages?: string[]; exiting?: boolean }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (messages.length <= 1) return
    const id = setInterval(() => setI((p) => (p + 1 < messages.length ? p + 1 : p)), 700)
    return () => clearInterval(id)
  }, [messages.length])

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className={cn(
        "fixed inset-0 z-[200] flex flex-col items-center justify-center gap-9 bg-navy-950/85 backdrop-blur-xl transition-opacity duration-500",
        exiting ? "opacity-0" : "opacity-100"
      )}
    >
      {/* Backdrop texture */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="grid-backdrop fade-mask-radial absolute inset-0 opacity-40" />
        <div className="absolute top-1/2 left-1/2 size-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-glow/[0.06] blur-[120px]" />
      </div>

      {/* Crest + sonar rings */}
      <div className="relative flex size-28 items-center justify-center">
        <span aria-hidden className="absolute size-24 rounded-full border border-glow/25 motion-safe:animate-loader-ping" />
        <span
          aria-hidden
          className="absolute size-24 rounded-full border border-glow/20 motion-safe:animate-loader-ping"
          style={{ animationDelay: "0.8s" }}
        />
        <span
          aria-hidden
          className="absolute size-24 rounded-full border border-glow/15 motion-safe:animate-loader-ping"
          style={{ animationDelay: "1.6s" }}
        />
        <LogoMark
          animated
          className="relative size-16 drop-shadow-[0_0_20px_rgba(0,181,250,0.4)]"
        />
      </div>

      {/* Progress + status */}
      <div className="flex flex-col items-center gap-3.5">
        <div className="relative h-[3px] w-56 overflow-hidden rounded-full bg-ink/10">
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 w-2/5 rounded-full bg-linear-to-r from-transparent via-glow to-transparent motion-safe:animate-loader-bar"
          />
        </div>
        <p className="h-4 font-mono text-[11px] tracking-[0.22em] text-foreground/70 uppercase transition-opacity">
          {messages[i]}
        </p>
        <p className="font-mono text-[9px] tracking-[0.28em] text-muted-foreground/40 uppercase">
          Perseonix Corvael
        </p>
      </div>
    </div>
  )
}
