import { cn } from "@/lib/utils"

// Perseonix Corvael brand mark — the raven-crest emblem (raster, on our dark navy
// ground). One asset drives every surface: sidebar, auth screens, marketing, PDF.
export type LogoTone = "brand" | "ember"

const SRC = "/brand/perseonix-mark.png" // 384px web asset; the PDF uses the full-res emblem

const hasSize = (c?: string) => (c ? /\b(size-|h-|w-)/.test(c) : false)

export function LogoMark({
  className,
  animated = false,
}: {
  className?: string
  /** subtle heartbeat + glow, matching the old mark */
  animated?: boolean
  /** kept for API compatibility; the raster crest is already red */
  tone?: LogoTone
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={SRC}
      alt="Perseonix Corvael"
      className={cn(
        !hasSize(className) && "size-8",
        "shrink-0 origin-center object-contain",
        animated && "motion-safe:animate-logo-beat-ember",
        className
      )}
      draggable={false}
    />
  )
}

export function Logo({
  className,
  animated = false,
}: {
  className?: string
  animated?: boolean
  tone?: LogoTone
}) {
  // The crest already contains the "PERSEONIX" wordmark, so no separate text.
  return <LogoMark animated={animated} className={cn(!hasSize(className) && "size-9", className)} />
}
