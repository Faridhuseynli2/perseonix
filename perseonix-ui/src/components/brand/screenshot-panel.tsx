"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Camera, Loader2, ShieldAlert } from "lucide-react"
import { captureScreenshotAction } from "@/app/app/modules/brand/actions"

export function ScreenshotPanel({
  detectionId,
  hasShot,
  capturedAt,
}: {
  detectionId: string
  hasShot: boolean
  capturedAt: string | null
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  // Cache-bust so a re-capture shows the new image.
  const [v, setV] = useState(capturedAt ?? "")

  function capture() {
    setError(null)
    start(async () => {
      const res = await captureScreenshotAction(detectionId)
      if (!res.ok) return setError(res.error ?? "Capture failed.")
      setV(String(Date.now()))
      router.refresh()
    })
  }

  return (
    <div>
      {hasShot ? (
        <div className="overflow-hidden rounded-lg border border-ink/[0.1]">
          {/* Isolated sandbox render; never an interactive link to the site. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/app/modules/brand/detections/${detectionId}/screenshot?v=${encodeURIComponent(v)}`}
            alt="Sandbox render of the suspected lookalike site"
            className="block w-full"
          />
        </div>
      ) : (
        <div className="grid place-items-center gap-3 rounded-lg border border-dashed border-ink/12 bg-navy-950/40 px-6 py-12 text-center">
          <ShieldAlert className="size-7 text-muted-foreground/40" />
          <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
            No screenshot yet. Capture renders the site in an isolated sandbox — you never visit it directly.
          </p>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={capture}
          disabled={pending}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-glow/40 bg-glow/10 px-3.5 text-sm font-medium text-glow transition-colors hover:bg-glow/20 disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
          {pending ? "Capturing…" : hasShot ? "Re-capture" : "Capture screenshot"}
        </button>
        {capturedAt && !error && (
          <span className="font-mono text-[10px] text-muted-foreground/60">captured {new Date(capturedAt).toLocaleString("en-GB")}</span>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-alert">{error}</p>}
    </div>
  )
}
