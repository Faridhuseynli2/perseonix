"use server"

import { requireModule } from "@/lib/auth/dal"
import {
  checkDomainBreaches,
  checkEmailBreaches,
  isDomain,
  isEmail,
  normalizeDomain,
  type DomainBreachResult,
  type EmailCheckResult,
} from "@/lib/credentials/hibp"
import { checkDomainStealer, type StealerResult } from "@/lib/credentials/stealer"
import { CREDENTIALS_MODULE_KEY } from "@/lib/credentials/meta"

export type EmailCheckState = { result?: EmailCheckResult; email?: string; error?: string }

export async function checkEmail(
  _prev: EmailCheckState,
  formData: FormData
): Promise<EmailCheckState> {
  await requireModule(CREDENTIALS_MODULE_KEY)

  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  if (!email) return { error: "Enter an email address." }
  if (!isEmail(email)) return { error: "That doesn't look like a valid email address.", email }

  const result = await checkEmailBreaches(email)
  return { result, email }
}

export type DomainCheckState = {
  domain?: string
  stealer?: StealerResult
  breaches?: DomainBreachResult
  error?: string
}

export async function checkDomain(
  _prev: DomainCheckState,
  formData: FormData
): Promise<DomainCheckState> {
  await requireModule(CREDENTIALS_MODULE_KEY)

  const raw = String(formData.get("domain") ?? "")
  const domain = normalizeDomain(raw)
  if (!domain) return { error: "Enter a domain." }
  if (!isDomain(domain)) return { error: "That doesn't look like a valid domain (e.g. company.com).", domain }

  // Free stealer-log intel + (key-gated) breach exposure, in parallel.
  const [stealer, breaches] = await Promise.all([
    checkDomainStealer(domain),
    checkDomainBreaches(domain),
  ])
  return { domain, stealer, breaches }
}
