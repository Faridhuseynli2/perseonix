import { cn } from "@/lib/utils"

const severityStyles = {
  critical: "bg-sev-critical/10 text-sev-critical ring-sev-critical/25",
  high: "bg-sev-high/10 text-sev-high ring-sev-high/25",
  medium: "bg-sev-medium/10 text-sev-medium ring-sev-medium/25",
  low: "bg-sev-low/10 text-sev-low ring-sev-low/25",
} as const

export type Severity = keyof typeof severityStyles

export function SeverityPill({
  level,
  className,
}: {
  level: Severity
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit items-center gap-1.5 rounded px-1.5 font-mono text-[10px] font-medium tracking-wider uppercase ring-1 ring-inset",
        severityStyles[level],
        className
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {level}
    </span>
  )
}
