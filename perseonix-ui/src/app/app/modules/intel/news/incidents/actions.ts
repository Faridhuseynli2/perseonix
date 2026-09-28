"use server"

import { revalidatePath } from "next/cache"
import { recordAudit } from "@/lib/audit"
import { requireModule } from "@/lib/auth/dal"
import { INTEL_MODULE_KEY } from "@/lib/intel/connectors"
import {
  addComment,
  assign,
  createBlankIncident,
  createIncidentFromArticle,
  setSeverity,
  setStatus,
  type CreateResult,
} from "@/lib/intel/incidents"

function refresh(id?: string) {
  revalidatePath("/app/modules/intel/news/incidents")
  if (id) revalidatePath(`/app/modules/intel/news/incidents/${id}`)
  revalidatePath("/app/modules/intel/news")
  revalidatePath("/app", "layout")
}

export async function openIncidentFromArticleAction(articleId: string): Promise<CreateResult> {
  const { user } = await requireModule(INTEL_MODULE_KEY)
  const res = await createIncidentFromArticle(user, articleId)
  if (res.ok && !res.existed) {
    await recordAudit({
      actor: user,
      action: "intel.incident_opened",
      target: { type: "news_incident", id: res.incidentId ?? articleId },
      metadata: { source: "manual", articleId },
    })
  }
  refresh(res.incidentId)
  return res
}

export async function createIncidentAction(input: {
  title: string
  severity: string
  summary?: string
  articleUrl?: string
}): Promise<CreateResult> {
  const { user } = await requireModule(INTEL_MODULE_KEY)
  const res = await createBlankIncident(user, input)
  if (res.ok) {
    await recordAudit({
      actor: user,
      action: "intel.incident_opened",
      target: { type: "news_incident", id: res.incidentId ?? input.title },
      metadata: { source: "manual" },
    })
  }
  refresh(res.incidentId)
  return res
}

export async function addIncidentCommentAction(id: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const { user } = await requireModule(INTEL_MODULE_KEY)
  const res = await addComment(user, id, body)
  if (res.ok) refresh(id)
  return res
}

export async function setIncidentStatusAction(id: string, status: string): Promise<{ ok: boolean; error?: string }> {
  const { user } = await requireModule(INTEL_MODULE_KEY)
  const res = await setStatus(user, id, status)
  if (res.ok) {
    await recordAudit({
      actor: user,
      action: "intel.incident_status",
      target: { type: "news_incident", id },
      metadata: { status },
    })
    refresh(id)
  }
  return res
}

export async function setIncidentSeverityAction(id: string, severity: string): Promise<{ ok: boolean; error?: string }> {
  const { user } = await requireModule(INTEL_MODULE_KEY)
  const res = await setSeverity(user, id, severity)
  if (res.ok) refresh(id)
  return res
}

export async function assignIncidentAction(id: string, toSelf: boolean): Promise<{ ok: boolean; error?: string }> {
  const { user } = await requireModule(INTEL_MODULE_KEY)
  const res = await assign(user, id, toSelf)
  if (res.ok) refresh(id)
  return res
}
