import { cn } from "@/lib/utils"

// One severity system for the whole console. High reads red across modules
// (ransomware, brand, adversary), medium amber, low muted.
export type Severity = "critical" | "high" | "medium" | "low" | "info"

const STYLE: Record<Severity, { label: string; cls: string; hex: string }> = {
  critical: { label: "Critical", cls: "bg-sev-critical/12 text-sev-critical ring-sev-critical/25", hex: "#ff4d5e" },
  high: { label: "High", cls: "bg-sev-critical/12 text-sev-critical ring-sev-critical/25", hex: "#ff4d5e" },
  medium: { label: "Medium", cls: "bg-signal/12 text-signal ring-signal/25", hex: "#ffb400" },
  low: { label: "Low", cls: "bg-ink/[0.06] text-muted-foreground ring-ink/15", hex: "#5b6a8f" },
  info: { label: "Info", cls: "bg-glow/12 text-glow ring-glow/25", hex: "#00b5fa" },
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
