import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Share2 } from "lucide-react"
import { GraphExplorer } from "@/components/investigate/graph/graph-explorer"
import { requireModule } from "@/lib/auth/dal"
import { INVESTIGATE_MODULE_KEY } from "@/lib/investigate/meta"

export const metadata: Metadata = { title: "Infrastructure Graph · Threat Investigation" }

export default async function InvestigateGraphPage() {
  await requireModule(INVESTIGATE_MODULE_KEY)

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5">
      <Link
        href="/app/modules/investigate"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Threat Investigation
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/10 pb-5">
        <div>
          <p className="font-mono text-[10px] tracking-[0.22em] text-glow uppercase">
            Perseonix Corvael // Infrastructure Graph
          </p>
          <h1 className="mt-2 flex items-center gap-2.5 font-display text-[26px] leading-none font-semibold tracking-tight text-ink lg:text-[30px]">
            <Share2 className="size-6 text-glow" />
            Infrastructure Graph
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Map and pivot through an adversary&apos;s live infrastructure — DNS, shared TLS certificates, hosting networks,
            exposed services and threat verdicts — fused from Shodan, crt.sh, RDAP, DNS and abuse feeds.
          </p>
        </div>
      </header>

      <GraphExplorer />
    </div>
  )
}
