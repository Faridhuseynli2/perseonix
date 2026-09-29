"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowUpRight, Loader2, Network, Search, Trash2 } from "lucide-react"
import { GraphCanvas } from "@/components/investigate/graph/graph-canvas"
import { expandNodeAction, startGraphAction } from "@/app/app/modules/investigate/graph/actions"
import type { GEdge, GNode } from "@/lib/investigate/graph"
import { cn } from "@/lib/utils"

const KIND_LABEL: Record<string, string> = {
  domain: "Domain",
  ip: "IP address",
  asn: "Network (ASN)",
  cert: "TLS certificate",
  service: "Exposed service",
  cve: "Vulnerability",
  malware: "Malware",
  verdict: "Threat verdict",
  registrar: "Registrar",
}
const KIND_DOT: Record<string, string> = {
  domain: "bg-glow",
  ip: "bg-brand",
  asn: "bg-muted-foreground",
  cert: "bg-signal",
  service: "bg-ok",
  cve: "bg-sev-high",
  malware: "bg-sev-critical",
  verdict: "bg-sev-critical",
  registrar: "bg-muted-foreground",
}

const LEGEND: { kind: string; label: string }[] = [
  { kind: "domain", label: "Domain" },
  { kind: "ip", label: "IP" },
  { kind: "asn", label: "ASN" },
  { kind: "cert", label: "Cert" },
  { kind: "service", label: "Service" },
  { kind: "cve", label: "CVE" },
  { kind: "verdict", label: "Threat" },
]

function mergeFragment(nodes: GNode[], edges: GEdge[], frag: { nodes: GNode[]; edges: GEdge[] }) {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  for (const n of frag.nodes) {
    const existing = byId.get(n.id)
    // Keep expandable/root flags; merge meta so an expanded node gains detail.
    byId.set(n.id, existing ? { ...existing, ...n, meta: { ...existing.meta, ...n.meta } } : n)
  }
  const seen = new Set(edges.map((e) => `${e.source}->${e.target}:${e.label ?? ""}`))
  const nextEdges = [...edges]
  for (const e of frag.edges) {
    const k = `${e.source}->${e.target}:${e.label ?? ""}`
    if (e.source !== e.target && !seen.has(k)) {
      seen.add(k)
      nextEdges.push(e)
    }
  }
  return { nodes: [...byId.values()], edges: nextEdges }
}

export function GraphExplorer({ initial = "" }: { initial?: string }) {
  const [indicator, setIndicator] = useState(initial)
  const [rootId, setRootId] = useState<string | null>(null)
  const [graph, setGraph] = useState<{ nodes: GNode[]; edges: GEdge[] }>({ nodes: [], edges: [] })
  const [selected, setSelected] = useState<GNode | null>(null)
  const [expanding, setExpanding] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { nodes, edges } = graph

  const start = useCallback(async () => {
    const q = indicator.trim()
    if (!q || loading) return
    setLoading(true)
    setError(null)
    setSelected(null)
    setExpanded(new Set())
    const res = await startGraphAction(q)
    setLoading(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setRootId(res.rootId)
    setGraph({ nodes: res.fragment.nodes, edges: res.fragment.edges })
    setExpanded(new Set([res.rootId]))
  }, [indicator, loading])

  const expand = useCallback(
    async (n: GNode) => {
      if (!n.expandable) return
      let already = false
      setExpanding((s) => {
        if (s.has(n.id)) already = true
        return new Set(s).add(n.id)
      })
      if (already) return
      const frag = await expandNodeAction(n.kind, n.value)
      setGraph((g) => mergeFragment(g.nodes, g.edges, frag))
      setExpanding((s) => {
        const next = new Set(s)
        next.delete(n.id)
        return next
      })
      setExpanded((s) => new Set(s).add(n.id))
    },
    []
  )

  const reset = () => {
    setRootId(null)
    setGraph({ nodes: [], edges: [] })
    setSelected(null)
    setExpanded(new Set())
    setError(null)
  }

  // Auto-run once when arriving with ?q=<indicator> (e.g. "Pivot in Graph").
  const autoRan = useRef(false)
  useEffect(() => {
    if (initial && !autoRan.current) {
      autoRan.current = true
      start()
    }
  }, [initial, start])

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/60" />
          <input
            value={indicator}
            onChange={(e) => setIndicator(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && start()}
            placeholder="Enter a domain or IP — e.g. example.com or 8.8.8.8"
            className="h-11 w-full rounded-lg border border-ink/10 bg-navy-950/50 pl-10 pr-3 font-mono text-sm text-ink placeholder:text-muted-foreground/50 outline-none focus:border-glow/60 focus:ring-2 focus:ring-glow/20"
          />
        </div>
        <button
          type="button"
          onClick={start}
          disabled={loading || !indicator.trim()}
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand px-5 text-sm font-medium text-white transition-colors hover:bg-brand/90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Network className="size-4" />}
          {loading ? "Mapping…" : "Map infrastructure"}
        </button>
        {nodes.length > 0 && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-ink/10 px-3 text-sm text-muted-foreground transition-colors hover:text-ink"
          >
            <Trash2 className="size-4" /> Clear
          </button>
        )}
      </div>
      {error && <p className="text-sm text-sev-critical">{error}</p>}

      {nodes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink/12 bg-navy-900/30 px-6 py-20 text-center">
          <Network className="mx-auto size-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-foreground/85">Map an adversary&apos;s infrastructure</p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground/70">
            Enter a domain or IP to draw its live link graph — resolutions, shared certificates, hosting network, exposed
            services and threat verdicts. <strong className="text-foreground/80">Double-click any node to pivot</strong> and
            expand outward.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,320px)]">
          {/* Canvas */}
          <div className="relative h-[600px]">
            <GraphCanvas
              nodes={nodes}
              edges={edges}
              rootId={rootId!}
              selectedId={selected?.id ?? null}
              expandingIds={expanding}
              onSelect={setSelected}
              onExpand={expand}
            />
            <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-x-3 gap-y-1 rounded-md border border-ink/10 bg-navy-950/80 px-3 py-2">
              {LEGEND.map((l) => (
                <span key={l.kind} className="inline-flex items-center gap-1.5 font-mono text-[9px] tracking-wide text-muted-foreground uppercase">
                  <span aria-hidden className={cn("size-1.5 rounded-full", KIND_DOT[l.kind])} />
                  {l.label}
                </span>
              ))}
            </div>
            <div className="pointer-events-none absolute top-3 right-3 rounded-md border border-ink/10 bg-navy-950/80 px-3 py-1.5 font-mono text-[10px] text-muted-foreground/70">
              {nodes.length} nodes · {edges.length} links · double-click to pivot
            </div>
          </div>

          {/* Detail panel */}
          <NodeDetail node={selected} expanded={expanded.has(selected?.id ?? "")} onExpand={expand} />
        </div>
      )}
    </div>
  )
}

function NodeDetail({ node, expanded, onExpand }: { node: GNode | null; expanded: boolean; onExpand: (n: GNode) => void }) {
  if (!node) {
    return (
      <aside className="rounded-lg border border-ink/[0.09] bg-navy-900/40 p-5">
        <p className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground/60 uppercase">Node inspector</p>
        <p className="mt-3 text-sm text-muted-foreground">Select a node to see its details and pivots.</p>
      </aside>
    )
  }
  const meta = node.meta ?? {}
  return (
    <aside className="grid content-start gap-3 rounded-lg border border-ink/[0.09] bg-navy-900/40 p-5">
      <div>
        <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-muted-foreground/60 uppercase">
          <span aria-hidden className={cn("size-1.5 rounded-full", node.danger ? "bg-sev-critical" : KIND_DOT[node.kind])} />
          {KIND_LABEL[node.kind] ?? node.kind}
        </p>
        <p className="mt-1.5 font-mono text-sm break-all text-ink">{node.label}</p>
        {node.sub && <p className="mt-0.5 text-xs text-muted-foreground">{node.sub}</p>}
      </div>

      {/* Meta rows */}
      <dl className="grid gap-1.5 border-t border-ink/[0.07] pt-3 text-[12px]">
        {Object.entries(meta)
          .filter(([k, v]) => k !== "root" && v != null && (!Array.isArray(v) || v.length))
          .slice(0, 8)
          .map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <dt className="font-mono text-[10px] tracking-wide text-muted-foreground/60 uppercase">{k}</dt>
              <dd className="min-w-0 truncate text-right text-foreground/85">{Array.isArray(v) ? v.slice(0, 4).join(", ") : String(v)}</dd>
            </div>
          ))}
      </dl>

      <div className="grid gap-2 border-t border-ink/[0.07] pt-3">
        {node.expandable && (
          <button
            type="button"
            onClick={() => onExpand(node)}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-brand/90 px-3 text-sm font-medium text-white transition-colors hover:bg-brand"
          >
            <Network className="size-4" /> {expanded ? "Expand again" : "Pivot / expand"}
          </button>
        )}
        {(node.kind === "domain" || node.kind === "ip") && (
          <Link
            href={`/app/modules/investigate?q=${encodeURIComponent(node.value)}`}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-ink/12 px-3 text-sm text-foreground/85 transition-colors hover:bg-ink/[0.06] hover:text-ink"
          >
            Full report <ArrowUpRight className="size-3.5" />
          </Link>
        )}
        {node.kind === "cve" && (
          <Link
            href={`/app/modules/intel/cve/${encodeURIComponent(node.value)}`}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-ink/12 px-3 text-sm text-foreground/85 transition-colors hover:bg-ink/[0.06] hover:text-ink"
          >
            View CVE <ArrowUpRight className="size-3.5" />
          </Link>
        )}
      </div>
    </aside>
  )
}
