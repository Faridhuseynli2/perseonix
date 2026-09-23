import { useId } from "react"
import { cn } from "@/lib/utils"

// Emblem for the Adversary Intelligence module: a faceted brand shield holding a
// masked actor (angular, watchful), a targeting reticle, and a linked group of
// nodes at the base — hidden actors, tracked, working as a group. Hand-built to
// match the falcon logo's faceted, electric-blue style.

/** The standalone crest. Size it with `className` (defaults to size-8). */
export function AdversaryMark({ className }: { className?: string }) {
  const uid = `adv${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`
  const id = (name: string) => `${uid}-${name}`

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden
      className={cn("size-8 shrink-0", className)}
    >
      <defs>
        <linearGradient id={id("shield")} x1="14" y1="6" x2="60" y2="94" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E7CEE" />
          <stop offset="1" stopColor="#0E4FB0" />
        </linearGradient>
        <linearGradient id={id("shieldR")} x1="50" y1="6" x2="88" y2="94" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2E92F5" />
          <stop offset="1" stopColor="#12539E" />
        </linearGradient>
        <linearGradient id={id("mask")} x1="30" y1="25" x2="66" y2="62" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6AD4FB" />
          <stop offset="1" stopColor="#2E9CF5" />
        </linearGradient>
      </defs>

      {/* Shield, split into two facets down the centre */}
      <path d="M50 5 L50 95 C29 88 12 74 12 50 L12 18 Z" fill={`url(#${id("shield")})`} />
      <path d="M50 5 L88 18 L88 50 C88 74 71 88 50 95 Z" fill={`url(#${id("shieldR")})`} />
      <path
        d="M50 5 L88 18 L88 50 C88 74 71 88 50 95 C29 88 12 74 12 50 L12 18 Z"
        fill="none"
        stroke="#7CC6FB"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M50 12 L81 23 L81 50 C81 70 67 82 50 88 C33 82 19 70 19 50 L19 23 Z"
        fill="none"
        stroke="#0A1A3A"
        strokeWidth="1"
        strokeOpacity="0.45"
        strokeLinejoin="round"
      />

      {/* Targeting reticle */}
      <circle cx="50" cy="44" r="25" fill="none" stroke="#86EAFF" strokeWidth="0.7" strokeOpacity="0.45" strokeDasharray="2 4" />
      <g stroke="#9AE0FF" strokeWidth="1.3" strokeOpacity="0.8" strokeLinecap="round">
        <line x1="50" y1="16" x2="50" y2="21" />
        <line x1="50" y1="67" x2="50" y2="72" />
        <line x1="23" y1="44" x2="28" y2="44" />
        <line x1="72" y1="44" x2="77" y2="44" />
      </g>

      {/* Masked actor */}
      <path
        d="M31 32 L50 26 L69 32 L64 50 L50 62 L36 50 Z"
        fill={`url(#${id("mask")})`}
        stroke="#06102E"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      <path d="M50 26 L50 62" stroke="#06102E" strokeWidth="0.6" strokeOpacity="0.3" />
      <path d="M37 39 L47 44 L46 48 L38 44 Z" fill="#050D26" />
      <path d="M63 39 L53 44 L54 48 L62 44 Z" fill="#050D26" />

      {/* The group: linked nodes */}
      <g stroke="#7CC6FB" strokeWidth="1" strokeOpacity="0.9">
        <line x1="50" y1="62" x2="35" y2="73" />
        <line x1="50" y1="62" x2="65" y2="73" />
        <line x1="35" y1="73" x2="65" y2="73" />
      </g>
      <g fill="#BDEBFF">
        <circle cx="35" cy="73" r="2.7" />
        <circle cx="65" cy="73" r="2.7" />
        <circle cx="50" cy="62" r="2.3" />
      </g>
    </svg>
  )
}

/** The emblem paired with the module name, for headers and cards. */
export function AdversaryLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <AdversaryMark className="size-9" />
      <span className="leading-tight">
        <span className="block font-display text-sm font-semibold tracking-[0.18em] text-ink">
          ADVERSARY
        </span>
        <span className="block font-display text-[11px] font-medium tracking-[0.34em] text-glow">
          INTELLIGENCE
        </span>
      </span>
    </span>
  )
}
