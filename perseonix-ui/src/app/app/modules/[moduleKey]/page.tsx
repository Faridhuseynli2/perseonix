import type { Metadata } from "next"
import { ShieldCheck } from "lucide-react"
import { requireModule } from "@/lib/auth/dal"

export const metadata: Metadata = {
  title: "Module",
}

export default async function ModulePage({
  params,
}: PageProps<"/app/modules/[moduleKey]">) {
  const { moduleKey } = await params
  const { user, module } = await requireModule(moduleKey)
  const org = user.organizationName || "your account"

  return (
    <div className="mx-auto max-w-[1100px]">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/10 pb-5">
        <div>
          <p className="font-mono text-[10px] tracking-[0.22em] text-glow uppercase">{module.key}</p>
          <h1 className="mt-2 font-display text-[26px] leading-none font-semibold tracking-tight text-ink lg:text-[30px]">
            {module.name}
          </h1>
          {module.description && <p className="mt-2 text-sm text-muted-foreground">{module.description}</p>}
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-ink/10 bg-ink/[0.03] px-2.5 py-1 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
          <span aria-hidden className="size-1.5 rounded-full bg-sev-low" /> Enabled
        </span>
      </header>

      <section className="mt-8 rounded-xl border border-ink/[0.09] bg-navy-900/40 p-10 text-center">
        <ShieldCheck className="mx-auto size-7 text-glow" />
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-foreground/85">
          {module.name} is licensed to {org}. The workspace is being provisioned — your Perseonix analyst
          will confirm when it is available.
        </p>
        <p className="mx-auto mt-2 max-w-md font-mono text-[11px] text-muted-foreground/55">
          Need it sooner? Contact your Perseonix analyst.
        </p>
      </section>
    </div>
  )
}
