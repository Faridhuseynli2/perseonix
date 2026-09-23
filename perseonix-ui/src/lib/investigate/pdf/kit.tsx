import path from "node:path"
import type { ReactNode } from "react"
import { Font, StyleSheet, Text, View } from "@react-pdf/renderer"
import type { SignalSeverity, Verdict } from "@/lib/investigate/types"

// Fonts: Inter for text, JetBrains Mono for indicators, Orbitron for the wordmark
// (SIL OFL). Google Fonts' full TTFs cover Latin, Cyrillic and Greek in one file;
// fontkit mis-reads the subset WOFFs from @fontsource.
const fontFile = (pkg: string, file: string) =>
  path.join(process.cwd(), "node_modules", "@expo-google-fonts", pkg, file)

Font.register({
  family: "Inter",
  fonts: [
    { src: fontFile("inter", "400Regular/Inter_400Regular.ttf"), fontWeight: 400 },
    { src: fontFile("inter", "600SemiBold/Inter_600SemiBold.ttf"), fontWeight: 600 },
    { src: fontFile("inter", "700Bold/Inter_700Bold.ttf"), fontWeight: 700 },
  ],
})
Font.register({
  family: "JetBrains Mono",
  fonts: [
    { src: fontFile("jetbrains-mono", "400Regular/JetBrainsMono_400Regular.ttf"), fontWeight: 400 },
    { src: fontFile("jetbrains-mono", "500Medium/JetBrainsMono_500Medium.ttf"), fontWeight: 500 },
  ],
})
Font.register({ family: "Orbitron", src: fontFile("orbitron", "700Bold/Orbitron_700Bold.ttf"), fontWeight: 700 })

// Keep words whole; only very long tokens (URLs, hashes) may wrap.
Font.registerHyphenationCallback((word) => (word.length > 24 ? (word.match(/.{1,16}/g) ?? [word]) : [word]))

export const SANS = "Inter"
export const MONO = "JetBrains Mono"
/**
 * JetBrains Mono's contextual alternates swap "/" for a glyph fontkit can't
 * read, which aborts rendering; indicators need plain glyphs anyway.
 */
const MONO_FONT = { fontFamily: MONO, fontFeatureSettings: { calt: false } }

/** Print palette: the portal's brand colours, darkened where needed for paper. */
export const C = {
  band: "#060C29",
  navy: "#0B1338",
  text: "#1E2640",
  muted: "#5B6680",
  faint: "#8A93A8",
  rule: "#E2E7EF",
  panel: "#F4F6FA",
  brand: "#128EEC",
  glow: "#00B5FA",
  signal: "#FFB400",
  critical: "#D9344A",
  high: "#E8741E",
  medium: "#C98B00",
  low: "#0E8FCB",
  info: "#7D879C",
  ok: "#12966A",
}

export const SEVERITY_COLORS: Record<SignalSeverity, string> = {
  critical: C.critical,
  high: C.high,
  medium: C.medium,
  low: C.low,
  info: C.info,
}

export const VERDICT_COLORS: Record<Verdict, string> = {
  malicious: C.critical,
  suspicious: C.high,
  no_known_threats: C.ok,
  inconclusive: C.info,
}

export const PAGE = { margin: 42, top: 64, bottom: 58 }
const A4_HEIGHT = 841.89
/** A4 width minus both margins, in points. */
export const CONTENT_WIDTH = 595.28 - PAGE.margin * 2

export const s = StyleSheet.create({
  page: {
    paddingTop: PAGE.top,
    paddingBottom: PAGE.bottom,
    paddingHorizontal: PAGE.margin,
    fontFamily: SANS,
    // fontkit mis-applies Inter's kerning around dots between digits, so IPs
    // like 78.153.140.129 would print as 78.153140.129.
    fontFeatureSettings: { kern: false },
    fontSize: 8.5,
    color: C.text,
    // Resolved against the page font size and inherited in points, so larger
    // text needs its own lineHeight.
    lineHeight: 1.45,
  },

  runningHeader: { position: "absolute", top: 22, left: PAGE.margin, right: PAGE.margin },
  runningInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 7,
    borderBottomWidth: 0.6,
    borderBottomColor: C.rule,
  },
  runningBrand: { flexDirection: "row", alignItems: "center" },
  runningWordmark: { fontFamily: "Orbitron", fontWeight: 700, fontSize: 7, letterSpacing: 1.6, color: C.navy, marginLeft: 5 },
  runningMeta: { ...MONO_FONT, fontSize: 6.8, color: C.muted },

  footer: {
    position: "absolute",
    // Anchored from the top: with this page style react-pdf drops fixed
    // elements positioned with `bottom`. Leaves ~22pt below the footer.
    top: A4_HEIGHT - 42,
    left: PAGE.margin,
    right: PAGE.margin,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 7,
    borderTopWidth: 0.6,
    borderTopColor: C.rule,
  },
  footerText: { fontSize: 6.8, color: C.faint },

  band: {
    marginTop: -PAGE.top,
    marginHorizontal: -PAGE.margin,
    backgroundColor: C.band,
    paddingHorizontal: PAGE.margin,
    paddingTop: 30,
    paddingBottom: 26,
    borderBottomWidth: 2.5,
    borderBottomColor: C.brand,
  },
  bandRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { flexDirection: "row", alignItems: "center" },
  wordmark: { fontFamily: "Orbitron", fontWeight: 700, fontSize: 14, letterSpacing: 3.2, color: "#EAF4FF", lineHeight: 1.1 },
  wordmarkSub: { fontSize: 6.2, fontWeight: 600, letterSpacing: 1.8, color: "#6F86B8", marginTop: 2 },
  bandRight: { alignItems: "flex-end" },
  tlp: {
    ...MONO_FONT,
    fontWeight: 500,
    fontSize: 7,
    color: "#FFC000",
    backgroundColor: "#000000",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 2,
    marginBottom: 7,
  },
  bandTitle: { fontSize: 10, fontWeight: 600, color: "#DCE6F7", lineHeight: 1.2 },
  bandMeta: { ...MONO_FONT, fontSize: 7, color: "#7F93BD", marginTop: 3 },

  titleBlock: { marginTop: 22 },
  eyebrow: { fontSize: 6.6, fontWeight: 600, letterSpacing: 1.4, color: C.muted, textTransform: "uppercase" },
  indicator: { ...MONO_FONT, fontWeight: 500, fontSize: 18, color: C.navy, marginTop: 4, lineHeight: 1.25 },
  submitted: { ...MONO_FONT, fontSize: 7, color: C.faint, marginTop: 2 },
  titleRow: { flexDirection: "row", alignItems: "center", marginTop: 9 },
  titleNote: { fontSize: 8.4, color: C.muted, marginLeft: 9, flex: 1 },
  metaGrid: {
    flexDirection: "row",
    marginTop: 16,
    borderTopWidth: 0.6,
    borderBottomWidth: 0.6,
    borderColor: C.rule,
    paddingVertical: 9,
  },
  metaCell: { flex: 1, paddingRight: 8 },
  metaLabel: { fontSize: 6.3, fontWeight: 600, letterSpacing: 0.9, color: C.faint, textTransform: "uppercase" },
  metaValue: { fontSize: 7.9, color: C.text, marginTop: 2.5 },

  cards: { flexDirection: "row", marginTop: 14 },
  card: {
    flex: 1,
    borderWidth: 0.6,
    borderColor: C.rule,
    borderRadius: 3,
    padding: 10,
    backgroundColor: "#FBFCFE",
  },
  cardGap: { marginRight: 8 },
  cardValue: { fontSize: 16, fontWeight: 700, color: C.navy, marginTop: 5, lineHeight: 1.15 },
  cardNote: { fontSize: 6.7, color: C.muted, marginTop: 3 },

  section: { marginTop: 22 },
  sectionHead: { flexDirection: "row", alignItems: "center", marginBottom: 9 },
  sectionNumber: { ...MONO_FONT, fontWeight: 500, fontSize: 8, color: C.brand, marginRight: 7 },
  sectionTitle: { fontSize: 11.5, fontWeight: 700, color: C.navy, marginRight: 10, lineHeight: 1.2 },
  sectionRule: { flex: 1, height: 0.6, backgroundColor: C.rule },
  subsection: { marginTop: 13 },
  subsectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 6,
  },
  subsectionTitle: { fontSize: 9.2, fontWeight: 700, color: C.navy, lineHeight: 1.2 },
  subsectionMeta: { ...MONO_FONT, fontSize: 6.7, color: C.faint },

  paragraph: { fontSize: 8.8, lineHeight: 1.55, color: C.text, marginBottom: 6 },
  bigNumber: { fontSize: 20, fontWeight: 700, lineHeight: 1.15 },
  bigNumberUnit: { fontSize: 10, fontWeight: 400, color: C.muted },
  tokens: { flexDirection: "row", flexWrap: "wrap" },
  token: {
    ...MONO_FONT,
    fontSize: 6.8,
    color: C.text,
    backgroundColor: C.panel,
    borderWidth: 0.4,
    borderColor: C.rule,
    borderRadius: 1.5,
    paddingHorizontal: 3.5,
    paddingVertical: 1.2,
    marginRight: 3,
    marginBottom: 3,
  },
  muted: { fontSize: 7.8, color: C.muted },
  small: { fontSize: 7, color: C.faint, lineHeight: 1.45 },
  mono: { ...MONO_FONT, fontSize: 7.8 },
  strong: { fontWeight: 600, color: C.navy },
  callout: { borderLeftWidth: 2.5, paddingLeft: 10, paddingVertical: 2, marginBottom: 8 },
  link: { color: C.brand, textDecoration: "none", fontSize: 7.6 },
  row: { flexDirection: "row", alignItems: "center" },

  facts: { borderTopWidth: 0.4, borderTopColor: "#EEF1F6" },
  factRow: { flexDirection: "row", paddingVertical: 2.8, borderBottomWidth: 0.4, borderBottomColor: "#EEF1F6" },
  factLabel: { width: 108, fontSize: 7.7, color: C.muted },
  factValue: { flex: 1, fontSize: 8.1, color: C.text },

  table: { borderTopWidth: 0.6, borderTopColor: C.rule },
  tableHead: { flexDirection: "row", borderBottomWidth: 0.6, borderBottomColor: C.rule, backgroundColor: C.panel },
  th: {
    fontSize: 6.2,
    fontWeight: 600,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: C.muted,
    paddingVertical: 4.5,
    paddingHorizontal: 5,
  },
  tr: { flexDirection: "row", borderBottomWidth: 0.4, borderBottomColor: "#EAEEF4" },
  trAlt: { backgroundColor: "#FAFBFD" },
  td: { paddingVertical: 4, paddingHorizontal: 5, fontSize: 7.7 },

  chip: { width: 50, borderRadius: 2, paddingVertical: 1.6, alignItems: "center" },
  chipText: { fontSize: 5.9, fontWeight: 700, letterSpacing: 0.6, color: "#FFFFFF", textTransform: "uppercase" },
  pill: { borderRadius: 2.5, paddingHorizontal: 7, paddingVertical: 3 },
  pillText: { fontSize: 7.4, fontWeight: 700, letterSpacing: 1.1, color: "#FFFFFF", textTransform: "uppercase" },

  bar: { flexDirection: "row", height: 6, borderRadius: 1.5, backgroundColor: "#E9EDF3" },

  mapFrame: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderWidth: 0.6, borderColor: "#CBD4E1", borderRadius: 3 },
  mapLabel: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    borderWidth: 0.6,
    borderColor: "#C5CFDD",
    borderRadius: 2,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  mapLabelTitle: { fontSize: 7.5, fontWeight: 600, color: C.navy },
  mapLabelIp: { ...MONO_FONT, fontSize: 6.5, color: C.muted, marginTop: 1 },
  mapBadge: {
    position: "absolute",
    backgroundColor: C.navy,
    borderRadius: 2,
    paddingHorizontal: 3,
    paddingVertical: 0.5,
  },
  mapBadgeText: { ...MONO_FONT, fontSize: 6.5, color: "#FFFFFF" },
  mapCoords: { position: "absolute", right: 8, bottom: 6, ...MONO_FONT, fontSize: 6.5, color: C.muted },
})

export function Section({
  number,
  title,
  breakBefore = false,
  children,
}: {
  number?: string
  title: string
  breakBefore?: boolean
  children: ReactNode
}) {
  return (
    <View style={s.section} break={breakBefore}>
      <View style={s.sectionHead} minPresenceAhead={90}>
        {number ? <Text style={s.sectionNumber}>{number}</Text> : null}
        <Text style={s.sectionTitle}>{title}</Text>
        <View style={s.sectionRule} />
      </View>
      {children}
    </View>
  )
}

export function Subsection({
  title,
  meta,
  keepTogether = false,
  children,
}: {
  title: string
  meta?: string
  /** Move the whole block to the next page rather than split it. */
  keepTogether?: boolean
  children: ReactNode
}) {
  return (
    <View style={s.subsection} wrap={!keepTogether}>
      <View style={s.subsectionHead} minPresenceAhead={70}>
        <Text style={s.subsectionTitle}>{title}</Text>
        {meta ? <Text style={s.subsectionMeta}>{meta}</Text> : null}
      </View>
      {children}
    </View>
  )
}

export function Facts({ items }: { items: [string, ReactNode][] }) {
  return (
    <View style={s.facts}>
      {items.map(([label, value]) => (
        <View key={label} style={s.factRow} wrap={false}>
          <Text style={s.factLabel}>{label}</Text>
          <View style={s.factValue}>
            {typeof value === "string" || typeof value === "number" ? <Text>{value === "" ? "—" : value}</Text> : value}
          </View>
        </View>
      ))}
    </View>
  )
}

export type Column = { label: string; width?: number; flex?: number }

const cellSize = (column: Column) => (column.width ? { width: column.width } : { flex: column.flex ?? 1 })

export function Table({ columns, rows }: { columns: Column[]; rows: ReactNode[][] }) {
  return (
    <View style={s.table}>
      <View style={s.tableHead} minPresenceAhead={24}>
        {columns.map((column) => (
          <Text key={column.label} style={[s.th, cellSize(column)]}>
            {column.label}
          </Text>
        ))}
      </View>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={rowIndex % 2 ? [s.tr, s.trAlt] : s.tr} wrap={false}>
          {row.map((cell, cellIndex) => (
            <View key={cellIndex} style={[s.td, cellSize(columns[cellIndex])]}>
              {typeof cell === "string" || typeof cell === "number" ? <Text>{cell}</Text> : cell}
            </View>
          ))}
        </View>
      ))}
    </View>
  )
}

export function SeverityChip({ severity }: { severity: SignalSeverity }) {
  return (
    <View style={[s.chip, { backgroundColor: SEVERITY_COLORS[severity] }]}>
      <Text style={s.chipText}>{severity}</Text>
    </View>
  )
}

export function VerdictPill({ verdict, label }: { verdict: Verdict; label: string }) {
  return (
    <View style={[s.pill, { backgroundColor: VERDICT_COLORS[verdict] }]}>
      <Text style={s.pillText}>{label}</Text>
    </View>
  )
}

/** Short identifiers (CVEs, hostnames) as wrapping tokens, never split mid-word. */
export function Tokens({ values }: { values: string[] }) {
  return (
    <View style={s.tokens}>
      {values.map((value, index) => (
        <Text key={`${index}-${value}`} style={s.token}>
          {value}
        </Text>
      ))}
    </View>
  )
}

/** Horizontal stacked bar; segment widths are proportional to their values. */
export function StackedBar({ segments }: { segments: { value: number; color: string }[] }) {
  return (
    <View style={s.bar}>
      {segments
        .filter((segment) => segment.value > 0)
        .map((segment, index) => (
          <View key={index} style={{ flexGrow: segment.value, flexBasis: 0, backgroundColor: segment.color }} />
        ))}
    </View>
  )
}
