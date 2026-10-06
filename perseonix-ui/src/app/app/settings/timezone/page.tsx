import type { Metadata } from "next"
import { Panel } from "@/components/admin/ui"
import { TimezonePicker } from "@/components/settings/timezone-picker"
import { requireUser } from "@/lib/auth/dal"

export const metadata: Metadata = {
  title: "Timezone",
}

export default async function TimezoneSettingsPage() {
  const user = await requireUser()

  return (
    <Panel
      title="Timezone"
      description="All timestamps display in this timezone. Saved to your account, used on every device."
    >
      <TimezonePicker current={user.timezone} />
    </Panel>
  )
}
