import { Radar, Search } from "lucide-react"
import { SeverityPill, type Severity } from "@/components/intel/severity"
import { cn } from "@/lib/utils"

type Finding = {
  level: Severity
  title: string
  category: string
  asset: string
  age: string
}

const findings: Finding[] = [
  {
    level: "critical",
    title: "Remote desktop service exposed to the internet",
    category: "New exposure",
    asset: "203.0.113.24:3389",
    age: "2m",
  },
  {
    level: "high",
    title: "Public storage bucket with directory listing enabled",
    category: "Cloud",
    asset: "backup.example-corp.com",
    age: "11m",
  },
  {
    level: "high",
    title: "VPN appliance running firmware with a known exploited CVE",
    category: "Vulnerable software",
    asset: "vpn.example-corp.com",
    age: "24m",
  },
  {
    level: "medium",
    title: "Dangling CNAME record — subdomain takeover risk",
    category: "DNS",
    asset: "promo.example-corp.com",
    age: "47m",
  },
  {
    level: "low",
    title: "TLS certificate expires in 9 days",
    category: "Certificates",
    asset: "mail.example-corp.com",
    age: "1h",
  },
]

const assetTypes = [
  { label: "Subdomains", share: 38 },
  { label: "IP addresses", share: 27 },
  { label: "Cloud assets", share: 21 },
  { label: "Certificates", share: 14 },
]

const trend = [18, 22, 19, 27, 24, 31, 29, 36, 33, 41, 38, 47, 44, 52]

function sparkline(values: number[], width: number, height: number) {
  const max = Math.max(...values)
  const min = Math.min(...values)
  const step = width / (values.length - 1)
  const line = values
    .map((v, i) => {
      const y = height - 2 - ((v - min) / (max - min)) * (height - 4)
      return `${i ? "L" : "M"}${(i * step).toFixed(1)} ${y.toFixed(1)}`
    })
    .join(" ")
  return { line, area: `${line} L${width} ${height} L0 ${height} Z` }
}

export function ConsolePreview() {
  const spark = sparkline(trend, 248, 56)

  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -inset-x-8 -top-12 bottom-8 -z-10 rounded-[2.5rem] bg-ember/16 blur-3xl"
      />
      <div className="coal-card relative overflow-hidden rounded-2xl border border-white/[0.08] text-left">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-ember/70 to-transparent"
        />

        <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-2.5 text-sm">
            <Radar className="size-4 shrink-0 text-ember-soft" />
            <span className="font-medium text-white">Perseonix Corvael</span>
            <span className="hidden truncate text-warm-500 sm:inline">
              / Attack surface findings
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden h-8 w-60 items-center gap-2 rounded-md border border-white/[0.08] bg-coal-950/60 px-2.5 text-xs text-warm-500 md:flex">
              <Search className="size-3.5" />
              Search assets, ports, CVEs
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] font-medium tracking-wider text-warm-300 uppercase">
              <span aria-hidden className="size-1.5 rounded-full bg-flare" />
              Sample data
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_296px]">
          <div>
            <div className="hidden grid-cols-[92px_minmax(0,1fr)_48px] gap-4 border-b border-white/[0.06] px-5 py-2.5 font-mono text-[10px] tracking-[0.16em] text-warm-500 uppercase sm:grid">
              <span>Severity</span>
              <span>Finding</span>
              <span className="text-right">Age</span>
            </div>
            <ul className="divide-y divide-white/[0.05]">
              {findings.map((item) => (
                <li
                  key={item.title}
                  className="grid grid-cols-[92px_minmax(0,1fr)_48px] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
                >
                  <SeverityPill level={item.level} />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-white/90">{item.title}</p>
                    <p className="mt-1 flex min-w-0 items-center gap-2 text-xs text-warm-500">
                      <span className="shrink-0">{item.category}</span>
                      <span
                        aria-hidden
                        className="size-0.5 shrink-0 rounded-full bg-warm-500/60"
                      />
                      <span className="truncate font-mono text-[11px] text-warm-300/70">
                        {item.asset}
                      </span>
                    </p>
                  </div>
                  <span className="text-right font-mono text-xs text-warm-500 tabular-nums">
                    {item.age}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <aside className="hidden flex-col gap-7 border-l border-white/[0.06] bg-coal-950/30 p-5 lg:flex">
            <div>
              <p className="eyebrow-warm">Exposure score</p>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-4xl font-semibold tracking-tight text-white tabular-nums">
                  72
                </span>
                <span className="text-sm text-warm-500">/100</span>
                <span className="ml-auto rounded bg-flare/10 px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wider text-flare uppercase">
                  Elevated
                </span>
              </div>
              <div aria-hidden className="mt-3 flex gap-[3px]">
                {Array.from({ length: 20 }, (_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1.5 flex-1 rounded-[1px]",
                      i >= 14
                        ? "bg-white/[0.07]"
                        : i < 9
                          ? "bg-ember"
                          : i < 12
                            ? "bg-ember-soft"
                            : "bg-flare"
                    )}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between">
                <p className="eyebrow-warm">Assets monitored</p>
                <span className="font-mono text-[11px] text-ember-soft">+37 this week</span>
              </div>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-white tabular-nums">
                2,418
              </p>
              <svg
                viewBox="0 0 248 56"
                preserveAspectRatio="none"
                aria-hidden
                className="mt-3 h-14 w-full"
              >
                <defs>
                  <linearGradient id="talos-spark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#ff3b52" stopOpacity="0.3" />
                    <stop offset="1" stopColor="#ff3b52" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={spark.area} fill="url(#talos-spark)" />
                <path
                  d={spark.line}
                  fill="none"
                  stroke="#ff3b52"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>

            <div>
              <p className="eyebrow-warm">Assets by type</p>
              <ul className="mt-3 grid gap-3">
                {assetTypes.map((s) => (
                  <li key={s.label}>
                    <div className="flex justify-between text-xs">
                      <span className="text-warm-100/80">{s.label}</span>
                      <span className="font-mono text-warm-500 tabular-nums">
                        {s.share}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-1 rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-ember to-flare"
                        style={{ width: `${s.share * 2.2}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
