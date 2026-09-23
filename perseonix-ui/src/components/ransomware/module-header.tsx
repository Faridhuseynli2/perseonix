import { Skull } from "lucide-react"
import { ModuleTabs } from "@/components/ransomware/module-tabs"
import { RefreshButton } from "@/components/ransomware/refresh-button"
import type { IngestionInfo } from "@/lib/ransomware/data"

function ago(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) return "just now"
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export function ModuleHeader({
  lastIngestion,
  canRefresh,
}: {
  lastIngestion: IngestionInfo
  canRefresh: boolean
}) {
  return (
    <section className="hud-corners relative overflow-hidden rounded-2xl border border-ink/[0.08] bg-navy-900/70">
      <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-sev-critical" />
      <div aria-hidden className="hud-grid fade-mask-top pointer-events-none absolute inset-0 opacity-50" />
      <div className="relative p-6 lg:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow flex items-center gap-2 text-[10px] text-glow">
              <span aria-hidden className="inline-block size-1.5 rounded-full bg-sev-critical motion-safe:animate-beacon" />
              Perseonix Corvael // Ransomware Tracker
            </p>
            <div className="mt-3 flex items-center gap-3">
              <span
                aria-hidden
                className="grid size-11 shrink-0 place-items-center rounded-xl bg-sev-critical/10 text-sev-critical ring-1 ring-sev-critical/25"
              >
                <Skull className="size-5.5" />
              </span>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-ink lg:text-3xl">
                Ransomware Tracker
              </h1>
            </div>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Ransomware groups and their claimed victims, tracked from public leak-site activity.
            </p>
          </div>

          {canRefresh && (
            <div className="flex flex-col items-end gap-2">
              <RefreshButton />
              <p className="font-mono text-[10px] tracking-wider text-muted-foreground/60 uppercase">
                {lastIngestion
                  ? `Updated ${ago(lastIngestion.ranAt)}`
                  : "Never updated — run a refresh"}
              </p>
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-ink/[0.08] pt-4">
          <ModuleTabs />
          {!canRefresh && lastIngestion && (
            <span className="font-mono text-[10px] tracking-wider text-muted-foreground/60 uppercase">
              Updated {ago(lastIngestion.ranAt)}
            </span>
          )}
        </div>
      </div>
    </section>
  )
}
