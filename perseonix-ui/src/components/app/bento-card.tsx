import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

type BentoCardProps = {
  /** Stable widget identifier, exposed as `data-widget` for future wiring. */
  slot: string
  title: string
  description?: string
  icon: LucideIcon
  className?: string
  children?: ReactNode
}

export function BentoCard({
  slot,
  title,
  description,
  icon: Icon,
  className,
  children,
}: BentoCardProps) {
  return (
    <Card
      data-widget={slot}
      className={cn(
        "relative gap-4 rounded-xl bg-navy-800/60 py-5 ring-ink/[0.07] backdrop-blur-sm transition-shadow hover:ring-brand/30",
        className
      )}
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-ink/10 to-transparent"
      />
      <CardHeader className="px-5">
        <CardTitle className="flex items-center gap-2.5 text-sm font-medium text-ink">
          <span className="grid size-7 place-items-center rounded-md bg-brand/10 ring-1 ring-brand/20">
            <Icon className="size-3.5 text-glow" />
          </span>
          {title}
        </CardTitle>
        {description && (
          <CardDescription className="text-xs">{description}</CardDescription>
        )}
        <CardAction>
          <span className="eyebrow text-[10px] text-muted-foreground/60">Idle</span>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 px-5">
        {children ?? (
          <div className="dot-backdrop grid min-h-28 flex-1 place-items-center rounded-lg border border-dashed border-ink/[0.08] bg-navy-900/40">
            <div className="text-center">
              <p className="eyebrow text-muted-foreground/70">Widget slot · {slot}</p>
              <p className="mt-1 text-xs text-muted-foreground/50">
                Awaiting data source
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
