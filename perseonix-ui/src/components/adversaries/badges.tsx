import { CATEGORY_STYLES, THREAT_LEVEL_STYLES } from "@/lib/adversaries/meta"
import { cn } from "@/lib/utils"

export function CategoryBadge({ category, className }: { category: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded px-1.5 font-mono text-[10px] font-medium tracking-wider uppercase ring-1 ring-inset",
        CATEGORY_STYLES[category] ?? CATEGORY_STYLES.APT,
        className
      )}
    >
      {category}
    </span>
  )
}

export function ThreatLevelBadge({ level, className }: { level: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1.5 rounded px-2 font-mono text-[10px] font-medium tracking-wider uppercase ring-1 ring-inset",
        THREAT_LEVEL_STYLES[level] ?? THREAT_LEVEL_STYLES.UNKNOWN,
        className
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {level}
    </span>
  )
}

export function Chips({ values, max = 8, mono = true }: { values: string[]; max?: number; mono?: boolean }) {
  if (values.length === 0) return <span className="text-sm text-muted-foreground">—</span>
  return (
    <span className="flex flex-wrap gap-1.5">
      {values.slice(0, max).map((value, index) => (
        <span
          key={`${index}-${value}`}
          className={cn(
            "rounded border border-ink/[0.08] bg-ink/[0.03] px-1.5 py-0.5 text-xs break-all text-foreground/85",
            mono && "font-mono text-[11px]"
          )}
        >
          {value}
        </span>
      ))}
      {values.length > max && (
        <span className="px-1 text-xs text-muted-foreground">+{values.length - max}</span>
      )}
    </span>
  )
}
