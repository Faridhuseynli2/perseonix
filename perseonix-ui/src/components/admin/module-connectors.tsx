"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Copy, Eye, EyeOff, KeyRound, Pencil, Plug, Plus, Trash2, TriangleAlert, X } from "lucide-react"
import {
  createKeyAction,
  deleteKeyAction,
  renameKeyAction,
  revealKeyAction,
  revokeKeyAction,
} from "@/app/app/admin/connectors/modules/actions"
import type { IngestConnector } from "@/lib/intel/connectors"
import type { IngestKeyRow } from "@/lib/intel/ingest-keys"
import { cn } from "@/lib/utils"

function ago(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setDone(true)
          setTimeout(() => setDone(false), 1500)
        } catch {
          /* clipboard blocked — ignore */
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-md border border-ink/12 bg-ink/[0.03] px-2.5 py-1 text-xs text-foreground/85 transition-colors hover:bg-ink/[0.07] hover:text-ink"
    >
      {done ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5" />}
      {done ? "Copied" : label}
    </button>
  )
}

function ConnectorCard({
  connector,
  keys,
  focused,
}: {
  connector: IngestConnector
  keys: IngestKeyRow[]
  focused: boolean
}) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [created, setCreated] = useState<{ fullKey: string; prefix: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function generate() {
    if (!name.trim()) {
      setError("Give the key a name (e.g. “n8n prod”).")
      return
    }
    setError(null)
    start(async () => {
      const res = await createKeyAction(connector.key, name)
      if (!res.ok) {
        setError(res.error)
        return
      }
      setCreated({ fullKey: res.fullKey, prefix: res.prefix })
      setName("")
      router.refresh()
    })
  }

  const active = keys.filter((k) => !k.revokedAt)

  return (
    <section
      className={cn(
        "rounded-xl border bg-navy-900/50 p-5",
        focused ? "border-glow/40 shadow-halo-brand" : "border-ink/[0.09]"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-ink/10 bg-navy-800 text-glow">
            <Plug className="size-4.5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-ink">{connector.name}</h2>
            <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-muted-foreground">{connector.description}</p>
            <p className="mt-1.5 font-mono text-[11px] text-muted-foreground/70">
              POST <span className="text-foreground/80">{connector.endpoint}</span>
            </p>
          </div>
        </div>
        <span className="font-mono text-[10px] tracking-wide text-muted-foreground/60 uppercase">
          {active.length} active key{active.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Generate */}
      <div className="mt-4 flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <label className="mb-1 block font-mono text-[10px] tracking-wider text-muted-foreground/70 uppercase">
            New ingestion key
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Key name — e.g. n8n prod"
            className="h-9 w-full rounded-md border border-ink/10 bg-navy-950/50 px-3 text-sm text-ink placeholder:text-muted-foreground/60 outline-none focus:border-glow/60 focus:ring-2 focus:ring-glow/20"
          />
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={pending}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand/90 disabled:opacity-50"
        >
          <Plus className="size-4" />
          {pending ? "Generating…" : "Generate key"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-sev-critical">{error}</p>}

      {/* One-time reveal */}
      {created && (
        <div className="mt-3 rounded-lg border border-glow/30 bg-glow/[0.05] p-3.5">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink">
              <TriangleAlert className="size-3.5 text-signal" />
              Copy this key now — it is shown only once.
            </p>
            <button type="button" onClick={() => setCreated(null)} className="text-muted-foreground hover:text-ink">
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2 rounded-md border border-ink/10 bg-navy-950/60 px-3 py-2">
            <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-glow">{created.fullKey}</code>
            <CopyButton value={created.fullKey} />
          </div>
          <p className="mt-2 font-mono text-[10px] leading-relaxed text-muted-foreground/70">
            In n8n, send it as a header:
          </p>
          <div className="mt-1 flex items-center gap-2 rounded-md border border-ink/[0.07] bg-navy-950/40 px-3 py-1.5">
            <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-foreground/80">
              Authorization: Bearer {created.fullKey}
            </code>
            <CopyButton value={`Authorization: Bearer ${created.fullKey}`} label="Copy header" />
          </div>
        </div>
      )}

      {/* Existing keys */}
      {keys.length > 0 && (
        <ul className="mt-4 grid gap-1.5">
          {keys.map((k) => (
            <KeyRow key={k.id} k={k} connectorKey={connector.key} />
          ))}
        </ul>
      )}
    </section>
  )
}

function KeyRow({ k, connectorKey }: { k: IngestKeyRow; connectorKey: string }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(k.name)
  const [confirming, setConfirming] = useState<"revoke" | "delete" | null>(null)
  const [revealed, setRevealed] = useState<string | null>(null)
  const [revealErr, setRevealErr] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function toggleReveal() {
    if (revealed) {
      setRevealed(null)
      return
    }
    setRevealErr(null)
    start(async () => {
      const res = await revealKeyAction(k.id, connectorKey)
      if (!res.ok || !res.key) setRevealErr(res.error ?? "Could not reveal.")
      else setRevealed(res.key)
    })
  }

  function saveName() {
    if (!draftName.trim()) return
    start(async () => {
      await renameKeyAction(k.id, connectorKey, draftName)
      setEditing(false)
      router.refresh()
    })
  }

  function doConfirm() {
    start(async () => {
      if (confirming === "delete") await deleteKeyAction(k.id, connectorKey)
      else if (confirming === "revoke") await revokeKeyAction(k.id, connectorKey)
      setConfirming(null)
      setRevealed(null)
      router.refresh()
    })
  }

  return (
    <li className="rounded-md border border-ink/[0.06] bg-navy-950/40 px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <KeyRound className={cn("size-3.5 shrink-0", k.revokedAt ? "text-muted-foreground/40" : "text-glow")} />
          <div className="min-w-0">
            {editing ? (
              <div className="flex items-center gap-1.5">
                <input
                  value={draftName}
                  autoFocus
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveName()
                    if (e.key === "Escape") {
                      setEditing(false)
                      setDraftName(k.name)
                    }
                  }}
                  className="h-7 w-44 rounded border border-ink/10 bg-navy-900/70 px-2 text-sm text-ink outline-none focus:border-glow/60"
                />
                <button type="button" onClick={saveName} disabled={pending} className="text-ok hover:text-ink">
                  <Check className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false)
                    setDraftName(k.name)
                  }}
                  className="text-muted-foreground hover:text-ink"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <p className="flex items-center gap-2 text-sm text-ink">
                <span className="truncate">{k.name}</span>
                {k.revokedAt && (
                  <span className="rounded border border-ink/10 px-1.5 py-0.5 font-mono text-[9px] tracking-wide text-muted-foreground/60 uppercase">
                    revoked
                  </span>
                )}
              </p>
            )}
            <p className="font-mono text-[10.5px] text-muted-foreground/60">
              {k.prefix}… · created {ago(k.createdAt)} · {k.lastUsedAt ? `used ${ago(k.lastUsedAt)}` : "never used"}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={toggleReveal}
            disabled={pending}
            title={revealed ? "Hide key" : "Reveal key"}
            className="grid size-7 place-items-center rounded text-muted-foreground transition-colors hover:bg-ink/[0.06] hover:text-ink disabled:opacity-50"
          >
            {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(true)
              setDraftName(k.name)
            }}
            title="Rename"
            className="grid size-7 place-items-center rounded text-muted-foreground transition-colors hover:bg-ink/[0.06] hover:text-ink"
          >
            <Pencil className="size-3.5" />
          </button>
          {k.revokedAt ? (
            <button
              type="button"
              onClick={() => setConfirming("delete")}
              title="Delete"
              className="grid size-7 place-items-center rounded text-muted-foreground transition-colors hover:bg-ink/[0.06] hover:text-ink"
            >
              <Trash2 className="size-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming("revoke")}
              className="inline-flex items-center rounded-md border border-ink/10 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-sev-critical/40 hover:text-sev-critical"
            >
              Revoke
            </button>
          )}
        </div>
      </div>

      {/* Revealed key */}
      {revealed && (
        <div className="mt-2 flex items-center gap-2 rounded-md border border-ink/10 bg-navy-950/70 px-3 py-1.5">
          <code className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-glow">{revealed}</code>
          <CopyButton value={revealed} />
        </div>
      )}
      {revealErr && <p className="mt-1.5 text-xs text-sev-critical">{revealErr}</p>}

      {/* Confirm bar */}
      {confirming && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-sev-critical/25 bg-sev-critical/[0.06] px-3 py-2">
          <p className="text-xs text-ink">
            {confirming === "delete" ? "Delete this key permanently?" : "Revoke this key? n8n using it will stop working."}
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={doConfirm}
              disabled={pending}
              className="inline-flex items-center rounded-md bg-sev-critical px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-sev-critical/90 disabled:opacity-50"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setConfirming(null)}
              className="inline-flex items-center rounded-md border border-ink/12 px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-ink"
            >
              No
            </button>
          </div>
        </div>
      )}
    </li>
  )
}

export function ModuleConnectors({
  connectors,
  keysByConnector,
  focus,
}: {
  connectors: IngestConnector[]
  keysByConnector: Record<string, IngestKeyRow[]>
  focus?: string
}) {
  return (
    <div className="grid gap-4">
      {connectors.map((c) => (
        <ConnectorCard key={c.key} connector={c} keys={keysByConnector[c.key] ?? []} focused={focus === c.key} />
      ))}
    </div>
  )
}
