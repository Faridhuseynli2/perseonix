import { ArrowUpRight, Boxes, Crosshair, FileText } from "lucide-react"
import { Section } from "@/components/adversaries/section"
import type { MitreEnrichment } from "@/lib/adversaries/data"

/** Techniques grouped by ATT&CK tactic, plus the software ATT&CK attributes to the group. */
export function MitreTechniques({ mitre }: { mitre: MitreEnrichment }) {
  return (
    <Section
      icon={Crosshair}
      label="MITRE ATT&CK"
      hint={`${mitre.techniqueCount} techniques · ${mitre.tactics.length} tactics`}
      action={
        <a
          href={mitre.attackUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 font-mono text-[11px] text-glow hover:text-ink"
        >
          {mitre.attackId}
          <ArrowUpRight aria-hidden className="size-3.5" />
        </a>
      }
    >
      <div className="grid gap-4">
        {mitre.tactics.map((tactic) => (
          <div key={tactic.key}>
            <p className="eyebrow flex items-baseline gap-2 text-[10px]">
              {tactic.label}
              <span className="font-mono text-muted-foreground/50">{tactic.techniques.length}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tactic.techniques.map((technique) => (
                <a
                  key={technique.id}
                  href={technique.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  title={`${technique.id} · ${technique.name}`}
                  className="inline-flex max-w-full items-center gap-1.5 rounded border border-ink/[0.08] bg-ink/[0.03] px-2 py-1 text-xs text-foreground/85 transition-colors hover:border-glow/40 hover:text-ink"
                >
                  <span className="font-mono text-[10px] text-muted-foreground">{technique.id}</span>
                  <span className="truncate">{technique.name}</span>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      {mitre.software.length > 0 && (
        <div className="mt-5 border-t border-ink/[0.06] pt-4">
          <p className="eyebrow flex items-center gap-2 text-[10px]">
            <Boxes aria-hidden className="size-3" />
            Software · {mitre.software.length}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {mitre.software.map((software) => (
              <a
                key={software.id}
                href={software.url}
                target="_blank"
                rel="noreferrer noopener"
                title={`${software.id} · ${software.type}`}
                className="rounded border border-ink/[0.08] bg-ink/[0.03] px-1.5 py-0.5 font-mono text-[11px] text-foreground/80 transition-colors hover:border-glow/40 hover:text-ink"
              >
                {software.name}
              </a>
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 font-mono text-[10px] text-muted-foreground/50">
        © The MITRE Corporation · ATT&amp;CK
      </p>
    </Section>
  )
}

/** External report citations from ATT&CK, as an evidence trail. */
export function MitreReferences({ mitre }: { mitre: MitreEnrichment }) {
  if (mitre.references.length === 0) return null
  return (
    <Section icon={FileText} label="References" hint={`${mitre.references.length}`}>
      <ul className="grid gap-1">
        {mitre.references.map((reference) => (
          <li key={reference.url}>
            <a
              href={reference.url}
              target="_blank"
              rel="noreferrer noopener"
              className="group flex items-start gap-2 rounded-md px-2 py-1.5 text-xs text-foreground/80 transition-colors hover:bg-ink/[0.04] hover:text-ink"
            >
              <ArrowUpRight aria-hidden className="mt-0.5 size-3.5 shrink-0 text-muted-foreground group-hover:text-glow" />
              <span className="line-clamp-2">{reference.name}</span>
            </a>
          </li>
        ))}
      </ul>
    </Section>
  )
}
