import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Crosshair, Radar, RefreshCw } from "lucide-react"
import { C2Chart } from "@/components/c2/c2-chart"
import { C2SoftwareTable } from "@/components/c2/c2-software-table"
import { requireModule } from "@/lib/auth/dal"
import { INVESTIGATE_MODULE_KEY } from "@/lib/investigate/meta"
import { c2Overview, lastC2Ingestion } from "@/lib/c2/data"
import { colorForSoftware } from "@/lib/c2/catalog"

export const metadata: Metadata = { title: "Talon · C2 Hunting" }

const n = (x: number) => x.toLocaleString("en-US")

const TIMEFRAMES: { key: string; label: string; days: number }[] = [
  { key: "7d", label: "7 Days", days: 7 },
  { key: "1m", label: "1 Month", days: 30 },
  { key: "3m", label: "3 Months", days: 90 },
]

function flag(iso2: string | null): string {
  if (!iso2 || iso2.length !== 2) return "🏴"
  const cc = iso2.toUpperCase()
  if (!/^[A-Z]{2}$/.test(cc)) return "🏴"
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}

function ago(iso: string | null): string {
  if (!iso) return "—"
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m} minutes ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default async function TalonPage({ searchParams }: PageProps<"/app/modules/investigate/c2">) {
  await requireModule(INVESTIGATE_MODULE_KEY)
  const sp = await searchParams
  const tfKey = typeof sp?.tf === "string" ? sp.tf : "1m"
  const tf = TIMEFRAMES.find((t) => t.key === tfKey) ?? TIMEFRAMES[1]

  const [ov, ingestion] = await Promise.all([c2Overview(tf.days), lastC2Ingestion()])

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-5">
      <Link
        href="/app/modules/investigate"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Threat Investigation
      </Link>

      {/* Masthead */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/10 pb-5">
        <div>
          <p className="font-mono text-[10px] tracking-[0.22em] text-glow uppercase">Perseonix Corvael // Talon · C2 Hunting</p>
          <h1 className="mt-2 flex items-center gap-2.5 font-display text-[26px] leading-none font-semibold tracking-tight text-ink lg:text-[30px]">
            <Crosshair className="size-6 text-sev-critical" />
            Talon
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Hunt live command-and-control infrastructure — botnet C2, offensive frameworks and abused tooling, discovered
            across the internet and attributed to malware families.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-ink/10 bg-ink/[0.03] px-2.5 py-1 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
            <RefreshCw className="size-3 text-glow" /> Auto · hourly
          </span>
          <div className="flex items-center gap-1 rounded-md border border-ink/10 bg-navy-950/50 p-0.5">
            {TIMEFRAMES.map((t) => (
              <Link
                key={t.key}
                href={`/app/modules/investigate/c2?tf=${t.key}`}
                className={
                  t.key === tf.key
                    ? "rounded bg-ink/[0.1] px-2.5 py-1 font-mono text-[10px] tracking-wide text-ink uppercase"
                    : "rounded px-2.5 py-1 font-mono text-[10px] tracking-wide text-muted-foreground uppercase transition-colors hover:text-ink"
                }
              >
                {t.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {/* Stat rail */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-ink/[0.09] bg-ink/10 sm:grid-cols-4">
        {[
          { label: "C2 endpoints", value: n(ov.totals.endpoints), sub: "tracked" },
          { label: "Software families", value: n(ov.totals.activeSoftware), sub: "active" },
          { label: "Countries", value: n(ov.totals.countries), sub: "hosting C2" },
          { label: "New", value: n(ov.totals.new24h), sub: "last 24h" },
        ].map((c) => (
          <div key={c.label} className="bg-navy-900 px-4 py-3">
            <p className="font-mono text-[9px] tracking-[0.16em] text-muted-foreground/55 uppercase">{c.label}</p>
            <p className="mt-1 font-mono text-2xl leading-none font-semibold text-ink tabular-nums">{c.value}</p>
            <p className="mt-1 font-mono text-[9px] tracking-wide text-muted-foreground/45 uppercase">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Overview: chart + discoveries */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
        <section className="rounded-xl border border-ink/[0.09] bg-navy-900/40 p-5">
          <h2 className="flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.14em] text-ink uppercase">
            <Radar className="size-4 text-glow" /> Active C2 Servers
          </h2>
          <div className="mt-4">
            <C2Chart days={ov.days} stacks={ov.stacks} />
          </div>
        </section>

        <section className="rounded-xl border border-ink/[0.09] bg-navy-900/40 p-5">
          <h2 className="font-mono text-[11px] font-semibold tracking-[0.14em] text-ink uppercase">Recent C2 Discoveries</h2>
          {ov.recent.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No endpoints yet — the hourly hunt will surface them here.</p>
          ) : (
            <ul className="mt-3 divide-y divide-ink/[0.06]">
              {ov.recent.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/app/modules/investigate/c2/${encodeURIComponent(r.ip)}`}
                    className="group flex items-center gap-3 py-2.5 transition-colors"
                  >
                    <span
                      aria-hidden
                      className="grid size-7 shrink-0 place-items-center rounded font-mono text-[11px] font-semibold text-white"
                      style={{ backgroundColor: colorForSoftware(r.software) }}
                    >
                      {r.softwareName.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-sm text-glow group-hover:text-ink">{r.ip}</span>
                      <span className="font-mono text-[11px] text-muted-foreground/70">:{r.port}</span>
                    </span>
                    <span className="hidden shrink-0 items-center gap-1.5 text-sm text-foreground/85 sm:flex">
                      <span>{flag(r.country)}</span>
                      <span className="truncate">{r.softwareName}</span>
                    </span>
                    <span className="shrink-0 text-right font-mono text-[11px] text-muted-foreground/60">{ago(r.firstSeen)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Software table */}
      <section className="rounded-xl border border-ink/[0.09] bg-navy-900/40 p-5">
        <h2 className="font-mono text-[11px] font-semibold tracking-[0.14em] text-ink uppercase">Software ({tf.label})</h2>
        <p className="mt-1 text-xs text-muted-foreground">Top C2 software by distinct endpoints (unique IP:port) seen in the period.</p>
        <div className="mt-4">
          <C2SoftwareTable software={ov.software} periodLabel={tf.label} />
        </div>
      </section>

      <p className="pt-1 text-center font-mono text-[10px] text-muted-foreground/40">
        Talon · {ingestion ? `last hunt ${ago(ingestion.ranAt)}` : "awaiting first hunt"} · sources: Shodan · abuse.ch Feodo
      </p>
    </div>
  )
}
