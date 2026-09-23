import Image from "next/image"
import type { Dict } from "@/lib/i18n/dictionaries"

// The cinematic hero centrepiece: a tracked adversary staring back through a
// targeting HUD. The portrait's black ground melts into the coal page; red
// scanlines, a crosshair reticle and live "tracking" chrome make it feel like
// the actor is being watched in real time — and watching back.
export function ThreatActorVisual({ t }: { t: Dict["hero"] }) {
  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* ambient red bloom behind the figure */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 -z-10 rounded-full bg-ember/20 blur-[90px]"
      />

      <div className="relative overflow-hidden rounded-2xl border border-ember/25 coal-card">
        {/* top status bar */}
        <div className="relative z-20 flex items-center justify-between border-b border-white/[0.08] bg-coal-950/70 px-4 py-2.5">
          <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.18em] text-ember-soft uppercase">
            <span className="size-1.5 rounded-full bg-ember motion-safe:animate-beacon" />
            {t.tracking}
          </span>
          <span className="font-mono text-[10px] tracking-[0.16em] text-warm-500 uppercase">
            REC ●
          </span>
        </div>

        {/* portrait */}
        <div className="relative aspect-square overflow-hidden">
          <Image
            src="/adversaries/breacher-red.jpg"
            alt="A tracked threat actor — a masked operative with glowing red optical sensors"
            fill
            priority
            sizes="(max-width: 1024px) 90vw, 440px"
            className="object-cover object-top"
          />

          {/* red duotone / vignette to fuse with the theme */}
          <div
            aria-hidden
            className="absolute inset-0 bg-ember/10 mix-blend-color"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(12,10,14,0.55)_100%)]"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-b from-transparent to-coal-900"
          />

          {/* HUD grid */}
          <div aria-hidden className="warm-grid absolute inset-0 opacity-30" />

          {/* moving scan line */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-ember/25 to-transparent motion-safe:animate-scan"
          />

          {/* crosshair reticle */}
          <svg
            aria-hidden
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full text-ember-soft/50"
          >
            <path d="M50 6 V22 M50 78 V94 M6 50 H22 M78 50 H94" stroke="currentColor" strokeWidth="0.4" fill="none" />
            <circle cx="50" cy="46" r="20" stroke="currentColor" strokeWidth="0.3" fill="none" strokeDasharray="2 3" />
          </svg>

          {/* bracket corners */}
          {[
            "top-3 left-3 border-t-2 border-l-2",
            "top-3 right-3 border-t-2 border-r-2",
            "bottom-3 left-3 border-b-2 border-l-2",
            "bottom-3 right-3 border-b-2 border-r-2",
          ].map((pos) => (
            <span key={pos} className={`absolute size-5 border-ember/70 ${pos}`} aria-hidden />
          ))}

          {/* identity tag */}
          <div className="absolute bottom-4 left-4 z-10">
            <p className="font-grotesk text-lg font-bold text-white drop-shadow">Obsidian Heron</p>
            <p className="mt-0.5 font-mono text-[11px] text-ember-soft">
              PX-APT-17 · State-aligned
            </p>
          </div>

          {/* threat chip */}
          <span className="absolute top-4 right-4 z-10 rounded-sm border border-ember/50 bg-ember/15 px-2 py-1 font-mono text-[10px] font-semibold tracking-[0.14em] text-ember-soft uppercase backdrop-blur-sm">
            {t.threat}: Critical
          </span>
        </div>

        {/* bottom telemetry strip */}
        <div className="grid grid-cols-3 divide-x divide-white/[0.06] border-t border-white/[0.08] bg-coal-950/60">
          {[
            { l: t.campaigns, v: "12" },
            { l: t.lastSeen, v: "2m" },
            { l: t.sectors, v: "Finance" },
          ].map((s) => (
            <div key={s.l} className="px-4 py-3">
              <div className="font-mono text-sm font-semibold text-white">{s.v}</div>
              <div className="mt-0.5 font-mono text-[9px] tracking-[0.14em] text-warm-500 uppercase">
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
