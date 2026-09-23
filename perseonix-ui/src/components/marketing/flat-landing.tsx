import Link from "next/link"
import { ArrowRight, ArrowUpRight, Bell, Crosshair, Globe2, Radar, ScanLine, ShieldCheck, Skull, Target } from "lucide-react"
import type { Dict } from "@/lib/i18n/dictionaries"

/* ── shared primitives ─────────────────────────────────────────────────── */

function Eyebrow({ children, center = false }: { children: React.ReactNode; center?: boolean }) {
  return (
    <p
      className={`mkt-mono inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.22em] text-[var(--mkt-muted)] uppercase ${
        center ? "justify-center" : ""
      }`}
    >
      <span aria-hidden className="inline-block size-1.5 rounded-full bg-[var(--mkt-accent)]" />
      {children}
    </p>
  )
}

function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: React.ReactNode
  description?: string
}) {
  return (
    <div className="mx-auto max-w-[720px] text-center">
      <Eyebrow center>{eyebrow}</Eyebrow>
      <h2 className="mkt-serif mt-6 text-[32px] leading-[1.08] text-[var(--mkt-text)] sm:text-[46px]">{title}</h2>
      {description ? <p className="mx-auto mt-5 max-w-[600px] text-[16px] leading-[1.65] text-[var(--mkt-muted)]">{description}</p> : null}
    </div>
  )
}

function Section({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="border-t border-[var(--mkt-line)]">
      <div className="mkt-reveal mx-auto max-w-[1200px] px-6 py-24 md:py-32">{children}</div>
    </section>
  )
}

/* ── the landing ───────────────────────────────────────────────────────── */

export function FlatLanding({ t }: { t: Dict }) {
  return (
    <main className="flex-1">
      <Hero t={t.hero} />
      <Reality t={t.reality} />
      <Platform t={t.platform} />
      <Modules t={t.modules} />
      <How t={t.how} />
      <Why t={t.why} />
      <Research t={t.research} />
      <About t={t.about} />
      <Cta t={t.cta} />
    </main>
  )
}

/* ── hero — centered, editorial serif, spacious ────────────────────────── */

function Hero({ t }: { t: Dict["hero"] }) {
  return (
    <section className="mkt-horizon relative overflow-hidden">
      <div aria-hidden className="mkt-grid pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-[920px] px-6 pt-20 pb-32 text-center md:pt-28 md:pb-44">
        <div className="mkt-load">
          <Eyebrow center>{t.eyebrow}</Eyebrow>
        </div>
        <h1 className="mkt-serif mkt-load mkt-load-1 mx-auto mt-8 max-w-[880px] text-[44px] leading-[1.04] text-[var(--mkt-text)] sm:text-[64px] lg:text-[80px]">
          {t.titleLine1}{" "}
          <span className="italic text-[var(--mkt-accent)]">{t.titleHighlight}</span>
        </h1>
        <p className="mkt-load mkt-load-2 mx-auto mt-8 max-w-[620px] text-[17px] leading-[1.65] text-[var(--mkt-muted)]">{t.subcopy}</p>
        <div className="mkt-load mkt-load-3 mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className="mkt-mono inline-flex items-center gap-2 rounded-full bg-[var(--mkt-accent)] px-6 py-3 text-[12px] font-semibold tracking-[0.1em] text-white uppercase transition-opacity hover:opacity-90"
          >
            {t.primary} <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/#platform"
            className="mkt-mono inline-flex items-center gap-2 rounded-full border border-[var(--mkt-line-strong)] px-6 py-3 text-[12px] font-medium tracking-[0.1em] text-[var(--mkt-text)] uppercase transition-colors hover:border-[var(--mkt-text)]"
          >
            {t.secondary}
          </Link>
        </div>
        <p className="mkt-mono mkt-load mkt-load-4 mt-10 text-[11px] tracking-[0.12em] text-[var(--mkt-faint)] uppercase">{t.trust}</p>
      </div>
    </section>
  )
}

/* ── reality ───────────────────────────────────────────────────────────── */

function Reality({ t }: { t: Dict["reality"] }) {
  const icons = [Target, ScanLine, Skull]
  return (
    <Section>
      <SectionIntro
        eyebrow={t.eyebrow}
        title={
          <>
            {t.titleLine1} <span className="italic text-[var(--mkt-accent)]">{t.titleHighlight}</span>
          </>
        }
      />
      <p className="mx-auto mt-5 max-w-[640px] text-center text-[16px] leading-[1.65] text-[var(--mkt-muted)]">
        {t.lead1}
        <em className="text-[var(--mkt-text)]">{t.leadEm}</em>
        {t.lead2}
      </p>
      <div className="mt-14 grid gap-px border border-[var(--mkt-line)] bg-[var(--mkt-line)] md:grid-cols-3">
        {t.cards.map((c, i) => {
          const Icon = icons[i] ?? Target
          return (
            <div key={c.title} className="bg-[var(--mkt-surface)] p-7">
              <div className="flex items-center justify-between">
                <Icon className="size-5 text-[var(--mkt-accent)]" />
                <span className="mkt-mono text-[12px] text-[var(--mkt-faint)]">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <h3 className="mkt-serif mt-6 text-[20px] leading-[1.2] text-[var(--mkt-text)]">{c.title}</h3>
              <p className="mt-2.5 text-[14px] leading-[1.6] text-[var(--mkt-muted)]">{c.body}</p>
            </div>
          )
        })}
      </div>
      <p className="mt-8 text-center text-[14px] text-[var(--mkt-faint)]">{t.note}</p>
    </Section>
  )
}

/* ── platform (with flat console preview) ──────────────────────────────── */

function Platform({ t }: { t: Dict["platform"] }) {
  return (
    <Section id="platform">
      <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
        <div>
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h2 className="mkt-serif mt-6 text-[32px] leading-[1.1] text-[var(--mkt-text)] sm:text-[42px]">{t.title}</h2>
          <p className="mt-5 max-w-[520px] text-[16px] leading-[1.65] text-[var(--mkt-muted)]">{t.description}</p>
          <ul className="mt-8 grid gap-3">
            {t.capabilities.map((cap) => (
              <li key={cap} className="flex items-center gap-3">
                <ShieldCheck className="size-4 shrink-0 text-[var(--mkt-accent)]" />
                <span className="text-[15px] text-[var(--mkt-text)]">{cap}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/login"
            className="mkt-mono mt-8 inline-flex items-center gap-2 text-[12px] tracking-[0.12em] text-[var(--mkt-accent)] uppercase transition-opacity hover:opacity-80"
          >
            {t.cta} <ArrowUpRight className="size-4" />
          </Link>
        </div>
        <ConsolePreview />
      </div>
    </Section>
  )
}

function ConsolePreview() {
  // Illustrative product preview — generic cluster labels, not a data claim.
  const rows = [
    { id: "CL-BLACKMIST", threat: "Ransomware", campaigns: 14, seen: "2h" },
    { id: "CL-2231", threat: "Espionage", campaigns: 9, seen: "6h" },
    { id: "CL-NIGHTJAR", threat: "Access broker", campaigns: 21, seen: "1d" },
    { id: "CL-0447", threat: "Hacktivism", campaigns: 5, seen: "2d" },
  ]
  return (
    <div className="rounded-[8px] border border-[var(--mkt-line-strong)] bg-[var(--mkt-surface)]">
      <div className="flex items-center justify-between border-b border-[var(--mkt-line)] px-4 py-3">
        <span className="mkt-mono inline-flex items-center gap-2 text-[11px] tracking-[0.16em] text-[var(--mkt-muted)] uppercase">
          <Radar className="size-3.5 text-[var(--mkt-accent)]" /> Adversary // Tracking
        </span>
        <span className="mkt-mono inline-flex items-center gap-1.5 text-[10px] tracking-[0.12em] text-[var(--mkt-faint)] uppercase">
          <span aria-hidden className="size-1.5 rounded-full bg-[var(--mkt-accent)]" /> live
        </span>
      </div>
      <ul>
        {rows.map((r) => (
          <li key={r.id} className="border-b border-[var(--mkt-line)] px-4 py-3.5 last:border-b-0">
            <div className="flex items-center justify-between gap-4">
              <span className="mkt-mono text-[13px] text-[var(--mkt-text)]">{r.id}</span>
              <span className="mkt-mono shrink-0 text-[11px] tabular-nums text-[var(--mkt-faint)]">{r.seen}</span>
            </div>
            <span className="mkt-mono mt-1 block text-[10px] tracking-[0.1em] text-[var(--mkt-accent)] uppercase">{r.threat}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ── modules ───────────────────────────────────────────────────────────── */

function Modules({ t }: { t: Dict["modules"] }) {
  const supIcons = [Skull, ShieldCheck, ScanLine, Crosshair]
  return (
    <Section id="modules">
      <SectionIntro
        eyebrow={t.eyebrow}
        title={
          <>
            {t.titleLine1} <span className="text-[var(--mkt-muted)]">{t.titleLine2}</span>
          </>
        }
        description={t.description}
      />
      <div className="mt-14 grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        {/* Flagship */}
        <div className="rounded-[8px] border border-[var(--mkt-line-strong)] bg-[var(--mkt-surface)] p-8">
          <div className="flex items-center gap-3">
            <Crosshair className="size-5 text-[var(--mkt-accent)]" />
            <span className="mkt-mono rounded-full border border-[var(--mkt-accent)] px-2.5 py-0.5 text-[10px] tracking-[0.14em] text-[var(--mkt-accent)] uppercase">
              {t.flagship}
            </span>
          </div>
          <h3 className="mkt-serif mt-6 text-[26px] text-[var(--mkt-text)]">{t.flagshipName}</h3>
          <p className="mt-3 max-w-[520px] text-[15px] leading-[1.65] text-[var(--mkt-muted)]">{t.flagshipDesc}</p>
          <div className="mt-7 flex flex-wrap gap-2">
            {t.chips.map((chip) => (
              <span
                key={chip}
                className="mkt-mono rounded-full border border-[var(--mkt-line-strong)] px-3 py-1 text-[11px] tracking-[0.06em] text-[var(--mkt-muted)]"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
        {/* Supporting */}
        <div className="grid gap-px overflow-hidden rounded-[8px] border border-[var(--mkt-line)] bg-[var(--mkt-line)]">
          {t.supporting.map((m, i) => {
            const Icon = supIcons[i] ?? ShieldCheck
            return (
              <div key={m.name} className="bg-[var(--mkt-surface)] p-5">
                <div className="flex items-center gap-2.5">
                  <Icon className="size-4 text-[var(--mkt-accent)]" />
                  <h4 className="text-[15px] font-semibold text-[var(--mkt-text)]">{m.name}</h4>
                </div>
                <p className="mt-1.5 text-[13px] leading-[1.55] text-[var(--mkt-muted)]">{m.tagline}</p>
              </div>
            )
          })}
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-3 rounded-[8px] border border-[var(--mkt-line)] bg-[var(--mkt-surface)] p-6 sm:flex-row sm:items-center sm:gap-5">
        <Bell className="size-5 shrink-0 text-[var(--mkt-accent)]" />
        <div>
          <h4 className="text-[15px] font-semibold text-[var(--mkt-text)]">{t.alertsName}</h4>
          <p className="mt-1 text-[14px] leading-[1.55] text-[var(--mkt-muted)]">{t.alertsBody}</p>
        </div>
      </div>
    </Section>
  )
}

/* ── how it works ──────────────────────────────────────────────────────── */

function How({ t }: { t: Dict["how"] }) {
  return (
    <Section>
      <SectionIntro eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <ol className="mt-14 grid gap-px overflow-hidden rounded-[8px] border border-[var(--mkt-line)] bg-[var(--mkt-line)] md:grid-cols-2 lg:grid-cols-4">
        {t.steps.map((s, i) => (
          <li key={s.title} className="bg-[var(--mkt-surface)] p-7">
            <span className="mkt-serif text-[28px] text-[var(--mkt-accent)]">{String(i + 1).padStart(2, "0")}</span>
            <h3 className="mt-4 text-[17px] font-semibold text-[var(--mkt-text)]">{s.title}</h3>
            <p className="mt-2 text-[14px] leading-[1.6] text-[var(--mkt-muted)]">{s.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  )
}

/* ── why ───────────────────────────────────────────────────────────────── */

function Why({ t }: { t: Dict["why"] }) {
  return (
    <Section>
      <SectionIntro eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <div className="mt-14 grid gap-px overflow-hidden rounded-[8px] border border-[var(--mkt-line)] bg-[var(--mkt-line)] md:grid-cols-3">
        {t.pillars.map((p, i) => (
          <div key={p.title} className="bg-[var(--mkt-surface)] p-7">
            <span className="mkt-mono text-[12px] text-[var(--mkt-faint)]">{String(i + 1).padStart(2, "0")}</span>
            <h3 className="mkt-serif mt-4 text-[20px] text-[var(--mkt-text)]">{p.title}</h3>
            <p className="mt-2.5 text-[14px] leading-[1.6] text-[var(--mkt-muted)]">{p.body}</p>
          </div>
        ))}
      </div>
    </Section>
  )
}

/* ── research ──────────────────────────────────────────────────────────── */

function Research({ t }: { t: Dict["research"] }) {
  return (
    <Section id="research">
      <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
        <div>
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h2 className="mkt-serif mt-6 text-[32px] leading-[1.1] text-[var(--mkt-text)] sm:text-[42px]">{t.title}</h2>
          <p className="mt-5 max-w-[520px] text-[16px] leading-[1.65] text-[var(--mkt-muted)]">{t.description}</p>
          <Link
            href="/login"
            className="mkt-mono mt-8 inline-flex items-center gap-2 text-[12px] tracking-[0.12em] text-[var(--mkt-accent)] uppercase transition-opacity hover:opacity-80"
          >
            {t.library} <ArrowUpRight className="size-4" />
          </Link>
        </div>
        <div className="rounded-[8px] border border-[var(--mkt-line-strong)] bg-[var(--mkt-surface)]">
          <div className="flex items-center gap-2 border-b border-[var(--mkt-line)] px-5 py-3.5">
            <Crosshair className="size-4 text-[var(--mkt-accent)]" />
            <span className="mkt-mono text-[11px] tracking-[0.16em] text-[var(--mkt-muted)] uppercase">{t.trackingEyebrow}</span>
          </div>
          <div className="p-6">
            <p className="mkt-serif text-[19px] leading-[1.3] text-[var(--mkt-text)]">{t.trackingTitle}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["CL-BLACKMIST", "CL-NIGHTJAR", "CL-2231", "CL-0447", "CL-EMBERWOLF"].map((c) => (
                <span key={c} className="mkt-mono rounded-full border border-[var(--mkt-line)] px-2.5 py-1 text-[11px] text-[var(--mkt-muted)]">
                  {c}
                </span>
              ))}
            </div>
            <p className="mkt-mono mt-6 text-[11px] tracking-[0.1em] text-[var(--mkt-faint)] uppercase">{t.customersOnly}</p>
          </div>
        </div>
      </div>
    </Section>
  )
}

/* ── about ─────────────────────────────────────────────────────────────── */

function About({ t }: { t: Dict["about"] }) {
  return (
    <Section id="about">
      <SectionIntro eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <div className="mt-14 grid gap-px overflow-hidden rounded-[8px] border border-[var(--mkt-line)] bg-[var(--mkt-line)] md:grid-cols-3">
        {t.principles.map((p) => (
          <div key={p.title} className="bg-[var(--mkt-surface)] p-7">
            <h3 className="text-[16px] font-semibold text-[var(--mkt-text)]">{p.title}</h3>
            <p className="mt-2.5 text-[14px] leading-[1.6] text-[var(--mkt-muted)]">{p.body}</p>
          </div>
        ))}
      </div>
    </Section>
  )
}

/* ── cta — centered, serif, horizon glow ───────────────────────────────── */

function Cta({ t }: { t: Dict["cta"] }) {
  return (
    <section className="mkt-horizon relative overflow-hidden border-t border-[var(--mkt-line)]">
      <div aria-hidden className="mkt-grid pointer-events-none absolute inset-0" />
      <div className="mkt-reveal relative mx-auto max-w-[820px] px-6 py-28 text-center md:py-36">
        <Eyebrow center>{t.eyebrow}</Eyebrow>
        <h2 className="mkt-serif mx-auto mt-7 max-w-[720px] text-[36px] leading-[1.08] text-[var(--mkt-text)] sm:text-[54px]">
          {t.title} <span className="italic text-[var(--mkt-accent)]">{t.highlight}</span>
        </h2>
        <p className="mx-auto mt-7 max-w-[560px] text-[16px] leading-[1.65] text-[var(--mkt-muted)]">{t.subcopy}</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            href="/login"
            className="mkt-mono inline-flex items-center gap-2 rounded-full bg-[var(--mkt-accent)] px-7 py-3.5 text-[12px] font-semibold tracking-[0.1em] text-white uppercase transition-opacity hover:opacity-90"
          >
            {t.primary} <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/#platform"
            className="mkt-mono inline-flex items-center gap-2 rounded-full border border-[var(--mkt-line-strong)] px-7 py-3.5 text-[12px] font-medium tracking-[0.1em] text-[var(--mkt-text)] uppercase transition-colors hover:border-[var(--mkt-text)]"
          >
            {t.secondary}
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ── footer ────────────────────────────────────────────────────────────── */

export function FlatFooter({ t }: { t: Dict["footer"] }) {
  return (
    <footer className="border-t border-[var(--mkt-line)]">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-6 py-14 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Globe2 className="size-4 text-[var(--mkt-accent)]" />
          <p className="max-w-[420px] text-[13px] leading-[1.55] text-[var(--mkt-muted)]">{t.tagline}</p>
        </div>
        <div className="mkt-mono flex flex-col gap-1 text-[11px] tracking-[0.08em] text-[var(--mkt-faint)] uppercase md:text-right">
          <span>{t.note}</span>
          <span>{t.copyright}</span>
        </div>
      </div>
    </footer>
  )
}
