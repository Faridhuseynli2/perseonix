"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { runDueScansAction } from "@/app/app/modules/brand/actions"

// Runs scheduled scans that are due while the dashboard is open. In production a
// server cron drives this unattended; this keeps it working during a demo.
export function AutoRunner() {
  const router = useRouter()
  const busy = useRef(false)

  useEffect(() => {
    let alive = true
    async function tick() {
      if (busy.current) return
      busy.current = true
      try {
        const res = await runDueScansAction()
        if (alive && res.ran > 0) router.refresh()
      } catch {
        // ignore — the next tick retries
      } finally {
        busy.current = false
      }
    }
    void tick()
    const timer = setInterval(tick, 5 * 60 * 1000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [router])

  return null
}
