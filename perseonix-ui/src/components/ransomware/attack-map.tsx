import type { MapPoint } from "@/lib/ransomware/data"
import { buildAttackMap } from "@/lib/ransomware/world-map"

const ACCENT = "#ff4d5e"

export function AttackMap({ points }: { points: MapPoint[] }) {
  const map = buildAttackMap(points)
  const top = map.hotspots.slice(0, 6)

  return (
    <figure className="relative overflow-hidden rounded-lg border border-ink/[0.09] bg-navy-900/40">
      <figcaption className="flex items-center justify-between gap-2 border-b border-ink/[0.07] px-4 py-3">
        <span className="flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.15em] text-ink uppercase">
          <span aria-hidden className="size-1.5 rounded-full bg-sev-critical motion-safe:animate-beacon" />
          Global surface
        </span>
        <span className="font-mono text-[10px] tracking-wider text-muted-foreground/55 uppercase">
          {map.hotspots.length} countries
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${map.width} ${map.height}`}
        className="block w-full"
        role="img"
        aria-label="World map of ransomware victim locations"
      >
        <path d={map.sphere} fill="#0b1220" />
        <path d={map.graticule} fill="none" stroke="#1b2740" strokeWidth={0.4} />
        <path d={map.land} fill="#16223a" stroke="#243352" strokeWidth={0.4} />
        {map.hotspots.map((h) => (
          <g key={h.code}>
            <circle cx={h.x} cy={h.y} r={h.r} fill={ACCENT} fillOpacity={0.18} />
            <circle cx={h.x} cy={h.y} r={Math.max(1.4, h.r * 0.34)} fill={ACCENT} fillOpacity={0.95}>
              <title>{`${h.name}: ${h.count}`}</title>
            </circle>
          </g>
        ))}
        {top.map((h) => (
          <circle key={`pulse-${h.code}`} cx={h.x} cy={h.y} r={h.r} fill="none" stroke={ACCENT} strokeWidth={1}>
            <animate attributeName="r" values={`${h.r};${h.r + 8}`} dur="2.2s" repeatCount="indefinite" />
            <animate attributeName="stroke-opacity" values="0.6;0" dur="2.2s" repeatCount="indefinite" />
          </circle>
        ))}
      </svg>
      {top.length > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 border-t border-ink/[0.06] px-4 py-2.5">
          {top.slice(0, 5).map((h) => (
            <li key={h.code} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span aria-hidden>{h.flag}</span>
              <span className="text-foreground/80">{h.name}</span>
              <span className="font-mono text-sev-critical/90">{h.count}</span>
            </li>
          ))}
        </ul>
      )}
    </figure>
  )
}
