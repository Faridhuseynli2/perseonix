import Link from "next/link"
import { ArrowLeft, ArrowUpRight, BellRing, Radar, X } from "lucide-react"
import { unwatchActorForm } from "@/app/app/modules/adversaries/actions"
import { EmptyState } from "@/components/admin/ui"
import type { WatchedActor } from "@/lib/adversaries/watch"
import { initials } from "@/lib/format"

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" })

export function WatchlistView({ actors }: { actors: WatchedActor[] }) {
  const totalUnread = actors.reduce((sum, a) => sum + a.unread, 0)

  return (
    <div className="mx-auto max-w-[1100px]">
      <Link
        href="/app/modules/adversaries"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        All threat actors
      </Link>

      <section className="hud-corners relative mt-4 overflow-hidden rounded-2xl border border-ink/[0.08] bg-navy-900/70">
        <div aria-hidden className="hud-grid fade-mask-top pointer-events-none absolute inset-0 opacity-50" />
        <div className="relative flex flex-wrap items-end justify-between gap-4 p-6 lg:p-7">
          <div>
            <p className="eyebrow text-[10px] text-glow">Adversary Intelligence // Watchlist</p>
            <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink lg:text-3xl">
              My watchlist
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Threat actors you follow. New public reporting on any of them appears in your alerts bell.
            </p>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right">
              <p className="font-mono text-2xl font-semibold text-ink tabular-nums">{actors.length}</p>
              <p className="font-mono text-[10px] tracking-wider text-muted-foreground/70 uppercase">Following</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-2xl font-semibold text-glow tabular-nums">{totalUnread}</p>
              <p className="font-mono text-[10px] tracking-wider text-muted-foreground/70 uppercase">Unread</p>
            </div>
          </div>
        </div>
      </section>

      {actors.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="You're not following anyone yet"
            body="Open a threat actor and hit “Watch actor” to get alerted when new activity is reported."
          />
          <div className="mt-4 text-center">
            <Link
              href="/app/modules/adversaries"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand/90"
            >
              <Radar className="size-4" />
              Browse threat actors
            </Link>
          </div>
        </div>
      ) : (
        <ul className="mt-6 grid gap-2.5">
          {actors.map((actor) => (
            <li
              key={actor.slug}
              className="group flex items-center gap-4 rounded-xl border border-ink/[0.07] bg-navy-800/60 p-4 transition-colors hover:border-brand/30"
            >
              <Link
                href={`/app/modules/adversaries/${actor.slug}`}
                className="flex min-w-0 flex-1 items-center gap-4"
              >
                {actor.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={actor.image}
                    alt=""
                    loading="lazy"
                    className="size-12 shrink-0 rounded-lg object-cover ring-1 ring-ink/[0.1]"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="grid size-12 shrink-0 place-items-center rounded-lg bg-navy-900/70 font-mono text-sm font-semibold text-muted-foreground/80 ring-1 ring-ink/[0.08]"
                  >
                    {initials(actor.name)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-semibold text-ink group-hover:text-glow">
                    <span className="truncate">{actor.name}</span>
                    {actor.unread > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-glow/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-glow">
                        <BellRing className="size-3" />
                        {actor.unread} new
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {actor.campaignCount > 0
                      ? `${actor.campaignCount} report${actor.campaignCount === 1 ? "" : "s"} on file`
                      : "No reporting yet"}
                    {actor.lastYear ? <span className="text-signal/80"> · last {actor.lastYear}</span> : null}
                    <span className="text-muted-foreground/50"> · watching since {dateFmt.format(new Date(actor.since))}</span>
                  </p>
                </div>
                <ArrowUpRight
                  aria-hidden
                  className="size-4 shrink-0 text-muted-foreground/0 transition-colors group-hover:text-glow"
                />
              </Link>
              <form action={unwatchActorForm.bind(null, actor.slug)}>
                <button
                  type="submit"
                  aria-label={`Unwatch ${actor.name}`}
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
