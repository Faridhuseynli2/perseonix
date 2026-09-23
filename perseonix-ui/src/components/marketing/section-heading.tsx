import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow: string
  title: ReactNode
  description?: ReactNode
  align?: "left" | "center"
  className?: string
}) {
  return (
    <div
      className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}
    >
      <p className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.24em] text-ember-soft uppercase">
        <span aria-hidden className="size-1 rounded-full bg-ember" />
        {eyebrow}
      </p>
      <h2 className="mt-4 font-grotesk text-3xl font-bold tracking-[-0.02em] text-balance text-white sm:text-4xl lg:text-[2.7rem] lg:leading-[1.08]">
        {title}
      </h2>
      {description && (
        <p className="mt-5 text-base leading-relaxed text-pretty text-warm-300 sm:text-lg">
          {description}
        </p>
      )}
    </div>
  )
}
