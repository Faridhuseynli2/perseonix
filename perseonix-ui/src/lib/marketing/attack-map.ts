import "server-only"
import type { FeatureCollection } from "geojson"
import { geoEqualEarth, geoGraticule10, geoPath } from "d3-geo"
import { feature } from "topojson-client"
import type { GeometryCollection, Topology } from "topojson-specification"
import land110m from "world-atlas/land-110m.json"

// Geometry for the animated hero "live attack map": world land + projected
// city nodes + great-circle-ish attack arcs. Server-only (world-atlas is ~heavy).

const landTopo = land110m as unknown as Topology<{ land: GeometryCollection }>
const LAND = feature(landTopo, landTopo.objects.land) as FeatureCollection

export const MAP_W = 900
export const MAP_H = 460

const CITIES: [number, number][] = [
  [-74, 40.7], // New York
  [-0.1, 51.5], // London
  [8.7, 50.1], // Frankfurt
  [37.6, 55.7], // Moscow
  [55.3, 25.2], // Dubai
  [103.8, 1.35], // Singapore
  [139.7, 35.7], // Tokyo
  [151.2, -33.9], // Sydney
  [-46.6, -23.5], // São Paulo
  [72.8, 19], // Mumbai
  [29, 41], // Istanbul
  [-118.2, 34], // Los Angeles
]

// Source → target index pairs for attack arcs.
const PAIRS: [number, number][] = [
  [0, 1], [1, 3], [4, 5], [6, 7], [8, 0], [9, 2], [10, 4], [11, 6], [3, 10], [5, 9],
]

const ACCENTS = ["#ff3b52", "#ff7a2f", "#ff9a4d"]

export type LiveMap = {
  width: number
  height: number
  sphere: string
  graticule: string
  land: string
  nodes: { x: number; y: number }[]
  arcs: { d: string; color: string; dur: number; begin: number }[]
}

export function buildLiveMap(): LiveMap {
  const projection = geoEqualEarth().fitExtent(
    [
      [4, 4],
      [MAP_W - 4, MAP_H - 4],
    ],
    { type: "Sphere" }
  )
  const path = geoPath(projection).digits(1)
  const pts = CITIES.map((c) => projection(c)).filter((p): p is [number, number] => Boolean(p))

  const arcs = PAIRS.flatMap(([a, b], i) => {
    const p1 = projection(CITIES[a])
    const p2 = projection(CITIES[b])
    if (!p1 || !p2) return []
    const [x1, y1] = p1
    const [x2, y2] = p2
    const dist = Math.hypot(x2 - x1, y2 - y1)
    const mx = (x1 + x2) / 2
    const my = (y1 + y2) / 2 - dist * 0.32
    return [{
      d: `M${x1.toFixed(1)},${y1.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`,
      color: ACCENTS[i % ACCENTS.length],
      dur: 3 + (i % 4) * 0.8,
      begin: (i % 5) * 0.7,
    }]
  })

  return {
    width: MAP_W,
    height: MAP_H,
    sphere: path({ type: "Sphere" }) ?? "",
    graticule: path(geoGraticule10()) ?? "",
    land: path(LAND) ?? "",
    nodes: pts.map(([x, y]) => ({ x, y })),
    arcs,
  }
}
