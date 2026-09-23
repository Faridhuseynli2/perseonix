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
      description="All dates and times across Perseonix Corvael — when a CVE was published, when a victim was claimed, when an alert fired — are shown in this timezone. Saved to your account and used on every device."
    >
      <TimezonePicker current={user.timezone} />
    </Panel>
  )
}
