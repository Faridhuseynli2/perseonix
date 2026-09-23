"use server"

import { revalidatePath } from "next/cache"
import { recordAudit } from "@/lib/audit"
import { requireModule } from "@/lib/auth/dal"
import {
  addComment,
  assign,
  createBlankCase,
  createCaseFromDetection,
  setSeverity,
  setStatus,
  type CreateResult,
} from "@/lib/brand/cases"
import { BRAND_MODULE_KEY } from "@/lib/brand/meta"

function refresh(id?: string) {
  revalidatePath("/app/modules/brand/cases")
  if (id) revalidatePath(`/app/modules/brand/cases/${id}`)
  revalidatePath("/app/modules/brand")
  revalidatePath("/app", "layout")
}

export async function openCaseFromDetectionAction(detectionId: string): Promise<CreateResult> {
  const { user } = await requireModule(BRAND_MODULE_KEY)
  const res = await createCaseFromDetection(user, detectionId)
  if (res.ok && !res.existed) {
    await recordAudit({
      actor: user,
      action: "brand.case_opened",
      target: { type: "brand_case", id: res.caseId ?? detectionId },
      metadata: { source: "manual", detectionId },
    })
  }
  refresh(res.caseId)
  return res
}

export async function createCaseAction(input: {
  title: string
  severity: string
  domain?: string
  summary?: string
}): Promise<CreateResult> {
  const { user } = await requireModule(BRAND_MODULE_KEY)
  const res = await createBlankCase(user, input)
  if (res.ok) {
    await recordAudit({
      actor: user,
      action: "brand.case_opened",
      target: { type: "brand_case", id: res.caseId ?? input.title },
      metadata: { source: "manual" },
    })
  }
  refresh(res.caseId)
  return res
}

export async function addCommentAction(id: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const { user } = await requireModule(BRAND_MODULE_KEY)
  const res = await addComment(user, id, body)
  if (res.ok) refresh(id)
  return res
}

export async function setCaseStatusAction(id: string, status: string): Promise<{ ok: boolean; error?: string }> {
  const { user } = await requireModule(BRAND_MODULE_KEY)
  const res = await setStatus(user, id, status)
  if (res.ok) {
    await recordAudit({
      actor: user,
      action: "brand.case_status",
      target: { type: "brand_case", id },
      metadata: { status },
    })
    refresh(id)
  }
  return res
}

export async function setCaseSeverityAction(id: string, severity: string): Promise<{ ok: boolean; error?: string }> {
  const { user } = await requireModule(BRAND_MODULE_KEY)
  const res = await setSeverity(user, id, severity)
  if (res.ok) refresh(id)
  return res
}

export async function assignCaseAction(id: string, toSelf: boolean): Promise<{ ok: boolean; error?: string }> {
  const { user } = await requireModule(BRAND_MODULE_KEY)
  const res = await assign(user, id, toSelf)
  if (res.ok) refresh(id)
  return res
}
