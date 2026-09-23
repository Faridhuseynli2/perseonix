import type { DetectionRow } from "@/lib/brand/store"
import { cn } from "@/lib/utils"

// Dense signal breakdown beside the radar. Bars, not tiles — reads as an
// operations readout.
export function ThreatSurface({ detections }: { detections: DetectionRow[] }) {
  const total = detections.length || 1
  const high = detections.filter((d) => d.severity === "high").length
  const medium = detections.filter((d) => d.severity === "medium").length
  const low = detections.filter((d) => d.severity === "low").length

  const signals: { label: string; value: number; tone: string }[] = [
    { label: "Live / resolving", value: detections.filter((d) => d.resolves).length, tone: "bg-sev-critical" },
    { label: "Email-capable (MX)", value: detections.filter((d) => d.hasMx).length, tone: "bg-sev-critical/80" },
    { label: "TLS certificate", value: detections.filter((d) => d.hasCert).length, tone: "bg-signal" },
    { label: "Homoglyph / punycode", value: detections.filter((d) => d.punycode).length, tone: "bg-signal/80" },
    { label: "Taken down (offline)", value: detections.filter((d) => d.offlineAt).length, tone: "bg-muted-foreground/50" },
  ]

  const maxSignal = Math.max(...signals.map((s) => s.value), 1)

  return (
    <section className="flex flex-col gap-5 rounded-lg border border-ink/[0.09] bg-navy-900/40 p-5">
      <div>
        <h3 className="font-mono text-[11px] font-semibold tracking-[0.16em] text-ink uppercase">Threat surface</h3>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-mono text-3xl font-semibold text-ink tabular-nums">{detections.length}</span>
          <span className="font-mono text-[11px] text-muted-foreground">impersonating domains</span>
        </div>
        {/* severity split */}
        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-ink/[0.06]">
          <span className="bg-sev-critical" style={{ width: `${(high / total) * 100}%` }} />
          <span className="bg-signal" style={{ width: `${(medium / total) * 100}%` }} />
          <span className="bg-[#5b6a8f]" style={{ width: `${(low / total) * 100}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-muted-foreground">
          <span className="text-sev-critical">{high} high</span>
          <span className="text-signal">{medium} medium</span>
          <span>{low} low</span>
        </div>
      </div>

      <div className="grid gap-2.5 border-t border-ink/[0.07] pt-4">
        {signals.map((sig) => (
          <div key={sig.label} className="grid grid-cols-[minmax(0,1fr)_2rem] items-center gap-3">
            <div className="min-w-0">
              <div className="flex items-center justify-between">
                <span className="truncate font-mono text-[11px] text-foreground/80">{sig.label}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
                <span className={cn("block h-full rounded-full", sig.tone)} style={{ width: `${(sig.value / maxSignal) * 100}%` }} />
              </div>
            </div>
            <span className="text-right font-mono text-xs text-muted-foreground tabular-nums">{sig.value}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
