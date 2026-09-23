const ROWS: { tag: string; tone: string; label: string; meta: string }[] = [
  { tag: "RANSOMWARE", tone: "text-ember-soft", label: "LockBit — new leak-site victim", meta: "2m" },
  { tag: "EXPLOIT", tone: "text-flare", label: "CVE-2026-3391 weaponised in the wild", meta: "9m" },
  { tag: "ADVERSARY", tone: "text-ember-soft", label: "APT29 infrastructure pivot", meta: "21m" },
  { tag: "LOOKALIKE", tone: "text-flare-soft", label: "perseonix-secure[.]net registered", meta: "34m" },
  { tag: "LEAK-SITE", tone: "text-ember-soft", label: "Cl0p added 3 organisations", meta: "1h" },
  { tag: "IOC", tone: "text-flare", label: "142 indicators enriched & shipped", meta: "1h" },
]

// The right-hand hero panel: a live "threat stream" console, warm theme.
export function HeroFeed() {
  return (
    <div className="coal-card relative overflow-hidden rounded-xl border border-white/[0.08]">
      {/* scanline */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-ember/12 to-transparent motion-safe:animate-scan"
      />
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-ember motion-safe:animate-beacon" />
          <span className="font-mono text-[11px] tracking-[0.18em] text-warm-300 uppercase">
            Corvael // Live Stream
          </span>
        </div>
        <span className="rounded-sm border border-ember/40 bg-ember/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-[0.2em] text-ember-soft">
          LIVE
        </span>
      </div>

      <ul className="divide-y divide-white/[0.05]">
        {ROWS.map((r) => (
          <li key={r.label} className="flex items-center gap-3 px-4 py-3">
            <span className={`w-24 shrink-0 font-mono text-[10px] font-semibold tracking-[0.12em] ${r.tone}`}>
              {r.tag}
            </span>
            <span className="flex-1 truncate text-[13px] text-warm-100">{r.label}</span>
            <span className="shrink-0 font-mono text-[10px] text-warm-500">{r.meta}</span>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-3 gap-px border-t border-white/[0.06] bg-white/[0.04]">
        {[
          { v: "3.8B+", l: "Indicators" },
          { v: "240+", l: "Adversaries" },
          { v: "24/7", l: "Coverage" },
        ].map((s) => (
          <div key={s.l} className="bg-coal-850 px-4 py-3">
            <div className="font-mono text-base font-semibold text-white">{s.v}</div>
            <div className="mt-0.5 font-mono text-[9px] tracking-[0.14em] text-warm-500 uppercase">
              {s.l}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
