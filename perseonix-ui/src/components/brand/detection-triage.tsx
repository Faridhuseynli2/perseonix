"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { setDetectionStatusAction } from "@/app/app/modules/brand/actions"
import { STATUS_LABEL, type DetectionStatus } from "@/lib/brand/meta"
import { cn } from "@/lib/utils"

const STATUSES: DetectionStatus[] = ["new", "malicious", "benign", "monitoring"]

export function DetectionTriage({ id, status: initial }: { id: string; status: string }) {
  const router = useRouter()
  const [status, setStatus] = useState(initial)
  const [pending, start] = useTransition()

  function change(next: DetectionStatus) {
    if (next === status) return
    setStatus(next)
    start(async () => {
      await setDetectionStatusAction(id, next)
      router.refresh()
    })
  }

  return (
    <div className="inline-flex items-center rounded-md border border-ink/10 bg-navy-950/50 p-0.5">
      {STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => change(s)}
          disabled={pending}
          className={cn(
            "rounded px-2.5 py-1.5 font-mono text-[10px] tracking-wide uppercase transition-colors disabled:opacity-60",
            status === s
              ? s === "malicious"
                ? "bg-sev-critical text-white"
                : s === "benign"
                  ? "bg-ok/80 text-white"
                  : "bg-ink/[0.12] text-ink"
              : "text-muted-foreground hover:text-ink"
          )}
        >
          {STATUS_LABEL[s]}
        </button>
      ))}
    </div>
  )
}
