"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Camera, RefreshCw, ShieldAlert } from "lucide-react"
import type { UrlscanPoll } from "@/lib/investigate/types"

const FIRST_POLL_MS = 10_000 // urlscan.io needs ~10s before a result exists
const POLL_INTERVAL_MS = 5_000
const MAX_POLLS = 30

export function UrlscanPanel({ investigationId }: { investigationId: string }) {
  const [poll, setPoll] = useState<UrlscanPoll>({ state: "pending" })

  useEffect(() => {
    let cancelled = false
    let attempts = 0
    let timer: ReturnType<typeof setTimeout>

    const check = async () => {
      attempts += 1
      try {
        const response = await fetch(`/app/modules/investigate/${investigationId}/urlscan`, {
          cache: "no-store",
        })
        const next = (await response.json()) as UrlscanPoll
        if (cancelled) return
        if (next.state === "pending" && attempts >= MAX_POLLS) {
          setPoll({ state: "error", message: "The scan is taking longer than usual. Reload later." })
          return
        }
        setPoll(next)
        if (next.state === "pending") timer = setTimeout(check, POLL_INTERVAL_MS)
      } catch {
        if (!cancelled) setPoll({ state: "error", message: "Couldn't reach urlscan.io." })
      }
    }

    timer = setTimeout(check, FIRST_POLL_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [investigationId])

  return (
    <section className="overflow-hidden rounded-xl border border-ink/[0.07] bg-navy-800/60 lg:col-span-2">
      <header className="flex items-center justify-between gap-3 border-b border-ink/[0.06] px-5 py-3.5">
        <h2 className="flex items-center gap-2.5 text-sm font-semibold text-ink">
          <span className="grid size-7 place-items-center rounded-md bg-brand/10 ring-1 ring-brand/20">
            <Camera className="size-3.5 text-glow" />
          </span>
          Screenshot scan
        </h2>
        <span className="font-mono text-[10px] tracking-wider text-muted-foreground/70 uppercase">
          urlscan.io · private
        </span>
      </header>
      <div className="p-5 text-sm">
        {poll.state === "pending" && (
          <p aria-live="polite" className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="size-4 animate-spin" />
            Scanning the page in an isolated browser…
          </p>
        )}
        {poll.state === "gone" && <p className="text-muted-foreground">This scan is no longer available.</p>}
        {poll.state === "error" && <p className="text-alert">{poll.message}</p>}
        {poll.state === "done" && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Image
              src={`/app/modules/investigate/${investigationId}/screenshot`}
              alt={`Screenshot of ${poll.summary.url ?? "the scanned page"}`}
              width={1280}
              height={1024}
              unoptimized
              className="h-auto w-full rounded-lg border border-ink/10"
            />
            <dl className="grid content-start gap-2.5">
              {poll.summary.malicious && (
                <p className="mb-1 flex items-center gap-2 font-medium text-alert">
                  <ShieldAlert className="size-4" /> urlscan.io classifies this page as malicious
                </p>
              )}
              {(
                [
                  ["Page", poll.summary.title],
                  ["URL", poll.summary.url],
                  ["IP", poll.summary.ip],
                  ["Country", poll.summary.country],
                  ["Server", poll.summary.server],
                  ["Requests", poll.summary.requests?.toString()],
                  ["Domains contacted", poll.summary.domains?.toString()],
                  ["Brands", poll.summary.brands.join(", ")],
                  ["Categories", poll.summary.categories.join(", ")],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-3">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="min-w-0 break-words text-foreground/90">{value || "—"}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </section>
  )
}
