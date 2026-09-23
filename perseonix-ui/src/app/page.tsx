import { FlatFooter, FlatLanding } from "@/components/marketing/flat-landing"
import { FlatNav } from "@/components/marketing/flat-nav"
import { getContent } from "@/lib/i18n/server"

export default async function Home() {
  const { locale, t } = await getContent()
  return (
    <div className="mkt flex min-h-screen flex-col">
      <FlatNav t={t.nav} locale={locale} announcement={t.announcement} />
      <FlatLanding t={t} />
      <FlatFooter t={t.footer} />
    </div>
  )
}
