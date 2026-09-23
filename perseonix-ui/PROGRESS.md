# Perseonix — İlerleme Kaydı

> Son güncelleme: 13 Eylül 2026 · Kapsam: 12–13 Eylül 2026 oturumları
> Proje yolu: `~/Desktop/Perseonix/perseonix-ui`

Bu dosya; yapılan işleri, alınan kararları (ve gerekçelerini) ve kalan adımları özetler. Teknik kurulum ayrıntıları için `README.md`'ye bakın.

---

## 1. Özet

Perseonix için sıfırdan bir **CTI (Cyber Threat Intelligence) SaaS** kuruldu:

- **Pazarlama sitesi** (`/`) — kurumsal CTI şirketi görünümünde, tek sayfa.
- **Perseonix Talos portalı** (`/login` → `/app`) — oturum açma, modül bazlı erişim, kullanıcı ayarları.
- **Modüller:** Attack Surface Management (tasarım bekliyor) ve **Threat Investigation** (çalışır durumda).
- **Yönetim konsolu** (`/app/admin`) — müşteriler (POC / lisanslı), kullanıcılar, denetim kaydı.
- **Yeni marka** — vektörel şahin logosu, Orbitron wordmark, hafif "kalp atışı" animasyonu.

Durum: TypeScript, ESLint ve production build temiz. Admin girişi, müşteri/kullanıcı oluşturma ve müşteri kullanıcısıyla giriş kullanıcı tarafından test edildi.

---

## 2. Yapılan işler

### 2.1 Ortam kurulumu
- Mac'te Node/npm yoktu → **Node.js v24.21.0 LTS** resmi siteden indirildi, SHA-256 doğrulandı, `~/.local/node` altına (sudo'suz) kuruldu; PATH `~/.zprofile`'a eklendi.
- Proje: **Next.js 16.3.5** (App Router, Turbopack), React 19.2, TypeScript, **Tailwind CSS v4**, **shadcn/ui** (Base UI).
- `ui-ux-pro-max` tasarım skill'i `~/.claude/skills/` altına kuruldu (güvenlik incelemesinden sonra, yalnızca çekirdek skill).

### 2.2 Pazarlama sitesi (`/`)
- ThreatMon görsel dili (lacivert + elektrik mavisi + cyan, amber vurgu), CYFIRMA yapısı referans alındı.
- Bölümler: duyuru şeridi · sticky glass navbar (Home, Perseonix Talos, Research, About, Login Portal) · radar efektli hero + ürün önizlemesi · rakam bandı · Talos / Attack Surface Management yetenekleri · istihbarat döngüsü · Threat Research Unit · noktalı dünya haritası · entegrasyonlar · About · CTA · footer.
- Tüm pazarlama içeriği tek dosyada: `src/content/site.ts` (**yer tutucu veri**).

### 2.3 Veritabanı
- **PostgreSQL** şeması, **Drizzle ORM** ile; yerelde **PGlite** (WASM Postgres) — veri `.data/pglite/`.
- Migration'lar `drizzle/` altında, uygulama ilk açılışta otomatik uygular:
  - `0000_init` — users, organizations, modules, user_modules, sessions, login_attempts, audit_logs
  - `0001_customer_plans` — müşteri planı (POC/Licensed), tarih aralığı, koltuk limiti, iletişim, notlar
  - `0002_user_theme` — kullanıcı teması
  - `0003_investigations` — Threat Investigation raporları
- İlk admin, veritabanı boşsa `.env.local` içindeki `SEED_ADMIN_*` değerlerinden oluşturulur.

### 2.4 Kimlik doğrulama ve güvenlik
- Kendi oturum sistemi: scrypt şifre hash'i, httpOnly/SameSite cookie'de 256-bit token, veritabanında yalnızca SHA-256'sı, 12 saatlik oturum.
- Giriş kilidi: hesap başına 5, IP başına 20 hatalı deneme / 15 dk (paralel istekle aşılamaz). Olmayan hesaplar aynı sürede ve aynı mesajla reddedilir.
- İlk girişte zorunlu şifre değişikliği; şifre sıfırlama/değiştirme ve hesap kapatmada oturumlar sonlanır.
- Yetki kontrolü veri erişim katmanında (`src/lib/auth/dal.ts`) ve her Server Action'da; admin sayfaları diğerlerine 404 döner. Güvenlik başlıkları eklendi.
- Bağımsız kod incelemesindeki 3 orta, 4 düşük seviye bulgu düzeltildi.

### 2.5 Yönetim konsolu (`/app/admin`)
- **Overview:** müşteri/POC sayıları, 14 gün içinde bitenler, kullanıcı/oturum, başarısız girişler, 30 günlük tarih listesi, son etkinlikler, modül kataloğu.
- **Customers:** POC ve lisanslı müşteriler ayrı; müşteri oluştururken birincil iletişim kişisine **aynı adımda hesap** açılabilir; POC → Licensed dönüşümü.
- **Users:** Licensed / POC / Internal staff sekmeleri, şirket başlıkları altında gruplu.
- **Şifreler** sunucuda üretilir (`Xk7m-Qp2r-Zt9w-Hn4s`), bir kez gösterilir, "Copy sign-in details" ile kopyalanır.
- **Audit log:** giriş/çıkış, engellenen girişler, tüm admin işlemleri.

### 2.6 POC süresi dolunca erişim kesme
- Bitiş tarihinin ertesi günü müşteri kullanıcıları giriş yapamaz, açık oturumları düşer; engellenen denemeler `auth.login_blocked` olarak loglanır.

### 2.7 Settings ve temalar (`/app/settings`)
- 3 tema (**Perseonix** varsayılan, **Dark**, **Light**), canlı önizlemeli; kullanıcının hesabına kaydedilir.

### 2.8 Logo ve marka
- Şahin logosu elle SVG olarak çizildi (`src/components/brand/logo.tsx`), Orbitron wordmark, kalp atışı animasyonu, `src/app/icon.svg` favicon. Next.js dev göstergesi kapatıldı.

### 2.9 Threat Investigation modülü (`/app/modules/investigate`)
urlscan.io benzeri araştırma modülü. Müşteri tek kutuya **alan adı, IP veya URL** yazar; kaydedilen bir rapor alır: karar rozeti (Malicious / Suspicious / No known threats / Inconclusive) + önem sırasına göre bulgular.

| Kaynak | Sağlayıcı | Anahtar | Durum |
| --- | --- | --- | --- |
| Güvenlik firması tespitleri (90+ antivirüs, URL filtresi, kara liste) | VirusTotal (sadece sorgu, gönderim yok) | `VIRUSTOTAL_API_KEY` | ✅ Test edildi (ücretsiz plan) |
| Kötüye kullanım raporları (güven skoru, saldırı kategorileri) | AbuseIPDB | `ABUSEIPDB_API_KEY` | ✅ Test edildi (ücretsiz plan) |
| DNS (A, AAAA, CNAME, MX, NS, TXT, CAA, SOA, DMARC) | Cloudflare & Google resolver'ları | — | ✅ Test edildi |
| Kayıt bilgisi (registrar, tarihler, durum) | RDAP (rdap.org) | — | ✅ Test edildi |
| Ağ & ASN, reverse DNS, abuse iletişimi | Team Cymru · RIR RDAP | — | ✅ Test edildi |
| Konum (şehir, ülke, koordinat) + harita | MaxMind GeoLite2 via RIPEstat | — | ✅ Test edildi |
| Sertifika şeffaflığı + alt alan adları | Cert Spotter / crt.sh (paralel) | — | ✅ Test edildi |
| Canlı kontrol (HTTP durumu, yönlendirmeler, başlık, TLS, güvenlik başlıkları) | Perseonix probe | — | ✅ Test edildi |
| Sayfa yakalama (ekran görüntüsü, script yönlendirmeleri, bağlanılan host'lar, şifre formu) | Perseonix sandbox (headless Chromium) | — | ✅ Test edildi |
| İnternete açık servisler (portlar, servisler, CVE, etiketler) | Shodan | `SHODAN_API_KEY` | ✅ Test edildi (dev planı) |
| Zararlı URL listesi | abuse.ch URLhaus | `ABUSECH_AUTH_KEY` (ticari kullanım ücretli) | ⏸ Anahtar yok |
| Özel ekran görüntülü tarama | urlscan.io | `URLSCAN_API_KEY` | ⏸ Anahtar + ticari anlaşma yok |

- **Açıklanabilir rapor (threat hunting için):**
  - **Why this verdict:** 4 karar kuralı; hangisinin uygulandığı ve kararı belirleyen bulgular.
  - **Investigation trace:** her kaynağa sorulan soru, dönen cevap, durum ve süre (Reputation / Infrastructure / Behaviour grupları).
  - **Findings:** her bulgu açılınca "Why it matters" açıklaması, önem seviyesinin anlamı ve kaynağı.
  - **Pivot:** ilgili IP'ler, alt alan adları, nameserver ve mail sunucuları tek tıkla yeni araştırma.
  - **Geolocation haritası:** IP'nin konumu bölgesel harita + küçük dünya haritasıyla gösterilir; ülke vurgulanır, koordinatlar yazılır. Sadece ülke seviyesinde bilinen IP'ler kesikli halkayla işaretlenir; birden fazla IP numaralanır.
  - Rapor metinleri kısa ve sade ürün diliyle yeniden yazıldı (14 Eylül 2026).
- **PDF rapor (14 Eylül 2026):**
  - Rapor sayfasında "Download PDF" butonu var. Sunucuda markalı bir A4 rapor oluşturulur.
  - İçerik: kapak bandı (logo, TLP:AMBER, referans no), dört özet kutusu, yönetici özeti, bulgular, konum haritası, itibar, altyapı, canlı kontrol ve IOC listesi.
  - Ekler: araştırma izi, önem ölçeği ve karar kuralları, kaynak atıfları, kullanım koşulları.
  - Her indirme audit log'a yazılır.
- **Sayfa yakalama / ekran görüntüsü (14 Eylül 2026):**
  - Kullanıcı şüpheli bir adresi girer; Perseonix sayfayı kendi sunucusunda izole bir tarayıcıda açar. Rapora ekran görüntüsü, gidilen adres zinciri, bağlanılan tüm host'lar (IP'leriyle) ve şifre formu tespiti eklenir.
  - Ekran görüntüsünde basılı tutunca büyüteç açılır. Görüntü 2x çözünürlükte alındığı için yakınlaşınca net kalır. "Full size" ile tam boyut açılabilir.
  - PDF raporuna "Page capture" bölümü eklendi: ekran görüntüsü ve host tablosu.
  - Yeni bulgular:
    - Şifre formu başka bir siteye gönderiyorsa **high**.
    - Sayfa şifre istiyorsa **low**.
    - Script ile başka alan adına yönlendiriyorsa **medium**.
    - Engellenen iç ağ istekleri için **low**.
  - SSRF testi: localhost, 127.0.0.1, localtest.me, 169.254.169.254 ve ::1 engellendi.
- **Kota koruması:** VirusTotal dakikada 4 / günde 500, AbuseIPDB günde 1.000 istek sınırı uygulamada zorlanır; sonuçlar 1 saat önbelleğe alınır. Sınır dolunca rapor bunu açıkça yazar.
- **SSRF koruması:** private/loopback/reserved IP'ler reddedilir; bir alan adı iç adrese çözülürse (ör. `localtest.me` → 127.0.0.1) bağlanılmaz; bağlantı doğrulanan IP'ye sabitlenir (DNS rebinding yok). Test edildi.
- Raporlar müşteri şirketi içinde paylaşılır; adminler hepsini görür. Kota: şirket başına günlük 200 (`INVESTIGATION_DAILY_LIMIT`), kullanıcı başına dakikada 10.
- Admin panelinden müşterilere modül olarak verilir (Customers / Users formlarındaki modül listesinde otomatik görünür).

---

### 2.10 Adversary Intelligence modülü (`/app/modules/adversaries`) — çalışıyor
Tehdit aktörlerini ve APT gruplarını gösteren modül (14 Eylül 2026). SOCRadar'ın threat-actor aracı örnek alınıp Perseonix kimliğiyle kuruldu.
- **Veri:** Kullanıcının verdiği Word dökümanı (`APT_Groups_CASPiSEC_EN_v2.docx`) tablo tablo ayrıştırılıp **411 grup**luk bir veri setine dönüştürüldü (`src/lib/adversaries/data/groups.json`, ~224KB, uygulamayla paketli). CASPiSEC markası atıldı; kaynak "APT Groups & Operations" (CC BY 4.0) olarak atıf veriliyor.
- Her grupta: isim, bölge (9 origin), bayrak, tip (APT/Ransomware/Hacktivist), kaynaklı alias'lar ("Wicked Panda · CrowdStrike"), MITRE ATT&CK ID, toolset/malware, hedef sektör/ülkeler, bilinen operasyonlar, modus operandi, notlar, örtüşen (related) gruplar. Bölge meta verisi (tehdit seviyesi, sponsor, motivasyon, açıklama) `regions.json`'da.
- **Liste sayfası:** amblemli hero + sayaçlar (411 aktör, 9 bölge, 898 malware ailesi, 89 MITRE), isim/alias/malware araması, Bölge + Tip filtreleri, 9 bölge kartı (tehdit seviyesiyle), grup kartları grid'i + sayfalama. URL tabanlı (veri set client'a gitmiyor).
- **Detay sayfası:** başlık (tip + tehdit seviyesi rozeti, "also known as" kaynaklı alias'lar, MITRE ATT&CK dış linki), paneller: Toolset & malware, Targets & sectors, Known operations, Modus operandi, Origin (bölge sponsor/motivasyon/açıklama), Related actors (profillere pivot — 59 örtüşmenin 28'i bağlanıyor), Intelligence özeti.
- Kaynakta isimsiz bırakılmış 15 grup için uydurma yapmadan görünen ad türetildi (varsa ilk alias, yoksa "Unattributed <bölge> group N").
- **Görseller (14 Eylül 2026):** Kullanıcının verdiği 20 tematik portre (maskeli operatif) bölge ipuçlarına göre en meşhur 20 grupla eşleştirildi (Lazarus, Sofacy/Fancy Bear, APT29/Cozy Bear, Sandworm/APT44, Turla, Winnti/APT41, Mustang Panda, Kimsuky, Charming Kitten, OilRig, Wizard Spider, Equation vb.). 512px'e küçültülüp `public/adversaries/<slug>.jpg` altına kopyalandı (kaynak klasör silinse de kalır), `groups.json`'da `image` alanı olarak. Avatarlar orta boya büyütüldü (kart 56px, detay 80px). **Bayraklar kaldırıldı (hukuki hassasiyet):** görseli olmayan gruplarda avatar artık nötr baş-harf yer tutucu, portredeki köşe bayrak rozeti ve bölge kartlarındaki bayraklar da kaldırıldı (bölge kartında tehdit-renkli nokta). Bölge yalnızca metin olarak gösteriliyor. `flag` alanı veride duruyor ama arayüzde render edilmiyor. Kalan gruplara kullanıcı sonradan görsel ekleyebilir (aynı desen: `public/adversaries/<slug>.jpg` + `image` alanı).
- Amblem `src/components/brand/adversary-mark.tsx`; kenar çubuğu ikonu `VenetianMask`.
- **Not:** İsim "Adversary Intelligence" (APT + tehdit grubu + aktörü kapsayan CTI terimi).
- **Arayüz yenilendi (14 Eylül 2026):** İlk sürüm "jenerik/AI" duruyordu; ui-ux-pro-max skill'iyle komuta-merkezi (HUD) diline taşındı. Liste: köşe çentikli masthead + mono sayaç rayı, "tehdit manzarası" dağılım grafiği (bölgeler tehdit rengiyle) + tıklanır bölge kutuları, konsol arama çubuğu (sonuç sayısı), tehdit-seviyesi vurgu çubuklu zengin kartlar, stagger animasyon. Detay: künye (dossier) başlığı — üstte tehdit rengi şerit, PX-ID, hızlı-bilgi rayı, ikonlu panel başlıkları. Yeni CSS yardımcıları: `hud-grid`, `hud-corners`, `animate-rise`. Tehdit rengi haritası `meta.ts`'te (`THREAT_ACCENT`).

### 2.11 Adversary — MITRE ATT&CK zenginleştirme (14 Eylül 2026)
Veri artık statik kalmasın diye MITRE ATT&CK katmanı eklendi (ücretsiz, ticari kullanıma uygun, atıfla).
- **Script:** `scripts/refresh-adversaries.mjs` (`npm run refresh:adversaries`). Resmi ATT&CK STIX paketlerini (Enterprise/Mobile/ICS, `mitre-attack/attack-stix-data`) indirir, gruplarımızı G-ID (yoksa alias) ile eşleştirip `src/lib/adversaries/data/mitre.json` (~1,1MB) üretir. **411 gruptan 160'ı eşleşti** (87 G-ID, 73 alias).
- Her eşleşen grupta: teknikler (taktiklere göre gruplu), kullanılan yazılım/malware, açıklama ve harici kaynak (rapor) linkleri.
- **Detay sayfası:** "MITRE ATT&CK" bölümü — teknikler taktik taktik (T-ID'ler ATT&CK'e link), Software listesi, ve yan panelde "References" (rapor linkleri). Grubun notu boşsa Overview MITRE açıklamasından doldurulur.
- **Liste:** kartlarda "N TTPs" rozeti; üst sayaç "ATT&CK mapped" = 160.
- **Otomatik güncelleme:** script tek başına çalışır; aylık bir cron (ör. GitHub Actions) ile `mitre.json` tazelenip commit'lenebilir (MITRE ~3 ayda bir güncelliyor). IOC katmanı (ThreatFox/OTX) lisans kararına göre sonraya bırakıldı.

### 2.12 Connectors — admin entegrasyon yönetimi (14 Eylül 2026)
Admin panelinde yeni "Connectors" bölümü (`/app/admin/connectors`). Üçüncü parti API entegrasyonlarını (Shodan, VirusTotal, AbuseIPDB, URLhaus, urlscan.io) buradan yönetiyoruz.
- **Ne yapıyor:** Her connector'ın anlık durumu (Active / Disabled / Not configured), aç/kapa toggle'ı, API anahtarını ekle/değiştir/sil. Üstte Active/Configured/Total sayaçları. Her kartta lisans notu.
- **Mimari:** Katalog kod içinde (`src/lib/connectors/config.ts`), durum çözümleme `src/lib/connectors/service.ts` — DB override'ları env değişkenlerinin üzerine biner. Yeni migration `0004_*` (`connectors` tablosu: key, enabled, api_key, updated_by, updated_at). Investigation kaynakları (shodan/virustotal/abuseipdb/urlhaus/urlscan) artık env yerine merkezi `connectorActive()/connectorKey()` okuyor; `runInvestigation` başında snapshot yükleniyor, toggle/anahtar bir sonraki araştırmada etkili.
- **Güvenlik:** Kaydedilen anahtar server'da kalır, tarayıcıya asla dönmez (sadece son 4 hane + kaynak gösterilir). Audit'e anahtar yazılmaz (sadece son 4 hane). Anahtarlar yerel DB'de düz metin — canlıda secrets manager / şifreleme gerekir (not düşüldü).
- **Not:** `connectors` tablosu ancak dev sunucusu yeniden başlayınca oluşur (migration). Sayfa açılmadan önce `npm run dev` bir kez yeniden başlatılmalı.

### 2.13 Adversary — Kampanya / Aktivite katmanı (15 Eylül 2026)
Kullanıcının verdiği 2018–2026 APT rapor linklerinden "zaman/aktivite" boyutu eklendi.
- **Veri:** `src/lib/adversaries/data/apt-links.txt` (kaynak, projeye kopyalandı) → `scripts/build-campaigns.mjs` (`npm run build:campaigns`) → `campaigns.json` (290 rapor). Her rapor: yıl, başlık (URL slug'undan türetilmiş — makale metni DEĞİL, telif güvenli), yayıncı, URL, alias index'iyle aktör eşleştirme (79 eşleşti). Yeni link ekleyip script tekrar çalıştırılınca güncellenir.
- **Profil:** "Campaigns & activity" bölümü — yıllara göre gruplu zaman çizelgesi, kaynak linkleri; başlıkta "Last reported <yıl>".
- **Yeni sayfa:** `/app/modules/adversaries/activity` — global akış: yıllık bar grafiği (tıklanır filtre), kaynak/arama filtreleri, rapor listesi (yıl · başlık↗ · aktör→profil · yayıncı), sayfalama. Listeden "Threat activity feed" linki.
- **Kartlar:** "· last <yıl>" recency rozeti.
- **Telif:** sadece link + başlık + yayıncı; makale içeriği kopyalanmaz.
- **Sonraki (para kazanma yol haritası):** watchlist + uyarılar, relevance (sektör/ülke), paketleme (Free/Pro/Enterprise) + Stripe, IOC katmanı (lisansa bağlı).

### 2.14 Adversary — Watchlist + bildirimler (15 Eylül 2026)
Para kazanma yol haritasının ilk dilimi: kullanıcı bir tehdit aktörünü takibe alır, o aktörle ilgili yeni raporlama için başlıktaki çanda Facebook tarzı bildirim alır (e-posta şimdilik yok — kullanıcı erteledi).
- **Şema:** `watchlist` (userId+groupSlug PK, groupName) ve `adversary_notifications` (kullanıcı başına, kampanya başına satır, unique(userId,refId), readAt=okunmamış). Migration `drizzle/0005_panoramic_mockingbird.sql` — **tabloların oluşması için dev server'ın bir kez yeniden başlatılması gerekir** (migration'lar yalnızca getDb açılışında çalışır, connectors'taki gibi). O ana kadar her şey zarifçe boş/pasif çalışır.
- **Servis:** `src/lib/adversaries/watch.ts` — follow/unfollow/isWatching/notificationsView/listWatchlist/markAllRead + `reconcile`. Takibe alınca aktörün bilinen kampanyalarından bildirim tohumlanır (en son yıl okunmamış, eskiler okunmuş; hiç yoksa tek "welcome" bildirimi) → çan hemen anlamlı olur. `reconcile` (notificationsView içinde) `build:campaigns` sonrası gelen gerçekten yeni kampanyalar için bildirim ekler.
- **Server actions:** `src/app/app/modules/adversaries/actions.ts` (`revalidatePath("/app","layout")` ile başlıktaki çan tazelenir).
- **UI:** başlıkta `NotificationBell` (client dropdown + rozet, açınca tümü okundu işaretlenir); profil dosya başlığında `WatchButton` (Watch/Watching, optimistic); `/app/modules/adversaries/watchlist` sayfası; masthead "My watchlist" linki + breadcrumb etiketi.
- **Doğrulama:** geçici `/preview-watch` fixture route ile görsel doğrulandı (silindi); tsc/eslint/build temiz.

### 2.15 Ransomware Tracker modülü — iskelet (16 Eylül 2026)
Yeni modül eklendi (şimdilik sadece kayıt + iskelet; içi kullanıcının talimatıyla sonra doldurulacak). Ransomware gruplarının saldırılarını takip etmek için.
- **Katalog:** `src/db/seed.ts` içine `ransomware` / "Ransomware Tracker" eklendi (sortOrder 40). Seed her getDb açılışında `onConflictDoNothing` ile çalışır → **modülün görünmesi için dev server bir kez yeniden başlatılmalı**. Admin tüm aktif modülleri otomatik görür; normal kullanıcılara ayrıca atanmalı.
- **Route:** `/app/modules/ransomware` — HUD tarzı iskelet sayfa (kırmızı Skull amblem, "In development" rozeti, planlanan 4 yetenek kartı: Active groups, Claimed victims, Sectors & geography, Attack timeline). Jenerik `[moduleKey]` bento'su yerine kendi sayfası.
- **Meta:** `src/lib/ransomware/meta.ts` (`RANSOMWARE_MODULE_KEY`, `RANSOMWARE_MODULE_NAME`). **Sidebar:** `ransomware` → `Skull` ikonu.
- Görsel geçici `/preview-ransomware` ile doğrulandı (silindi); tsc/eslint/build temiz.

### 2.16 Ransomware Tracker — ransomware.live tarzı, canlı veri (16 Eylül 2026)
İskelet, gerçek bir leak-site kurban takip modülüne dönüştürüldü (ransomware.live modeli). Kullanıcı: modülü kullanıcılara ÜCRETSIZ verecek; yenileme şimdilik UYGULAMA İÇİ MANUEL BUTON, canlıda otomatik kurulacak.
- **Kaynak (pluggable adapter):** `src/lib/ransomware/sources/ransomware-live.ts` — free v2 API (`api.ransomware.live/v2`, key yok, 1 req/dk, **"personal use only"** — ticari için PRO key/ransomwatch; adapter fişe-tak-çıkar, connector'dan key okuyor). `/groups` + `/recentvictims` çekiyor; leak-site URL'i / çalınan veri SAKLANMAZ.
- **Şema (migration 0006):** `ransomware_groups`, `ransomware_victims` (dedupe unique group+victim+discovered), `ransomware_ingestions` (log). **Tablolar için dev server 1 kez restart gerekir.**
- **Ingestion:** `src/lib/ransomware/ingest.ts` — upsert + Adversary Intelligence'a `adversarySlug` çapraz köprü (resolveGroupSlug). **Connector:** `ransomware_live` (Ransomware Tracker kategorisi, requiresKey:false) admin → Connectors'ta.
- **Manuel tetik:** `refreshRansomware()` server action (admin) + başlıktaki **"Refresh data"** butonu; "Updated Xh ago" + audit log.
- **Okuma:** `src/lib/ransomware/data.ts` (stats, monthlyTimeline, listVictims/Groups, getGroup, groupVictims, facets; tablo yoksa boş döner).
- **UI:** dashboard (KPI rayı + aylık timeline bar + son kurbanlar + en aktif gruplar), `/victims` (filtre: q/sektör/ülke + sayfalama), `/groups` (arama + grid), `/groups/[slug]` (kurbanlar + hedef sektör/ülke dağılımı + Adversary dossier pivotu). Kırmızı (sev-critical) tema, Skull amblem, sekmeler.
- **Hukuki:** her kurban "iddia edildi (doğrulanmamış)" çerçevesinde; kaynak atfı ransomware.live.
- Görsel `/preview-ransomware` fixture ile doğrulandı (silindi); tsc/eslint/build temiz.

### 2.17 Ransomware Tracker — dashboard yeniden tasarım + kurban detay (16 Eylül 2026)
Kullanıcının attığı referans görsele göre dashboard tamamen yenilendi (birebir değil — telif için farklılaştırıldı; onların 3D globe'u yerine bizim 2D d3-geo dünya haritamız).
- **Yeni dashboard:** masthead + zaman aralığı sekmeleri (30g/6ay/1yıl/tümü, ?range=), 3 hero stat kartı (büyüme %'li: kurban/grup/ülke), **gelişmiş arama konsolu** (sözdizimi: `+country:us -group:lockbit +sector:healthcare before:2026-06`, örnek çipler → /victims'e yönlendirir), **Live Threat Intelligence** paneli (LIVE, son 24s/30g, kaç grup iddia ediyor, N CRITICAL, relatif zaman + NEW rozeti), **saldırı haritası** (kırmızı sıcak noktalar, ülke bayrak legendi), **Attack Volume** alan grafiği, **Top 10** kartları (gruplar/ülkeler/sektörler — tıklanır filtre linkleri).
- **Tarih düzeltmesi:** `discovered` (gerçek ISO datetime) kanonik yapıldı; `published` alanı API'de yok (kaldırıldı); her yerde relatif zaman ("about 6h ago"). Zaman aralığı filtreleri + before/after arama.
- **Kurban detay sayfası** (`/victims/[id]`): "Claimed — unverified" çerçeve, hızlı-bilgiler (grup, ülke, sektör, saldırı/ifşa tarihi, **fidye talebi**, veri boyutu), **grubun iddiası** (description — ne çaldıkları), **basın kapsamı** (gerçek haber linki), **infostealer maruziyeti** (ele geçen kullanıcı/çalışan + stealer aileleri), Adversary dossier pivotu.
- **Şema (migration 0007):** kurban tablosuna ransom, data_size, press_source, press_summary, infostealer eklendi. **Restart + Refresh gerekir** (mevcut satırlar upsert ile zenginleşir). Eksik-kolon (42703) da "hazır değil" sayılıp zarifçe boş dönülüyor (restart öncesi çökmez).
- **Ingest:** onConflictDoUpdate (mevcut satırlar tazelenir/zenginleşir), victimsAdded = before/after sayımı.
- Görsel `/preview-ransomware` fixture ile doğrulandı (silindi); tsc/eslint/build temiz.

### 2.18 Ransomware Tracker — bespoke yeniden tasarım + kategori filtreler (16 Eylül 2026)
Kullanıcı: "panel AI yapımı gibi + SOCRadar kopyası gibi (query kutusu birebir), query yerine kategori seçimi (ülke/grup/sektör) olsun." ui-ux-pro-max rehberiyle (brutalist/komuta-merkezi, asimetrik, yüksek kontrast, mono etiketler) yeniden tasarlandı.
- **AI/kopya hissi kırıldı:** "Ransomware Command" başlıklı asimetrik masthead + LIVE durum satırı; 3 eşit kart yerine **Bloomberg-terminali tarzı metrik rayı** (8 hairline-bölünmüş hücre); numaralı bölüm başlıkları (01/02/03 + mono uppercase + hairline rule); keskin köşeler (rounded-lg).
- **Query kutusu kaldırıldı → kategori filtre rayı** (`filter-rail.tsx`): Country/Group/Sector açılır menüleri + Window segment (30D/6M/1Y/ALL) + isim arama + aktif filtre çipleri (×). SOCRadar'ın query-syntax kutusu artık yok.
- **Faceted dashboard:** ülke/grup/sektör seçimi TÜM paneli süzer (metrik rayı, feed, harita, grafik, Top-10'lar) — `data.ts` fonksiyonları `Facets` alıyor. Bu, kaynaktan işlevsel olarak da farklı ve daha güçlü.
- Kaldırılan: `search-console.tsx`, `hero-stats.tsx` (yerine `metric-rail.tsx`). `filterOptions()` (ülke/sektör/grup seçenekleri). LiveFeed/AttackMap/AttackVolume/RankCard başlıkları mono-uppercase + keskin köşeye çekildi.
- Görsel `/preview-ransomware` fixture ile doğrulandı (silindi); tsc/eslint/build temiz.

### 2.19 Watchlist ↔ Ransomware + birleşik bildirim çanı (16 Eylül 2026)
Kullanıcı bir ransomware dilimini (ülke/sektör/grup ya da kombinasyonu) takibe alır; yeni kurban geldiğinde başlıktaki çana Facebook-tarzı bildirim düşer. Çan artık **birleşik** — hem Adversary hem Ransomware uyarıları tek yerde.
- **Şema (migration 0008):** `ransomware_watches` (userId + country/sector/groupSlug/groupName + label; boş dimensiyonlar "hepsi" demek), `ransomware_notifications` (userId+victimId unique, readAt). **Restart gerekir.**
- **Servis:** `src/lib/ransomware/watch.ts` — addWatch/removeWatch/removeWatchByFacets/watchExists/listWatches (+ eşleşen kurban sayısı & unread), `reconcile` (izlemeye uyan, watch tarihinden sonra keşfedilen yeni kurbanlara bildirim üretir), notificationsView, markAllRead. Hepsi tablo yokken zarifçe boş.
- **Birleşik feed:** `src/lib/notifications/feed.ts` (`BellItem`, adversary+ransomware'i birleştirir, her item kendi href'ini taşır). `src/app/app/notifications/actions.ts` `markAllNotificationsRead` ikisini birden okur. `notification-bell.tsx` genelleştirildi (kırmızı kurukafa=ransomware, mavi maske=adversary; ACTORS/RANSOMWARE kısayolları). `app-topbar.tsx` artık `notificationFeed` kullanıyor.
- **UI:** dashboard'da aktif filtre varken **"Watch this view"** barı; **grup detayda "Watch group"**; **`/app/modules/ransomware/watchlist`** sayfası (dilimler + eşleşme/unread + kaldır). Masthead'e Watchlist linki. `RansomwareWatchButton` (facet ile aç/kapa, optimistic).
- Görsel `/preview-watch2` fixture ile doğrulandı (silindi); tsc/eslint/build temiz.

### 2.20 Adversary — "Sana özel tehdit haritası" (Relevance) (16 Eylül 2026)
Şirket/birey sektör + ülke girer → onu en çok hedefleyecek aktörler skorlu ve **gerekçeli** sıralanır. Kurumsal satışın çıpası.
- **Ortak taksonomi:** `src/lib/intel/taxonomy.ts` (SECTORS ~20 + eş anlamlılar, COUNTRIES **~190 (tüm dünya, Azerbaycan/Türkiye dahil)** bölge kovalı gazetteer, REGION_PHRASES). Ransomware ile de paylaşılabilir.
- **Çıkarım:** `src/lib/adversaries/targeting.ts` — grubun `targets`+notes prozasını taksonomiyle tarar → yapısal {sectors, countries, regions, motivation, confidence}. Çalışma-anı memoize (build script yok, drift yok); ~15 meşhur gruba elle override. %58 grupta hedefleme metni var → confidence=low olanlar sıralamaya girmez (uydurma yok).
- **Skorlama:** `src/lib/adversaries/relevance.ts` — `score = 45×sektör + 30×coğrafya + 15×güncellik + 10×şiddet`, level (Critical/High/Moderate/Low), her aktörde açıklanabilir `reasons[]`. Ayrıca manzara özeti (menşei bölgeye göre, motivasyona göre, en sık malware) + top aktörlerin ortak ATT&CK teknikleri (`commonTechniques`).
- **Profil kalıcılığı (migration 0009):** `relevance_profiles` (scope user|org, ownerId, sectors, country). Kişisel profil org'u override eder. `relevance-store.ts` (getProfiles/saveProfile/clearProfile, tablo yoksa zarif). **Kaydetme için restart gerekir; anlık (URL param) skorlama restart'sız çalışır.**
- **UI:** `/app/modules/adversaries/relevance` — `RelevanceConsole` (sektör çipleri + ülke, "Save to my profile" / "Save for organization" / Clear, canlı URL param), manzara özet kartları, skorlu-gerekçeli `RankedActorCard` listesi, **"Watch top 10"** (toplu izleme → watchlist), ATT&CK teknik çipleri. Directory masthead'ine "Your threat landscape" linki + breadcrumb.
- Gerçek veriyle doğrulandı (US + Gov/Def/Tech/Health → 138 aktör, Lazarus 87 / Sofacy 78 / APT29 77…); `/preview-relevance` fixture silindi; tsc/eslint/build temiz.

### 2.21 Brand Protection modülü — lookalike/typosquat phishing tespiti (16 Eylül 2026)
Yeni modül: şirket kendi domainini girer, ona benzeyen sahte/phishing domainler tespit edilip uyarı gelir (CTI'daki "Brand Protection / Domain Protection"). Kullanıcı tam yetki verdi; **öncelik düşük false-positive, gerçek PoC'de rezil etmeyen sonuçlar.**
- **Motor (ücretsiz, ticari-uygun):** `src/lib/brand/permutations.ts` (dnstwist mantığı — typo/homoglif/TLD/keyword), `sources/ct.ts` (**Certificate Transparency / crt.sh** — kamu altyapısı, lisans tuzağı yok), `sources/dns.ts` (node DNS A+MX), `scan.ts` (skorlama + **precision kapısı**). `domain.ts` (registrable domain, Levenshtein).
- **Düşük-FP teknikleri:** yalnızca çözümlenen/sertifikalı/yüksek-benzerlikli adaylar tespit; markanın **kendi IP'sine** çözümlenenler (paypal.co.uk gibi) elenir; keyword sadece markaya EKLENEN kısımda aranır. **Gerçek test:** paypal.com→temiz typosquat listesi (kendi ccTLD'leri yok), perseonix.com→2 gerçek typo, github.com→hepsi gerçek. Tarama 3-7sn.
- **Şema (migration 0010):** `protected_assets` (org veya user sahipli), `phishing_detections` (kanıt + triyaj durumu), `brand_scans` (log), `brand_notifications` (per-user bell). **Restart gerekir.**
- **Servis:** `src/lib/brand/store.ts` (listAssets/addAsset/removeAsset/scanAsset/listDetections/brandStats/setDetectionStatus + notificationsView/markAllRead; tablo yoksa zarif). Self-service: org/user sahipliği.
- **Bell entegrasyonu:** birleşik feed'e `brand` türü eklendi (ShieldAlert, amber); `notificationFeed` artık user objesi alıyor; markAll üçünü birden okur.
- **UI:** `/app/modules/brand` — masthead + stat rayı + `AssetsPanel` (domain ekle/tara/kaldır) + `DetectionsPanel` (kanıt çipleri: resolves/MX/TLS/punycode/keyword/%match + triyaj New/Confirmed/Benign/Monitoring). **Phishing sitesine ASLA link verilmez** (güvenlik). Katalog `brand`/"Brand Protection" (sortOrder 50), sidebar `ShieldCheck`.
- Görsel `/preview-brand` + gerçek tarama `/preview-brand-scan` fixture'larıyla doğrulandı (silindi); tsc/eslint/build temiz.

### 2.22 Brand Protection — detay sayfası + PDF + zamanlayıcı + screenshot (16 Eylül 2026)
Kullanıcı geri bildirimi: (1) arayüz "AI gibi", (2) tespit satırına tıklayınca detay sayfası (aktif/pasif, screenshot, bilgi kaynağı, **PDF rapor** CERT'e), (3) zamanlayıcı (günde N kez + değişince çana uyarı).
- **Detay sayfası** `/app/modules/brand/detections/[id]` (bespoke): ACTIVE/OFFLINE/registered durumu, HIGH·risk rozeti, triyaj (New/Confirmed/Benign/Monitoring), **Risk evidence** (resolves/MX/TLS/punycode/keyword/%match + fact'ler), **Where this came from** (CT/DNS kaynağı, permutation class, cert issuer, first seen), **Sandbox screenshot** (Capture butonu), **Download PDF**. Liste satırındaki domain artık detaya link + offline rozeti.
- **PDF rapor** (`src/lib/brand/pdf.tsx`, Investigate PDF kit'i reuse): TLP:AMBER markalı tek-lookalike raporu (assessment/evidence/provenance/screenshot) — CERT/registrar'a göndermek için. Route `/detections/[id]/pdf`. Doğrulandı (24KB, geçerli %PDF).
- **Screenshot** (`screenshot-store.ts` + sandbox capture reuse): şüpheli siteyi izole sandbox'ta çeker (asla direkt ziyaret yok), `/detections/[id]/screenshot` servis eder. On-demand (Capture butonu), tarama yavaşlamaz.
- **Zamanlayıcı:** asset başına cadence (Manual / 4×gün / 2×gün / Daily), `scanIntervalHours` + `nextScanAt`. `AutoRunner` (client, dashboard açıkken 5dk'da bir due taramaları tetikler; canlıda cron ile tam otomatik). **Takedown tespiti:** rescan'de artık bulunmayan canlı domainler `offlineAt` ile OFFLINE işaretlenir. Yeni yüksek/orta tespit → çana uyarı (mevcut).
- **Şema (migration 0011):** assets +scan_interval_hours/next_scan_at, detections +screenshot_at/offline_at.
- Görsel `/preview-brand2` + PDF `/preview-brand-pdf` fixture'larıyla doğrulandı (silindi); tsc/eslint/build temiz. Dev server bu oturumda restart edildi → 0011 canlıda.

### 2.23 Brand Protection — tam arayüz yeniden tasarımı ("AI gibi" giderildi) (16 Eylül 2026)
Kullanıcı: müşteriler arayüzü "AI yapımı" bulduğu için TÜM modül arayüzü baştan. ui-ux-pro-max (brutalist/komuta, yoğunluk 9, asimetrik) + modüle özgü imza görsel.
- **İmza görsel — "Lookalike Radar"** (`lookalike-radar.tsx`, server SVG): korunan marka merkezde, tespit edilen sahte domainler şiddet halkalarında (high iç / medium / low dış) yörüngede; balon boyutu = risk, içi boş = offline; radar süpürme + ızgara. Noktalar tıklanınca detay sayfası.
- **Threat surface** (`threat-surface.tsx`): şiddet dağılımı + sinyal bar'ları (live/resolving, MX, TLS, punycode, offline) — operasyon okuması, tile yok.
- **Detected lookalikes** artık yoğun **tablo** (`detections-panel.tsx` yeniden): domain (link) · risk bar+skor · sinyaller (RES/MX/TLS/PUNY/KW yanık/sönük) · yaş · durum dropdown. Chip-yığını kaldırıldı.
- Dashboard: asimetrik masthead (WATCHING durum satırı) + radar/threat-surface hero + protected domains şeridi + tablo. Numaralı bölüm/çift başlık temizlendi.
- tsc/eslint/build temiz; `/preview-brand3` fixture ile doğrulandı (silindi).

### 2.24 Brand Protection — PDF rapor yeniden tasarımı (16 Eylül 2026)
Kullanıcı: PDF "berbat" (başlık alt satırla üst üste biniyordu, çok sade). `src/lib/brand/pdf.tsx` modern CERT raporu olarak baştan: koyu kapak bandı + logo + PERSEONIX + TLP:AMBER + "Lookalike Domain Report"; temiz başlık bloğu (overlap düzeldi, kit `s.titleBlock` kullanıldı); meta grid; 3 skor kartı (Risk /100, Email capability, TLS issuer); otomatik Executive summary; Risk indicators (token+facts); Provenance; **Recommended actions** (CERT takedown checklist: registrar/host, CA cert revocation, mail-gateway block, monitoring, delil saklama); opsiyonel screenshot; TLP footer + sayfa x/y. `qlmanage` ile rasterize edilip sayfa 1 görsel doğrulandı; tsc/eslint/build temiz.

### 2.25 Tasarım sistemi skill'i + anasayfa hero yeniden tasarımı (16 Eylül 2026)
- **`perseonix-design` skill'i** oluşturuldu (`~/.claude/skills/perseonix-design/SKILL.md`): tüm UI işlerinde otomatik uygulanan "enterprise XDR console" tasarım sistemi (token, tipografi, komuta-merkezi düzen dili, anti-pattern'ler, imza görsel ilkesi). Falcon-ayarında sakin/yoğun/koyu; kopya değil.
- **Anasayfa hero yeniden tasarlandı** (`hero.tsx` + yeni `hero-feed.tsx`): ortalanmış klasik SaaS hero → **asimetrik canlı konsol**: sol mono eyebrow + Orbitron başlık + CTA + "trusted across" mono satırı; sağda **Live Threat Intelligence** akış paneli (severity satırları + LIVE + mini stat rayı). "AI gibi" his kırıldı; müşteri girer girmez CTI konsolu hisseder.
- **Site faz 2 (tamam):** jenerik "See your perimeter" 6-kart gridi → **`modules-showcase.tsx`** (5 gerçek modülün bento vitrini; flagship Adversary tile'da `ActorOrbit` mini-SVG + modül başına renk kodu). `stats-band` → mono hairline metrik rayı. `page.tsx` güncellendi, eski `talos-platform.tsx` silindi. Tam sayfa doğrulandı.
- **Faz A (cila):** `intel-cycle.tsx` → numaralı yoğun pipeline (mono, sola hizalı). Kalan bölümler markaya uygun, dokunulmadı.
- **Faz B — ⌘K komut çubuğu (tamam):** `command-menu.tsx` (`CommandMenu` global palet — ⌘K/Ctrl+K veya `perseonix:open-command` eventiyle açılır; Workspace/Modules/Management grupları + dinamik "Search …" satırları ?q= ile yönlendirir; klavye navigasyonu; kullanıcının modüllerinden üretilir + `CommandTrigger` topbar butonu). `app/layout.tsx`'e mount edildi; topbar'daki dekoratif arama kutusu ⌘K tetikleyicisiyle değişti. Fixture ile doğrulandı; tsc/eslint/build temiz.
- **Konsol kiti primitifleri (tamam):** `src/components/console/` — `SeverityBadge` (+severityHex, tek severity sistemi), `DataTable<T>` (jenerik, severity spine + satır tıklama), `Drawer` (sağdan flyout). **Brand tespit tablosu referans olarak bunlara geçirildi**: satır → **Drawer quick-look** (SeverityBadge + kanıt + facts + triyaj + "Full report ↗/PDF") — Falcon liste→flyout→tam-sayfa akışı. Fixture ile doğrulandı; tsc/eslint/build temiz.
- **Benimseme (kademeli):** ransomware/adversary tabloları da DataTable+SeverityBadge+Drawer'a taşınabilir; modüle dokununca yap, toptan retrofit yok (regresyon riski).

### 2.26 Anasayfa hero — sinematik canlı saldırı haritası (16 Eylül 2026)
Kullanıcı: hero "CrowdStrike gibi animasyonlu/canlı" olsun istedi (önceki statik hero yetmedi). Eklenenler:
- **Canlı animasyonlu saldırı haritası** (`src/lib/marketing/attack-map.ts` geometri + `attack-map.tsx` SVG): d3-geo dünya + şehirler arası **uçan saldırı yayları** (SMIL animateMotion ile hareketli paketler), **nabız atan düğümler**, **radar süpürme** (CSS spin). JS'siz, sonsuz döngü, aria-hidden. Hero'da arkaplan.
- **Animasyonlu sayaçlar** (`count-up.tsx`, client, IntersectionObserver + rAF, reduced-motion saygılı): 3.8B+ / 240+ / 1,600+ / 146.
- Hero yeniden düzenlendi: sinematik harita bg + sol başlık/CTA + sayaç rayı + sağda Live Threat Intelligence akışı. tsc/eslint/build temiz.

## 3. Alınan kararlar

| Karar | Gerekçe |
| --- | --- |
| Tailwind v4 CSS-first config, `tailwind.config.ts` yok | v4'ün resmi yöntemi. |
| PostgreSQL + Drizzle, yerelde PGlite | SaaS standardı; canlıda şema aynen kalır. |
| Kendi oturum sistemi | Tam kontrol, Next.js resmi rehber deseni. |
| Organizasyon = müşteri şirketi; modüller kullanıcı bazında; koltuk limiti | Net lisans takibi. |
| POC bitince erişim kesilir, lisans bitince sadece uyarı | Ödeyen müşteriyi yanlışlıkla kilitlememek. |
| Şifreyi sunucu üretir, bir kez gösterilir | Güçlü şifre, düz metin saklanmaz. |
| Logo PNG yerine elle çizilmiş SVG | Keskin, animasyonlanabilir, "AI görseli" hissi yok. |
| Investigation için hibrit kaynak (bütçe 0) | Ücretsiz ve ticari kullanıma açık kaynaklarla hemen çalışır; ücretli kaynaklar anahtar gelince kendiliğinden açılır. |
| urlscan taramaları **her zaman private** | Müşterinin incelediği adresler herkese açık listelenmez. |
| Canlı kontrol script çalıştırmaz; script'ler yalnızca izole sandbox tarayıcısında çalışır | Ekran görüntüsü için urlscan'e (ticari lisans) gerek kalmadı. |
| Sandbox trafiği, kimlik doğrulamalı yerel bir proxy'den geçer | Sayfa JavaScript'i iç ağa, metadata servisine veya uygulamanın kendisine ulaşamaz; DNS rebinding olmaz. |
| Shodan CVE'leri "medium" (şüpheli değil) | Sürüm tahminine dayalı, doğrulanmamış; yanlış alarmı önler. |
| Shodan anahtarı yalnızca `.env.local`'de | Koda/git'e girmez. |
| VirusTotal'a hiçbir şey gönderilmez, sadece mevcut analiz okunur | Müşterinin araştırdığı adres VirusTotal topluluğuyla paylaşılmaz. |
| URL VirusTotal'da yoksa host'unun itibarı gösterilir | Çoğu URL hiç taranmamıştır; alan adı/IP yine de fikir verir. |
| Alan adının IP'si AbuseIPDB'de kötü çıksa bile en fazla "medium" | Paylaşımlı hosting/CDN IP'leri başka sitelerin raporlarını taşır. |
| AbuseIPDB rapor yorumları gösterilmez | Doğrulanmamış serbest metin; başka kurbanların bilgisini içerebilir. |
| Karar kuralı sabit ve raporda görünür | Müşteri kararın nedenini görür; "kara kutu" yok. |
| Harita, tile servisi yerine sunucuda SVG olarak çizilir (Natural Earth sınırları) | Araştırılan konumlar üçüncü taraf harita servislerine gitmez; lisans ve ücret yok. |
| Konum verisi RIPEstat üzerinden GeoLite2 (anahtarsız) | Geliştirme için ücretsiz; ticari kullanım RIPE NCC izni ister, canlıda DB-IP Lite'a geçilecek. |
| PDF, sunucuda @react-pdf/renderer ile üretilir (Chromium yok) | Hafif ve hızlı (~0,6 sn), sunucuya tarayıcı kurmak gerekmez. Harita PDF'e de vektör olarak çizilir. |
| PDF'te beyaz zemin, marka rengi vurgular, TLP:AMBER işareti | Yazdırılabilir ve kurumsal CTI raporu standardına uygun. |

---

## 4. Güvenlik kuralları (davranış özeti)

- Admin kendi rolünü düşüremez, hesabını kapatamaz/silemez; son aktif admin kaldırılamaz (kilitli transaction).
- Kullanıcı silmek için e-posta onayı; müşteri yalnızca kullanıcısı yoksa silinebilir.
- Tüm admin işlemleri ve girişler audit log'a yazılır.
- Investigation: iç ağa/iç IP'lere istek atılmaz; dış kaynak hata mesajları müşteriye güvenli biçimde gösterilir; API anahtarları tarayıcıya ulaşmaz.

---

## 5. Doğrulama durumu

- ✅ TypeScript, ESLint, production build temiz.
- ✅ Birim testleri (şifre, doğrulama, plan, POC kuralı, şifre üretici) ve **Investigation entegrasyon testleri** gerçek kaynaklarla (github.com, 8.8.8.8, URL, 8 geçersiz girdi, SSRF denemesi) — geçici olarak çalıştırıldı, **repoda test paketi yok**.
- ⚠️ Asistan tarafından görsel olarak doğrulanamayanlar (giriş gerektirir): temalar, sidebar logosu, Investigation sayfalarının görünümü.

---

## 6. Bilinen sınırlamalar ve lisans notları

- **Lisans:**
  - **urlscan.io** — ticari kullanım (müşterilere sunmak) için yazılı onay / ticari plan gerekir (Automate: yıllık 5.000 $).
  - **Shodan** — şartların 6.5. maddesi: ayrı yazılı anlaşma olmadan servis "çoğaltılamaz, satılamaz, yeniden satılamaz". Mevcut "dev" planı iç kullanım içindir; **müşterilere Shodan verisi göstermeden önce Shodan ile ticari anlaşma yapılmalı**.
  - **VirusTotal** — ücretsiz Public API "ticari ürün veya hizmetlerde kullanılamaz"; dakikada 4, günde 500 sorgu. Satış için Premium API gerekir.
  - **AbuseIPDB** — "ücretsiz planlar ticari amaçla kullanılamaz"; günde 1.000 sorgu. Satış için ücretli plan gerekir.
  - **abuse.ch (URLhaus, ThreatFox, MalwareBazaar)** — ücretsiz erişim sadece kâr amacı gütmeyen kullanım için; ticari kullanım Spamhaus üzerinden ücretli abonelik ister.
  - **RIPEstat** (harita konum verisi) — ticari kullanım RIPE NCC'nin yazılı iznini gerektirir. Canlıya çıkmadan önce DB-IP City Lite'a geçilmeli (CC BY 4.0, ticari kullanım serbest, "IP Geolocation by DB-IP" atfı gerekli).
- **Güvenlik:** Shodan, VirusTotal ve AbuseIPDB anahtarları sohbette paylaşıldı → üçü de hesaplardan **yenilenmeli (regenerate)** ve yeni anahtarlar `.env.local`'e yazılmalı.
- Kota sayaçları sunucu belleğinde tutulur; sunucu yeniden başlarsa sıfırlanır. Birden fazla sunucuya geçince veritabanına taşınmalı.
- **Sandbox:**
  - Gerçek bir tarayıcıda zararlı sayfalar açılıyor. Canlıda uygulama (veya ayrı bir yakalama sunucusu) iç ağdan izole bir makinede çalışmalı.
  - Tarayıcı motoru ayrıca kurulmalı: `npx playwright-core install chromium-headless-shell`.
  - Ekran görüntüleri `.data/captures/` klasöründe tutulur. Müşteri silinince dosyalar kalıyor; ileride temizlik işi eklenmeli.
  - Sandbox, çalıştığı ağın gördüğünü görür. Örneğin geliştirme ağındaki Fortinet güvenlik duvarı EICAR test sayfasını engelledi.
- Yer tutucu pazarlama içeriği (`src/content/site.ts`); araştırma/dark web bölümleri için karar bekliyor.
- ASM modül sayfası ve `/app` genel bakış boş kartlar.
- Git deposu yok; e-posta gönderimi, "şifremi unuttum", MFA yok.
- PGlite tek süreçlidir: aynı `.data/pglite` üzerinde iki sunucu çalıştırılmamalı.

---

## 7. Sonraki adımlar (önerilen sıra)

1. **Dev sunucusunu yeniden başlatmak** (terminalde Ctrl+C → `npm run dev`) — `0003` migration'ı ve Shodan anahtarı ancak böyle devreye girer.
2. **Shodan, VirusTotal ve AbuseIPDB anahtarlarını yenilemek** ve lisansları netleştirmek (Shodan, VirusTotal Premium, AbuseIPDB ücretli plan, urlscan ticari anlaşması).
3. **Git:** `git init` + ilk commit.
4. abuse.ch anahtarı sadece iç test için alınabilir (`ABUSECH_AUTH_KEY`); müşterilere sunmak Spamhaus aboneliği ister.
5. Investigation sayfalarını ve temaları gözden geçirip geri bildirim vermek.
6. **ASM modülü:** varlık envanteri, açık servisler (Shodan verisiyle), bulgular, exposure skoru.
7. Pazarlama sitesine ikinci modülü (Threat Investigation) eklemek; yer tutucu içeriği gerçek verilerle değiştirmek.
8. **Canlıya çıkış:** barındırılan Postgres, `APP_URL`, `TRUSTED_PROXY_COUNT`, HTTPS.
9. **Hesap güvenliği:** MFA, şifremi unuttum, e-posta ile giriş bilgisi gönderimi.
10. **Testler:** Vitest + Playwright repoya.

---

## 8. Hızlı başvuru

```bash
cd ~/Desktop/Perseonix/perseonix-ui
npm run dev          # http://localhost:3000
npm run db:generate  # şema değişince migration üret
```

| Yol | İçerik |
| --- | --- |
| `src/content/site.ts` | Pazarlama metinleri ve yer tutucu veriler |
| `src/app/globals.css` | Renk token'ları, temalar, animasyonlar |
| `src/components/brand/logo.tsx` | Şahin logosu (SVG) + wordmark |
| `src/db/schema.ts` · `drizzle/` | Veritabanı şeması ve migration'lar |
| `src/lib/auth/` | Şifre, oturum, DAL, giriş kilidi |
| `src/lib/investigate/` | Investigation motoru: hedef ayrıştırma, SSRF koruması, kaynaklar, bulgu motoru |
| `src/app/app/modules/investigate/` | Investigation sayfaları, action ve route'lar |
| `src/app/app/admin/` | Yönetim konsolu |
| `.env.local` | Yerel ortam değişkenleri ve anahtarlar (**git'e girmez**) |
