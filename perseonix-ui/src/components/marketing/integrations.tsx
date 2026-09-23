import type { ReactNode } from "react"
import {
  Database,
  Layers,
  Server,
  ShieldCheck,
  Webhook,
  Workflow,
  type LucideIcon,
} from "lucide-react"
import { SectionHeading } from "@/components/marketing/section-heading"
import { integrations } from "@/content/site"
import type { Dict } from "@/lib/i18n/dictionaries"

const destinationIcons: Record<string, LucideIcon> = {
  SIEM: Server,
  SOAR: Workflow,
  "EDR / XDR": ShieldCheck,
  "Threat Intel Platforms": Database,
  Ticketing: Layers,
  "Email & Chat": Webhook,
}

const Key = ({ children }: { children: ReactNode }) => (
  <span className="text-ember-soft">&quot;{children}&quot;</span>
)
const Str = ({ children }: { children: ReactNode }) => (
  <span className="text-flare-soft">&quot;{children}&quot;</span>
)
const Num = ({ children }: { children: ReactNode }) => (
  <span className="text-flare">{children}</span>
)
const P = ({ children }: { children: ReactNode }) => (
  <span className="text-warm-500/70">{children}</span>
)

function StixSnippet() {
  return (
    <div
      data-reveal
      className="coal-card relative overflow-hidden rounded-2xl border border-white/[0.08]"
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-ember/60 to-transparent"
      />
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-5 py-3">
        <span className="truncate font-mono text-xs text-warm-100/80">
          GET /taxii2/collections/px-ransomware/objects
        </span>
        <span className="shrink-0 rounded-sm bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-warm-500">
          STIX 2.1
        </span>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-6 text-warm-100/80">
        <code>
          <P>{"{"}</P>
          {"\n  "}<Key>type</Key><P>: </P><Str>indicator</Str><P>,</P>
          {"\n  "}<Key>spec_version</Key><P>: </P><Str>2.1</Str><P>,</P>
          {"\n  "}<Key>id</Key><P>: </P><Str>indicator--3f9c2b7e-58d1-4c7a-9e02-6b1f0d4a7c11</Str><P>,</P>
          {"\n  "}<Key>name</Key><P>: </P><Str>Nightglass C2 domain</Str><P>,</P>
          {"\n  "}<Key>pattern</Key><P>: </P><Str>[domain-name:value = &apos;cdn-sync.example&apos;]</Str><P>,</P>
          {"\n  "}<Key>confidence</Key><P>: </P><Num>85</Num><P>,</P>
          {"\n  "}<Key>labels</Key><P>: [</P><Str>ransomware</Str><P>, </P><Str>PX-RAN-42</Str><P>],</P>
          {"\n  "}<Key>kill_chain_phases</Key><P>: [{"{"}</P>
          {"\n    "}<Key>kill_chain_name</Key><P>: </P><Str>mitre-attack</Str><P>,</P>
          {"\n    "}<Key>phase_name</Key><P>: </P><Str>command-and-control</Str>
          {"\n  "}<P>{"}"}],</P>
          {"\n  "}<Key>created_by_ref</Key><P>: </P><Str>identity--perseonix-ptru</Str>
          {"\n"}<P>{"}"}</P>
        </code>
      </pre>
    </div>
  )
}

export function Integrations({ t }: { t: Dict["integrations"] }) {
  return (
    <section id="integrations" className="border-t border-white/[0.06] bg-coal-900 py-24 lg:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 lg:grid-cols-2 lg:gap-20">
        <div>
          <SectionHeading eyebrow={t.eyebrow} title={t.title} description={t.description} />

          <div className="mt-10">
            <p className="font-mono text-[10px] tracking-[0.24em] text-warm-500 uppercase">
              {t.standards}
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {integrations.standards.map((standard) => (
                <li
                  key={standard}
                  className="rounded-md border border-ember/25 bg-ember/[0.08] px-2.5 py-1.5 font-mono text-xs text-warm-100/85"
                >
                  {standard}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8">
            <p className="font-mono text-[10px] tracking-[0.24em] text-warm-500 uppercase">
              {t.deliversTo}
            </p>
            <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {integrations.destinations.map((destination) => {
                const Icon = destinationIcons[destination] ?? Server
                return (
                  <li
                    key={destination}
                    className="flex items-center gap-2.5 rounded-lg border border-white/[0.07] bg-coal-850/60 px-3 py-2.5 text-sm text-warm-100/85"
                  >
                    <Icon className="size-4 shrink-0 text-ember-soft" />
                    <span className="truncate">{destination}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        <StixSnippet />
      </div>
    </section>
  )
}
