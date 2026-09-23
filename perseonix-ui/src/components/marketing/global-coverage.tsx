import DottedMap from "dotted-map"
import { SectionHeading } from "@/components/marketing/section-heading"
import {
  coverageFacts,
  coverageNodes,
  sectors,
  type CoverageNode,
} from "@/content/site"
import type { Dict } from "@/lib/i18n/dictionaries"

const links: [string, string][] = [
  ["Istanbul", "Frankfurt"],
  ["Istanbul", "Dubai"],
  ["Istanbul", "Johannesburg"],
  ["Dubai", "Singapore"],
  ["Singapore", "Tokyo"],
  ["Singapore", "Sydney"],
  ["London", "Frankfurt"],
  ["Ashburn", "London"],
  ["Ashburn", "São Paulo"],
]

const DOT_RADIUS = 0.24

const worldMap = buildWorldMap()

function buildWorldMap() {
  const map = new DottedMap({
    height: 56,
    grid: "diagonal",
    projection: { name: "robinson" },
    region: { lat: { min: -56, max: 78 }, lng: { min: -180, max: 180 } },
  })

  const pins = coverageNodes.map((node) => ({
    node,
    point: map.addPin({ lat: node.lat, lng: node.lng, data: node.city }),
  }))

  const r = DOT_RADIUS
  const dots = map
    .getPoints()
    .filter((p) => p.data === undefined)
    .map(
      (p) =>
        `M${(p.x - r).toFixed(2)} ${p.y.toFixed(2)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`
    )
    .join("")

  const byCity = new Map(pins.map(({ node, point }) => [node.city, point]))
  const arcs = links.flatMap(([from, to]) => {
    const a = byCity.get(from)
    const b = byCity.get(to)
    if (!a || !b) return []
    const lift = Math.hypot(b.x - a.x, b.y - a.y) * 0.3
    const cx = (a.x + b.x) / 2
    const cy = Math.min(a.y, b.y) - lift
    return [`M${a.x} ${a.y}Q${cx} ${cy} ${b.x} ${b.y}`]
  })

  return { width: map.image.width, height: map.image.height, dots, pins, arcs }
}

function Pin({ node, x, y }: { node: CoverageNode; x: number; y: number }) {
  return (
    <g>
      {node.hub && (
        <circle
          cx={x}
          cy={y}
          r={0.8}
          className="origin-center fill-ember-soft/50 [transform-box:fill-box] motion-safe:animate-beacon"
        />
      )}
      <circle
        cx={x}
        cy={y}
        r={node.hub ? 0.7 : 0.45}
        className={node.hub ? "fill-ember-soft" : "fill-flare"}
      />
      {node.hub && (
        <text
          x={x + 1.3}
          y={y + 0.6}
          className="hidden fill-warm-100/80 font-mono text-[1.7px] sm:inline"
        >
          {node.city}
        </text>
      )}
    </g>
  )
}

export function GlobalCoverage({ t }: { t: Dict["coverage"] }) {
  const { width, height, dots, pins, arcs } = worldMap
  const hubCount = coverageNodes.filter((n) => n.hub).length

  return (
    <section id="coverage" className="border-t border-white/[0.06] bg-coal-850/50 py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.55fr] lg:items-center lg:gap-16">
          <div>
            <SectionHeading
              eyebrow={t.eyebrow}
              title={t.title}
              description={t.description}
            />
            <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-white/[0.06] pt-8">
              {coverageFacts.map((fact) => (
                <div key={fact.label} className="flex flex-col">
                  <dt className="mt-2 text-xs leading-snug text-warm-500">{fact.label}</dt>
                  <dd className="order-first font-grotesk text-2xl font-bold tracking-tight text-white tabular-nums sm:text-3xl">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <figure
            data-reveal
            className="coal-card relative overflow-hidden rounded-2xl border border-white/[0.08]"
          >
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-ember/60 to-transparent"
            />
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-3">
              <span className="font-mono text-xs text-warm-100/80">{t.coverageLabel}</span>
              <span className="flex items-center gap-4 font-mono text-[10px] tracking-wider text-warm-500 uppercase">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-ember-soft" /> {t.hub}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-flare" /> {t.node}
                </span>
              </span>
            </div>
            <div className="px-3 py-6 sm:px-6">
              <svg
                viewBox={`0 0 ${width} ${height}`}
                role="img"
                aria-labelledby="coverage-map-title"
                className="h-auto w-full"
              >
                <title id="coverage-map-title">
                  {`Map of ${coverageNodes.length} Perseonix collection locations, including ${hubCount} regional hubs`}
                </title>
                <defs>
                  <linearGradient id="coverage-arc" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#e01734" stopOpacity="0.15" />
                    <stop offset="0.5" stopColor="#ff3b52" stopOpacity="0.85" />
                    <stop offset="1" stopColor="#e01734" stopOpacity="0.15" />
                  </linearGradient>
                </defs>
                <path d={dots} fill="rgb(255 160 130 / 0.22)" />
                <g fill="none" stroke="url(#coverage-arc)" strokeWidth={0.16}>
                  {arcs.map((d) => (
                    <path key={d} d={d} />
                  ))}
                </g>
                {pins.map(({ node, point }) => (
                  <Pin key={node.city} node={node} x={point.x} y={point.y} />
                ))}
              </svg>
            </div>
          </figure>
        </div>

        <div className="mt-20 border-t border-white/[0.06] pt-10">
          <p className="font-mono text-[10px] tracking-[0.24em] text-warm-500 uppercase">
            {t.sectorsLabel}
          </p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {sectors.map((sector) => (
              <li
                key={sector}
                className="rounded-full border border-white/[0.08] bg-white/[0.02] px-3.5 py-1.5 text-sm text-warm-100/80"
              >
                {sector}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
