"use client"

import { useEffect } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

// Slide-in detail flyout — the console "quick look". Row → drawer → (optional)
// full page, the way an XDR console works. Additive; never replaces deep pages.
export function Drawer({
  open,
  onClose,
  title,
  eyebrow,
  footer,
  children,
}: {
  open: boolean
  onClose: () => void
  title: React.ReactNode
  eyebrow?: string
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  return (
    <div className={cn("fixed inset-0 z-[90]", open ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!open}>
      {/* overlay */}
      <div
        onMouseDown={onClose}
        className={cn(
          "absolute inset-0 bg-navy-950/60 backdrop-blur-sm transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0"
        )}
      />
      {/* panel */}
      <aside
        role="dialog"
        aria-modal="true"
        className={cn(
          "absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col border-l border-ink/12 bg-navy-900 shadow-2xl transition-transform duration-250 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <header className="flex items-start justify-between gap-3 border-b border-ink/[0.08] px-5 py-4">
          <div className="min-w-0">
            {eyebrow && <p className="font-mono text-[10px] tracking-[0.16em] text-glow uppercase">{eyebrow}</p>}
            <div className="mt-1 min-w-0">{title}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-ink/[0.06] hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && <div className="border-t border-ink/[0.08] px-5 py-3">{footer}</div>}
      </aside>
    </div>
  )
}
