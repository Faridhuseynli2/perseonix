import Link from "next/link"
import { ArrowLeft, BellRing, Radar, Skull, X } from "lucide-react"
import { removeRansomwareWatchForm } from "@/app/app/modules/ransomware/actions"
import { EmptyState } from "@/components/admin/ui"
import type { RansomwareWatch } from "@/lib/ransomware/watch"

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" })

export function RansomwareWatchlistView({ watches }: { watches: RansomwareWatch[] }) {
  const totalUnread = watches.reduce((s, w) => s + w.unread, 0)

  return (
    <div className="mx-auto max-w-[1100px]">
      <Link
        href="/app/modules/ransomware"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Ransomware Command
      </Link>

      <header className="mt-4 flex flex-wrap items-end justify-between gap-4 border-b border-ink/10 pb-5">
        <div>
          <p className="font-mono text-[10px] tracking-[0.22em] text-sev-critical/90 uppercase">
            Perseonix Corvael // Ransomware Ops
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink lg:text-3xl">
            My ransomware watchlist
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Saved slices of the attack feed. A new victim matching any of these raises a bell alert.
          </p>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right">
            <p className="font-mono text-2xl font-semibold text-ink tabular-nums">{watches.length}</p>
            <p className="font-mono text-[10px] tracking-wider text-muted-foreground/60 uppercase">Watches</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl font-semibold text-sev-critical tabular-nums">{totalUnread}</p>
            <p className="font-mono text-[10px] tracking-wider text-muted-foreground/60 uppercase">Unread</p>
          </div>
        </div>
      </header>

      {watches.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No watches yet"
            body="Filter the dashboard by country, sector or group and hit “Watch this view”, or open a group and hit “Watch group”."
          />
          <div className="mt-4 text-center">
            <Link
              href="/app/modules/ransomware"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-sev-critical px-4 text-sm font-medium text-white transition-colors hover:bg-sev-critical/90"
            >
              <Radar className="size-4" />
              Go to Ransomware Command
            </Link>
          </div>
        </div>
      ) : (
        <ul className="mt-6 grid gap-2.5">
          {watches.map((w) => (
            <li
              key={w.id}
              className="flex items-center gap-4 rounded-lg border border-ink/[0.08] bg-navy-900/40 p-4"
            >
              <span
                aria-hidden
                className="grid size-10 shrink-0 place-items-center rounded-md bg-sev-critical/10 text-sev-critical ring-1 ring-inset ring-sev-critical/20"
              >
                <Skull className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-semibold text-ink">
                  <span className="truncate">{w.label}</span>
                  {w.unread > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sev-critical/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-sev-critical">
                      <BellRing className="size-3" />
                      {w.unread} new
                    </span>
                  )}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  {w.matchCount} {w.matchCount === 1 ? "victim" : "victims"} tracked
                  <span className="text-muted-foreground/50"> · watching since {dateFmt.format(new Date(w.createdAt))}</span>
                </p>
              </div>
              <form action={removeRansomwareWatchForm.bind(null, w.id)}>
                <button
                  type="submit"
                  aria-label={`Remove watch ${w.label}`}
                  className="inline-flex size-8 items-center justify-center rounded-md border border-ink/10 text-muted-foreground transition-colors hover:border-sev-critical/30 hover:text-alert"
                >
                  <X className="size-4" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
