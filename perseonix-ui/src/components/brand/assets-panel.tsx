"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Globe, Loader2, Plus, RadarIcon, Trash2, TriangleAlert } from "lucide-react"
import {
  addProtectedDomain,
  removeProtectedDomain,
  scanProtectedDomain,
  setScheduleAction,
} from "@/app/app/modules/brand/actions"
import type { AssetRow } from "@/lib/brand/store"
import { cn } from "@/lib/utils"

function ago(iso: string | null): string {
  if (!iso) return "never scanned"
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000)
  if (h < 1) return "scanned just now"
  if (h < 24) return `scanned ${h}h ago`
  return `scanned ${Math.floor(h / 24)}d ago`
}

export function AssetsPanel({ assets }: { assets: AssetRow[] }) {
  const router = useRouter()
  const [value, setValue] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [adding, startAdd] = useTransition()

  function add() {
    setError(null)
    startAdd(async () => {
      const res = await addProtectedDomain(value)
      if (!res.ok) return setError(res.error ?? "Could not add domain.")
      setValue("")
      router.refresh()
    })
  }

  return (
    <section className="rounded-lg border border-ink/[0.09] bg-navy-900/50 p-5">
      <h2 className="flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.16em] text-ink uppercase">
        <Globe className="size-4 text-glow" />
        Protected domains
      </h2>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="yourcompany.com"
          autoComplete="off"
          spellCheck={false}
          className="h-10 flex-1 rounded-md border border-ink/12 bg-navy-950/60 px-3 font-mono text-[13px] text-ink outline-none transition-colors hover:border-ink/25 focus-visible:border-glow/60 focus-visible:ring-2 focus-visible:ring-glow/20"
        />
        <button
          type="submit"
          disabled={adding || !value.trim()}
          className="inline-flex h-10 items-center gap-1.5 rounded-md bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand/90 disabled:opacity-60"
        >
          {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Add domain
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-alert">{error}</p>}

      {assets.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Add the domain you want protected. We&apos;ll hunt for lookalike and typosquat domains impersonating it.
        </p>
      ) : (
        <ul className="mt-4 grid gap-2">
          {assets.map((a) => (
            <AssetItem key={a.id} asset={a} />
          ))}
        </ul>
      )}
    </section>
  )
}

function AssetItem({ asset }: { asset: AssetRow }) {
  const router = useRouter()
  const [scanning, startScan] = useTransition()
  const [removing, startRemove] = useTransition()
  const [scheduling, startSchedule] = useTransition()
  const [result, setResult] = useState<string | null>(null)

  function scan() {
    setResult(null)
    startScan(async () => {
      const res = await scanProtectedDomain(asset.id)
      setResult(res.ok ? `${res.findings} found · ${res.newFindings} new` : res.error ?? "Scan failed")
      if (res.ok) router.refresh()
    })
  }

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-md border border-ink/[0.08] bg-navy-800/50 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-mono text-[13px] font-medium text-ink">
          {asset.domain}
          {asset.newCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sev-critical/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-sev-critical">
              <TriangleAlert className="size-3" />
              {asset.newCount} new
            </span>
          )}
        </p>
        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
          {asset.detectionCount} detection{asset.detectionCount === 1 ? "" : "s"} · {ago(asset.lastScanAt)}
        </p>
      </div>
      {result && (
        <span className={cn("font-mono text-[11px]", scanning ? "text-muted-foreground" : "text-ok")}>{result}</span>
      )}
      <label className="flex items-center gap-1.5">
        <span className="font-mono text-[9px] tracking-wider text-muted-foreground/55 uppercase">Auto</span>
        <select
          value={asset.scanIntervalHours ?? 0}
          onChange={(e) => {
            const h = Number(e.target.value)
            startSchedule(async () => {
              await setScheduleAction(asset.id, h > 0 ? h : null)
              router.refresh()
            })
          }}
          disabled={scheduling}
          className="h-9 appearance-none rounded-md border border-ink/12 bg-navy-950/60 px-2 font-mono text-[11px] text-ink outline-none hover:border-ink/25 focus-visible:border-glow/60 disabled:opacity-60"
        >
          <option value={0}>Manual</option>
          <option value={6}>4× / day</option>
          <option value={12}>2× / day</option>
          <option value={24}>Daily</option>
        </select>
      </label>
      <button
        type="button"
        onClick={scan}
        disabled={scanning}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-glow/40 bg-glow/10 px-3 text-sm font-medium text-glow transition-colors hover:bg-glow/20 disabled:opacity-60"
      >
        {scanning ? <Loader2 className="size-4 animate-spin" /> : <RadarIcon className="size-4" />}
        {scanning ? "Scanning…" : "Scan now"}
      </button>
      <button
        type="button"
        aria-label={`Remove ${asset.domain}`}
        onClick={() => startRemove(async () => { await removeProtectedDomain(asset.id); router.refresh() })}
        disabled={removing}
        className="inline-flex size-9 items-center justify-center rounded-md border border-ink/10 text-muted-foreground transition-colors hover:border-sev-critical/30 hover:text-alert disabled:opacity-60"
      >
        {removing ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      </button>
    </li>
  )
}
