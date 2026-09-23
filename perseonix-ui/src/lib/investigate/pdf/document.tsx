import type { ReactNode } from "react"
import {
  Circle,
  Document,
  G,
  Image as PdfImage,
  Line,
  Link,
  Page,
  Path,
  Polygon,
  Rect,
  Svg,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer"
import { readFileSync } from "node:fs"
import path from "node:path"
import {
  collectPivots,
  coverage,
  executiveSummary,
  severityCounts,
  traceSteps,
} from "@/lib/investigate/explain"
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  buildMapGeometry,
  formatCoordinates,
  placeName,
} from "@/lib/investigate/map-geometry"
import {
  KIND_LABELS,
  SEVERITY_MEANING,
  SEVERITY_ORDER,
  SOURCES,
  VERDICTS,
  VERDICT_ORDER,
  countryName,
  formatIsoDate,
  plural,
} from "@/lib/investigate/meta"
import type {
  AbuseInfo,
  GeoLocation,
  InvestigationReport,
  SandboxCapture,
  SourceResult,
  TargetKind,
  Verdict,
  VirusTotalInfo,
} from "@/lib/investigate/types"
import {
  C,
  CONTENT_WIDTH,
  Facts,
  SEVERITY_COLORS,
  Section,
  SeverityChip,
  StackedBar,
  Subsection,
  Table,
  Tokens,
  VERDICT_COLORS,
  VerdictPill,
  s,
} from "@/lib/investigate/pdf/kit"

export type PdfInvestigation = {
  id: string
  input: string
  query: string
  kind: TargetKind
  verdict: Verdict
  report: InvestigationReport
  createdAt: Date
  userName: string | null
  organizationName: string | null
  generatedAt: Date
  generatedBy: string
  /** The sandbox screenshot (JPEG), when one was stored. */
  screenshot?: Buffer | null
}

/** Traffic Light Protocol 2.0: share within the recipient organisation and its clients. */
const TLP = "TLP:AMBER"

const dateTime = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })

function formatDateTimeUtc(value?: Date | string) {
  if (!value) return "—"
  const date = typeof value === "string" ? new Date(value) : value
  return Number.isNaN(date.getTime()) ? "—" : `${dateTime.format(date)} UTC`
}

function ageText(iso: string) {
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000)
  if (days < 90) return plural(days, "day")
  if (days < 730) return plural(Math.floor(days / 30), "month")
  return `${(days / 365).toFixed(1)} years`
}

const vtTotal = (vt: VirusTotalInfo) => vt.stats.malicious + vt.stats.suspicious + vt.stats.harmless + vt.stats.undetected
const worstAbuse = (hosts: AbuseInfo[]) => hosts.reduce((a, b) => (b.score > a.score ? b : a))
const detectionColor = (malicious: number) =>
  malicious >= 5 ? C.critical : malicious >= 2 ? C.high : malicious === 1 ? C.medium : C.ok
const abuseColor = (score: number) => (score >= 75 ? C.critical : score >= 25 ? C.high : score > 0 ? C.medium : C.ok)

/** Why a source has nothing to show. */
function Unavailable({ result, empty }: { result?: SourceResult<unknown>; empty: string }) {
  const text = !result
    ? "Not part of this report."
    : result.status === "error"
      ? `Unavailable: ${result.error ?? "the lookup failed."}`
      : result.status === "empty"
        ? empty
        : (result.error ?? "Not applicable.")
  return <Text style={s.muted}>{text}</Text>
}

// ---------------------------------------------------------------------------
// Brand, running header and footer

const LOGO_PNG = readFileSync(path.join(process.cwd(), "public/brand/perseonix-emblem.png"))

function LogoMark({ size }: { size: number }) {
  return <PdfImage src={{ data: LOGO_PNG, format: "png" }} style={{ width: size, height: size }} />
}

/** On every page; the first page's cover band is painted over it. */
function RunningHeader({ reference, query }: { reference: string; query: string }) {
  return (
    <View fixed style={s.runningHeader}>
      <View style={s.runningInner}>
        <View style={s.runningBrand}>
          <LogoMark size={11} />
          <Text style={s.runningWordmark}>PERSEONIX</Text>
        </View>
        <Text style={s.runningMeta}>
          {query} · {reference}
        </Text>
      </View>
    </View>
  )
}

/**
 * The footer sits below the content area, where pagination drops static text;
 * text with a `render` prop is laid out again on every page, so all of it uses one.
 */
function Footer() {
  return (
    <View fixed style={s.footer}>
      <Text style={s.footerText} render={() => `${TLP} · Perseonix Threat Investigation Report · Confidential`} />
      <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  )
}

function CoverBand({ reference, generatedAt }: { reference: string; generatedAt: Date }) {
  return (
    <View style={s.band}>
      <View style={s.bandRow}>
        <View style={s.brand}>
          <LogoMark size={30} />
          <View style={{ marginLeft: 9 }}>
            <Text style={s.wordmark}>PERSEONIX</Text>
            <Text style={s.wordmarkSub}>THREAT INTELLIGENCE</Text>
          </View>
        </View>
        <View style={s.bandRight}>
          <Text style={s.tlp}>{TLP}</Text>
          <Text style={s.bandTitle}>Threat Investigation Report</Text>
          <Text style={s.bandMeta}>
            {reference} · {formatDateTimeUtc(generatedAt)}
          </Text>
        </View>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// First page: target, verdict, key figures

function TitleBlock({ data }: { data: PdfInvestigation }) {
  const meta: [string, string][] = [
    ["Prepared for", data.organizationName ?? "Perseonix"],
    ["Requested by", data.userName ?? "—"],
    ["Investigated", formatDateTimeUtc(data.createdAt)],
    ["Exported by", data.generatedBy],
  ]
  return (
    <View style={s.titleBlock} wrap={false}>
      <Text style={s.eyebrow}>{KIND_LABELS[data.kind]}</Text>
      <Text style={s.indicator}>{data.query}</Text>
      {data.input.trim() !== data.query && <Text style={s.submitted}>Submitted as {data.input.trim()}</Text>}
      <View style={s.titleRow}>
        <VerdictPill verdict={data.verdict} label={VERDICTS[data.verdict].label} />
        <Text style={s.titleNote}>{VERDICTS[data.verdict].description}</Text>
      </View>
      <View style={s.metaGrid}>
        {meta.map(([label, value]) => (
          <View key={label} style={s.metaCell}>
            <Text style={s.metaLabel}>{label}</Text>
            <Text style={s.metaValue}>{value}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function StatCards({ report }: { report: InvestigationReport }) {
  const counts = severityCounts(report.signals)
  const findings = counts.critical + counts.high + counts.medium + counts.low
  const { answered, attempted } = coverage(traceSteps(report))
  const cards: { label: string; value: string; note: string; color?: string }[] = [
    {
      label: "Verdict",
      value: VERDICTS[report.verdict].label,
      note: VERDICTS[report.verdict].rule,
      color: VERDICT_COLORS[report.verdict],
    },
    {
      label: "Findings",
      value: String(findings),
      note: `${counts.critical} critical · ${counts.high} high · ${counts.medium} medium`,
    },
  ]

  const vt = report.virustotal?.data
  if (vt) {
    cards.push({
      label: "Vendor detections",
      value: `${vt.stats.malicious}/${vtTotal(vt)}`,
      note: vt.fallbackFrom ? `VirusTotal · host ${vt.indicator}` : "VirusTotal",
      color: detectionColor(vt.stats.malicious),
    })
  }
  const abuse = report.abuse?.data
  const registered = report.registration.data?.createdAt
  if (report.target.kind === "ip" && abuse?.length) {
    const worst = worstAbuse(abuse)
    cards.push({
      label: "Abuse confidence",
      value: `${worst.score}%`,
      note: `AbuseIPDB · ${plural(worst.totalReports, "report")}`,
      color: abuseColor(worst.score),
    })
  } else if (registered) {
    cards.push({ label: "Domain age", value: ageText(registered), note: `Registered ${formatIsoDate(registered)}` })
  }
  if (cards.length < 4) {
    cards.push({ label: "Sources", value: `${answered}/${attempted}`, note: "responded" })
  }

  return (
    <View style={s.cards} wrap={false}>
      {cards.slice(0, 4).map((card, index) => (
        <View key={card.label} style={index < 3 ? [s.card, s.cardGap] : s.card}>
          <Text style={s.metaLabel}>{card.label}</Text>
          <Text
            style={[
              s.cardValue,
              // Long values ("No known threats") would wrap at the default size.
              { color: card.color ?? C.navy, fontSize: card.value.length > 10 ? 11 : 16 },
            ]}
          >
            {card.value}
          </Text>
          <Text style={s.cardNote}>{card.note}</Text>
        </View>
      ))}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Sections

function SummarySection({ report }: { report: InvestigationReport }) {
  const [assessment, ...rest] = executiveSummary(report)
  return (
    <>
      <View style={[s.callout, { borderLeftColor: VERDICT_COLORS[report.verdict] }]}>
        <Text style={[s.paragraph, { marginBottom: 0 }]}>{assessment}</Text>
      </View>
      {rest.map((paragraph) => (
        <Text key={paragraph} style={s.paragraph}>
          {paragraph}
        </Text>
      ))}
    </>
  )
}

function FindingsSection({ report }: { report: InvestigationReport }) {
  if (report.signals.length === 0) return <Text style={s.muted}>No findings.</Text>
  return (
    <Table
      columns={[
        { label: "Severity", width: 62 },
        { label: "Finding", flex: 1 },
        { label: "Source", width: 78 },
      ]}
      rows={report.signals.map((signal) => [
        <SeverityChip key="severity" severity={signal.severity} />,
        <View key="finding">
          <Text style={s.strong}>{signal.title}</Text>
          {signal.detail ? <Text style={[s.muted, { marginTop: 1.5 }]}>{signal.detail}</Text> : null}
          {signal.why ? <Text style={[s.small, { marginTop: 1.5 }]}>{signal.why}</Text> : null}
        </View>,
        signal.source ? SOURCES[signal.source].provider : "—",
      ])}
    />
  )
}

function PageCaptureSection({ capture, screenshot }: { capture: SandboxCapture; screenshot: Buffer | null }) {
  const ratio = capture.screenshot ? capture.screenshot.height / capture.screenshot.width : 0.625
  const imageWidth = CONTENT_WIDTH - 1.2
  return (
    <>
      {screenshot ? (
        <View wrap={false} style={{ borderWidth: 0.6, borderColor: "#CBD4E1", borderRadius: 3, overflow: "hidden" }}>
          <PdfImage src={{ data: screenshot, format: "jpg" }} style={{ width: imageWidth, height: imageWidth * ratio }} />
        </View>
      ) : (
        <Text style={s.muted}>The screenshot is no longer available.</Text>
      )}
      <View style={{ marginTop: 9 }}>
        <Facts
          items={[
            ["Final URL", <Text key="u" style={s.mono}>{capture.finalUrl}</Text>],
            ["Page title", capture.title ?? "—"],
            ["HTTP status", capture.status ? String(capture.status) : "—"],
            ["Load", capture.loaded ? "Complete" : "Partial (time limit reached)"],
            [
              "Requests",
              `${capture.requests.total} (${capture.requests.failed} failed, ${capture.requests.blocked} blocked)`,
            ],
            ["Password fields", capture.passwordFields > 0 ? String(capture.passwordFields) : "None"],
            ...(capture.externalFormTargets.length
              ? ([["Form submits to", capture.externalFormTargets.join(", ")]] as [string, string][])
              : []),
          ]}
        />
      </View>
      {capture.hosts.length > 0 && (
        <View style={{ marginTop: 9 }}>
          <Table
            columns={[
              { label: `Contacted hosts (${capture.hosts.length})`, flex: 1.6 },
              { label: "IP address", flex: 1.1 },
              { label: "Requests", width: 52 },
              { label: "Site", width: 66 },
            ]}
            rows={capture.hosts.slice(0, 15).map((host) => [
              <Text key="h" style={s.mono}>{host.host}</Text>,
              <Text key="i" style={s.mono}>{host.ip ?? "—"}</Text>,
              String(host.requests),
              host.thirdParty ? "Third party" : "Same site",
            ])}
          />
        </View>
      )}
    </>
  )
}

function MapLabel({ point, x, y }: { point: GeoLocation; x: number; y: number }) {
  const title = placeName(point)
  const estimatedWidth = Math.max(title.length * 4.3, point.ip.length * 4.1) + 14
  const flip = x + 12 + estimatedWidth > CONTENT_WIDTH - 6
  const above = y - 40 > 4
  return (
    <View
      style={[
        s.mapLabel,
        flip ? { right: CONTENT_WIDTH - x + 12 } : { left: x + 12 },
        { top: above ? y - 38 : y + 12 },
      ]}
    >
      <Text style={s.mapLabelTitle}>{title}</Text>
      <Text style={s.mapLabelIp}>{point.ip}</Text>
    </View>
  )
}

function PdfMap({ points }: { points: GeoLocation[] }) {
  const map = buildMapGeometry(points)
  const scale = CONTENT_WIDTH / MAP_WIDTH
  const height = MAP_HEIGHT * scale
  const { inset } = map
  const single = map.markers.length === 1 ? map.markers[0] : null

  return (
    <View style={{ position: "relative", width: CONTENT_WIDTH, height }} wrap={false}>
      <Svg width={CONTENT_WIDTH} height={height} viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}>
        <Rect x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} fill="#EDF2F8" />
        <Path d={map.graticule} fill="none" stroke="#DFE6F0" strokeWidth={0.6} />
        {map.countries.map((country, index) => (
          <Path
            key={index}
            d={country.d}
            fill={country.highlighted ? "#D3E7FB" : "#DCE2EB"}
            stroke={country.highlighted ? C.brand : "#FFFFFF"}
            strokeWidth={country.highlighted ? 1.1 : 0.7}
          />
        ))}
        {map.markers.map(({ point, x, y }) => (
          <G key={point.ip}>
            {!point.cityLevel && (
              <Circle
                cx={x}
                cy={y}
                r={26}
                fill={C.brand}
                fillOpacity={0.08}
                stroke={C.brand}
                strokeWidth={0.8}
                strokeDasharray="3,3"
              />
            )}
            <Line x1={x - 15} y1={y} x2={x - 7} y2={y} stroke={C.navy} strokeWidth={1.1} />
            <Line x1={x + 7} y1={y} x2={x + 15} y2={y} stroke={C.navy} strokeWidth={1.1} />
            <Line x1={x} y1={y - 15} x2={x} y2={y - 7} stroke={C.navy} strokeWidth={1.1} />
            <Line x1={x} y1={y + 7} x2={x} y2={y + 15} stroke={C.navy} strokeWidth={1.1} />
            <Circle cx={x} cy={y} r={4.5} fill={C.signal} stroke={C.navy} strokeWidth={1.5} />
          </G>
        ))}
        <Rect
          x={inset.x}
          y={inset.y}
          width={inset.width}
          height={inset.height}
          rx={4}
          fill="#FFFFFF"
          stroke="#CBD4E1"
          strokeWidth={0.8}
        />
        <Path d={inset.sphere} fill="#F3F6FA" stroke="#D5DDE8" strokeWidth={0.5} />
        <Path d={inset.land} fill="#C3CDDB" />
        {inset.viewport.length > 0 && (
          <Polygon
            points={inset.viewport.map((xy) => xy.join(",")).join(" ")}
            fill={C.brand}
            fillOpacity={0.15}
            stroke={C.brand}
            strokeWidth={0.8}
          />
        )}
        {inset.points.map((xy, index) => (
          <Circle key={index} cx={xy.x} cy={xy.y} r={2.2} fill={C.signal} stroke={C.navy} strokeWidth={0.5} />
        ))}
      </Svg>
      <View style={s.mapFrame} />
      {single ? (
        <MapLabel point={single.point} x={single.x * scale} y={single.y * scale} />
      ) : (
        map.markers.map(({ point, index, x, y }) => (
          <View key={point.ip} style={[s.mapBadge, { left: x * scale + 6, top: y * scale - 15 }]}>
            <Text style={s.mapBadgeText}>{index + 1}</Text>
          </View>
        ))
      )}
      {single && <Text style={s.mapCoords}>{formatCoordinates(single.point)}</Text>}
    </View>
  )
}

function LocationSection({ points }: { points: GeoLocation[] }) {
  return (
    <>
      <PdfMap points={points} />
      <View style={{ marginTop: 10 }}>
        <Table
          columns={[
            { label: "#", width: 18 },
            // Wide enough for common IPv6 addresses on one line.
            { label: "IP address", flex: 1.7 },
            { label: "Location", flex: 1.4 },
            { label: "Coordinates", flex: 1.5 },
            { label: "Network", flex: 1.2 },
            { label: "Precision", width: 58 },
          ]}
          rows={points.map((point, index) => [
            String(index + 1),
            <Text key="ip" style={s.mono}>{point.ip}</Text>,
            placeName(point),
            <Text key="c" style={s.mono}>{formatCoordinates(point)}</Text>,
            <Text key="n" style={s.mono}>{point.network ?? "—"}</Text>,
            point.cityLevel ? "City" : "Country only",
          ])}
        />
      </View>
      <Text style={[s.small, { marginTop: 6 }]}>
        Approximate. IP geolocation reflects where the network range is registered and may differ from the
        server&apos;s physical location.
      </Text>
    </>
  )
}

function VirusTotalBlock({ result }: { result?: SourceResult<VirusTotalInfo> }) {
  const vt = result?.status === "ok" ? result.data : undefined
  return (
    <Subsection title="Vendor detections" meta="VIRUSTOTAL">
      {!vt ? (
        <Unavailable result={result} empty="Not analyzed by VirusTotal." />
      ) : (
        <>
          {vt.fallbackFrom && (
            <Text style={[s.muted, { marginBottom: 6 }]}>
              No VirusTotal record for this URL. Results shown for the host {vt.indicator}.
            </Text>
          )}
          <View style={[s.row, { marginBottom: 9 }]} wrap={false}>
            <View style={{ width: 92 }}>
              <Text style={[s.bigNumber, { color: detectionColor(vt.stats.malicious) }]}>
                {vt.stats.malicious}
                <Text style={s.bigNumberUnit}>/{vtTotal(vt)}</Text>
              </Text>
              <Text style={s.small}>detections</Text>
            </View>
            <View style={{ flex: 1 }}>
              <StackedBar
                segments={[
                  { value: vt.stats.malicious, color: C.critical },
                  { value: vt.stats.suspicious, color: C.high },
                  { value: vt.stats.harmless, color: "#7FCBAE" },
                  { value: vt.stats.undetected, color: "#CDD4DF" },
                ]}
              />
              <Text style={[s.small, { marginTop: 4 }]}>
                Malicious {vt.stats.malicious} · Suspicious {vt.stats.suspicious} · Harmless {vt.stats.harmless} ·
                Undetected {vt.stats.undetected}
              </Text>
            </View>
          </View>
          <Facts
            items={[
              ["Last analysis", formatDateTimeUtc(vt.lastAnalysisAt)],
              ["First seen", formatIsoDate(vt.firstSeenAt)],
              ["Community score", `${vt.reputation ?? 0} (${vt.votes.malicious} malicious, ${vt.votes.harmless} harmless votes)`],
              ...(vt.popularity
                ? ([["Popularity", `#${vt.popularity.rank.toLocaleString("en-US")} · ${vt.popularity.provider}`]] as [string, string][])
                : []),
              ...(vt.owner || vt.network
                ? ([["Network", [vt.owner, vt.asn && `AS${vt.asn}`, vt.network, countryName(vt.country)].filter(Boolean).join(" · ")]] as [string, string][])
                : []),
              ...(vt.categories.length ? ([["Categories", vt.categories.join(", ")]] as [string, string][]) : []),
              ...(vt.threatNames.length ? ([["Threat names", vt.threatNames.join(", ")]] as [string, string][]) : []),
              ...(vt.tags.length ? ([["Tags", vt.tags.join(", ")]] as [string, string][]) : []),
            ]}
          />
          {vt.engines.length > 0 && (
            <View style={{ marginTop: 9 }}>
              <Table
                columns={[
                  { label: "Engine", flex: 1.2 },
                  { label: "Result", width: 70 },
                  { label: "Label", flex: 1.4 },
                ]}
                rows={vt.engines.map((engine) => [
                  engine.engine,
                  <Text key="r" style={{ color: engine.category === "malicious" ? C.critical : C.high, fontWeight: 600 }}>
                    {engine.category}
                  </Text>,
                  <Text key="l" style={s.mono}>{engine.label ?? "—"}</Text>,
                ])}
              />
            </View>
          )}
          <Link src={vt.permalink} style={[s.link, { marginTop: 6 }]}>
            View on VirusTotal
          </Link>
        </>
      )}
    </Subsection>
  )
}

function AbuseBlock({ result }: { result?: SourceResult<AbuseInfo[]> }) {
  const hosts = result?.status === "ok" ? result.data : undefined
  return (
    <Subsection title="Abuse reports" meta="ABUSEIPDB · 90 DAYS">
      {!hosts?.length ? (
        <Unavailable result={result} empty="No data returned." />
      ) : (
        hosts.map((host, hostIndex) => (
          <View key={host.ip} style={hostIndex > 0 ? { marginTop: 12 } : undefined}>
            <View style={[s.row, { marginBottom: 8 }]} wrap={false}>
              <View style={{ width: 92 }}>
                <Text style={[s.bigNumber, { color: abuseColor(host.score) }]}>{host.score}%</Text>
                <Text style={s.small}>confidence of abuse</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.mono, { color: C.navy, fontWeight: 500 }]}>
                  {host.ip}
                  {host.isTor ? "  ·  Tor exit" : ""}
                  {host.isWhitelisted ? "  ·  Whitelisted" : ""}
                </Text>
                <View style={{ marginTop: 5 }}>
                  <StackedBar
                    segments={[
                      { value: host.score, color: abuseColor(host.score) },
                      { value: 100 - host.score, color: "#E9EDF3" },
                    ]}
                  />
                </View>
              </View>
            </View>
            <Facts
              items={[
                ["Reports", `${host.totalReports} (${host.distinctReporters} reporters)`],
                ["Last report", formatDateTimeUtc(host.lastReportedAt)],
                ["Usage type", host.usageType ?? "—"],
                ["ISP", host.isp ?? "—"],
                ["Domain", host.domain ?? "—"],
                ["Country", countryName(host.countryCode) ?? "—"],
              ]}
            />
            {host.categories.length > 0 && (
              <View style={{ marginTop: 9 }}>
                <Table
                  columns={[
                    { label: `Category (last ${host.sampled} reports)`, flex: 1 },
                    { label: "Share", flex: 1.4 },
                    { label: "Reports", width: 48 },
                  ]}
                  rows={host.categories.map((category) => [
                    category.name,
                    <View key="bar" style={{ paddingTop: 2.5 }}>
                      <StackedBar
                        segments={[
                          { value: category.count, color: C.brand },
                          { value: host.categories[0].count - category.count, color: "#E9EDF3" },
                        ]}
                      />
                    </View>,
                    String(category.count),
                  ])}
                />
              </View>
            )}
            {host.recent.length > 0 && (
              <View style={{ marginTop: 9 }}>
                <Table
                  columns={[
                    { label: "Reported", width: 118 },
                    { label: "Categories", flex: 1 },
                    { label: "Reporter", width: 50 },
                  ]}
                  rows={host.recent.map((report) => [
                    formatDateTimeUtc(report.reportedAt),
                    report.categories.join(", ") || "Uncategorized",
                    report.reporterCountry ?? "—",
                  ])}
                />
              </View>
            )}
            <Link src={host.permalink} style={[s.link, { marginTop: 6 }]}>
              View on AbuseIPDB
            </Link>
          </View>
        ))
      )}
    </Subsection>
  )
}

function ThreatFeedBlock({ report }: { report: InvestigationReport }) {
  const result = report.threatFeed
  const feed = result.data
  return (
    <Subsection title="Malware URL feed" meta="URLHAUS">
      {!feed ? (
        <Unavailable result={result} empty="No data returned." />
      ) : !feed.listed ? (
        <Text style={s.muted}>Not listed.</Text>
      ) : (
        <Table
          columns={[
            { label: "URL", flex: 2 },
            { label: "Status", width: 50 },
            { label: "Threat", flex: 1 },
            { label: "Added", width: 62 },
          ]}
          rows={feed.hits.map((hit) => [
            <Text key="u" style={s.mono}>{hit.url}</Text>,
            hit.status,
            hit.threat,
            formatIsoDate(hit.dateAdded.replace(" ", "T").replace(" UTC", "Z")),
          ])}
        />
      )}
    </Subsection>
  )
}

function InfrastructureSection({ report }: { report: InvestigationReport }) {
  const isIp = report.target.kind === "ip"
  const network = report.network
  const registration = report.registration
  const dns = report.dns
  const exposure = report.exposure
  const certificates = report.certificates

  return (
    <>
      <Subsection title="Network & hosting" meta="TEAM CYMRU · RDAP">
        {network.status !== "ok" || !network.data ? (
          <Unavailable result={network} empty="No network data." />
        ) : (
          network.data.map((host, index) => (
            <View key={host.ip} style={index > 0 ? { marginTop: 8 } : undefined}>
              <Facts
                items={[
                  ["IP address", <Text key="ip" style={s.mono}>{host.ip}</Text>],
                  ["ASN", host.asn ? `AS${host.asn}${host.asName ? ` · ${host.asName}` : ""}` : "—"],
                  ["Prefix", host.prefix ?? host.networkRange ?? "—"],
                  ["Network", [host.networkName, host.owner].filter(Boolean).join(" · ") || "—"],
                  ["Country", countryName(host.country) ?? "—"],
                  ["Registry", host.registry ?? "—"],
                  ["Reverse DNS", host.reverseDns.join(", ") || "—"],
                  ["Abuse contact", host.abuseEmail ?? "—"],
                ]}
              />
            </View>
          ))
        )}
      </Subsection>

      {!isIp && (
        <Subsection title="Registration" meta="RDAP">
          {registration.status !== "ok" || !registration.data ? (
            <Unavailable result={registration} empty="No registration record." />
          ) : (
            <Facts
              items={[
                ["Domain", <Text key="d" style={s.mono}>{registration.data.domain}</Text>],
                ["Registrar", registration.data.registrar ?? "—"],
                [
                  "Registered",
                  registration.data.createdAt
                    ? `${formatIsoDate(registration.data.createdAt)} (${ageText(registration.data.createdAt)} ago)`
                    : "—",
                ],
                ["Expires", formatIsoDate(registration.data.expiresAt)],
                ["Last changed", formatIsoDate(registration.data.updatedAt)],
                ["DNSSEC", registration.data.dnssec === undefined ? "—" : registration.data.dnssec ? "Signed" : "Not signed"],
                ["Status", registration.data.status.join(", ") || "—"],
                ["Nameservers", registration.data.nameservers.join(", ") || "—"],
              ]}
            />
          )}
        </Subsection>
      )}

      {!isIp && (
        <Subsection title="DNS records" meta="PUBLIC RESOLVERS">
          {dns.status !== "ok" || !dns.data ? (
            <Unavailable result={dns} empty="No records returned." />
          ) : dns.data.nxdomain ? (
            <Text style={s.muted}>The domain does not exist in DNS (NXDOMAIN).</Text>
          ) : (
            <Table
              columns={[
                { label: "Type", width: 50 },
                { label: "Value", flex: 1 },
              ]}
              rows={(
                [
                  ["A", dns.data.a],
                  ["AAAA", dns.data.aaaa],
                  ["CNAME", dns.data.cname],
                  ["MX", dns.data.mx.map((mx) => `${mx.priority} ${mx.exchange}`)],
                  ["NS", dns.data.ns],
                  ["TXT", dns.data.txt],
                  ["CAA", dns.data.caa],
                  ["DMARC", dns.data.dmarc ? [dns.data.dmarc] : []],
                ] as [string, string[]][]
              )
                .filter(([, values]) => values.length > 0)
                .map(([type, values]) => [
                  <Text key="t" style={[s.mono, { color: C.brand }]}>{type}</Text>,
                  <Text key="v" style={s.mono}>{values.slice(0, 10).join("\n")}</Text>,
                ])}
            />
          )}
        </Subsection>
      )}

      {exposure && exposure.status !== "skipped" && (
        <Subsection title="Internet exposure" meta="SHODAN">
          {exposure.status !== "ok" || !exposure.data ? (
            <Unavailable result={exposure} empty="Not seen by Shodan." />
          ) : (
            exposure.data.map((host, index) => (
              <View key={host.ip} style={index > 0 ? { marginTop: 10 } : undefined}>
                <Facts
                  items={[
                    ["IP address", <Text key="ip" style={s.mono}>{host.ip}</Text>],
                    ["Open ports", host.ports.join(", ") || "None seen"],
                    ["Organisation", [host.org, host.isp].filter((v, i, all) => v && all.indexOf(v) === i).join(" · ") || "—"],
                    ["Operating system", host.os ?? "—"],
                    ["Tags", host.tags.join(", ") || "—"],
                    ["Last seen", formatIsoDate(host.lastUpdate)],
                  ]}
                />
                {host.services.length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    <Table
                      columns={[
                        { label: "Port", width: 56 },
                        { label: "Service", width: 80 },
                        { label: "Software", flex: 1 },
                        { label: "Page title", flex: 1.2 },
                      ]}
                      rows={host.services.map((service) => [
                        <Text key="p" style={s.mono}>{`${service.port}/${service.transport}`}</Text>,
                        service.module ?? "—",
                        [service.product, service.version].filter(Boolean).join(" ") || "—",
                        service.title ?? "—",
                      ])}
                    />
                  </View>
                )}
                {host.vulns.length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={[s.strong, { fontSize: 7.8, marginBottom: 4 }]}>
                      Known vulnerabilities ({host.vulns.length}), inferred from service banners
                    </Text>
                    <Tokens values={host.vulns.slice(0, 80)} />
                  </View>
                )}
              </View>
            ))
          )}
        </Subsection>
      )}

      {!isIp && (
        <Subsection title="Certificate transparency" meta="CT LOGS">
          {certificates.status !== "ok" || !certificates.data ? (
            <Unavailable result={certificates} empty="No certificates found." />
          ) : (
            <>
              <Text style={[s.muted, { marginBottom: 6 }]}>
                {plural(certificates.data.total, "certificate")} and {plural(certificates.data.subdomains.length, "hostname")}{" "}
                found via {certificates.data.source}.
              </Text>
              {certificates.data.certificates.length > 0 && (
                <Table
                  columns={[
                    { label: "Common name", flex: 1.4 },
                    { label: "Issuer", flex: 1 },
                    { label: "Valid", width: 128 },
                  ]}
                  rows={certificates.data.certificates.map((cert) => [
                    <Text key="cn" style={s.mono}>{cert.commonName}</Text>,
                    cert.issuer,
                    `${formatIsoDate(cert.notBefore)} – ${formatIsoDate(cert.notAfter)}`,
                  ])}
                />
              )}
              {certificates.data.subdomains.length > 0 && (
                <View style={{ marginTop: 7 }}>
                  <Tokens values={certificates.data.subdomains.slice(0, 60)} />
                </View>
              )}
            </>
          )}
        </Subsection>
      )}
    </>
  )
}

function LiveSection({ report }: { report: InvestigationReport }) {
  const result = report.live
  const live = result.data
  if (result.status !== "ok" || !live) return <Unavailable result={result} empty="No response." />
  return (
    <>
      <Facts
        items={[
          ["HTTP status", String(live.status)],
          ["Requested", <Text key="r" style={s.mono}>{live.requestedUrl}</Text>],
          ["Final URL", <Text key="f" style={s.mono}>{live.finalUrl}</Text>],
          ["Page title", live.title ?? "—"],
          ["Server", live.server ?? "—"],
          ["Content type", live.contentType ?? "—"],
          ["Served from", live.ip ? <Text key="ip" style={s.mono}>{live.ip}</Text> : "—"],
        ]}
      />
      {live.redirects.length > 0 && (
        <Subsection title="Redirect chain">
          <Table
            columns={[
              { label: "Status", width: 50 },
              { label: "URL", flex: 1 },
            ]}
            rows={[
              ...live.redirects.map((hop) => [String(hop.status), <Text key="u" style={s.mono}>{hop.url}</Text>]),
              [String(live.status), <Text key="u" style={s.mono}>{live.finalUrl}</Text>],
            ]}
          />
        </Subsection>
      )}
      {live.tls && (
        <Subsection title="TLS certificate">
          <Facts
            items={[
              ["Trust", live.tls.trusted ? "Trusted" : `Not trusted (${live.tls.error ?? "unknown reason"})`],
              ["Issued to", live.tls.subject ?? "—"],
              ["Issuer", live.tls.issuer ?? "—"],
              ["Valid", `${formatIsoDate(live.tls.validFrom)} – ${formatIsoDate(live.tls.validTo)}`],
              ["Protocol", live.tls.protocol ?? "—"],
            ]}
          />
        </Subsection>
      )}
      <Subsection title="Security headers">
        <Table
          columns={[
            { label: "Header", flex: 1 },
            { label: "Status", width: 70 },
          ]}
          rows={live.securityHeaders.map((header) => [
            <Text key="h" style={s.mono}>{header.name}</Text>,
            <Text key="s" style={{ color: header.present ? C.ok : C.faint, fontWeight: 600 }}>
              {header.present ? "Present" : "Missing"}
            </Text>,
          ])}
        />
      </Subsection>
    </>
  )
}

const PIVOT_RELATIONS: Record<string, string> = {
  "IP addresses": "Resolves to / hosts",
  "Domains & hostnames": "Related hostname",
  Nameservers: "Nameserver",
  "Mail servers": "Mail server",
}

function IndicatorsSection({ report }: { report: InvestigationReport }) {
  const isIp = (value: string) => /^[\d.]+$/.test(value) || value.includes(":")
  const indicators: [string, string, string][] = [
    [KIND_LABELS[report.target.kind], report.target.value, "Investigated target"],
    ...collectPivots(report).flatMap((group) =>
      group.values.map(
        (value): [string, string, string] => [
          isIp(value) ? "IP address" : "Domain",
          value,
          PIVOT_RELATIONS[group.label] ?? group.label,
        ]
      )
    ),
  ]
  const rows = indicators.slice(0, 60)
  return (
    <>
      <Text style={[s.muted, { marginBottom: 6 }]}>
        Indicators observed during the investigation. Validate before blocking: shared hosting and CDN addresses
        serve many unrelated sites.
      </Text>
      <Table
        columns={[
          { label: "Type", width: 64 },
          { label: "Indicator", flex: 1.6 },
          { label: "Relation", flex: 1 },
        ]}
        rows={rows.map(([type, value, relation]) => [type, <Text key="v" style={s.mono}>{value}</Text>, relation])}
      />
    </>
  )
}

const STATUS_LABELS = {
  ok: "OK",
  empty: "No data",
  error: "Error",
  not_enabled: "Off",
  not_applicable: "N/A",
  missing: "—",
} as const

function AppendixSection({ report }: { report: InvestigationReport }) {
  const steps = traceSteps(report)
  const ran = steps.filter((step) => step.status === "ok" || step.status === "empty")
  const geoRan = ran.some((step) => step.key === "geo")
  return (
    <>
      <Subsection title="A. Investigation trace" meta={`${formatDateTimeUtc(report.generatedAt)} · ${(report.tookMs / 1000).toFixed(1)} S`}>
        <Table
          columns={[
            { label: "Source", flex: 1 },
            { label: "Provider", flex: 1 },
            { label: "Status", width: 60 },
            { label: "Result", flex: 1.8 },
            { label: "Time", width: 44 },
          ]}
          rows={steps.map((step) => [
            SOURCES[step.key].label,
            SOURCES[step.key].provider,
            <Text key="s" style={{ color: step.status === "ok" ? C.ok : step.status === "error" ? C.critical : C.faint, fontWeight: 600 }}>
              {STATUS_LABELS[step.status]}
            </Text>,
            step.outcome,
            step.tookMs !== undefined ? `${step.tookMs} ms` : "—",
          ])}
        />
      </Subsection>

      <Subsection title="B. Severity scale and verdict rules" keepTogether>
        <View style={s.row}>
          <View style={{ flex: 1, marginRight: 12, alignSelf: "flex-start" }}>
            <Table
              columns={[
                { label: "Severity", width: 62 },
                { label: "Meaning", flex: 1 },
              ]}
              rows={SEVERITY_ORDER.map((severity) => [
                <View key="c" style={[{ width: 50, borderRadius: 2, paddingVertical: 1.6, alignItems: "center", backgroundColor: SEVERITY_COLORS[severity] }]}>
                  <Text style={s.chipText}>{severity}</Text>
                </View>,
                SEVERITY_MEANING[severity],
              ])}
            />
          </View>
          <View style={{ flex: 1, alignSelf: "flex-start" }}>
            <Table
              columns={[
                { label: "Verdict", width: 88 },
                { label: "Rule", flex: 1 },
              ]}
              rows={VERDICT_ORDER.map((verdict) => [
                <Text key="v" style={{ color: VERDICT_COLORS[verdict], fontWeight: 700 }}>{VERDICTS[verdict].label}</Text>,
                VERDICTS[verdict].rule,
              ])}
            />
          </View>
        </View>
      </Subsection>

      <Subsection title="C. Data sources and attribution" keepTogether>
        <Text style={[s.muted, { marginBottom: 3 }]}>
          {ran.map((step) => `${SOURCES[step.key].label}: ${SOURCES[step.key].provider}`).join(" · ")}.
        </Text>
        <Text style={s.muted}>
          {geoRan ? "This report includes GeoLite2 data created by MaxMind, available from https://www.maxmind.com. " : ""}
          Map borders: Natural Earth.
        </Text>
      </Subsection>

      <Subsection title="D. Handling and limitations" keepTogether>
        <Text style={[s.paragraph, { fontSize: 8 }]}>
          {TLP}: limited disclosure. Recipients may share this report with members of their own organisation and its
          clients who need to know, and not beyond.
        </Text>
        <Text style={[s.paragraph, { fontSize: 8 }]}>
          This report reflects data returned by the listed sources at the time of the investigation. Infrastructure,
          reputation and ownership change quickly; validate indicators before taking blocking or legal action.
          Page scripts ran only inside Perseonix&apos;s isolated capture browser, and the target was not submitted to
          third-party scanners.
        </Text>
      </Subsection>
    </>
  )
}

// ---------------------------------------------------------------------------

function ReportDocument({ data }: { data: PdfInvestigation }) {
  const { report } = data
  const reference = `PX-${data.id.slice(0, 8).toUpperCase()}`
  const geo = report.geo?.status === "ok" ? report.geo.data : undefined
  const reputationRan = [report.virustotal, report.abuse, report.threatFeed].some(
    (result) => result && result.status !== "skipped"
  )

  const sections: { title: string; body: ReactNode }[] = [
    { title: "Executive summary", body: <SummarySection report={report} /> },
    { title: "Findings", body: <FindingsSection report={report} /> },
  ]
  if (report.sandbox?.status === "ok" && report.sandbox.data) {
    sections.push({
      title: "Page capture",
      body: <PageCaptureSection capture={report.sandbox.data} screenshot={data.screenshot ?? null} />,
    })
  }
  if (geo?.length) sections.push({ title: "Location", body: <LocationSection points={geo} /> })
  if (reputationRan) {
    sections.push({
      title: "Reputation",
      body: (
        <>
          {report.virustotal && report.virustotal.status !== "skipped" && <VirusTotalBlock result={report.virustotal} />}
          {report.abuse && report.abuse.status !== "skipped" && <AbuseBlock result={report.abuse} />}
          {report.threatFeed.status !== "skipped" && <ThreatFeedBlock report={report} />}
        </>
      ),
    })
  }
  sections.push({ title: "Infrastructure", body: <InfrastructureSection report={report} /> })
  sections.push({ title: "Live check", body: <LiveSection report={report} /> })
  sections.push({ title: "Indicators", body: <IndicatorsSection report={report} /> })

  return (
    <Document
      title={`Threat Investigation Report · ${data.query}`}
      author="Perseonix"
      subject={`${KIND_LABELS[data.kind]} ${data.query}`}
      creator="Perseonix Corvael"
      producer="Perseonix Corvael"
      language="en"
    >
      <Page size="A4" style={s.page}>
        <RunningHeader reference={reference} query={data.query} />
        <Footer />
        <CoverBand reference={reference} generatedAt={data.generatedAt} />
        <TitleBlock data={data} />
        <StatCards report={report} />
        {sections.map((section, index) => (
          <Section key={section.title} number={String(index + 1).padStart(2, "0")} title={section.title}>
            {section.body}
          </Section>
        ))}
        <Section title="Appendix" breakBefore>
          <AppendixSection report={report} />
        </Section>
      </Page>
    </Document>
  )
}

export function renderInvestigationPdf(data: PdfInvestigation) {
  return renderToBuffer(<ReportDocument data={data} />)
}

/** A safe, descriptive download name, e.g. perseonix-ip-78.153.140.129-2026-09-14.pdf. */
export function pdfFilename(data: Pick<PdfInvestigation, "kind" | "query" | "generatedAt">) {
  const indicator = data.query
    .replace(/^https?:\/\//, "")
    .replace(/[^a-zA-Z0-9.-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80)
  return `perseonix-${data.kind}-${indicator}-${data.generatedAt.toISOString().slice(0, 10)}.pdf`
}
