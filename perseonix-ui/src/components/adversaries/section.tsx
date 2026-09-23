import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

/** Panel with an iconed header, shared across the adversary profile sections. */
export function Section({
  icon: Icon,
  label,
  hint,
  action,
  children,
  className,
}: {
  icon: LucideIcon
  label: string
  hint?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`overflow-hidden rounded-xl border border-ink/[0.07] bg-navy-800/60 ${className ?? ""}`}>
      <header className="flex items-center gap-2.5 border-b border-ink/[0.06] px-5 py-3">
        <span aria-hidden className="grid size-6 place-items-center rounded bg-brand/10 ring-1 ring-brand/20">
          <Icon className="size-3.5 text-glow" />
        </span>
        <h2 className="text-[13px] font-semibold text-ink">{label}</h2>
        {hint && <span className="font-mono text-[10px] text-muted-foreground/60">{hint}</span>}
        {action && <span className="ml-auto">{action}</span>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  )
}
