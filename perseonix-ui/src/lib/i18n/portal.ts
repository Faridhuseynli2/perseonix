// Portal (logged-in /app) UI dictionary. Separate from the marketing dictionary.
// The user's language lives on `users.locale` and is chosen in Settings → Language.
// Keys here cover the app shell, settings, the Overview and shared UI chrome.
// Data values (CVE ids, actor names, domains, victim names) are never translated.

import { type Locale, DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config"

export type ModuleKey = "intel" | "investigate" | "adversaries" | "ransomware" | "brand" | "credentials"

export type PortalDict = {
  common: {
    search: string
    open: string
    close: string
    save: string
    saving: string
    saved: string
    cancel: string
    clear: string
    loading: string
    noData: string
    viewAll: string
    back: string
    updated: string
    all: string
    signOut: string
    administrator: string
    analyst: string
    today: string
    last24h: string
    sev: { critical: string; high: string; medium: string; low: string; info: string }
  }
  nav: {
    overview: string
    settings: string
    admin: string
    modules: string
    workspace: string
    management: string
    signOut: string
    searchPlaceholder: string
    account: string
  }
  // Localized module display names (override the DB English name by key).
  modules: Record<ModuleKey, string>
  settings: {
    title: string
    subtitle: string
    preferences: string
    language: string
    languageDesc: string
    theme: string
    themeDesc: string
    timezone: string
    timezoneDesc: string
    languagePageDesc: string
    useDeviceLanguage: string
    savedToAccount: string
    appliesAllDevices: string
    themePageDesc: string
    timezonePageDesc: string
    searchTimezonePlaceholder: string
    useDeviceTimezone: string
  }
  overview: {
    commandCenter: string
    workspaceFallback: string
    noSignals: string
    postureLabel: string
    priorityQueue: string
    noPriorityItems: string
    postureDrivers: string
    noDrivers: string
    trendingActors: string
    activeMalware: string
    nothingRanked: string
    cveSeverityMix: string
    threatNewsSeverity: string
    lastArrival: string
    articles: string
    inLast24h: string
    vulnerabilities: string
    threatNews: string
    ransomware: string
    rail: {
      riskPosture: string
      exploited: string
      kevCves: string
      ransomware: string
      victims24h: string
      news: string
      lookalikes: string
      highRisk: string
      alerts: string
      unread: string
    }
    ciso: {
      heading: string
      sub: string
      summary: string
      riskConcentration: string
    }
  }
  posture: { critical: string; high: string; guarded: string; low: string }
}

const en: PortalDict = {
  common: {
    search: "Search",
    open: "Open",
    close: "Close",
    save: "Save",
    saving: "Saving…",
    saved: "Saved",
    cancel: "Cancel",
    clear: "Clear",
    loading: "Loading…",
    noData: "No data yet.",
    viewAll: "View all",
    back: "Back",
    updated: "Updated",
    all: "All",
    signOut: "Sign out",
    administrator: "Administrator",
    analyst: "Analyst",
    today: "today",
    last24h: "in last 24h",
    sev: { critical: "Critical", high: "High", medium: "Medium", low: "Low", info: "Info" },
  },
  nav: {
    overview: "Overview",
    settings: "Settings",
    admin: "Admin",
    modules: "Modules",
    workspace: "Workspace",
    management: "Management",
    signOut: "Sign out",
    searchPlaceholder: "Search…",
    account: "Account",
  },
  modules: {
    intel: "Threat Intelligence",
    investigate: "Threat Investigation",
    adversaries: "Adversary Intelligence",
    ransomware: "Ransomware",
    brand: "Brand Protection",
    credentials: "Credential Exposure",
  },
  settings: {
    title: "Settings",
    subtitle: "Language, theme and timezone for your account.",
    preferences: "Preferences",
    language: "Language",
    languageDesc: "Portal display language",
    theme: "Theme",
    themeDesc: "Perseonix, dark or light",
    timezone: "Timezone",
    timezoneDesc: "Show all times in your local time",
    languagePageDesc: "The portal interface language. Applies to this account on all devices.",
    useDeviceLanguage: "Use my device language",
    savedToAccount: "Saved to your account.",
    appliesAllDevices: "Applies to this account on all devices.",
    themePageDesc: "Applies to this account on all devices.",
    timezonePageDesc: "All timestamps display in this timezone. Saved to your account, used on every device.",
    searchTimezonePlaceholder: "Search timezone…",
    useDeviceTimezone: "Use my device timezone",
  },
  overview: {
    commandCenter: "Command Center",
    workspaceFallback: "Security operations",
    noSignals: "No critical signals. All feeds nominal.",
    postureLabel: "posture",
    priorityQueue: "Priority queue",
    noPriorityItems: "No priority items. New KEV CVEs, critical news and high-risk lookalikes appear here.",
    postureDrivers: "Posture drivers",
    noDrivers: "No active pressure signals.",
    trendingActors: "Trending threat actors",
    activeMalware: "Active malware families",
    nothingRanked: "Nothing ranked yet.",
    cveSeverityMix: "CVE severity mix",
    threatNewsSeverity: "Threat-news severity",
    lastArrival: "last arrival",
    articles: "articles",
    inLast24h: "in last 24h",
    vulnerabilities: "Vulnerabilities",
    threatNews: "Threat news",
    ransomware: "Ransomware",
    rail: {
      riskPosture: "Risk posture",
      exploited: "Exploited",
      kevCves: "KEV CVEs",
      ransomware: "Ransomware",
      victims24h: "victims · 24h",
      news: "News",
      lookalikes: "Lookalikes",
      highRisk: "high-risk",
      alerts: "Alerts",
      unread: "unread",
    },
    ciso: {
      heading: "Executive risk briefing",
      sub: "NIST CSF · updated",
      summary: "Summary",
      riskConcentration: "Risk concentration",
    },
  },
  posture: { critical: "critical", high: "elevated", guarded: "guarded", low: "low" },
}

const tr: PortalDict = {
  common: {
    search: "Ara", open: "Aç", close: "Kapat", save: "Kaydet", saving: "Kaydediliyor…",
    saved: "Kaydedildi", cancel: "İptal", clear: "Temizle", loading: "Yükleniyor…",
    noData: "Henüz veri yok.", viewAll: "Tümünü gör", back: "Geri", updated: "Güncellendi",
    all: "Tümü", signOut: "Çıkış yap", administrator: "Yönetici", analyst: "Analist",
    today: "bugün", last24h: "son 24 saatte",
    sev: { critical: "Kritik", high: "Yüksek", medium: "Orta", low: "Düşük", info: "Bilgi" },
  },
  nav: {
    overview: "Genel Bakış", settings: "Ayarlar", admin: "Yönetim", modules: "Modüller",
    workspace: "Çalışma Alanı", management: "Yönetim",
    signOut: "Çıkış yap", searchPlaceholder: "Ara…", account: "Hesap",
  },
  modules: {
    intel: "Tehdit İstihbaratı", investigate: "Tehdit İncelemesi",
    adversaries: "Tehdit Aktörü İstihbaratı", ransomware: "Fidye Yazılımı",
    brand: "Marka Koruması", credentials: "Kimlik Bilgisi Sızıntısı",
  },
  settings: {
    title: "Ayarlar", subtitle: "Hesabınız için dil, tema ve saat dilimi.",
    preferences: "Tercihler", language: "Dil", languageDesc: "Portal görüntüleme dili",
    theme: "Tema", themeDesc: "Perseonix, koyu veya açık",
    timezone: "Saat Dilimi", timezoneDesc: "Tüm saatleri yerel saatinizle gösterin",
    languagePageDesc: "Portal arayüz dili. Tüm cihazlarda bu hesaba uygulanır.",
    useDeviceLanguage: "Cihaz dilimi kullan", savedToAccount: "Hesabınıza kaydedildi.",
    appliesAllDevices: "Tüm cihazlarda bu hesaba uygulanır.",
    themePageDesc: "Tüm cihazlarda bu hesaba uygulanır.",
    timezonePageDesc: "Tüm zaman damgaları bu saat diliminde gösterilir. Hesabınıza kaydedilir ve her cihazda kullanılır.",
    searchTimezonePlaceholder: "Saat dilimi ara…", useDeviceTimezone: "Cihaz saat dilimimi kullan",
  },
  overview: {
    commandCenter: "Komuta Merkezi", workspaceFallback: "Güvenlik operasyonları",
    noSignals: "Kritik sinyal yok. Tüm akışlar normal.", postureLabel: "duruş",
    priorityQueue: "Öncelik kuyruğu",
    noPriorityItems: "Öncelikli öğe yok. Yeni KEV CVE'leri, kritik haberler ve yüksek riskli taklit alan adları burada görünür.",
    postureDrivers: "Duruş etkenleri", noDrivers: "Aktif baskı sinyali yok.",
    trendingActors: "Öne çıkan tehdit aktörleri", activeMalware: "Aktif zararlı yazılım aileleri",
    nothingRanked: "Henüz sıralama yok.", cveSeverityMix: "CVE önem dağılımı",
    threatNewsSeverity: "Tehdit haberi önem derecesi", lastArrival: "son gelen",
    articles: "makale", inLast24h: "son 24 saatte", vulnerabilities: "Güvenlik açıkları",
    threatNews: "Tehdit haberleri", ransomware: "Fidye yazılımı",
    rail: {
      riskPosture: "Risk duruşu", exploited: "İstismar edildi", kevCves: "KEV CVE'leri",
      ransomware: "Fidye yazılımı", victims24h: "mağdur · 24s", news: "Haberler",
      lookalikes: "Taklit alan adları", highRisk: "yüksek riskli", alerts: "Uyarılar", unread: "okunmamış",
    },
    ciso: {
      heading: "Yönetici risk brifingi", sub: "NIST CSF · güncellendi",
      summary: "Özet", riskConcentration: "Risk yoğunlaşması",
    },
  },
  posture: { critical: "kritik", high: "yükselmiş", guarded: "temkinli", low: "düşük" },
}

const ru: PortalDict = {
  common: {
    search: "Поиск", open: "Открыть", close: "Закрыть", save: "Сохранить", saving: "Сохранение…",
    saved: "Сохранено", cancel: "Отмена", clear: "Очистить", loading: "Загрузка…",
    noData: "Данных пока нет.", viewAll: "Показать все", back: "Назад", updated: "Обновлено",
    all: "Все", signOut: "Выйти", administrator: "Администратор", analyst: "Аналитик",
    today: "сегодня", last24h: "за последние 24 ч",
    sev: { critical: "Критический", high: "Высокий", medium: "Средний", low: "Низкий", info: "Информационный" },
  },
  nav: {
    overview: "Обзор", settings: "Настройки", admin: "Администрирование", modules: "Модули",
    workspace: "Рабочая область", management: "Управление",
    signOut: "Выйти", searchPlaceholder: "Поиск…", account: "Аккаунт",
  },
  modules: {
    intel: "Киберразведка угроз", investigate: "Расследование угроз",
    adversaries: "Разведка по злоумышленникам", ransomware: "Программы-вымогатели",
    brand: "Защита бренда", credentials: "Утечка учётных данных",
  },
  settings: {
    title: "Настройки", subtitle: "Язык, тема и часовой пояс для вашего аккаунта.",
    preferences: "Параметры", language: "Язык", languageDesc: "Язык интерфейса портала",
    theme: "Тема", themeDesc: "Perseonix, тёмная или светлая",
    timezone: "Часовой пояс", timezoneDesc: "Показывать всё время в вашем местном времени",
    languagePageDesc: "Язык интерфейса портала. Применяется к этому аккаунту на всех устройствах.",
    useDeviceLanguage: "Использовать язык устройства", savedToAccount: "Сохранено в вашем аккаунте.",
    appliesAllDevices: "Применяется к этому аккаунту на всех устройствах.",
    themePageDesc: "Применяется к этому аккаунту на всех устройствах.",
    timezonePageDesc: "Все метки времени отображаются в этом часовом поясе. Сохраняется в вашем аккаунте и используется на всех устройствах.",
    searchTimezonePlaceholder: "Поиск часового пояса…", useDeviceTimezone: "Использовать часовой пояс устройства",
  },
  overview: {
    commandCenter: "Командный центр", workspaceFallback: "Операции безопасности",
    noSignals: "Критических сигналов нет. Все потоки в норме.", postureLabel: "защищённость",
    priorityQueue: "Очередь приоритетов",
    noPriorityItems: "Приоритетных элементов нет. Новые KEV CVE, критические новости и высокорисковые домены-двойники появляются здесь.",
    postureDrivers: "Факторы защищённости", noDrivers: "Активных сигналов давления нет.",
    trendingActors: "Актуальные злоумышленники", activeMalware: "Активные семейства вредоносного ПО",
    nothingRanked: "Пока нет рейтинга.", cveSeverityMix: "Распределение CVE по критичности",
    threatNewsSeverity: "Критичность новостей об угрозах", lastArrival: "последнее поступление",
    articles: "статьи", inLast24h: "за последние 24 ч", vulnerabilities: "Уязвимости",
    threatNews: "Новости об угрозах", ransomware: "Программы-вымогатели",
    rail: {
      riskPosture: "Уровень риска", exploited: "Эксплуатируется", kevCves: "KEV CVE",
      ransomware: "Программы-вымогатели", victims24h: "жертвы · 24 ч", news: "Новости",
      lookalikes: "Домены-двойники", highRisk: "высокий риск", alerts: "Оповещения", unread: "непрочитанные",
    },
    ciso: {
      heading: "Риск-брифинг для руководства", sub: "NIST CSF · обновлено",
      summary: "Сводка", riskConcentration: "Концентрация риска",
    },
  },
  posture: { critical: "критический", high: "повышенный", guarded: "настороженный", low: "низкий" },
}

const DICTS: Record<Locale, PortalDict> = { en, tr, ru }

export function getPortalDict(locale: string | null | undefined): PortalDict {
  const l = isLocale(locale ?? undefined) ? (locale as Locale) : DEFAULT_LOCALE
  return DICTS[l] ?? en
}

export { en as portalEn }
