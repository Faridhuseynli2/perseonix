import type { Metadata } from "next"
import { Panel } from "@/components/admin/ui"
import { ThemePicker } from "@/components/settings/theme-picker"
import { requireUser } from "@/lib/auth/dal"

export const metadata: Metadata = {
  title: "Theme",
}

export default async function ThemeSettingsPage() {
  const user = await requireUser()

  return (
    <Panel
      title="Theme"
      description="Choose how Perseonix Corvael looks for you. Your choice is saved to your account and follows you to every device."
    >
      <ThemePicker current={user.theme} />
    </Panel>
  )
}
