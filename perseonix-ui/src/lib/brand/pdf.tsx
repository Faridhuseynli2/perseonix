import { Document, Image as PdfImage, Page, Text, View, renderToBuffer } from "@react-pdf/renderer"
import { readFileSync } from "node:fs"
import path from "node:path"
import { C, CONTENT_WIDTH, Facts, MONO, s, Section, Tokens } from "@/lib/investigate/pdf/kit"
import type { DetectionRow } from "@/lib/brand/store"

// Modern, CERT-facing single-lookalike report. Reuses the Threat Investigation
// PDF kit (fonts, palette, components) with a Brand Protection cover + layout.

const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" })
const SEV_COLOR: Record<string, string> = { high: C.high, medium: C.medium, low: C.low }
const SEV_LABEL: Record<string, string> = { high: "HIGH", medium: "MEDIUM", low: "LOW" }

export type BrandPdfData = {
  detection: DetectionRow
  generatedBy: string
  generatedAt: Date
  screenshot: Buffer | null
}

const LOGO_PNG = readFileSync(path.join(process.cwd(), "public/brand/perseonix-emblem.png"))

function LogoMark({ size }: { size: number }) {
  return <PdfImage src={{ data: LOGO_PNG, format: "png" }} style={{ width: size, height: size }} />
}

function fmt(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "—" : dateFmt.format(d)
}

function summary(d: DetectionRow): string {
  const parts: string[] = []
  parts.push(`${d.domain} is a ${d.offlineAt ? "recently-active" : d.resolves ? "live" : "registered"} lookalike of ${d.assetDomain}`)
  const traits: string[] = []
  if (d.hasMx) traits.push("configured to send email as the brand")
  if (d.hasCert) traits.push("carrying a valid TLS certificate")
  if (d.punycode) traits.push("using homoglyph/punycode characters")
  if (traits.length) parts.push(traits.join(", "))
  let text = parts.join(", ") + "."
  text += ` It matches the brand name by ${d.similarity}%`
  if (d.keyword) text += ` and uses the phishing lure “${d.keyword}”`
  text += `. Perseonix rates it ${SEV_LABEL[d.severity] ?? d.severity} risk (${d.score}/100).`
  if (d.offlineAt) text += ` The domain no longer resolves as of ${fmt(d.offlineAt)}; monitor for reactivation.`
  return text
}

function actions(d: DetectionRow): string[] {
  const list = [
    "Report the domain to its registrar and hosting provider with this evidence and request suspension.",
  ]
  if (d.hasCert) list.push(`Request revocation of the TLS certificate from the issuing CA${d.issuer ? ` (${d.issuer})` : ""} via their abuse/revocation channel.`)
  if (d.hasMx) list.push("Block the domain at the mail gateway and warn staff of brand-impersonation phishing — this domain can send email as you.")
  list.push("Add the domain to your blocklists and continuous monitoring; watch for content or DNS changes.")
  list.push("Preserve this report and the sandbox screenshot as evidence for takedown and any legal action.")
  return list
}

function BrandDoc({ data }: { data: BrandPdfData }) {
  const d = data.detection
  const reference = `PX-BP-${d.id.replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase()}`
  const sev = SEV_COLOR[d.severity] ?? C.low
  const status = d.offlineAt ? "Offline (taken down)" : d.resolves ? "Active — resolving" : "Registered — not resolving"

  const evidence: string[] = []
  if (d.resolves) evidence.push("Resolves (live)")
  if (d.hasMx) evidence.push("MX — email-capable")
  if (d.hasCert) evidence.push("TLS certificate")
  if (d.punycode) evidence.push("Punycode / homoglyph")
  if (d.keyword) evidence.push(`Lure: ${d.keyword}`)

  return (
    <Document title={`Lookalike report — ${d.domain}`} author="Perseonix" subject="Brand Protection">
      <Page size="A4" style={s.page}>
        {/* Running header + footer (from page 2 on, header is painted over by band on p1) */}
        <View fixed style={s.runningHeader}>
          <View style={s.runningInner}>
            <View style={s.runningBrand}><LogoMark size={11} /><Text style={s.runningWordmark}>PERSEONIX</Text></View>
            <Text style={s.runningMeta}>{d.domain} · {reference}</Text>
          </View>
        </View>
        <View fixed style={s.footer}>
          <Text style={s.footerText} render={() => "TLP:AMBER · Perseonix Brand Protection · Confidential"} />
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>

        {/* Cover band */}
        <View style={s.band}>
          <View style={s.bandRow}>
            <View style={s.brand}>
              <LogoMark size={30} />
              <View style={{ marginLeft: 9 }}>
                <Text style={s.wordmark}>PERSEONIX</Text>
                <Text style={s.wordmarkSub}>TALOS · BRAND PROTECTION</Text>
              </View>
            </View>
            <View style={s.bandRight}>
              <Text style={s.tlp}>TLP:AMBER</Text>
              <Text style={s.bandTitle}>Lookalike Domain Report</Text>
              <Text style={s.bandMeta}>{reference} · {dateFmt.format(data.generatedAt)}</Text>
            </View>
          </View>
        </View>

        {/* Title block */}
        <View style={s.titleBlock}>
          <Text style={s.eyebrow}>Impersonating {d.assetDomain}</Text>
          <Text style={s.indicator}>{d.domain}</Text>
          <View style={s.titleRow}>
            <View style={[s.pill, { backgroundColor: sev }]}><Text style={s.pillText}>{SEV_LABEL[d.severity] ?? d.severity} risk</Text></View>
            <Text style={s.titleNote}>{status} · risk {d.score}/100 · {d.similarity}% name match</Text>
          </View>
        </View>

        {/* Meta grid */}
        <View style={s.metaGrid}>
          {[
            ["Risk score", `${d.score} / 100`],
            ["Severity", SEV_LABEL[d.severity] ?? d.severity],
            ["Status", status],
            ["First detected", fmt(d.detectedAt)],
          ].map(([label, value]) => (
            <View key={label} style={s.metaCell}>
              <Text style={s.metaLabel}>{label}</Text>
              <Text style={s.metaValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Cards */}
        <View style={s.cards}>
          <View style={[s.card, s.cardGap]}>
            <Text style={s.metaLabel}>Risk score</Text>
            <Text style={[s.cardValue, { color: sev }]}>{d.score}<Text style={s.bigNumberUnit}> /100</Text></Text>
            <Text style={s.cardNote}>{SEV_LABEL[d.severity] ?? d.severity} · {d.similarity}% name match</Text>
          </View>
          <View style={[s.card, s.cardGap]}>
            <Text style={s.metaLabel}>Email capability</Text>
            <Text style={[s.cardValue, { color: d.hasMx ? C.critical : C.ok }]}>{d.hasMx ? "Yes" : "No"}</Text>
            <Text style={s.cardNote}>{d.hasMx ? "MX present — can send mail as you" : "No mail records"}</Text>
          </View>
          <View style={s.card}>
            <Text style={s.metaLabel}>TLS certificate</Text>
            <Text style={[s.cardValue, { color: d.hasCert ? C.high : C.muted }]}>{d.hasCert ? "Issued" : "None"}</Text>
            <Text style={s.cardNote}>{d.hasCert ? (d.issuer ?? "Seen in CT logs") : "Not observed"}</Text>
          </View>
        </View>

        <Section number="01" title="Executive summary">
          <Text style={s.paragraph}>{summary(d)}</Text>
        </Section>

        <Section number="02" title="Risk indicators">
          {evidence.length ? <Tokens values={evidence} /> : <Text style={s.muted}>No active-infrastructure signals.</Text>}
          <View style={{ height: 8 }} />
          <Facts
            items={[
              ["Resolves (A record)", d.resolves ? "Yes — live" : "No"],
              ["IP addresses", d.ips.length ? d.ips.join(", ") : "—"],
              ["Mail (MX) records", d.hasMx ? "Present — can send email as the brand" : "None"],
              ["TLS certificate", d.hasCert ? "Issued (seen in Certificate Transparency)" : "Not observed"],
              ["Certificate issuer", d.issuer ?? "—"],
              ["Homoglyph / punycode", d.punycode ? "Yes" : "No"],
              ["Name similarity", `${d.similarity}%`],
            ]}
          />
        </Section>

        <Section number="03" title="Provenance">
          <Facts
            items={[
              ["Discovery source", d.source === "both" ? "Certificate Transparency + DNS" : d.source === "certificate" ? "Certificate Transparency (crt.sh)" : "Permutation + DNS resolution"],
              ["Permutation class", d.kind],
              ["Certificate first seen", fmt(d.firstSeen)],
              ["Report generated", `${dateFmt.format(data.generatedAt)} by ${data.generatedBy}`],
            ]}
          />
        </Section>

        <Section number="04" title="Recommended actions">
          {actions(d).map((a, i) => (
            <View key={i} style={{ flexDirection: "row", marginBottom: 6 }}>
              <Text style={{ ...MONO_FONT_INLINE, width: 16, color: C.brand }}>{String(i + 1).padStart(2, "0")}</Text>
              <Text style={{ flex: 1, fontSize: 8.6, lineHeight: 1.5, color: C.text }}>{a}</Text>
            </View>
          ))}
        </Section>

        {data.screenshot ? (
          <Section number="05" title="Sandbox screenshot">
            <Text style={[s.small, { marginBottom: 6 }]}>Rendered in an isolated sandbox — do not visit the site directly.</Text>
            <View style={{ borderWidth: 0.6, borderColor: C.rule, borderRadius: 3, overflow: "hidden" }}>
              <PdfImage src={{ data: data.screenshot, format: "jpg" }} style={{ width: CONTENT_WIDTH, height: CONTENT_WIDTH * 0.625 }} />
            </View>
          </Section>
        ) : null}

        <View style={[s.callout, { borderLeftColor: sev, marginTop: 20 }]}>
          <Text style={s.small}>
            This report is generated from public Certificate Transparency logs and live DNS. A match indicates
            impersonation risk, not confirmed malicious activity. Verify independently before requesting a takedown.
          </Text>
        </View>
      </Page>
    </Document>
  )
}

const MONO_FONT_INLINE = { fontFamily: MONO, fontFeatureSettings: { calt: false }, fontSize: 8.6 }

export function renderBrandPdf(data: BrandPdfData): Promise<Buffer> {
  return renderToBuffer(<BrandDoc data={data} />)
}

export function brandPdfFilename(d: DetectionRow): string {
  return `perseonix-lookalike-${d.domain.replace(/[^a-z0-9]/gi, "-")}.pdf`
}
