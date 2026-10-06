import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Bug, Globe2, Network, Server, Share2, ShieldAlert } from "lucide-react"
import { requireModule } from "@/lib/auth/dal"
import { INVESTIGATE_MODULE_KEY } from "@/lib/investigate/meta"
import { getC2ByIp } from "@/lib/c2/data"
import { colorForSoftware } from "@/lib/c2/catalog"
import { loadConnectorRuntime } from "@/lib/connectors/service"
import { isPublicAddress } from "@/lib/investigate/address"
import { lookupGeo } from "@/lib/investigate/sources/geo"
import { lookupNetwork } from "@/lib/investigate/sources/network"
import { lookupExposure, shodanEnabled } from "@/lib/investigate/sources/shodan"
import { isIP } from "node:net"

export async function generateMetadata({ params }: PageProps<"/app/modules/investigate/c2/[ip]">): Promise<Metadata> {
  const { ip } = await params
  return { title: `${ip} · C2 Hunting` }
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" })
const fmt = (iso: string | null) => (iso ? dateFmt.format(new Date(iso)) : "—")
function flag(iso2: string | null | undefined): string {
  if (!iso2 || iso2.length !== 2 || !/^[A-Za-z]{2}$/.test(iso2)) return "🏴"
  return String.fromCodePoint(...[...iso2.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}

const RISK_STYLE: Record<string, string> = {
  critical: "bg-sev-critical/14 text-sev-critical ring-sev-critical/30",
  high: "bg-sev-critical/12 text-sev-critical ring-sev-critical/25",
  medium: "bg-signal/12 text-signal ring-signal/25",
  low: "bg-ink/[0.06] text-muted-foreground ring-ink/15",
}

export default async function C2IpPage({ params }: PageProps<"/app/modules/investigate/c2/[ip]">) {
  await requireModule(INVESTIGATE_MODULE_KEY)
  const { ip: rawIp } = await params
  const ip = decodeURIComponent(rawIp)
  if (!isIP(ip) || !isPublicAddress(ip)) notFound()

  const rows = await getC2ByIp(ip)

  await loadConnectorRuntime()
  const [netR, geoR, expR] = await Promise.allSettled([
    lookupNetwork(ip),
    lookupGeo(ip),
    shodanEnabled() ? lookupExposure(ip) : Promise.resolve(null),
  ])
  const net = netR.status === "fulfilled" ? netR.value : null
  const geo = geoR.status === "fulfilled" ? geoR.value : null
  const exposure = expR.status === "fulfilled" ? expR.value : null

  const malwares = [...new Set(rows.map((r) => r.malware).filter(Boolean))] as string[]
  const softwares = [...new Set(rows.map((r) => r.softwareName))]
  const topRisk = rows.map((r) => r.risk).sort((a, b) => (["critical", "high", "medium", "low"].indexOf(a) - ["critical", "high", "medium", "low"].indexOf(b)))[0] ?? null
  const highRisk = topRisk === "critical" || topRisk === "high" || malwares.length > 0

  return (
    <div className="mx-auto max-w-[1400px]">
      <Link
        href="/app/modules/investigate/c2"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        C2 Hunting
      </Link>

      {/* Header */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold text-ink">{ip}</h1>
          {highRisk && (
            <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[11px] font-semibold tracking-wide uppercase ring-1 ring-inset ${RISK_STYLE[topRisk ?? "high"]}`}>
              <ShieldAlert className="size-3.5" /> {topRisk === "critical" ? "Critical" : "High"} Risk
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/app/modules/investigate/graph?q=${encodeURIComponent(ip)}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-ink/12 bg-ink/[0.03] px-3.5 text-sm font-medium text-foreground/90 transition-colors hover:border-glow/40 hover:bg-ink/[0.07] hover:text-ink"
          >
            <Share2 className="size-4 text-glow" /> Pivot in Graph
          </Link>
          <Link
            href={`/app/modules/investigate?q=${encodeURIComponent(ip)}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-ink/12 px-3.5 text-sm text-foreground/85 transition-colors hover:bg-ink/[0.06] hover:text-ink"
          >
            Full report
          </Link>
        </div>
      </div>

      {/* Top cards */}
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {/* Network */}
        <section className="rounded-xl border border-ink/[0.09] bg-navy-900/50 p-5">
          <h2 className="flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.14em] text-ink uppercase">
            <Network className="size-4 text-glow" /> Network
          </h2>
          <dl className="mt-4 grid gap-2.5 text-sm">
            <Row k="ASN" v={net?.asn ? `AS${net.asn}` : "—"} />
            <Row k="AS Name" v={net?.asName ?? net?.owner ?? "—"} />
            <Row k="IP Range" v={net?.prefix ?? "—"} mono />
            <Row k="Registry" v={net?.registry ?? "—"} />
          </dl>
        </section>

        {/* Location */}
        <section className="rounded-xl border border-ink/[0.09] bg-navy-900/50 p-5">
          <h2 className="flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.14em] text-ink uppercase">
            <Globe2 className="size-4 text-glow" /> Location
          </h2>
          <dl className="mt-4 grid gap-2.5 text-sm">
            <Row k="Country" v={geo?.countryCode ? `${flag(geo.countryCode)}  ${geo.countryCode}` : "—"} />
            <Row k="City" v={geo?.city ?? "—"} />
            <Row k="Coordinates" v={geo ? `${geo.latitude?.toFixed(2)}, ${geo.longitude?.toFixed(2)}` : "—"} mono />
          </dl>
        </section>

        {/* Reputation & Risk */}
        <section className="rounded-xl border border-ink/[0.09] bg-navy-900/50 p-5">
          <h2 className="flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.14em] text-ink uppercase">
            <ShieldAlert className="size-4 text-sev-critical" /> Reputation &amp; Risk
          </h2>
          <div className="mt-4 grid gap-2.5">
            {highRisk ? (
              <div className="border-l-2 border-sev-critical pl-3">
                <p className="text-sm font-semibold text-sev-critical">Flagged C2 infrastructure</p>
                {malwares.length > 0 && <p className="mt-0.5 text-[13px] text-foreground/85">Active malware: {malwares.join(", ")}</p>}
                {softwares.length > 0 && <p className="mt-0.5 text-[13px] text-muted-foreground">Software: {softwares.join(", ")}</p>}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No C2 attribution recorded for this IP.</p>
            )}
            {exposure?.tags?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {exposure.tags.slice(0, 8).map((t) => (
                  <span key={t} className="rounded-full border border-ink/10 bg-ink/[0.03] px-2 py-0.5 font-mono text-[10px] text-muted-foreground">{t}</span>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      </div>

      {/* Talon C2 records */}
      {rows.length > 0 && (
        <section className="mt-4 rounded-xl border border-ink/[0.09] bg-navy-900/40 p-5">
          <h2 className="flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.14em] text-ink uppercase">
            <Bug className="size-4 text-sev-critical" /> C2 attribution
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center gap-2.5 rounded-lg border border-ink/[0.07] bg-navy-950/40 px-3 py-2.5">
                <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded font-mono text-[11px] font-semibold text-white" style={{ backgroundColor: colorForSoftware(r.software) }}>
                  {r.softwareName.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{r.softwareName}</span>
                  <span className="font-mono text-[11px] text-muted-foreground/70">port {r.port} · {r.source} · seen {fmt(r.lastSeen)}</span>
                </span>
                {r.malware && <span className="shrink-0 rounded border border-sev-critical/30 bg-sev-critical/10 px-1.5 py-0.5 font-mono text-[10px] text-sev-critical">{r.malware}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Open ports & software (Shodan) */}
      <section className="mt-4 rounded-xl border border-ink/[0.09] bg-navy-900/40 p-5">
        <h2 className="flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.14em] text-ink uppercase">
          <Server className="size-4 text-glow" /> Open Ports and Software
        </h2>
        {!shodanEnabled() ? (
          <p className="mt-3 text-sm text-muted-foreground">Enable the Shodan connector (admin → Connectors) to see live ports and services.</p>
        ) : !exposure || exposure.services.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No open ports returned by Shodan for this host.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink/[0.08] text-left font-mono text-[10px] tracking-wider text-muted-foreground/70 uppercase">
                  <th className="px-3 py-2">Port</th>
                  <th className="px-3 py-2">Service</th>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2 text-right">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {exposure.services.map((s, i) => (
                  <tr key={i} className="border-b border-ink/[0.05] last:border-0">
                    <td className="px-3 py-2 font-mono text-glow">{s.port}<span className="text-muted-foreground/50">/{s.transport}</span></td>
                    <td className="px-3 py-2 font-mono text-[12px] text-muted-foreground">{s.module ?? "—"}</td>
                    <td className="px-3 py-2 text-foreground/85">{s.product ?? "—"}{s.version ? ` ${s.version}` : ""}</td>
                    <td className="px-3 py-2 text-muted-foreground">{s.title ?? "—"}</td>
                    <td className="px-3 py-2 text-right font-mono text-[11px] text-muted-foreground/60">{s.lastSeen ? fmt(s.lastSeen) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {exposure.vulns.length > 0 && (
              <p className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[10px] tracking-wide text-muted-foreground/60 uppercase">Shodan-inferred CVEs:</span>
                {exposure.vulns.slice(0, 12).map((v) => (
                  <Link key={v} href={`/app/modules/intel/cve/${encodeURIComponent(v)}`} className="rounded border border-sev-high/30 bg-sev-high/10 px-1.5 py-0.5 font-mono text-[10px] text-sev-high hover:text-ink">{v}</Link>
                ))}
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="font-mono text-[10px] tracking-wider text-muted-foreground/60 uppercase">{k}</dt>
      <dd className={`min-w-0 truncate text-right text-foreground/85${mono ? " font-mono text-[13px]" : ""}`}>{v}</dd>
    </div>
  )
}
