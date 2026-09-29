"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import type { GEdge, GNode } from "@/lib/investigate/graph"

type Pt = { x: number; y: number; vx: number; vy: number; fixed?: boolean }
type XY = { x: number; y: number }

const KIND_COLOR: Record<string, string> = {
  domain: "#00b5fa",
  ip: "#128eec",
  asn: "#8a8f9c",
  cert: "#ffb400",
  service: "#6ee7b7",
  cve: "#ff8a3d",
  malware: "#ff4d5e",
  verdict: "#ff4d5e",
  registrar: "#9aa0ad",
}

const radius = (n: GNode, rootId: string) => (n.id === rootId ? 13 : n.expandable ? 9 : 6.5)

/** Self-contained force-directed graph (no external lib). Drag nodes, click to
 *  select, double-click to pivot/expand, wheel to zoom, drag background to pan.
 *  Simulation state lives in a ref; a per-frame snapshot in state drives render. */
export function GraphCanvas({
  nodes,
  edges,
  rootId,
  selectedId,
  expandingIds,
  onSelect,
  onExpand,
}: {
  nodes: GNode[]
  edges: GEdge[]
  rootId: string
  selectedId: string | null
  expandingIds: Set<string>
  onSelect: (n: GNode) => void
  onExpand: (n: GNode) => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const sim = useRef<Map<string, Pt>>(new Map())
  const alpha = useRef(1)
  const [positions, setPositions] = useState<Record<string, XY>>({})
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [view, setView] = useState({ tx: 400, ty: 300, k: 1 })
  const viewRef = useRef(view)
  useEffect(() => { viewRef.current = view }, [view])
  const drag = useRef<{ id: string | null; pan: boolean; px: number; py: number; moved: boolean }>({ id: null, pan: false, px: 0, py: 0, moved: false })

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const apply = () => {
      const r = el.getBoundingClientRect()
      setSize({ w: r.width, h: r.height })
      setView((v) => ({ ...v, tx: v.tx === 400 ? r.width / 2 : v.tx, ty: v.ty === 300 ? r.height / 2 : v.ty }))
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Seed positions for new nodes; drop removed ones.
  useEffect(() => {
    const p = sim.current
    let added = 0
    nodes.forEach((n, i) => {
      if (!p.has(n.id)) {
        if (n.id === rootId) p.set(n.id, { x: 0, y: 0, vx: 0, vy: 0, fixed: true })
        else {
          const a = (i * 137.5 * Math.PI) / 180
          const rr = 70 + Math.random() * 130
          p.set(n.id, { x: Math.cos(a) * rr, y: Math.sin(a) * rr, vx: 0, vy: 0 })
        }
        added++
      }
    })
    const ids = new Set(nodes.map((n) => n.id))
    for (const id of [...p.keys()]) if (!ids.has(id)) p.delete(id)
    if (added) alpha.current = 1
  }, [nodes, rootId])

  const snapshot = useCallback(() => {
    const snap: Record<string, XY> = {}
    for (const [id, pt] of sim.current) snap[id] = { x: pt.x, y: pt.y }
    setPositions(snap)
  }, [])

  // Simulation loop — always scheduled, but only computes + re-renders while "warm".
  useEffect(() => {
    let frame = 0
    const tick = () => {
      const a = alpha.current
      if (a > 0.02) {
        const p = sim.current
        const ids = nodes.map((n) => n.id)
        for (let i = 0; i < ids.length; i++) {
          const pi = p.get(ids[i])
          if (!pi) continue
          for (let j = i + 1; j < ids.length; j++) {
            const pj = p.get(ids[j])
            if (!pj) continue
            let dx = pi.x - pj.x
            let dy = pi.y - pj.y
            let d2 = dx * dx + dy * dy
            if (d2 < 0.01) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d2 = 0.01 }
            const d = Math.sqrt(d2)
            const f = (2800 * a) / d2
            const fx = (dx / d) * f
            const fy = (dy / d) * f
            if (!pi.fixed) { pi.vx += fx; pi.vy += fy }
            if (!pj.fixed) { pj.vx -= fx; pj.vy -= fy }
          }
        }
        for (const e of edges) {
          const s = p.get(e.source)
          const t = p.get(e.target)
          if (!s || !t) continue
          const dx = t.x - s.x
          const dy = t.y - s.y
          const d = Math.sqrt(dx * dx + dy * dy) || 0.01
          const f = (d - 95) * 0.03 * a
          const fx = (dx / d) * f
          const fy = (dy / d) * f
          if (!s.fixed) { s.vx += fx; s.vy += fy }
          if (!t.fixed) { t.vx -= fx; t.vy -= fy }
        }
        for (const id of ids) {
          const pt = p.get(id)
          if (!pt || pt.fixed) { if (pt) { pt.vx = 0; pt.vy = 0 } ; continue }
          pt.vx += -pt.x * 0.008 * a
          pt.vy += -pt.y * 0.008 * a
          pt.vx *= 0.82
          pt.vy *= 0.82
          pt.x += pt.vx
          pt.y += pt.vy
        }
        alpha.current = a * 0.985
        snapshot()
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [nodes, edges, snapshot])

  const toGraph = useCallback((clientX: number, clientY: number): XY => {
    const el = wrapRef.current
    const v = viewRef.current
    if (!el) return { x: 0, y: 0 }
    const r = el.getBoundingClientRect()
    return { x: (clientX - r.left - v.tx) / v.k, y: (clientY - r.top - v.ty) / v.k }
  }, [])

  const onPointerDown = (e: React.PointerEvent, n?: GNode) => {
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    if (n) {
      drag.current = { id: n.id, pan: false, px: e.clientX, py: e.clientY, moved: false }
      const pt = sim.current.get(n.id)
      if (pt) pt.fixed = true
      alpha.current = Math.max(alpha.current, 0.5)
    } else {
      drag.current = { id: null, pan: true, px: e.clientX, py: e.clientY, moved: false }
    }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (d.id) {
      d.moved = true
      const g = toGraph(e.clientX, e.clientY)
      const pt = sim.current.get(d.id)
      if (pt) { pt.x = g.x; pt.y = g.y; pt.vx = 0; pt.vy = 0 }
      alpha.current = Math.max(alpha.current, 0.1)
    } else if (d.pan) {
      d.moved = true
      const dxp = e.clientX - d.px
      const dyp = e.clientY - d.py
      d.px = e.clientX
      d.py = e.clientY
      setView((v) => ({ ...v, tx: v.tx + dxp, ty: v.ty + dyp }))
    }
  }
  const onPointerUp = () => {
    const d = drag.current
    if (d.id) {
      const pt = sim.current.get(d.id)
      if (pt && d.id !== rootId) pt.fixed = false
      alpha.current = Math.max(alpha.current, 0.3)
    }
    drag.current = { id: null, pan: false, px: 0, py: 0, moved: false }
  }
  const onWheel = (e: React.WheelEvent) => {
    const el = wrapRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const mx = e.clientX - r.left
    const my = e.clientY - r.top
    setView((v) => {
      const factor = e.deltaY < 0 ? 1.12 : 0.89
      const nk = Math.min(3, Math.max(0.25, v.k * factor))
      return { k: nk, tx: mx - ((mx - v.tx) * nk) / v.k, ty: my - ((my - v.ty) * nk) / v.k }
    })
  }

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full cursor-grab touch-none overflow-hidden rounded-lg border border-ink/[0.09] bg-navy-950/60 active:cursor-grabbing"
      onPointerDown={(e) => onPointerDown(e)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onWheel={onWheel}
    >
      <div aria-hidden className="hud-grid pointer-events-none absolute inset-0 opacity-30" />
      <svg width={size.w} height={size.h} className="relative block">
        <g transform={`translate(${view.tx},${view.ty}) scale(${view.k})`}>
          {edges.map((e, i) => {
            const s = positions[e.source]
            const t = positions[e.target]
            if (!s || !t) return null
            return (
              <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="currentColor" className="text-ink/15" strokeWidth={1 / view.k} />
            )
          })}
          {nodes.map((n) => {
            const pt = positions[n.id]
            if (!pt) return null
            const r = radius(n, rootId)
            const color = n.danger ? "#ff4d5e" : KIND_COLOR[n.kind] ?? "#8a8f9c"
            const selected = selectedId === n.id
            const busy = expandingIds.has(n.id)
            return (
              <g
                key={n.id}
                transform={`translate(${pt.x},${pt.y})`}
                className="cursor-pointer"
                onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, n) }}
                onClick={(e) => { e.stopPropagation(); if (!drag.current.moved) onSelect(n) }}
                onDoubleClick={(e) => { e.stopPropagation(); if (n.expandable) onExpand(n) }}
              >
                {selected && <circle r={r + 5} fill="none" stroke={color} strokeWidth={1.5 / view.k} opacity={0.7} />}
                {busy && (
                  <circle r={r + 5} fill="none" stroke={color} strokeWidth={1.5 / view.k} strokeDasharray="3 3" className="motion-safe:animate-spin" style={{ transformOrigin: "center" }} />
                )}
                <circle r={r} fill={color} fillOpacity={n.expandable ? 0.9 : 0.55} stroke={color} strokeWidth={1 / view.k} />
                {n.id === rootId && <circle r={r + 3} fill="none" stroke={color} strokeWidth={1.5 / view.k} opacity={0.5} />}
                <text x={r + 4} y={3} fontSize={11 / view.k} className="pointer-events-none select-none fill-foreground/90 font-mono">
                  {n.label.length > 34 ? n.label.slice(0, 32) + "…" : n.label}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
