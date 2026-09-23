import { buildLiveMap } from "@/lib/marketing/attack-map"

// Cinematic "live global attack map" (warm theme): world land with attack arcs
// streaming between nodes, pulsing targets and a radar sweep. Pure SVG/SMIL — no
// JS, loops forever, decorative (aria-hidden).
export function AttackMap({ className }: { className?: string }) {
  const m = buildLiveMap()
  const cx = m.width / 2
  const cy = m.height / 2

  return (
    <svg
      viewBox={`0 0 ${m.width} ${m.height}`}
      className={className}
      role="img"
      aria-label="Live global attack map"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id="am-fade" cx="50%" cy="45%" r="65%">
          <stop offset="0%" stopColor="#0c0a0e" stopOpacity="0" />
          <stop offset="100%" stopColor="#0c0a0e" stopOpacity="0.92" />
        </radialGradient>
        <radialGradient id="am-sweep" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff3b52" stopOpacity="0.16" />
          <stop offset="70%" stopColor="#ff3b52" stopOpacity="0" />
        </radialGradient>
      </defs>

      <path d={m.graticule} fill="none" stroke="#3a2029" strokeWidth={0.5} />
      <path d={m.land} fill="#1a141a" stroke="#3a2731" strokeWidth={0.5} />

      {/* radar sweep */}
      <g
        style={{ transformOrigin: `${cx}px ${cy}px` }}
        className="motion-safe:animate-[spin_9s_linear_infinite]"
      >
        <path
          d={`M${cx},${cy} L${cx + 260},${cy - 70} A270,270 0 0,1 ${cx + 260},${cy + 70} Z`}
          fill="url(#am-sweep)"
        />
      </g>

      {/* attack arcs + travelling packets */}
      {m.arcs.map((a, i) => (
        <g key={i}>
          <path d={a.d} fill="none" stroke={a.color} strokeOpacity={0.2} strokeWidth={0.8} />
          <circle r={2.6} fill={a.color}>
            <animateMotion
              dur={`${a.dur}s`}
              begin={`${a.begin}s`}
              repeatCount="indefinite"
              path={a.d}
              rotate="auto"
            />
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              dur={`${a.dur}s`}
              begin={`${a.begin}s`}
              repeatCount="indefinite"
            />
          </circle>
          <circle r={5} fill={a.color} opacity={0.35}>
            <animateMotion
              dur={`${a.dur}s`}
              begin={`${a.begin}s`}
              repeatCount="indefinite"
              path={a.d}
            />
            <animate
              attributeName="opacity"
              values="0;0.35;0.35;0"
              dur={`${a.dur}s`}
              begin={`${a.begin}s`}
              repeatCount="indefinite"
            />
          </circle>
        </g>
      ))}

      {/* nodes */}
      {m.nodes.map((n, i) => (
        <g key={`n-${i}`}>
          <circle cx={n.x} cy={n.y} r={2} fill="#ff6f81" />
          <circle cx={n.x} cy={n.y} r={2} fill="none" stroke="#ff3b52" strokeWidth={1}>
            <animate
              attributeName="r"
              values="2;12"
              dur="2.6s"
              begin={`${(i % 6) * 0.4}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="stroke-opacity"
              values="0.7;0"
              dur="2.6s"
              begin={`${(i % 6) * 0.4}s`}
              repeatCount="indefinite"
            />
          </circle>
        </g>
      ))}

      <rect x={0} y={0} width={m.width} height={m.height} fill="url(#am-fade)" />
    </svg>
  )
}
