import { Camera } from "lucide-react"
import { Facts, SourcePanel } from "@/components/investigate/report"
import { ScreenshotLoupe } from "@/components/investigate/screenshot-loupe"
import { SOURCES } from "@/lib/investigate/meta"
import type { SandboxCapture, SourceResult } from "@/lib/investigate/types"
import { cn } from "@/lib/utils"

const cellHead = "px-5 py-2 font-medium"

export function CapturePanel({
  investigationId,
  result,
  className,
}: {
  investigationId: string
  result: SourceResult<SandboxCapture>
  className?: string
}) {
  return (
    <SourcePanel
      title={SOURCES.sandbox.label}
      icon={Camera}
      provider="Perseonix sandbox"
      description={SOURCES.sandbox.description}
      result={result}
      emptyText="Nothing was captured."
      className={className}
    >
      {(page) => (
        <div className="grid gap-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
            {page.screenshot ? (
              <ScreenshotLoupe
                src={`/app/modules/investigate/${investigationId}/capture`}
                width={page.screenshot.width}
                height={page.screenshot.height}
                alt={`Screenshot of ${page.finalUrl}`}
              />
            ) : (
              <p className="text-muted-foreground">The page loaded, but no screenshot could be taken.</p>
            )}
            <div className="grid content-start gap-5">
              <Facts
                items={[
                  ["Final URL", <span key="u" className="font-mono text-[12px] break-all">{page.finalUrl}</span>],
                  ["Page title", page.title ?? "—"],
                  ["HTTP status", page.status ? <span key="s" className="font-mono">{page.status}</span> : "—"],
                  [
                    "Load",
                    page.loaded ? "Complete" : <span key="l" className="text-sev-medium">Partial (time limit)</span>,
                  ],
                  [
                    "Requests",
                    `${page.requests.total} · ${page.requests.failed} failed · ${page.requests.blocked} blocked`,
                  ],
                  [
                    "Password fields",
                    page.passwordFields > 0 ? (
                      <span key="p" className="text-sev-high">{page.passwordFields}</span>
                    ) : (
                      "None"
                    ),
                  ],
                ]}
              />
              {page.navigations.length > 1 && (
                <div>
                  <p className="eyebrow text-[10px]">Navigation</p>
                  <ol className="mt-2 grid gap-1.5">
                    {page.navigations.map((url, index) => (
                      <li key={`${url}-${index}`} className="flex gap-2 font-mono text-[11.5px] break-all text-foreground/85">
                        <span className="shrink-0 text-muted-foreground">{index + 1}.</span>
                        {url}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {page.externalFormTargets.length > 0 && (
                <div>
                  <p className="eyebrow text-[10px] text-sev-high">Password form submits to</p>
                  <ul className="mt-2 grid gap-1">
                    {page.externalFormTargets.map((target) => (
                      <li key={target} className="font-mono text-[11.5px] break-all text-foreground/90">
                        {target}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {page.hosts.length > 0 && (
            <div>
              <p className="eyebrow text-[10px]">Contacted hosts · {page.hosts.length}</p>
              <div className="-mx-5 mt-2 overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-[12.5px]">
                  <thead>
                    <tr className="border-y border-ink/[0.06] font-mono text-[10px] tracking-[0.14em] text-muted-foreground/70 uppercase">
                      <th scope="col" className={cellHead}>Host</th>
                      <th scope="col" className={cellHead}>IP address</th>
                      <th scope="col" className={cellHead}>Requests</th>
                      <th scope="col" className={cellHead}>Site</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/[0.05]">
                    {page.hosts.slice(0, 15).map((host) => (
                      <tr key={host.host}>
                        <td className="px-5 py-2 font-mono break-all text-foreground/90">{host.host}</td>
                        <td className="px-5 py-2 font-mono text-muted-foreground">{host.ip ?? "—"}</td>
                        <td className="px-5 py-2 font-mono text-foreground/85 tabular-nums">
                          {host.requests}
                          {host.blocked > 0 && <span className="ml-1.5 text-sev-medium">({host.blocked} blocked)</span>}
                        </td>
                        <td className={cn("px-5 py-2 text-xs", host.thirdParty ? "text-foreground/80" : "text-muted-foreground")}>
                          {host.thirdParty ? "Third party" : "Same site"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {page.hosts.length > 15 && (
                <p className="mt-2 text-xs text-muted-foreground">+{page.hosts.length - 15} more hosts</p>
              )}
            </div>
          )}
        </div>
      )}
    </SourcePanel>
  )
}
