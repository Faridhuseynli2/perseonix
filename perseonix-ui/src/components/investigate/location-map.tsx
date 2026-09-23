import { MapPin } from "lucide-react"
import { Facts, SourcePanel } from "@/components/investigate/report"
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  buildMapGeometry,
  formatCoordinates,
  placeName,
} from "@/lib/investigate/map-geometry"
import { SOURCES, countryName } from "@/lib/investigate/meta"
import type { GeoLocation, SourceResult } from "@/lib/investigate/types"
import { cn } from "@/lib/utils"

// Rendered on the server as plain SVG: no map tiles, so no third party learns
// which addresses customers investigate. Borders: Natural Earth (public domain).

function LocationMap({ points }: { points: GeoLocation[] }) {
  const map = buildMapGeometry(points)
  const single = map.markers.length === 1 ? map.markers[0] : null
  const { inset } = map

  return (
    <svg
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      className="block h-auto w-full"
      role="img"
      aria-label={`Map: ${points.map((point) => `${point.ip} in ${placeName(point)}`).join("; ")}`}
    >
      <rect width={MAP_WIDTH} height={MAP_HEIGHT} className="fill-navy-900/80" />
      <path d={map.graticule} className="fill-none stroke-ink/[0.05]" strokeWidth={0.6} />
      {map.countries.map((country, index) => (
        <path
          key={index}
          d={country.d}
          strokeWidth={country.highlighted ? 0.9 : 0.5}
          strokeLinejoin="round"
          className={country.highlighted ? "fill-glow/[0.13] stroke-glow/45" : "fill-ink/[0.05] stroke-ink/[0.16]"}
        />
      ))}

      {map.markers.map(({ point, index, x, y }) => (
        <g key={point.ip}>
          {!point.cityLevel && (
            <circle cx={x} cy={y} r={26} className="fill-glow/[0.05] stroke-glow/40" strokeDasharray="3 3" />
          )}
          <line x1={x - 14} x2={x - 6} y1={y} y2={y} className="stroke-ink/50" strokeWidth={1} />
          <line x1={x + 6} x2={x + 14} y1={y} y2={y} className="stroke-ink/50" strokeWidth={1} />
          <line x1={x} x2={x} y1={y - 14} y2={y - 6} className="stroke-ink/50" strokeWidth={1} />
          <line x1={x} x2={x} y1={y + 6} y2={y + 14} className="stroke-ink/50" strokeWidth={1} />
          <circle cx={x} cy={y} r={3.5} className="fill-signal stroke-navy-950" strokeWidth={1.5} />
          {!single && (
            <text x={x + 9} y={y - 8} className="fill-ink font-mono text-[11px]">
              {index + 1}
            </text>
          )}
        </g>
      ))}

      {single && <MarkerLabel point={single.point} x={single.x} y={single.y} />}

      <g>
        <rect
          x={inset.x}
          y={inset.y}
          width={inset.width}
          height={inset.height}
          rx={4}
          className="fill-navy-950/90 stroke-ink/[0.14]"
          strokeWidth={0.75}
        />
        <path d={inset.sphere} className="fill-none stroke-ink/[0.1]" strokeWidth={0.5} />
        <path d={inset.land} className="fill-ink/[0.14]" />
        {inset.viewport.length > 0 && (
          <polygon
            points={inset.viewport.map((xy) => xy.join(",")).join(" ")}
            className="fill-glow/10 stroke-glow/70"
            strokeWidth={0.75}
          />
        )}
        {inset.points.map((xy, index) => (
          <circle key={index} cx={xy.x} cy={xy.y} r={1.8} className="fill-signal" />
        ))}
      </g>

      {single && (
        <text
          x={MAP_WIDTH - 12}
          y={MAP_HEIGHT - 12}
          textAnchor="end"
          className="fill-muted-foreground font-mono text-[10.5px]"
        >
          {formatCoordinates(single.point)}
        </text>
      )}
    </svg>
  )
}

function MarkerLabel({ point, x, y }: { point: GeoLocation; x: number; y: number }) {
  const title = placeName(point)
  const width = Math.max(title.length * 6.6, point.ip.length * 6.4) + 20
  const height = 40
  const left = x + 22 + width > MAP_WIDTH - 8
  const above = y - 22 - height > 8
  const boxX = left ? x - 22 - width : x + 22
  const boxY = above ? y - 22 - height : y + 22
  const anchorX = left ? boxX + width : boxX
  const anchorY = above ? boxY + height : boxY
  return (
    <g>
      <line x1={x} y1={y} x2={anchorX} y2={anchorY} className="stroke-ink/40" strokeWidth={0.75} />
      <rect x={boxX} y={boxY} width={width} height={height} rx={3} className="fill-navy-950/95 stroke-ink/20" strokeWidth={0.75} />
      <text x={boxX + 10} y={boxY + 16} className="fill-ink text-[12px] font-medium">
        {title}
      </text>
      <text x={boxX + 10} y={boxY + 31} className="fill-muted-foreground font-mono text-[10.5px]">
        {point.ip}
      </text>
    </g>
  )
}

export function LocationPanel({ result, className }: { result: SourceResult<GeoLocation[]>; className?: string }) {
  return (
    <SourcePanel
      title={SOURCES.geo.label}
      icon={MapPin}
      provider="GeoLite2 · RIPEstat"
      description={SOURCES.geo.description}
      result={result}
      emptyText="No location data for this address."
      className={className}
    >
      {(points) => (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="overflow-hidden rounded-lg border border-ink/[0.08]">
            <LocationMap points={points} />
          </div>
          <div className="grid content-start gap-5">
            {points.map((point, index) => (
              <div key={point.ip} className="grid gap-2.5">
                <p className="flex items-center gap-2 font-mono text-[13px] font-medium text-ink">
                  {points.length > 1 && (
                    <span className="grid size-4 place-items-center rounded-sm bg-signal/15 text-[10px] text-signal">
                      {index + 1}
                    </span>
                  )}
                  {point.ip}
                </p>
                <Facts
                  items={[
                    ["City", point.city ?? "—"],
                    ["Country", point.countryCode ? `${countryName(point.countryCode)} (${point.countryCode})` : "—"],
                    ["Coordinates", <span key="c" className="font-mono text-[12px]">{formatCoordinates(point)}</span>],
                    ["Network", point.network ? <span key="n" className="font-mono text-[12px]">{point.network}</span> : "—"],
                    [
                      "Precision",
                      <span key="p" className={cn(!point.cityLevel && "text-sev-medium")}>
                        {point.cityLevel ? "City" : "Country only"}
                      </span>,
                    ],
                  ]}
                />
              </div>
            ))}
            <p className="text-xs leading-relaxed text-muted-foreground">
              Approximate. IP geolocation reflects where the network range is registered and may differ from
              the server&apos;s physical location.
            </p>
            <p className="font-mono text-[10px] text-muted-foreground/60">
              Includes GeoLite2 data by MaxMind · borders: Natural Earth
            </p>
          </div>
        </div>
      )}
    </SourcePanel>
  )
}
