import type { Metadata } from "next"
import { Lock } from "lucide-react"
import { DomainExposure } from "@/components/credentials/domain-exposure"
import { EmailCheck } from "@/components/credentials/email-check"
import { PasswordCheck } from "@/components/credentials/password-check"
import { requireModule } from "@/lib/auth/dal"
import { CREDENTIALS_MODULE_KEY } from "@/lib/credentials/meta"

export const metadata: Metadata = {
  title: "Credential Exposure",
}

export default async function CredentialsPage() {
  const { user, module } = await requireModule(CREDENTIALS_MODULE_KEY)
  const isAdmin = user.role === "admin"

  return (
    <div className="mx-auto max-w-[1100px]">
      <div>
        <p className="eyebrow text-glow">Module</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{module.name}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Find exposed credentials for your organisation — breached accounts and infostealer-infected
          devices — and check individual passwords and emails.
        </p>
      </div>

      <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-ink/[0.07] bg-navy-800/40 px-4 py-3">
        <Lock className="mt-0.5 size-4 shrink-0 text-glow" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Privacy by design: passwords are hashed in your browser and never sent or stored, and a
          plaintext password is never displayed. Only scan domains and addresses you are authorised
          to check.
        </p>
      </div>

      <div className="mt-6">
        <DomainExposure isAdmin={isAdmin} />
      </div>

      <div className="mt-8">
        <p className="eyebrow text-glow">Quick lookups</p>
        <div className="mt-3 grid gap-5">
          <PasswordCheck />
          <EmailCheck isAdmin={isAdmin} />
        </div>
      </div>
    </div>
  )
}
