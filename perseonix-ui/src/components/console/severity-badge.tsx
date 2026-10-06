import { cn } from "@/lib/utils"

// One severity system for the whole console: a four-step hue ramp used
// identically in every module — critical red, high orange, medium amber,
// low blue, info neutral.
export type Severity = "critical" | "high" | "medium" | "low" | "info"

const STYLE: Record<Severity, { label: string; cls: string; hex: string }> = {
  critical: { label: "Critical", cls: "bg-sev-critical/12 text-sev-critical ring-sev-critical/25", hex: "#ff4d5e" },
  high: { label: "High", cls: "bg-sev-high/12 text-sev-high ring-sev-high/25", hex: "#ff8a3d" },
  medium: { label: "Medium", cls: "bg-sev-medium/12 text-sev-medium ring-sev-medium/25", hex: "#ffb400" },
  low: { label: "Low", cls: "bg-sev-low/12 text-sev-low ring-sev-low/25", hex: "#00b5fa" },
  info: { label: "Info", cls: "bg-ink/[0.06] text-muted-foreground ring-ink/15", hex: "#5b6a8f" },
}

export function severityHex(sev: string): string {
  return (STYLE[sev as Severity] ?? STYLE.low).hex
}

export function SeverityBadge({ severity, score, className }: { severity: string; score?: number; className?: string }) {
  const s = STYLE[severity as Severity] ?? STYLE.low
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-[9px] tracking-wider uppercase ring-1 ring-inset",
        s.cls,
        className
      )}
    >
      {s.label}
      {score !== undefined && <span className="opacity-70">· {score}</span>}
    </span>
  )
}
