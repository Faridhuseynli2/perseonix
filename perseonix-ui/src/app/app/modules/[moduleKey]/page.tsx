import type { Metadata } from "next"
import { Gauge, Radar, Server, Siren } from "lucide-react"
import { BentoCard } from "@/components/app/bento-card"
import { Badge } from "@/components/ui/badge"
import { requireModule } from "@/lib/auth/dal"

export const metadata: Metadata = {
  title: "Module",
}

export default async function ModulePage({
  params,
}: PageProps<"/app/modules/[moduleKey]">) {
  const { moduleKey } = await params
  const { module } = await requireModule(moduleKey)

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-glow">Module</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
            {module.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{module.description}</p>
        </div>
        <Badge
          variant="outline"
          className="h-6 gap-1.5 border-ink/10 px-2.5 font-mono text-[11px] text-muted-foreground"
        >
          <span aria-hidden className="size-1.5 rounded-full bg-glow" />
          Licensed
        </Badge>
      </div>

      <div className="mt-8 grid auto-rows-[minmax(200px,auto)] grid-cols-1 gap-4 md:grid-cols-6">
        <BentoCard
          slot={`${module.key}-asset-inventory`}
          title="Asset inventory"
          description="Domains, IPs and cloud assets discovered"
          icon={Radar}
          className="md:col-span-4 md:row-span-2"
        />
        <BentoCard
          slot={`${module.key}-exposure-score`}
          title="Exposure score"
          description="Current external risk posture"
          icon={Gauge}
          className="md:col-span-2"
        />
        <BentoCard
          slot={`${module.key}-open-findings`}
          title="Open findings"
          description="Findings awaiting triage"
          icon={Siren}
          className="md:col-span-2"
        />
        <BentoCard
          slot={`${module.key}-exposed-services`}
          title="Exposed services"
          description="Internet-reachable services by risk"
          icon={Server}
          className="md:col-span-6"
        />
      </div>
    </div>
  )
}
