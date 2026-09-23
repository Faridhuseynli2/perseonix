"use server"

import { redirect } from "next/navigation"
import { requireModule } from "@/lib/auth/dal"
import { INVESTIGATE_MODULE_KEY } from "@/lib/investigate/meta"
import { runInvestigation } from "@/lib/investigate/run"
import { saveCapture } from "@/lib/investigate/sandbox/storage"
import { checkInvestigationLimits, saveInvestigation } from "@/lib/investigate/store"
import { TargetError, parseTarget, type Target } from "@/lib/investigate/target"
import { formText } from "@/lib/validation"

export type InvestigateState = { error?: string; input?: string }

export async function investigate(
  _prev: InvestigateState,
  formData: FormData
): Promise<InvestigateState> {
  const { user } = await requireModule(INVESTIGATE_MODULE_KEY)
  const input = formText(formData, "query").trim()

  let target: Target
  try {
    target = parseTarget(input)
  } catch (error) {
    if (error instanceof TargetError) return { error: error.message, input }
    throw error
  }

  const limitError = await checkInvestigationLimits(user)
  if (limitError) return { error: limitError, input }

  const { report, screenshot } = await runInvestigation(target)
  const id = await saveInvestigation(user, target, report)
  // A lost screenshot only degrades the report; the panel says it's unavailable.
  if (screenshot) await saveCapture(id, screenshot).catch(() => undefined)
  redirect(`/app/modules/investigate/${id}`)
}
