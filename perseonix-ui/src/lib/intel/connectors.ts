// Shared by server and client: no server-only imports here.
// Catalog of INBOUND ingestion connectors — each is a feed sub-module that an
// external automation (n8n) can push data into, using a scoped Ingestion Key.
// Distinct from src/lib/connectors (outbound third-party keys WE consume).

export type IngestConnector = {
  key: string
  name: string
  moduleKey: string
  /** The feed sub-page inside the Threat Intelligence hub. */
  href: string
  /** The public ingestion endpoint n8n POSTs to. */
  endpoint: string
  description: string
}

export const INTEL_MODULE_KEY = "intel"

export const INGEST_CONNECTORS: IngestConnector[] = [
  {
    key: "cve",
    name: "CVE Feed",
    moduleKey: "intel",
    href: "/app/modules/intel/cve",
    endpoint: "/api/ingest/v1/cve",
    description:
      "Vulnerabilities ingested from NVD and the CISA KEV catalog by an n8n playbook, prioritised by CVSS and real-world exploitation.",
  },
  {
    key: "news",
    name: "Threat News",
    moduleKey: "intel",
    href: "/app/modules/intel/news",
    endpoint: "/api/ingest/v1/news",
    description:
      "Security-news articles pushed by an n8n playbook, each LLM-summarised and entity-extracted (CVEs, threat actors, malware, MITRE TTPs, sectors, regions).",
  },
]

export function getConnector(key: string): IngestConnector | undefined {
  return INGEST_CONNECTORS.find((c) => c.key === key)
}
