import type { Metadata } from "next"
import { Panel } from "@/components/admin/ui"
import { ThemePicker } from "@/components/settings/theme-picker"
import { requireUser } from "@/lib/auth/dal"
import { getPortalDict } from "@/lib/i18n/portal"

export const metadata: Metadata = {
  title: "Theme",
}

export default async function ThemeSettingsPage() {
  const user = await requireUser()
  const t = getPortalDict(user.locale)

  return (
    <Panel title={t.settings.theme} description={t.settings.themePageDesc}>
      <ThemePicker current={user.theme} />
    </Panel>
  )
}
