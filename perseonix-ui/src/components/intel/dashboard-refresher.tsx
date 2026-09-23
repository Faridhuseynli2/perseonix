"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/** Keeps the analyst dashboard live: re-fetches server data on an interval and
 *  when the tab regains focus. Cheap — the server accessors are read-only. */
export function DashboardRefresher({ intervalMs = 60000 }: { intervalMs?: number }) {
  const router = useRouter()
  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs)
    const onFocus = () => router.refresh()
    window.addEventListener("focus", onFocus)
    return () => {
      clearInterval(id)
      window.removeEventListener("focus", onFocus)
    }
  }, [router, intervalMs])
  return null
}
