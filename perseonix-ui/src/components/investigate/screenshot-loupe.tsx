"use client"

import { useRef, useState, type PointerEvent } from "react"
import { Maximize2, ZoomIn } from "lucide-react"

const ZOOM = 2.5
const LENS = 200

type Lens = { x: number; y: number; width: number; height: number }

/**
 * A screenshot with a press-and-hold magnifier. The image is captured at 2x,
 * so the lens stays sharp at this zoom.
 */
export function ScreenshotLoupe({
  src,
  width,
  height,
  alt,
}: {
  src: string
  width: number
  height: number
  alt: string
}) {
  const frame = useRef<HTMLDivElement>(null)
  const [lens, setLens] = useState<Lens | null>(null)
  const [failed, setFailed] = useState(false)

  const place = (event: PointerEvent<HTMLDivElement>) => {
    const box = frame.current?.getBoundingClientRect()
    if (!box) return
    setLens({
      x: Math.min(Math.max(event.clientX - box.left, 0), box.width),
      y: Math.min(Math.max(event.clientY - box.top, 0), box.height),
      width: box.width,
      height: box.height,
    })
  }

  if (failed) {
    return (
      <p className="grid place-items-center rounded-lg border border-ink/[0.08] bg-navy-900/60 p-10 text-sm text-muted-foreground">
        The screenshot is no longer available.
      </p>
    )
  }

  return (
    <figure className="grid min-w-0 gap-2">
      <div
        ref={frame}
        className="relative cursor-zoom-in touch-none overflow-hidden rounded-lg border border-ink/[0.08] bg-navy-900 select-none"
        style={{ aspectRatio: `${width} / ${height}` }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId)
          place(event)
        }}
        onPointerMove={(event) => {
          if (lens) place(event)
        }}
        onPointerUp={() => setLens(null)}
        onPointerCancel={() => setLens(null)}
        onLostPointerCapture={() => setLens(null)}
      >
        {/* A plain img: the file comes from an authenticated route and is already sized. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          onError={() => setFailed(true)}
          className="block h-full w-full object-cover object-top"
        />
        {lens ? (
          <div
            aria-hidden
            className="pointer-events-none absolute rounded-full border-2 border-white/90 shadow-[0_10px_30px_rgba(0,0,0,0.45)] ring-1 ring-black/40"
            style={{
              width: LENS,
              height: LENS,
              left: lens.x - LENS / 2,
              top: lens.y - LENS / 2,
              backgroundImage: `url("${src}")`,
              backgroundRepeat: "no-repeat",
              backgroundSize: `${lens.width * ZOOM}px ${lens.height * ZOOM}px`,
              backgroundPosition: `${LENS / 2 - lens.x * ZOOM}px ${LENS / 2 - lens.y * ZOOM}px`,
            }}
          />
        ) : (
          <span className="pointer-events-none absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-md bg-navy-950/80 px-2 py-1 text-[11px] text-foreground/85 ring-1 ring-ink/10">
            <ZoomIn aria-hidden className="size-3.5" />
            Press and hold to zoom
          </span>
        )}
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="font-mono text-[11px]">
          {width}×{height} · isolated browser
        </span>
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-medium text-glow hover:text-ink"
        >
          <Maximize2 aria-hidden className="size-3.5" />
          Full size
        </a>
      </figcaption>
    </figure>
  )
}
