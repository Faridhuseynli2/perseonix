import { cn } from "@/lib/utils"

// Colours follow the FIRST TLP 2.0 specification (coloured text on black).
const tlpStyles = {
  CLEAR: "text-white",
  GREEN: "text-[#33ff00]",
  AMBER: "text-[#ffc000]",
  RED: "text-[#ff2b2b]",
} as const

export type TlpLevel = keyof typeof tlpStyles

export function TlpBadge({
  level,
  className,
}: {
  level: TlpLevel
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-sm bg-black px-1.5 font-mono text-[10px] font-semibold tracking-wider ring-1 ring-white/10",
        tlpStyles[level],
        className
      )}
    >
      TLP:{level}
    </span>
  )
}
