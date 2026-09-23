import { Radar, TriangleAlert } from "lucide-react"
import { SOURCES, formatIsoDate } from "@/lib/investigate/meta"
import type { ExposureInfo, SourceResult } from "@/lib/investigate/types"

const cellHead = "px-5 py-2 font-medium"

function HostExposure({ host }: { host: ExposureInfo }) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[13px] font-medium text-ink">{host.ip}</span>
        {host.tags.map((tag) => (
          <span
            key={tag}
            className="rounded bg-signal/10 px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-signal uppercase ring-1 ring-signal/25"
          >
            {tag}
          </span>
        ))}
        <span className="ml-auto font-mono text-[11px] text-muted-foreground">
          Last seen {formatIsoDate(host.lastUpdate)}
        </span>
      </div>

      <dl className="grid gap-2.5">
        {(
          [
            ["Open ports", host.ports.length > 0 ? host.ports.join(", ") : "None seen"],
            ["Organisation", [host.org, host.isp].filter((v, i, all) => v && all.indexOf(v) === i).join(" · ") || "—"],
            ["Operating system", host.os ?? "—"],
            ["Hostnames", host.hostnames.join(", ") || "—"],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="min-w-0 font-mono text-[12px] break-words text-foreground/90">{value}</dd>
          </div>
        ))}
      </dl>

      {host.services.length > 0 && (
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[12.5px]">
            <thead>
              <tr className="border-y border-ink/[0.06] font-mono text-[10px] tracking-[0.14em] text-muted-foreground/70 uppercase">
                <th scope="col" className={cellHead}>Port</th>
                <th scope="col" className={cellHead}>Service</th>
                <th scope="col" className={cellHead}>Software</th>
                <th scope="col" className={cellHead}>Page title</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/[0.05]">
              {host.services.map((service, index) => (
                <tr key={`${service.port}-${service.transport}-${index}`}>
                  <td className="px-5 py-2 font-mono whitespace-nowrap text-ink">
                    {service.port}/{service.transport}
                  </td>
                  <td className="px-5 py-2 font-mono text-muted-foreground">{service.module ?? "—"}</td>
                  <td className="px-5 py-2 text-foreground/85">
                    {[service.product, service.version].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td className="max-w-[16rem] truncate px-5 py-2 text-foreground/80">{service.title ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {host.vulns.length > 0 && (
        <div>
          <p className="eyebrow flex items-center gap-2 text-[10px]">
            <TriangleAlert aria-hidden className="size-3" />
            Known vulnerabilities · {host.vulns.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Inferred by Shodan from software versions; exposure is likely but not verified.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {host.vulns.slice(0, 40).map((cve) => (
              <a
                key={cve}
                href={`https://nvd.nist.gov/vuln/detail/${cve}`}
                target="_blank"
                rel="noreferrer noopener"
                className="rounded border border-sev-medium/25 bg-sev-medium/10 px-1.5 py-0.5 font-mono text-[11px] text-sev-medium hover:border-sev-medium/50"
              >
                {cve}
              </a>
            ))}
            {host.vulns.length > 40 && (
              <span className="px-1 text-xs text-muted-foreground">+{host.vulns.length - 40} more</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function ExposurePanel({ result }: { result: SourceResult<ExposureInfo[]> }) {
  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-ink/[0.07] bg-navy-800/60 lg:col-span-2">
      <header className="flex items-center justify-between gap-3 border-b border-ink/[0.06] px-5 py-3.5">
        <h2 className="flex items-center gap-2.5 text-sm font-semibold text-ink">
          <span className="grid size-7 place-items-center rounded-md bg-brand/10 ring-1 ring-brand/20">
            <Radar className="size-3.5 text-glow" />
          </span>
          Internet exposure
        </h2>
        <span className="font-mono text-[10px] tracking-wider text-muted-foreground/70 uppercase">Shodan</span>
      </header>
      <p className="border-b border-ink/[0.04] bg-ink/[0.015] px-5 py-2 text-xs text-muted-foreground">
        {SOURCES.exposure.description}
      </p>
      <div className="flex-1 p-5 text-sm">
        {result.status === "ok" && result.data ? (
          <div className="grid gap-7">
            {result.data.map((host) => (
              <HostExposure key={host.ip} host={host} />
            ))}
          </div>
        ) : result.status === "error" ? (
          <p className="flex items-start gap-2 text-alert">
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            {result.error ?? "Shodan lookup failed."}
          </p>
        ) : (
          <p className="text-muted-foreground">
            {result.status === "skipped" ? result.error : "Shodan has no record of this host."}
          </p>
        )}
      </div>
    </section>
  )
}
