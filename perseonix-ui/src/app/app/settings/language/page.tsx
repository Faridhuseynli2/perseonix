import type { Metadata } from "next"
import { Panel } from "@/components/admin/ui"
import { LanguagePicker } from "@/components/settings/language-picker"
import { requireUser } from "@/lib/auth/dal"
import { getPortalDict } from "@/lib/i18n/portal"

export const metadata: Metadata = {
  title: "Language",
}

export default async function LanguageSettingsPage() {
  const user = await requireUser()
  const t = getPortalDict(user.locale)

  return (
    <Panel title={t.settings.language} description={t.settings.languagePageDesc}>
      <LanguagePicker current={user.locale} />
    </Panel>
  )
}
