"use client"

import "leaflet/dist/leaflet.css"
import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import type { LayerGroup, Map as LeafletMap } from "leaflet"
import { ArrowUpRight, Layers, X } from "lucide-react"
import { cn } from "@/lib/utils"

// Real tile map (Leaflet + free CARTO dark basemap) — a proper geographic
// surface, not a stylized SVG. Threat activity is plotted as red glowing
// markers over muted cartography (context grey / signal red — dashboard-designer
// principle). Leaflet is loaded only in the browser (SSR-safe).

export type GeoPoint = { code: string; name: string; lat: number; lng: number; count: number }
export type MapVictim = { id: string; groupName: string; victim: string; country: string | null; discovered: string | null }

function ago(iso: string | null): string {
  if (!iso) return ""
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 60) return `${Math.max(1, m)}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

const LAYER_DEFS = [
  { key: "ransomware", label: "Ransomware victims", color: "#ff8a3d" },
  { key: "cve", label: "CVE hotspots", color: "#ffb400" },
  { key: "ioc", label: "IOC sources", color: "#00b5fa" },
  { key: "news", label: "News events", color: "#6ee7b7" },
]

// Severity by relative victim volume — colour encodes how bad, size how many.
const SEV_TIERS = [
  { min: 0.5, color: "#ff4d5e", label: "Critical" },
  { min: 0.2, color: "#ff8a3d", label: "High" },
  { min: 0.06, color: "#ffb400", label: "Medium" },
  { min: 0, color: "#00b5fa", label: "Low" },
]
function tierColor(count: number, max: number): string {
  const r = count / max
  return (SEV_TIERS.find((t) => r >= t.min) ?? SEV_TIERS[SEV_TIERS.length - 1]).color
}

export function ThreatMap({ points, victims }: { points: GeoPoint[]; victims: MapVictim[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const layerRef = useRef<LayerGroup | null>(null)
  const LRef = useRef<typeof import("leaflet") | null>(null)

  const [ready, setReady] = useState(false)
  const [activeCode, setActiveCode] = useState<string | null>(points[0]?.code ?? null)
  const [showRansomware, setShowRansomware] = useState(true)

  const max = useMemo(() => Math.max(1, ...points.map((p) => p.count)), [points])
  const active = points.find((p) => p.code === activeCode) ?? null
  const activeVictims = useMemo(
    () => (active ? victims.filter((v) => v.country === active.code).slice(0, 5) : []),
    [active, victims]
  )

  // Init map once (client only).
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const L = (await import("leaflet")).default
      if (cancelled || !containerRef.current || mapRef.current) return
      LRef.current = L
      const map = L.map(containerRef.current, {
        center: [28, 12],
        zoom: 2,
        minZoom: 2,
        maxZoom: 7,
        zoomControl: false,
        scrollWheelZoom: false,
        worldCopyJump: true,
        attributionControl: false, // default bar removed; minimal credit rendered as an overlay below
      })
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 16 }
      ).addTo(map)
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 16, opacity: 0.9 }
      ).addTo(map)
      L.control.zoom({ position: "bottomleft" }).addTo(map)
      layerRef.current = L.layerGroup().addTo(map)
      mapRef.current = map
      setReady(true)
      setTimeout(() => map.invalidateSize(), 60)
    })()
    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [])

  // (Re)draw markers when data / layer / selection changes.
  useEffect(() => {
    const L = LRef.current
    const layer = layerRef.current
    if (!ready || !L || !layer) return
    layer.clearLayers()
    if (!showRansomware) return

    points.forEach((p, i) => {
      const size = Math.round(10 + (Math.sqrt(p.count) / Math.sqrt(max)) * 22)
      const isActive = p.code === activeCode
      const pulse = i < 8
      const color = tierColor(p.count, max)
      const icon = L.divIcon({
        className: "",
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        html: `<span class="threat-dot${isActive ? " threat-dot--active" : ""}${pulse ? " threat-dot--pulse" : ""}" style="display:block;width:${size}px;height:${size}px;color:${color}"></span>`,
      })
      const marker = L.marker([p.lat, p.lng], { icon, keyboard: false })
      marker.bindTooltip(`${p.name}: ${p.count.toLocaleString()}`, {
        className: "threat-tip",
        direction: "top",
        offset: [0, -size / 2 - 2],
      })
      marker.on("click", () => setActiveCode(p.code))
      marker.addTo(layer)
    })
  }, [ready, points, showRansomware, activeCode, max])

  return (
    <figure className="relative h-[64vh] min-h-[440px] overflow-hidden rounded-lg border border-ink/[0.09] bg-navy-950/60">
      <div ref={containerRef} className="absolute inset-0 z-0" aria-label="World threat map" />

      {/* title */}
      <div className="pointer-events-none absolute top-3 right-3 z-[500] flex items-center gap-2 rounded-md bg-navy-950/70 px-2.5 py-1 font-mono text-[10px] tracking-[0.16em] text-muted-foreground/80 uppercase backdrop-blur-sm">
        <span aria-hidden className="size-1.5 rounded-full bg-sev-critical motion-safe:animate-beacon" />
        {points.length} countries
      </div>

      {/* layers */}
      <div className="absolute top-3 left-3 z-[500] rounded-lg border border-ink/10 bg-navy-950/80 p-2.5 backdrop-blur-sm">
        <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[9px] tracking-[0.16em] text-muted-foreground/70 uppercase">
          <Layers className="size-3" /> Layers
        </p>
        <ul className="grid gap-1">
          {LAYER_DEFS.map((l) => {
            const enabled = l.key === "ransomware"
            const checked = enabled ? showRansomware : false
            return (
              <li key={l.key}>
                <button
                  type="button"
                  disabled={!enabled}
                  onClick={() => enabled && setShowRansomware((v) => !v)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-[11px] transition-colors",
                    enabled ? "text-foreground/85 hover:bg-ink/[0.05]" : "cursor-not-allowed text-muted-foreground/40"
                  )}
                >
                  <span
                    aria-hidden
                    className="size-3 shrink-0 rounded-[3px] border"
                    style={{ borderColor: l.color, backgroundColor: checked ? l.color : "transparent" }}
                  />
                  <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: l.color }} />
                  <span className="truncate">{l.label}</span>
                  {!enabled && <span className="ml-auto font-mono text-[8px] text-muted-foreground/40 uppercase">soon</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {/* detail panel */}
      {active && (
        <div className="absolute right-3 bottom-8 z-[500] w-[230px] rounded-lg border border-sev-critical/25 bg-navy-950/85 p-3 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono text-[9px] tracking-[0.16em] text-muted-foreground/60 uppercase">Selected</p>
              <p className="truncate text-sm font-semibold text-ink">{active.name}</p>
            </div>
            <button type="button" onClick={() => setActiveCode(null)} className="text-muted-foreground hover:text-ink" aria-label="Clear">
              <X className="size-3.5" />
            </button>
          </div>
          <p className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-semibold tabular-nums" style={{ color: tierColor(active.count, max) }}>
              {active.count.toLocaleString()}
            </span>
            <span className="text-[11px] text-muted-foreground">claimed victims</span>
          </p>
          {activeVictims.length > 0 && (
            <ul className="mt-2 grid gap-1 border-t border-ink/[0.07] pt-2">
              {activeVictims.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="min-w-0 truncate text-foreground/85" title={v.victim}>
                    <span className="text-sev-critical/90">{v.groupName}</span> · {v.victim}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground/60">{ago(v.discovered)}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/app/modules/ransomware" className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-medium text-glow hover:text-ink">
            Open in Ransomware Tracker <ArrowUpRight className="size-3" />
          </Link>
        </div>
      )}

      {/* legend — severity key */}
      <div className="pointer-events-none absolute bottom-2.5 left-1/2 z-[500] flex -translate-x-1/2 flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-md bg-navy-950/70 px-3 py-1 font-mono text-[10px] text-muted-foreground/75 backdrop-blur-sm">
        {SEV_TIERS.map((t) => (
          <span key={t.label} className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: t.color }} />
            {t.label}
          </span>
        ))}
        <span className="text-muted-foreground/45">· size = victims</span>
      </div>

      {/* minimal required map credit (OSM/Esri licensing) */}
      <div className="pointer-events-none absolute right-1.5 bottom-1 z-[500] font-mono text-[8px] tracking-wide text-muted-foreground/30">
        © Esri · OpenStreetMap
      </div>

      {!ready && (
        <div className="absolute inset-0 z-[400] grid place-items-center text-xs text-muted-foreground/60">Loading map…</div>
      )}
    </figure>
  )
}
