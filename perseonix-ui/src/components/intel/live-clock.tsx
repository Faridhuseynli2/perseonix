"use client"

import { useEffect, useState } from "react"
import { formatInTimeZone, offsetLabel } from "@/lib/timezone"

/** Live clock in the viewer's timezone. Renders empty on the server to avoid a
 *  hydration mismatch, then ticks on the client. */
export function LiveClock({ tz = "UTC" }: { tz?: string }) {
  const [now, setNow] = useState("")
  useEffect(() => {
    const tick = () =>
      setNow(
        formatInTimeZone(new Date(), tz, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) +
          " · " +
          offsetLabel(tz)
      )
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [tz])
  return <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{now || `— ${offsetLabel(tz)}`}</span>
}
