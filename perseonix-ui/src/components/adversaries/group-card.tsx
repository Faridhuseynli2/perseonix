import Link from "next/link"
import { ArrowUpRight, Crosshair, Target } from "lucide-react"
import { CategoryBadge } from "@/components/adversaries/badges"
import type { GroupSummary } from "@/lib/adversaries/data"
import { threatAccent } from "@/lib/adversaries/meta"
import { initials } from "@/lib/format"

export function GroupCard({ group }: { group: GroupSummary }) {
  const accent = threatAccent(group.threatLevel)
  return (
    <Link
      href={`/app/modules/adversaries/${group.slug}`}
      className="group relative flex min-w-0 flex-col gap-3 overflow-hidden rounded-xl border border-ink/[0.07] bg-navy-800/60 p-4 pl-5 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:bg-navy-800 hover:shadow-halo-brand"
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px] opacity-70 transition-opacity group-hover:opacity-100"
        style={{ backgroundColor: accent }}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {group.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={group.image}
              alt=""
              loading="lazy"
              className="size-14 shrink-0 rounded-lg object-cover ring-1 ring-ink/[0.1]"
            />
          ) : (
            <span
              aria-hidden
              className="grid size-14 shrink-0 place-items-center rounded-lg bg-navy-900/70 font-mono text-sm font-semibold text-muted-foreground/80 ring-1 ring-ink/[0.08]"
            >
              {initials(group.name)}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink transition-colors group-hover:text-glow">
              {group.name}
            </p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              {group.region}
              {group.mitreId && <span className="text-muted-foreground/60"> · {group.mitreId}</span>}
              {group.techniqueCount ? (
                <span className="text-glow/70"> · {group.techniqueCount} TTPs</span>
              ) : null}
              {group.lastActive ? <span className="text-signal/80"> · last {group.lastActive}</span> : null}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <CategoryBadge category={group.category} />
          <ArrowUpRight
            aria-hidden
            className="size-4 text-muted-foreground/0 transition-colors group-hover:text-glow"
          />
        </div>
      </div>

      {group.aliasNames.length > 0 && (
        <p className="line-clamp-1 font-mono text-[11px] text-muted-foreground">
          <span className="text-muted-foreground/50">aka </span>
          {group.aliasNames.join(" · ")}
        </p>
      )}

      <div className="mt-auto grid gap-2.5 pt-1">
        {group.malware.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {group.malware.slice(0, 4).map((name) => (
              <span
                key={name}
                className="rounded border border-ink/[0.08] bg-ink/[0.03] px-1.5 py-0.5 font-mono text-[10.5px] text-foreground/80"
              >
                {name}
              </span>
            ))}
            {group.malware.length > 4 && (
              <span className="px-1 py-0.5 text-[10.5px] text-muted-foreground">
                +{group.malware.length - 4}
              </span>
            )}
          </div>
        ) : null}
        {group.targets ? (
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Target aria-hidden className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />
            <span className="line-clamp-2">{group.targets}</span>
          </p>
        ) : group.malware.length === 0 ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground/60">
            <Crosshair aria-hidden className="size-3.5 shrink-0" />
            Profile on file
          </p>
        ) : null}
      </div>
    </Link>
  )
}
