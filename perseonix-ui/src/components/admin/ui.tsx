import type { ReactNode } from "react"
import { CircleCheck, Info, TriangleAlert, type LucideIcon } from "lucide-react"
import type { TermStatus } from "@/lib/customers"
import { cn } from "@/lib/utils"

/** Shared styling for native inputs and selects in admin forms. */
export const fieldClass =
  "h-10 w-full rounded-md border border-ink/10 bg-navy-900/60 px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-glow/60 focus-visible:ring-3 focus-visible:ring-glow/20 aria-invalid:border-sev-critical/60 disabled:cursor-not-allowed disabled:opacity-50"

export const tableHeadClass =
  "px-5 py-3 font-mono text-[10px] font-medium tracking-[0.16em] whitespace-nowrap text-muted-foreground/70 uppercase"

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="eyebrow text-glow">{eyebrow}</p>
        <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight text-ink">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Panel({
  title,
  description,
  action,
  tone = "default",
  flush = false,
  className,
  children,
}: {
  title?: string
  description?: string
  action?: ReactNode
  tone?: "default" | "danger"
  /** Drops the body padding, for edge-to-edge tables. */
  flush?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border bg-navy-800/60",
        tone === "danger" ? "border-sev-critical/25" : "border-ink/[0.07]",
        className
      )}
    >
      {title && (
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-ink/[0.06] px-5 py-4">
          <div className="min-w-0">
            <h2
              className={cn(
                "text-sm font-semibold",
                tone === "danger" ? "text-sev-critical" : "text-ink"
              )}
            >
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
            )}
          </div>
          {action}
        </header>
      )}
      <div className={flush ? undefined : "p-5"}>{children}</div>
    </section>
  )
}

const noticeTones: Record<"success" | "error" | "info", { icon: LucideIcon; className: string }> = {
  success: { icon: CircleCheck, className: "border-ok/25 bg-ok/10 text-ok" },
  error: { icon: TriangleAlert, className: "border-sev-critical/30 bg-sev-critical/10 text-alert" },
  info: { icon: Info, className: "border-glow/25 bg-glow/10 text-info" },
}

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "success" | "error" | "info"
  children: ReactNode
}) {
  const { icon: Icon, className } = noticeTones[tone]
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm", className)}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function RoleBadge({ role }: { role: "admin" | "user" }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-md px-2 font-mono text-[10px] font-medium tracking-wider whitespace-nowrap uppercase ring-1 ring-inset",
        role === "admin"
          ? "bg-signal/10 text-signal ring-signal/25"
          : "bg-glow/10 text-glow ring-glow/25"
      )}
    >
      {role === "admin" ? "Administrator" : "Customer user"}
    </span>
  )
}

export function StatusBadge({ status }: { status: "active" | "disabled" }) {
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-md bg-ink/[0.04] px-2 text-xs whitespace-nowrap text-foreground/80 ring-1 ring-ink/10 ring-inset">
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", status === "active" ? "bg-ok" : "bg-muted-foreground")}
      />
      {status === "active" ? "Active" : "Disabled"}
    </span>
  )
}

const planStyles = {
  poc: { label: "POC", className: "bg-signal/10 text-signal ring-signal/25" },
  licensed: { label: "Licensed", className: "bg-glow/10 text-glow ring-glow/25" },
  internal: { label: "Internal", className: "bg-ink/[0.04] text-muted-foreground ring-ink/10" },
} as const

export function PlanBadge({ plan }: { plan: keyof typeof planStyles }) {
  const { label, className } = planStyles[plan]
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-md px-2 font-mono text-[10px] font-medium tracking-wider whitespace-nowrap uppercase ring-1 ring-inset",
        className
      )}
    >
      {label}
    </span>
  )
}

const termDot: Record<TermStatus["tone"], string> = {
  active: "bg-ok",
  ending: "bg-signal",
  ended: "bg-sev-critical",
  open: "bg-muted-foreground",
}

export function TermBadge({ status }: { status: TermStatus }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-md bg-ink/[0.04] px-2 text-xs whitespace-nowrap ring-1 ring-inset",
        status.tone === "ending"
          ? "text-signal ring-signal/25"
          : status.tone === "ended"
            ? "text-alert ring-sev-critical/30"
            : "text-foreground/80 ring-ink/10"
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", termDot[status.tone])} />
      {status.label}
    </span>
  )
}

export function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return <p className="text-xs text-alert">{messages[0]}</p>
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="dot-backdrop m-5 grid place-items-center rounded-lg border border-dashed border-ink/[0.08] bg-navy-900/40 px-6 py-14 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{body}</p>
    </div>
  )
}
