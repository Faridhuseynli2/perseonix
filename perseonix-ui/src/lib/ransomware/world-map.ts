import "server-only"
import type { FeatureCollection, Geometry } from "geojson"
import { geoCentroid, geoEqualEarth, geoGraticule10, geoPath } from "d3-geo"
import { feature } from "topojson-client"
import type { GeometryCollection, Topology } from "topojson-specification"
import countries110m from "world-atlas/countries-110m.json"
import land110m from "world-atlas/land-110m.json"
import { countryName, flagEmoji } from "@/lib/ransomware/meta"
import type { MapPoint } from "@/lib/ransomware/data"

// Flat "attack map" — a world outline with glowing hotspots sized by victim
// count. Deliberately 2-D (not a 3-D globe) so it reads as our own design.
// Server-only: world-atlas borders must stay out of the client bundle.

type CountryProps = { name: string }
const countriesTopo = countries110m as unknown as Topology<{ countries: GeometryCollection<CountryProps> }>
const landTopo = land110m as unknown as Topology<{ land: GeometryCollection }>
const COUNTRIES = feature(countriesTopo, countriesTopo.objects.countries) as FeatureCollection<Geometry, CountryProps>
const LAND = feature(landTopo, landTopo.objects.land) as FeatureCollection

export const MAP_WIDTH = 560
export const MAP_HEIGHT = 300

// Feature names differ from Intl's; map the common ISO-2 codes that don't match.
const NAME_ALIAS: Record<string, string> = {
  US: "United States of America",
  GB: "United Kingdom",
  KR: "South Korea",
  KP: "North Korea",
  RU: "Russia",
  CZ: "Czechia",
  CD: "Dem. Rep. Congo",
  CG: "Congo",
  TZ: "Tanzania",
  VE: "Venezuela",
  BO: "Bolivia",
  LA: "Laos",
  SY: "Syria",
  IR: "Iran",
  VN: "Vietnam",
  MD: "Moldova",
  DO: "Dominican Rep.",
  BA: "Bosnia and Herz.",
  MK: "North Macedonia",
  BN: "Brunei",
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "")

// name → [lon, lat] centroid for every country polygon.
const CENTROIDS = new Map<string, [number, number]>()
for (const f of COUNTRIES.features) {
  CENTROIDS.set(norm(f.properties.name), geoCentroid(f))
}

function centroidFor(code: string): [number, number] | null {
  const candidates = [NAME_ALIAS[code.toUpperCase()], countryName(code)].filter(Boolean) as string[]
  for (const name of candidates) {
    const hit = CENTROIDS.get(norm(name))
    if (hit) return hit
  }
  return null
}

export type Hotspot = { code: string; name: string; flag: string; count: number; x: number; y: number; r: number }
export type AttackMap = {
  width: number
  height: number
  sphere: string
  graticule: string
  land: string
  hotspots: Hotspot[]
}

export type GeoPoint = { code: string; name: string; lat: number; lng: number; count: number }

/** Country victim counts as lat/lng points, for a real (Leaflet) tile map. */
export function geoPoints(points: MapPoint[]): GeoPoint[] {
  const out: GeoPoint[] = []
  for (const p of points) {
    const c = centroidFor(p.code)
    if (!c) continue
    out.push({ code: p.code, name: countryName(p.code), lat: c[1], lng: c[0], count: p.count })
  }
  return out.sort((a, b) => b.count - a.count)
}

export function buildAttackMap(points: MapPoint[]): AttackMap {
  const projection = geoEqualEarth().fitExtent(
    [
      [6, 6],
      [MAP_WIDTH - 6, MAP_HEIGHT - 6],
    ],
    { type: "Sphere" }
  )
  const path = geoPath(projection).digits(1)
  const max = Math.max(...points.map((p) => p.count), 1)

  const hotspots: Hotspot[] = []
  for (const p of points) {
    const centroid = centroidFor(p.code)
    if (!centroid) continue
    const xy = projection(centroid)
    if (!xy) continue
    hotspots.push({
      code: p.code,
      name: countryName(p.code),
      flag: flagEmoji(p.code),
      count: p.count,
      x: xy[0],
      y: xy[1],
      r: 2.5 + (Math.sqrt(p.count) / Math.sqrt(max)) * 16,
    })
  }
  // Largest first so small dots draw on top and stay clickable/visible.
  hotspots.sort((a, b) => b.r - a.r)

  return {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    sphere: path({ type: "Sphere" }) ?? "",
    graticule: path(geoGraticule10()) ?? "",
    land: path(LAND) ?? "",
    hotspots,
  }
}
