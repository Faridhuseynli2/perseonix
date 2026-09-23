import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Plug } from "lucide-react"
import { ModuleConnectors } from "@/components/admin/module-connectors"
import { requireAdmin } from "@/lib/auth/dal"
import { INGEST_CONNECTORS } from "@/lib/intel/connectors"
import { listIngestKeys, storeReady, type IngestKeyRow } from "@/lib/intel/ingest-keys"

export const metadata: Metadata = { title: "Module Connectors" }

export default async function ModuleConnectorsPage({
  searchParams,
}: PageProps<"/app/admin/connectors/modules">) {
  await requireAdmin()
  const sp = await searchParams
  const focus = typeof sp?.connector === "string" ? sp.connector : undefined

  const ready = await storeReady()
  const allKeys = ready ? await listIngestKeys() : []
  const keysByConnector: Record<string, IngestKeyRow[]> = {}
  for (const k of allKeys) (keysByConnector[k.connectorKey] ??= []).push(k)

  return (
    <div className="mx-auto max-w-[900px]">
      <Link
        href="/app/admin/connectors"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Connectors
      </Link>

      <header className="mt-4 border-b border-ink/10 pb-5">
        <p className="font-mono text-[10px] tracking-[0.22em] text-glow uppercase">Perseonix Corvael // Ingestion</p>
        <h1 className="mt-2 flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-ink">
          <Plug className="size-5 text-glow" />
          Module Connectors
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Inbound ingestion keys. Each feed module gets its own isolated API key so an n8n playbook can push data
          straight into that module&apos;s schema — securely and separately. Keys are shown once and stored hashed.
        </p>
      </header>

      {!ready && (
        <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-signal/25 bg-signal/[0.06] px-4 py-3">
          <p className="text-sm text-foreground/85">
            Restart the dev server once to create the ingestion-keys table, then keys can be generated here.
          </p>
        </div>
      )}

      <div className="mt-6">
        <ModuleConnectors connectors={INGEST_CONNECTORS} keysByConnector={keysByConnector} focus={focus} />
      </div>
    </div>
  )
}
