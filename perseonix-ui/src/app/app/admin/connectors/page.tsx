import type { Metadata } from "next"
import { ShieldCheck } from "lucide-react"
import { ConnectorCard } from "@/components/admin/connector-card"
import { PageHeader, Panel } from "@/components/admin/ui"
import { requireAdmin } from "@/lib/auth/dal"
import { CONNECTOR_CATEGORIES } from "@/lib/connectors/config"
import { listConnectors } from "@/lib/connectors/service"

export const metadata: Metadata = {
  title: "Connectors",
}

export default async function ConnectorsPage() {
  await requireAdmin()
  const connectors = await listConnectors()
  const active = connectors.filter((c) => c.active).length
  const configured = connectors.filter((c) => c.configured).length

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        eyebrow="Management"
        title="Connectors"
        description="Third-party integrations that power the modules. Add or replace API keys, and turn each integration on or off."
      />

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Active", value: active },
          { label: "Configured", value: configured },
          { label: "Total", value: connectors.length },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-ink/[0.07] bg-navy-800/60 p-4">
            <p className="font-mono text-2xl font-semibold text-ink tabular-nums">{stat.value}</p>
            <p className="eyebrow mt-1 text-[10px] text-muted-foreground/70">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-8">
        {CONNECTOR_CATEGORIES.map((category) => {
          const inCategory = connectors.filter((c) => c.category === category)
          if (inCategory.length === 0) return null
          return (
            <section key={category}>
              <h2 className="eyebrow text-[11px] text-muted-foreground/70">{category}</h2>
              <div className="mt-3 grid gap-4 lg:grid-cols-2">
                {inCategory.map((connector) => (
                  <ConnectorCard key={connector.id} connector={connector} />
                ))}
              </div>
            </section>
          )
        })}
      </div>

      <Panel className="mt-8" title="How keys are handled">
        <ul className="grid gap-2 text-xs leading-relaxed text-muted-foreground">
          <li className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-glow" />
            Saved keys are stored server-side and never shown again — only the last four characters appear here.
          </li>
          <li className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-glow" />
            A key set here overrides the matching environment variable. Remove it to fall back to the environment.
          </li>
          <li className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-glow" />
            Every change is written to the audit log (without the key). Disabling a connector stops the modules from calling it.
          </li>
        </ul>
      </Panel>
    </div>
  )
}
