"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { updateTimezone } from "@/app/app/settings/actions"

// On a user's first screen, detect the browser timezone and save it once — so
// incoming data timestamps show in their local time from the start. Runs at most
// once per browser (localStorage flag) so it never overrides a later Settings choice.
export function TimezoneAutoSet({ current }: { current: string }) {
  const router = useRouter()
  useEffect(() => {
    try {
      if (localStorage.getItem("px-tz-set")) return
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (tz && tz !== current) {
        updateTimezone(tz).then((res) => {
          localStorage.setItem("px-tz-set", "1")
          if (!res.error) router.refresh()
        })
      } else {
        localStorage.setItem("px-tz-set", "1")
      }
    } catch {
      /* private mode / blocked storage — skip silently */
    }
  }, [current, router])
  return null
}
