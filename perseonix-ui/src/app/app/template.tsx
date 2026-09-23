"use client"

import { useEffect, useState } from "react"
import { BrandLoader } from "@/components/brand/brand-loader"

// A template re-mounts on every navigation (unlike a layout), so this runs on
// each route change within the portal — including module-to-module. It shows the
// branded overlay for a guaranteed minimum time, then fades it out. The page is
// already rendered underneath, so the reveal is instant once the splash clears.
const HOLD_MS = 900 // visible duration
const FADE_MS = 450 // fade-out duration

export default function AppTemplate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<"show" | "fade" | "done">("show")

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("fade"), HOLD_MS)
    const t2 = setTimeout(() => setPhase("done"), HOLD_MS + FADE_MS)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  return (
    <>
      {phase !== "done" ? <BrandLoader exiting={phase === "fade"} /> : null}
      {children}
    </>
  )
}
