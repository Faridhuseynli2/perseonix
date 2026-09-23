import type { Locale } from "@/lib/i18n/config"

// English is the source of truth; `Dict` is derived from it so tr/ru must match.
const en = {
  nav: {
    platform: "Platform",
    modules: "Modules",
    research: "Research",
    company: "Company",
    login: "Login",
    getStarted: "Get Started",
    language: "Language",
  },
  announcement: {
    eyebrow: "Corvael Threat Brief",
    text: "Ransomware leak-site activity up 37% this quarter — read the latest adversary tracking.",
  },
  hero: {
    eyebrow: "Perseonix Corvael // Threat Intelligence Platform",
    titleLine1: "See the threat",
    titleHighlight: "before it reaches you.",
    subcopy:
      "One console for the whole threat picture — adversaries, ransomware, brand impersonation and your external attack surface — enriched by an in-house research unit that tells you what attackers are actually targeting.",
    primary: "Get Started",
    secondary: "Explore the platform",
    trust: "Deployed by security teams across 5 continents",
    counters: ["Indicators indexed", "Adversary clusters", "Victims tracked", "Countries covered"],
    tracking: "Adversary // Tracking",
    threat: "Threat",
    campaigns: "Campaigns",
    lastSeen: "Last seen",
    sectors: "Sectors",
  },
  reality: {
    eyebrow: "The uncomfortable truth",
    titleLine1: "Right now, someone is",
    titleHighlight: "studying your organisation.",
    lead1: "The question was never ",
    leadEm: "if",
    lead2:
      " you become a target — it's whether you'll see them coming. Most organisations find out too late, from someone else.",
    cards: [
      {
        title: "You are already being watched.",
        body: "Adversaries profile their targets for weeks — your exposed services, your staff, your suppliers — long before they make a move.",
      },
      {
        title: "Your attack surface is public.",
        body: "Every forgotten subdomain, open port and stale certificate is on the internet for anyone to find. Most breaches start with one you didn't know you had.",
      },
      {
        title: "Your name may already be leaked.",
        body: "Impersonated domains phish your customers and stolen data is auctioned on leak sites — usually before the victim ever finds out.",
      },
    ],
    cta: "See what they see",
    note: "Turn their advantage into yours — before they strike.",
  },
  platform: {
    eyebrow: "Perseonix Corvael",
    title: "The whole threat picture, in one console.",
    description:
      "Corvael gives security teams the clarity they need — map your attack surface, watch the adversaries who target you, and respond fast with intelligence that is already enriched and prioritised.",
    capabilities: [
      "Continuous external attack-surface discovery",
      "Adversary & ransomware tracking",
      "Brand & domain impersonation defense",
      "One-console alerts and CERT-ready reports",
    ],
    cta: "Explore the platform",
  },
  modules: {
    eyebrow: "The Platform",
    titleLine1: "Five modules.",
    titleLine2: "One adversary picture.",
    description:
      "Each module runs on the same intelligence core, so a signal in one becomes context in the others — and every alert lands in a single console.",
    seeAll: "See all modules",
    flagship: "Flagship",
    flagshipName: "Adversary Intelligence",
    flagshipDesc:
      "Track 240+ threat actors and their campaigns, build a relevance-ranked map of who targets your sector and country, and follow any group to get alerted the moment they move.",
    chips: ["Actor profiles", "Relevance ranking", "Campaign tracking", "Watchlist alerts"],
    supporting: [
      { name: "Ransomware Tracker", tagline: "Every leak-site victim, group and demand — tracked as it breaks." },
      { name: "Brand Protection", tagline: "Lookalike, typosquat and phishing domains, caught with low false positives." },
      { name: "Attack Surface", tagline: "Continuous discovery of your exposed, internet-facing assets." },
      { name: "Investigate", tagline: "Pivot across indicators and export CERT-ready intelligence reports." },
    ],
    alertsName: "Unified alerts",
    alertsBody:
      "One notification bell across every module — follow a group, sector or domain and never miss the next move.",
  },
  how: {
    eyebrow: "How it works",
    title: "From raw signal to a decision you can defend.",
    description:
      "A single intelligence pipeline runs under every module, so what one sensor sees becomes context everywhere else.",
    steps: [
      { title: "Collect", body: "Leak sites, certificate transparency, DNS, the open and dark web, and our own research feed — pulled continuously." },
      { title: "Correlate", body: "Signals are de-duplicated, enriched and linked to the actors, campaigns and assets they actually belong to." },
      { title: "Prioritise", body: "Everything is ranked by relevance to your sector, geography and exposed surface — not by raw volume." },
      { title: "Act", body: "One alert bell, guided takedown checklists and CERT-ready PDF reports you can share the same day." },
    ],
  },
  why: {
    eyebrow: "Why Perseonix",
    title: "Intelligence you can put your name on.",
    description:
      "We built the platform we wished we had on the worst night of our careers — practical, prioritised and defensible.",
    pillars: [
      { title: "Analyst-validated", body: "Every critical finding is reviewed by a human analyst before it reaches you — with the evidence attached, so you act on facts, not noise." },
      { title: "Relevance-first", body: "Signals are ranked by what matters to your sector, geography and exposed surface — the adversaries who target you rise to the top." },
      { title: "Built to be shared", body: "Clear severity, guided remediation and CERT-ready reports you can hand to leadership or a national CERT the same day." },
    ],
  },
  research: {
    eyebrow: "Threat Research Unit",
    title: "Research from the people who hunt them.",
    description:
      "Our analysts publish finished intelligence on the campaigns, actors and vulnerabilities shaping your threat landscape.",
    library: "Full library in the Portal",
    readReport: "Read the report in the Portal",
    customersOnly: "Customers only",
    trackingEyebrow: "Adversary tracking",
    trackingTitle: "Clusters our hunters are watching this week",
    clustersTracked: "clusters tracked",
    shown: "shown",
    targets: "Targets",
  },
  coverage: {
    eyebrow: "Global coverage",
    title: "Eyes on every place attackers gather.",
    description:
      "Collection infrastructure and regional research desks give our analysts native-language visibility into the communities where attacks are planned.",
    coverageLabel: "Collection coverage",
    hub: "Regional hub",
    node: "Collection node",
    sectorsLabel: "Sectors we protect",
  },
  integrations: {
    eyebrow: "Integrations",
    title: "Intelligence that lands where your team already works.",
    description:
      "Machine-readable feeds and native connectors push validated intelligence into your detection and response stack — no copy-paste, no swivel-chair.",
    standards: "Open standards",
    deliversTo: "Delivers to",
  },
  about: {
    eyebrow: "About Perseonix",
    title: "Built by threat hunters, for teams who can't afford blind spots.",
    description:
      "Perseonix was founded by practitioners from incident response, threat hunting and offensive security. We built the platform we wished we had on the worst night of our careers.",
    principles: [
      { title: "Analyst-validated, not just automated", body: "Every critical finding is reviewed by a human analyst before it reaches you — with the evidence attached." },
      { title: "Context mapped to your business", body: "Signals are tied to your assets, suppliers and people, so the priority of every alert is obvious." },
      { title: "Built to be acted on", body: "Clear severity, recommended actions and machine-readable output — ready for your SOC in minutes." },
    ],
  },
  cta: {
    eyebrow: "Don't wait to be the headline",
    title: "See what adversaries already know",
    highlight: "about your organisation.",
    subcopy:
      "Every day without visibility is a day your attackers spend ahead of you. Sign in to Perseonix Corvael and take back the advantage — your exposure, your threats, mapped and prioritised.",
    primary: "Get Started",
    secondary: "Explore the platform",
  },
  footer: {
    tagline: "Cyber threat intelligence for organisations that need to know first.",
    note: "This page may be shared freely.",
    copyright: "© 2026 Perseonix. All rights reserved.",
  },
}

export type Dict = typeof en

const tr: Dict = {
  nav: {
    platform: "Platform",
    modules: "Modüller",
    research: "Araştırma",
    company: "Şirket",
    login: "Giriş",
    getStarted: "Başla",
    language: "Dil",
  },
  announcement: {
    eyebrow: "Corvael Tehdit Bülteni",
    text: "Bu çeyrekte fidye yazılımı sızıntı sitesi faaliyeti %37 arttı — en güncel aktör takibini okuyun.",
  },
  hero: {
    eyebrow: "Perseonix Corvael // Tehdit İstihbaratı Platformu",
    titleLine1: "Tehdidi, sana ulaşmadan",
    titleHighlight: "önce gör.",
    subcopy:
      "Tüm tehdit tablosu tek bir konsolda — düşman aktörler, fidye yazılımları, marka taklidi ve dış saldırı yüzeyin — saldırganların gerçekte neyi hedeflediğini söyleyen kendi araştırma birimimizle zenginleştirilmiş.",
    primary: "Başla",
    secondary: "Platformu keşfet",
    trust: "5 kıtada güvenlik ekipleri tarafından kullanılıyor",
    counters: ["İndekslenen gösterge", "Aktör kümesi", "Takip edilen kurban", "Kapsanan ülke"],
    tracking: "Aktör // Takip",
    threat: "Tehdit",
    campaigns: "Kampanya",
    lastSeen: "Son görülme",
    sectors: "Sektör",
  },
  reality: {
    eyebrow: "Rahatsız edici gerçek",
    titleLine1: "Şu anda birileri",
    titleHighlight: "kurumunu inceliyor.",
    lead1: "Soru hiçbir zaman hedef olup ",
    leadEm: "olmayacağın",
    lead2:
      " değildi — onları önceden görüp göremeyeceğin. Çoğu kurum bunu çok geç, başkasından öğrenir.",
    cards: [
      {
        title: "Zaten izleniyorsun.",
        body: "Saldırganlar hamle yapmadan haftalar önce hedeflerini profiller — açık servislerini, çalışanlarını, tedarikçilerini.",
      },
      {
        title: "Saldırı yüzeyin herkese açık.",
        body: "Unutulmuş her alt alan adı, açık port ve süresi geçmiş sertifika internette herkesin erişimine açık. İhlallerin çoğu, var olduğunu bilmediğin bir varlıkla başlar.",
      },
      {
        title: "Adın çoktan sızmış olabilir.",
        body: "Taklit alan adları müşterilerini oltalar, çalınan veriler sızıntı sitelerinde satılır — genelde kurban fark etmeden önce.",
      },
    ],
    cta: "Onların gördüğünü gör",
    note: "Onların avantajını kendi lehine çevir — saldırmadan önce.",
  },
  platform: {
    eyebrow: "Perseonix Corvael",
    title: "Tüm tehdit tablosu, tek bir konsolda.",
    description:
      "Corvael, güvenlik ekiplerine ihtiyaç duydukları netliği verir — saldırı yüzeyini haritalandır, seni hedefleyen aktörleri izle ve önceden zenginleştirilip önceliklendirilmiş istihbaratla hızla yanıt ver.",
    capabilities: [
      "Sürekli dış saldırı yüzeyi keşfi",
      "Aktör ve fidye yazılımı takibi",
      "Marka ve alan adı taklidine karşı savunma",
      "Tek konsolda uyarılar ve CERT'e hazır raporlar",
    ],
    cta: "Platformu keşfet",
  },
  modules: {
    eyebrow: "Platform",
    titleLine1: "Beş modül.",
    titleLine2: "Tek bir aktör tablosu.",
    description:
      "Her modül aynı istihbarat çekirdeği üzerinde çalışır; birindeki bir sinyal diğerlerinde bağlama dönüşür — ve her uyarı tek bir konsolda toplanır.",
    seeAll: "Tüm modülleri gör",
    flagship: "Amiral gemisi",
    flagshipName: "Aktör İstihbaratı",
    flagshipDesc:
      "240+ tehdit aktörünü ve kampanyalarını izle, sektörünü ve ülkeni kimin hedeflediğine dair önem sırasına göre bir harita oluştur ve herhangi bir grubu takibe alarak harekete geçtikleri anda haberdar ol.",
    chips: ["Aktör profilleri", "Önem sıralaması", "Kampanya takibi", "İzleme listesi uyarıları"],
    supporting: [
      { name: "Ransomware Tracker", tagline: "Her sızıntı-sitesi kurbanı, grup ve fidye talebi — anında takip edilir." },
      { name: "Brand Protection", tagline: "Benzer, typosquat ve oltalama alan adları, düşük yanlış-pozitifle yakalanır." },
      { name: "Attack Surface", tagline: "İnternete açık varlıklarının sürekli keşfi." },
      { name: "Investigate", tagline: "Göstergeler arasında geçiş yap ve CERT'e hazır istihbarat raporları çıkar." },
    ],
    alertsName: "Birleşik uyarılar",
    alertsBody:
      "Tüm modüllerde tek bir bildirim zili — bir grubu, sektörü veya alan adını takip et ve bir sonraki hamleyi asla kaçırma.",
  },
  how: {
    eyebrow: "Nasıl çalışır",
    title: "Ham sinyalden, savunabileceğin bir karara.",
    description:
      "Her modülün altında tek bir istihbarat hattı çalışır; bir sensörün gördüğü, her yerde bağlama dönüşür.",
    steps: [
      { title: "Topla", body: "Sızıntı siteleri, sertifika şeffaflığı, DNS, açık ve karanlık ağ ile kendi araştırma akışımız — sürekli çekilir." },
      { title: "İlişkilendir", body: "Sinyaller tekilleştirilir, zenginleştirilir ve gerçekten ait oldukları aktör, kampanya ve varlıklara bağlanır." },
      { title: "Önceliklendir", body: "Her şey ham hacme göre değil; sektörüne, coğrafyana ve açık yüzeyine olan önemine göre sıralanır." },
      { title: "Harekete geç", body: "Tek uyarı zili, adım adım kaldırma listeleri ve aynı gün paylaşabileceğin CERT'e hazır PDF raporları." },
    ],
  },
  why: {
    eyebrow: "Neden Perseonix",
    title: "Altına adını koyabileceğin istihbarat.",
    description:
      "Kariyerimizin en kötü gecesinde keşke elimizde olsaydı dediğimiz platformu kurduk — pratik, önceliklendirilmiş ve savunulabilir.",
    pillars: [
      { title: "Analist onaylı", body: "Her kritik bulgu, sana ulaşmadan önce bir insan analist tarafından — kanıtı ekli olarak — incelenir; böylece gürültüyle değil, gerçeklerle hareket edersin." },
      { title: "Önce önem", body: "Sinyaller sektörüne, coğrafyana ve açık yüzeyine göre sıralanır — seni hedefleyen aktörler en üste çıkar." },
      { title: "Paylaşmak için tasarlandı", body: "Net önem derecesi, adım adım giderme ve yönetime ya da ulusal bir CERT'e aynı gün sunabileceğin raporlar." },
    ],
  },
  research: {
    eyebrow: "Tehdit Araştırma Birimi",
    title: "Onları avlayanların araştırmaları.",
    description:
      "Analistlerimiz, tehdit ortamını şekillendiren kampanyalar, aktörler ve zafiyetler üzerine tamamlanmış istihbarat yayımlar.",
    library: "Portaldaki tam kütüphane",
    readReport: "Raporu Portalda oku",
    customersOnly: "Yalnızca müşteriler",
    trackingEyebrow: "Aktör takibi",
    trackingTitle: "Avcılarımızın bu hafta izlediği kümeler",
    clustersTracked: "küme takip ediliyor",
    shown: "gösteriliyor",
    targets: "Hedefler",
  },
  coverage: {
    eyebrow: "Küresel kapsama",
    title: "Saldırganların toplandığı her yerde gözümüz var.",
    description:
      "Toplama altyapısı ve bölgesel araştırma masaları, analistlerimize saldırıların planlandığı topluluklarda ana dilde görünürlük sağlar.",
    coverageLabel: "Toplama kapsamı",
    hub: "Bölgesel merkez",
    node: "Toplama noktası",
    sectorsLabel: "Koruduğumuz sektörler",
  },
  integrations: {
    eyebrow: "Entegrasyonlar",
    title: "Ekibinin zaten çalıştığı yere ulaşan istihbarat.",
    description:
      "Makine tarafından okunabilir beslemeler ve yerel bağlayıcılar, doğrulanmış istihbaratı tespit ve müdahale yığınına iletir — kopyala-yapıştır yok, sistemler arası koşuşturma yok.",
    standards: "Açık standartlar",
    deliversTo: "Şuralara iletir",
  },
  about: {
    eyebrow: "Perseonix Hakkında",
    title: "Tehdit avcıları tarafından, kör noktaya tahammülü olmayan ekipler için kuruldu.",
    description:
      "Perseonix; olay müdahalesi, tehdit avcılığı ve saldırgan güvenlik alanlarından gelen uygulayıcılar tarafından kuruldu. Kariyerimizin en kötü gecesinde keşke elimizde olsaydı dediğimiz platformu inşa ettik.",
    principles: [
      { title: "Yalnızca otomatik değil, analist onaylı", body: "Her kritik bulgu, sana ulaşmadan önce bir insan analist tarafından — kanıtı ekli olarak — incelenir." },
      { title: "İşine göre bağlamlandırılmış", body: "Sinyaller varlıklarına, tedarikçilerine ve insanlarına bağlanır; böylece her uyarının önceliği bellidir." },
      { title: "Harekete geçmek için tasarlandı", body: "Net önem derecesi, önerilen aksiyonlar ve makine tarafından okunabilir çıktı — SOC'un için dakikalar içinde hazır." },
    ],
  },
  cta: {
    eyebrow: "Manşet olmayı bekleme",
    title: "Saldırganların kurumun hakkında",
    highlight: "çoktan bildiklerini gör.",
    subcopy:
      "Görünürlük olmadan geçen her gün, saldırganların senden bir adım önde olduğu bir gündür. Perseonix Corvael'a giriş yap ve avantajı geri al — açığın, tehditlerin; haritalanmış ve önceliklendirilmiş.",
    primary: "Başla",
    secondary: "Platformu keşfet",
  },
  footer: {
    tagline: "İlk öğrenmesi gereken kurumlar için siber tehdit istihbaratı.",
    note: "Bu sayfa serbestçe paylaşılabilir.",
    copyright: "© 2026 Perseonix. Tüm hakları saklıdır.",
  },
}

const ru: Dict = {
  nav: {
    platform: "Платформа",
    modules: "Модули",
    research: "Исследования",
    company: "Компания",
    login: "Вход",
    getStarted: "Начать",
    language: "Язык",
  },
  announcement: {
    eyebrow: "Сводка угроз Corvael",
    text: "Активность сайтов утечек программ-вымогателей выросла на 37% за квартал — читайте свежий обзор по злоумышленникам.",
  },
  hero: {
    eyebrow: "Perseonix Corvael // Платформа киберразведки",
    titleLine1: "Увидьте угрозу",
    titleHighlight: "прежде чем она вас настигнет.",
    subcopy:
      "Единая консоль для всей картины угроз — злоумышленники, программы-вымогатели, подмена бренда и ваша внешняя поверхность атаки — обогащённая собственным исследовательским подразделением, которое показывает, на что реально нацелены атакующие.",
    primary: "Начать",
    secondary: "Изучить платформу",
    trust: "Используется командами безопасности на 5 континентах",
    counters: ["Индикаторов в индексе", "Кластеров злоумышленников", "Отслеживаемых жертв", "Охваченных стран"],
    tracking: "Злоумышленник // Слежение",
    threat: "Угроза",
    campaigns: "Кампании",
    lastSeen: "Последняя активность",
    sectors: "Секторы",
  },
  reality: {
    eyebrow: "Неудобная правда",
    titleLine1: "Прямо сейчас кто-то",
    titleHighlight: "изучает вашу организацию.",
    lead1: "Вопрос никогда не стоял, ",
    leadEm: "станете",
    lead2:
      " ли вы целью — вопрос в том, заметите ли вы их вовремя. Большинство организаций узнают об этом слишком поздно и от посторонних.",
    cards: [
      {
        title: "За вами уже наблюдают.",
        body: "Злоумышленники неделями изучают свои цели — ваши открытые сервисы, ваших сотрудников, ваших поставщиков — задолго до первого шага.",
      },
      {
        title: "Ваша поверхность атаки открыта.",
        body: "Каждый забытый поддомен, открытый порт и просроченный сертификат доступны в интернете любому. Большинство взломов начинается с того, о чём вы даже не знали.",
      },
      {
        title: "Ваше имя, возможно, уже слито.",
        body: "Поддельные домены фишингуют ваших клиентов, а украденные данные продаются на сайтах утечек — обычно раньше, чем жертва об этом узнаёт.",
      },
    ],
    cta: "Посмотрите их глазами",
    note: "Обратите их преимущество в своё — до того как они нанесут удар.",
  },
  platform: {
    eyebrow: "Perseonix Corvael",
    title: "Вся картина угроз в одной консоли.",
    description:
      "Corvael даёт командам безопасности нужную ясность — картируйте поверхность атаки, следите за злоумышленниками, нацеленными на вас, и быстро реагируйте с разведкой, которая уже обогащена и приоритизирована.",
    capabilities: [
      "Непрерывное обнаружение внешней поверхности атаки",
      "Слежение за злоумышленниками и вымогателями",
      "Защита от подмены бренда и доменов",
      "Оповещения и готовые для CERT отчёты в одной консоли",
    ],
    cta: "Изучить платформу",
  },
  modules: {
    eyebrow: "Платформа",
    titleLine1: "Пять модулей.",
    titleLine2: "Единая картина злоумышленника.",
    description:
      "Каждый модуль работает на одном разведывательном ядре, поэтому сигнал в одном становится контекстом в других — и каждое оповещение попадает в единую консоль.",
    seeAll: "Все модули",
    flagship: "Флагман",
    flagshipName: "Разведка по злоумышленникам",
    flagshipDesc:
      "Отслеживайте более 240 угроз-акторов и их кампании, стройте ранжированную по релевантности карту тех, кто нацелен на ваш сектор и страну, и подписывайтесь на любую группу, чтобы узнать о её движении мгновенно.",
    chips: ["Профили акторов", "Ранжирование по релевантности", "Отслеживание кампаний", "Оповещения списка наблюдения"],
    supporting: [
      { name: "Ransomware Tracker", tagline: "Каждая жертва сайта утечек, группа и требование — отслеживаются в момент публикации." },
      { name: "Brand Protection", tagline: "Похожие, тайпсквоттинг и фишинговые домены — с низким числом ложных срабатываний." },
      { name: "Attack Surface", tagline: "Непрерывное обнаружение ваших открытых в интернет активов." },
      { name: "Investigate", tagline: "Переходите между индикаторами и выгружайте готовые для CERT отчёты." },
    ],
    alertsName: "Единые оповещения",
    alertsBody:
      "Один колокольчик уведомлений по всем модулям — следите за группой, сектором или доменом и не пропускайте следующий ход.",
  },
  how: {
    eyebrow: "Как это работает",
    title: "От сырого сигнала к решению, которое можно обосновать.",
    description:
      "Под каждым модулем работает единый разведывательный конвейер, поэтому увиденное одним сенсором становится контекстом повсюду.",
    steps: [
      { title: "Сбор", body: "Сайты утечек, прозрачность сертификатов, DNS, открытый и тёмный веб и наша собственная лента исследований — непрерывно." },
      { title: "Корреляция", body: "Сигналы дедуплицируются, обогащаются и связываются с акторами, кампаниями и активами, к которым действительно относятся." },
      { title: "Приоритизация", body: "Всё ранжируется по значимости для вашего сектора, географии и открытой поверхности — а не по объёму." },
      { title: "Действие", body: "Один колокольчик оповещений, пошаговые чек-листы по снятию угроз и готовые для CERT PDF-отчёты для обмена в тот же день." },
    ],
  },
  why: {
    eyebrow: "Почему Perseonix",
    title: "Разведка, под которой можно поставить своё имя.",
    description:
      "Мы построили платформу, о которой мечтали в худшую ночь нашей карьеры — практичную, приоритизированную и обоснованную.",
    pillars: [
      { title: "Проверено аналитиком", body: "Каждая критическая находка проверяется живым аналитиком до того, как дойдёт до вас — с приложенными доказательствами, чтобы вы действовали по фактам, а не по шуму." },
      { title: "Сначала релевантность", body: "Сигналы ранжируются по тому, что важно для вашего сектора, географии и открытой поверхности — злоумышленники, нацеленные на вас, поднимаются наверх." },
      { title: "Создано для обмена", body: "Понятная критичность, пошаговое устранение и готовые для CERT отчёты, которые можно передать руководству или национальному CERT в тот же день." },
    ],
  },
  research: {
    eyebrow: "Исследовательское подразделение",
    title: "Исследования от тех, кто их выслеживает.",
    description:
      "Наши аналитики публикуют готовую разведку о кампаниях, акторах и уязвимостях, формирующих ваш ландшафт угроз.",
    library: "Полная библиотека в Портале",
    readReport: "Читать отчёт в Портале",
    customersOnly: "Только для клиентов",
    trackingEyebrow: "Слежение за злоумышленниками",
    trackingTitle: "Кластеры, за которыми наши охотники следят на этой неделе",
    clustersTracked: "кластеров отслеживается",
    shown: "показано",
    targets: "Цели",
  },
  coverage: {
    eyebrow: "Глобальный охват",
    title: "Наблюдаем за каждым местом, где собираются атакующие.",
    description:
      "Инфраструктура сбора и региональные исследовательские отделы дают нашим аналитикам видимость на родном языке в сообществах, где планируются атаки.",
    coverageLabel: "Охват сбора",
    hub: "Региональный узел",
    node: "Точка сбора",
    sectorsLabel: "Секторы, которые мы защищаем",
  },
  integrations: {
    eyebrow: "Интеграции",
    title: "Разведка приходит туда, где уже работает ваша команда.",
    description:
      "Машиночитаемые фиды и нативные коннекторы передают проверенную разведку в ваш стек обнаружения и реагирования — без копипаста и переключений между системами.",
    standards: "Открытые стандарты",
    deliversTo: "Доставляется в",
  },
  about: {
    eyebrow: "О Perseonix",
    title: "Создано охотниками за угрозами для команд, которым нельзя иметь слепых зон.",
    description:
      "Perseonix основана практиками из реагирования на инциденты, охоты за угрозами и наступательной безопасности. Мы построили платформу, о которой мечтали в худшую ночь нашей карьеры.",
    principles: [
      { title: "Проверено аналитиком, а не только автоматикой", body: "Каждая критическая находка проверяется живым аналитиком до того, как дойдёт до вас — с приложенными доказательствами." },
      { title: "Контекст под ваш бизнес", body: "Сигналы связаны с вашими активами, поставщиками и людьми, поэтому приоритет каждого оповещения очевиден." },
      { title: "Создано для действий", body: "Понятная критичность, рекомендованные действия и машиночитаемый вывод — готово для вашего SOC за минуты." },
    ],
  },
  cta: {
    eyebrow: "Не ждите, пока станете заголовком",
    title: "Узнайте, что злоумышленники уже знают",
    highlight: "о вашей организации.",
    subcopy:
      "Каждый день без видимости — это день, который атакующие проводят впереди вас. Войдите в Perseonix Corvael и верните преимущество — ваша экспозиция и угрозы, картированные и приоритизированные.",
    primary: "Начать",
    secondary: "Изучить платформу",
  },
  footer: {
    tagline: "Киберразведка для организаций, которым нужно узнавать первыми.",
    note: "Этой страницей можно свободно делиться.",
    copyright: "© 2026 Perseonix. Все права защищены.",
  },
}

const DICTS: Record<Locale, Dict> = { en, tr, ru }

export function getDictionary(locale: Locale): Dict {
  return DICTS[locale] ?? en
}
