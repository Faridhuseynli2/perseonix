"use client"

import { useActionState, useState } from "react"
import { ArrowUpRight, Check, KeyRound, Loader2, Trash2, X } from "lucide-react"
import {
  removeConnectorKeyAction,
  saveConnectorKeyAction,
  toggleConnector,
} from "@/app/app/admin/connectors/actions"
import { fieldClass } from "@/components/admin/ui"
import type { ActionState } from "@/lib/action-state"
import type { ConnectorView } from "@/lib/connectors/config"
import { cn } from "@/lib/utils"

const initialState: ActionState = {}

function statusStyle(connector: ConnectorView) {
  if (connector.active) return { label: "Active", cls: "bg-ok/10 text-ok ring-ok/30", dot: "bg-ok" }
  if (connector.configured) return { label: "Disabled", cls: "bg-signal/10 text-signal ring-signal/30", dot: "bg-signal" }
  return { label: "Not configured", cls: "bg-ink/[0.05] text-muted-foreground ring-ink/15", dot: "bg-ink/25" }
}

export function ConnectorCard({ connector }: { connector: ConnectorView }) {
  const [editing, setEditing] = useState(false)
  const [state, formAction, pending] = useActionState(
    saveConnectorKeyAction.bind(null, connector.id),
    initialState
  )
  const status = statusStyle(connector)

  // A saved key was submitted successfully — collapse the editor.
  if (state.success && editing) setEditing(false)

  return (
    <div className="rounded-xl border border-ink/[0.07] bg-navy-800/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-ink">{connector.name}</h3>
            <a
              href={connector.docsUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-0.5 font-mono text-[11px] text-muted-foreground hover:text-glow"
            >
              {connector.provider}
              <ArrowUpRight className="size-3" />
            </a>
          </div>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">{connector.description}</p>
        </div>
        <span
          className={cn(
            "inline-flex h-6 items-center gap-1.5 rounded-md px-2 font-mono text-[10px] tracking-wider uppercase ring-1 ring-inset",
            status.cls
          )}
        >
          <span aria-hidden className={cn("size-1.5 rounded-full", status.dot)} />
          {status.label}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-ink/[0.06] pt-3 text-xs">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <KeyRound className="size-3.5" />
          {connector.keyHint ? (
            <>
              <span className="font-mono text-foreground/85">{connector.keyHint}</span>
              <span className="text-muted-foreground/60">
                {connector.keySource === "environment" ? "via environment" : "saved"}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground/70">No API key set</span>
          )}
        </span>
      </div>

      {editing ? (
        <form action={formAction} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="password"
            name="apiKey"
            autoComplete="off"
            autoFocus
            required
            placeholder={`Paste ${connector.name} API key`}
            aria-label={`${connector.name} API key`}
            className={cn(fieldClass, "h-9 flex-1 font-mono text-[13px]")}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand px-3 text-sm font-medium text-white transition-colors hover:bg-brand/90 disabled:opacity-60"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-ink/10 px-3 text-sm text-muted-foreground transition-colors hover:bg-ink/[0.04] hover:text-ink"
            >
              <X className="size-4" />
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {/* Toggle needs a configured key to activate. */}
          <form action={toggleConnector.bind(null, connector.id, !connector.enabled)}>
            <button
              type="submit"
              disabled={!connector.configured}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                connector.enabled
                  ? "border-ok/30 text-ok hover:bg-ok/[0.06]"
                  : "border-ink/10 text-muted-foreground hover:bg-ink/[0.04] hover:text-ink"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "relative inline-flex h-4 w-7 items-center rounded-full transition-colors",
                  connector.enabled ? "bg-ok/70" : "bg-ink/15"
                )}
              >
                <span
                  className={cn(
                    "absolute size-3 rounded-full bg-white transition-transform",
                    connector.enabled ? "translate-x-3.5" : "translate-x-0.5"
                  )}
                />
              </span>
              {connector.enabled ? "Enabled" : "Disabled"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-ink/10 px-3 text-sm text-muted-foreground transition-colors hover:bg-ink/[0.04] hover:text-ink"
          >
            <KeyRound className="size-4" />
            {connector.keySource === "saved" ? "Replace key" : "Set key"}
          </button>

          {connector.keySource === "saved" && (
            <form action={removeConnectorKeyAction.bind(null, connector.id)}>
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-ink/10 px-3 text-sm text-muted-foreground transition-colors hover:border-sev-critical/30 hover:text-alert"
              >
                <Trash2 className="size-4" />
                Remove
              </button>
            </form>
          )}
        </div>
      )}

      {state.error && <p className="mt-2 text-xs text-alert">{state.error}</p>}
      {state.success && !editing && <p className="mt-2 text-xs text-ok">{state.success}</p>}

      {connector.licenseNote && (
        <p className="mt-3 border-t border-ink/[0.06] pt-3 text-[11px] leading-relaxed text-muted-foreground/70">
          {connector.licenseNote}
        </p>
      )}
    </div>
  )
}
