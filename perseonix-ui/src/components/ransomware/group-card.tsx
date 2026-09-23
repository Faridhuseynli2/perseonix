import Link from "next/link"
import { ArrowUpRight, Skull, VenetianMask } from "lucide-react"
import type { GroupRow } from "@/lib/ransomware/data"
import { initials } from "@/lib/format"

const dateFormat = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" })

function lastSeenLabel(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : dateFormat.format(d)
}

export function GroupCard({ group }: { group: GroupRow }) {
  const last = lastSeenLabel(group.lastSeen)
  return (
    <Link
      href={`/app/modules/ransomware/groups/${group.slug}`}
      className="group relative flex min-w-0 flex-col gap-3 overflow-hidden rounded-xl border border-ink/[0.07] bg-navy-800/60 p-4 pl-5 transition-all hover:-translate-y-0.5 hover:border-sev-critical/40 hover:bg-navy-800"
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-sev-critical/70 transition-opacity group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className="grid size-11 shrink-0 place-items-center rounded-lg bg-sev-critical/10 font-mono text-xs font-semibold text-sev-critical ring-1 ring-sev-critical/20"
          >
            {initials(group.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink transition-colors group-hover:text-sev-critical">
              {group.name}
            </p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              {group.victimCount} {group.victimCount === 1 ? "victim" : "victims"}
              {last && <span className="text-muted-foreground/60"> · last {last}</span>}
            </p>
          </div>
        </div>
        <ArrowUpRight aria-hidden className="size-4 shrink-0 text-muted-foreground/0 transition-colors group-hover:text-sev-critical" />
      </div>

      {group.aliases.length > 0 && (
        <p className="line-clamp-1 font-mono text-[11px] text-muted-foreground">
          <span className="text-muted-foreground/50">aka </span>
          {group.aliases.join(" · ")}
        </p>
      )}

      {group.adversarySlug && (
        <span className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-md bg-brand/10 px-2 py-0.5 font-mono text-[10px] text-glow ring-1 ring-brand/20">
          <VenetianMask className="size-3" />
          Adversary dossier
        </span>
      )}
      {!group.adversarySlug && (
        <span className="mt-auto inline-flex w-fit items-center gap-1.5 font-mono text-[10px] text-muted-foreground/50">
          <Skull className="size-3" />
          Ransomware operation
        </span>
      )}
    </Link>
  )
}
