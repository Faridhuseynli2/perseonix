"use client"

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react"
import { PanelLeft } from "lucide-react"
import { cn } from "@/lib/utils"

type SidebarState = { open: boolean; toggle: () => void; close: () => void }

const SidebarCtx = createContext<SidebarState>({
  open: true,
  toggle: () => {},
  close: () => {},
})

export const useSidebar = () => useContext(SidebarCtx)

const STORAGE_KEY = "px-sidebar-open"
const EVENT = "px-sidebar-change"

function readOpen(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === "0") return false
    if (v === "1") return true
    return window.innerWidth >= 1024 // first visit: open on desktop, closed on mobile
  } catch {
    return true
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb)
  window.addEventListener("storage", cb)
  return () => {
    window.removeEventListener(EVENT, cb)
    window.removeEventListener("storage", cb)
  }
}

function setOpen(next: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0")
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENT))
}

/**
 * Falcon-style collapsible left navigation. The sidebar slides in/out and the
 * content reflows; the ☰ toggle lives in the top bar. State is remembered per
 * browser (via localStorage + useSyncExternalStore — no effect, hydration-safe).
 * On small screens the sidebar opens as an overlay with a backdrop.
 */
export function AppShell({
  sidebar,
  topbar,
  children,
}: {
  sidebar: ReactNode
  topbar: ReactNode
  children: ReactNode
}) {
  const open = useSyncExternalStore(
    subscribe,
    readOpen,
    () => true // server render: assume open (matches first client paint, no flash)
  )
  const state: SidebarState = {
    open,
    toggle: () => setOpen(!open),
    close: () => setOpen(false),
  }

  return (
    <SidebarCtx.Provider value={state}>
      {/* Sidebar rail */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r border-ink/[0.06] bg-navy-900 transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebar}
      </div>

      {/* Mobile backdrop */}
      <div
        aria-hidden
        onClick={state.close}
        className={cn(
          "fixed inset-0 z-30 bg-black/60 transition-opacity duration-300 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      {/* Content column — reflows to the sidebar on desktop */}
      <div
        className={cn(
          "flex min-h-dvh flex-col transition-[padding] duration-300 ease-out",
          open ? "lg:pl-64" : "pl-0"
        )}
      >
        {topbar}
        <main className="flex-1 px-6 py-8 lg:px-10">{children}</main>
      </div>
    </SidebarCtx.Provider>
  )
}

/** The ☰ button, placed at the far left of the top bar. */
export function SidebarToggle() {
  const { toggle, open } = useSidebar()
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={open ? "Collapse navigation" : "Open navigation"}
      aria-expanded={open}
      className="grid size-9 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-ink/[0.06] hover:text-ink"
    >
      <PanelLeft className="size-5" />
    </button>
  )
}
