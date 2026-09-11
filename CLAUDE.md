# CLAUDE.md — EmlakAI

> Repo kök dizinindedir; Claude Code her oturum başında otomatik okur.

## Proje
EmlakAI: **yapay zekâ destekli, iki segmentli ilan platformu** — taşınmaz
(`segment: "emlak"`) + araç (`segment: "vasita"`), her ikisi satılık/kiralık.
Çok sayfalı statik site: saf HTML + CSS + Vanilla JS, bağımlılıksız Node statik
sunucu (`server.js`, Railway uyumlu). AI özellikleri istemcide çalışır; sunucu
üyelik/ilan API'si ve SEO ön işlemesi yapar.
TASARIM: ana sayfa **premium keşif + portal** kurgusudur — güçlü hero ve doğal
dil araması, ardından ilan vitrinleri (son eklenenler, AI seçkisi, fırsatlar,
fiyat düşüşleri, koleksiyonlar) ve portal blokları (kategori ağacı, bölge
kartları, popüler aramalar). Eski "Google sadeliği" ilkesi bırakılmıştır.

Sayfalar (kök dizinde):
`index.html` (premium hero + doğal dil arama + keşif vitrinleri `home.js` ile;
ARDINDAN portal blokları: `#statStrip` istatistik şeridi, `#catTree` sayaçlı
kategori ağacı (SEO rotalarına bağlanır), `#regionGrid` bölge kartları,
`#popularTags` popüler aramalar — bunları `app.js pageIndex()` doldurur ve
sunucu `renderHomeHtml()` ile bot görünümüne basar) · `ilanlar.html`
(segment seçicili filtreli liste; `?q=` doğal dil sorgusunu da ayrıştırır;
araçta marka/model/yıl/km/yakıt/vites filtreleri; sayfa başına 24 ilan +
`.pager` sayfalama — filtre/sıralama değişince 1. sayfaya döner) · `ilan.html?id=`
(detay: açıklama, değerleme bandı, trend (yalnız emlak), benzer ilanlar,
konut/taşıt kredisi, fiyat düştüyse `.price-drop` rozeti, sunucu varken
"Satıcıya Mesaj Gönder" formu; dinamik canonical + JSON-LD) · `ilan-ver.html`
(segment seçimli form; AI fiyat önerisi + AI başlık/açıklama yazarı + fotoğraf
yükleme + ⭐ öne çıkarma; sunucu varken ÜYELİK ister — giriş yoksa
`#ilanVerGate` üyelik kapısı gösterilir) ·
`giris.html` (üye girişi + ücretsiz kayıt; `?next=` ile geri dönüş, `?kayit=1`
kayıt sekmesini açar) · `hesap.html` (Hesabım: ilanlarım · mesajlarım · profil/şifre;
noindex + robots'ta engelli) ·
`degerleme.html` (AI değerleme: taşınmaz + araç, kredi) · `asistan.html` (EVA) ·
`rehber.html` (SSS/rehber, FAQPage JSON-LD — elle yazılır) ·
`bolge-fiyatlari.html` (ÜRETİLİR, elle düzenlenmez) · `favoriler.html` ·
`magaza.html?u=<uid>` (satıcı mağaza profili — ilanları, istatistikleri,
iletişimi; sunucuda ön işlenir, sitemap'te) ·
`404.html` · `admin.html` (yönetim paneli — menüde YOK, robots'ta engelli,
noindex; yalnızca sunucu API'si varken çalışır).
Nav menü SADE tutulur (5 öğe): Ana Sayfa · İlanlar · Değerleme · Favoriler ·
İlan Ver. Oturum bağlantısı ("Giriş Yap" / "👤 Ad") sayfalara ELLE eklenmez —
`app.js` `injectAuthLink()` her sayfada nav'a enjekte eder. İkincil sayfalar (Bölge Fiyatları · Rehber · AI Asistan) footer'daki
`.footer-links` bloğundadır; asistana ayrıca her sayfadaki FAB düğmesi götürür.
Nav/footer değişince TÜM sayfalarda + `build-seo.js` iskeletinde güncelle.

## KATEGORİ OMURGASI — SEO rotaları (server.js)
Uzantısız tek segmentli adresler kategori/lokasyon sayfasıdır:
`/manavgat-satilik-villa`, `/antalya-kiralik-daire`, `/satilik-arsa`, `/antalya`.
- `parseSeoSlug()` slug'ı şehir/ilçe/tür/kategori/segment parçalarına ayırır
  (sıra önemsiz, tanınmayan parça varsa SEO sayfası değildir → 404'e düşer).
- `seoSlugOf()` kanonik biçimi üretir (`ilce-kategori-tur`); farklı sıralı slug
  **301** ile kanoniğe yönlenir — tek adres kuralı.
- Sayfa metni VERİDEN üretilir (`seoPageTexts`): ilan sayısı, medyan fiyat,
  ortalama ₺/m², ilçe piyasa ortalaması, kira tahmini, şehir değer eğilimi →
  her sayfa özgün içerik. H1 ve giriş paragrafı ilanlar.html'e basılır.
- İstemci aynı filtreleri `<meta name="ea-filters">` üzerinden alır (CSP satır
  içi script'e izin vermez — başka yol arama).
- `seoRouteList()` yalnız İLANI OLAN kombinasyonları üretir (ince sayfa yok);
  sitemap'e ve sayfa altındaki "popüler kategoriler" iç bağlantı bloğuna girer.

## SEO / AEO — sunucu ön işlemesi (BOTLAR JS ÇALIŞTIRMAZ)
`server.js` iki sayfayı yayınlamadan önce DOLDURUR — arama motorları ve AI
tarayıcıları içeriği JS'siz görür; tarayıcıda `app.js` aynı alanları yeniden çizer:
- `/ilan.html?id=` → başlık/description/canonical/OG ilana göre yazılır,
  `#detailRoot` içine okunabilir tam içerik (h1, fiyat, foto, açıklama, künye)
  basılır, Product+RealEstateListing (araçta Car) ve BreadcrumbList JSON-LD
  `data-sld` ile eklenir. `app.js` `hasServerLd()` görünce AYNI şemayı tekrar
  enjekte etmez.
- `/ilanlar.html` → yayındaki ilanların statik kart listesi + ItemList JSON-LD +
  ilan sayısını içeren başlık/description.
- `/magaza.html?u=` → satıcı adı, tipi (ofis/bireysel), ilan kartları ve
  RealEstateAgent/Person JSON-LD basılır; `/api/seller?u=` herkese açık profil
  verir (e-posta ASLA dönmez).
- `/` (ana sayfa) → `renderHomeHtml()`: son eklenenler (`#latestTrack`),
  AI seçkisi (`#aiPicksGrid`), fırsatlar (`#dealGrid`), fiyatı düşenler
  (`#dropGrid`) ile portal blokları (`#statStrip`, `#catGrid`, `#regionGrid`)
  doldurulur + ItemList JSON-LD. AI blokları için `assets/ai.js` NODE'DA da
  yüklenir (priceBadge/rank sunucuda çalışır).
  DİKKAT: bu kapsayıcılar iskelet kutusu (`home-skeleton`) içerir; doldurma
  kalıbı TAM olarak onları eşleştirir — tembel `[\s\S]*?` ilk `</div>`'i
  yakalayıp markup'ı bozar (bir kez düştük).
- `/llms.txt` canlı yayındaki ilan listesini de ekler (AEO).
- `/sitemap.xml` ilan URL'lerine `image:image` girdileri ekler (görsel arama).

## AEO — YAPAY ZEKÂ MOTORLARINDA GÖRÜNÜRLÜK (ChatGPT, Perplexity, Gemini…)
Yanıt motorları JS çalıştırmaz, SORUYA DOĞRUDAN CEVAP veren ve SAYI içeren
metinleri alıntılar. Bu yüzden:
- **Kurum + WebSite şeması artık SUNUCUDA statik basılır** (`siteJsonLd()`),
  ve TÜM `.html` sayfaları `sendHtml()`'den geçer — eskiden yalnız `app.js`
  enjekte ediyordu, yani botlar hiç görmüyordu. Şema `RealEstateAgent` olup
  `areaServed` (config'teki şehirler) ve `knowsAbout` alanlarını taşır.
  İstemci `hasServerLd()` görünce aynısını TEKRAR EKLEMEZ.
- **Kategori/bölge sayfalarında veriden üretilen SSS** (`seoFaq()`): fiyat,
  m², kira getirisi, amortisman, en uygun ilan, ücret politikası. Metin hem
  sayfada görünür hem `FAQPage` JSON-LD olarak basılır — İKİSİ AYNI METİNDİR.
  Sayısal gerçekler `seoStats()` tek kaynağından gelir (giriş paragrafı da
  oradan beslenir; çelişki çıkmaz). Ayrıca `CollectionPage` + `dateModified`
  ile tazelik sinyali verilir.
- **`/llms-full.txt`** (sunucuda canlı, `llmsFullTxt()`; statik yedeği
  `build-seo.js` üretir): site tanıtımı, SSS cevapları, ilçe bazlı m² fiyat
  tablosu ve yayındaki TÜM ilanların künyesi — alıntılanmaya hazır düz metin.
- **`/veri/ilanlar.json`**: yayındaki ilanların makine okunur akışı (CORS açık,
  yalnız herkese açık alanlar). `llms.txt` ve `robots.txt` buna işaret eder.
- **robots.txt** AI tarayıcılarını tek tek karşılar (`AI_BOTS` listesi:
  GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended, Applebot,
  Bingbot, DuckAssistBot, meta-externalagent, Amazonbot…). Bot engellenirse
  yanıtlarda kaynak gösterilemez — listeyi daraltma.
KURAL: Yeni bir sayı/iddia eklerken önce veriden hesapla; AEO metinleri
uydurma bilgi TAŞIMAZ (yanlış alıntı itibar kaybettirir).
Yeni bir sayfayı ön işlersen `sendHtml()` üzerinden gönder (CSP/HSTS başlıkları
orada).

## SEO / AEO — `build-seo.js`
`bolge-fiyatlari.html`, `sitemap.xml`, `robots.txt`, `llms.txt` bu betikle
`assets/config.js`'ten ÜRETİLİR (elle düzenleme; kaynak değişince
`npm run build` çalıştırıp çıktıyı da commit'le — `npm start` de önce build
çalıştırır). ALAN ADI TEK KAYNAKTAN: `config.seo.siteUrl` (şu an Railway adresi) değişince
`npm run build` TÜM statik sayfaların `canonical`, `og:url`, `og:image` ve elle
yazılmış JSON-LD `"item"` adreslerini yeniden yazar — HTML'lerde adres ELLE
düzeltilmez. JSON-LD:
Organization + WebSite(SearchAction) `app.js`'ten enjekte edilir; FAQPage
`rehber.html`'de statik; Dataset build ile üretilir. OG görseli:
`assets/img/og.png` (1200×630).

## TEK DOĞRU KAYNAK — `assets/config.js`
Marka, iletişim, şehir/ilçe m² piyasa fiyatları, araç marka/model taban
fiyatları ve amortisman eğrisi (`config.vehicles`), değerleme katsayıları,
kredi varsayılanları (konut + taşıt) YALNIZCA burada. Sayfalara/JS'e sayı
gömme; değişiklik = config.

### KATEGORİ AĞACI: 3 segment · 37 tür (`config.segments`)
Segmentler: **emlak** · **vasita** · **diger**. Her segment gruplara, gruplar
türlere ayrılır; `data.js` KINDS'ı bu ağaçtan üretir, form/filtre optgroup'ları
`D.groupsOf(segment)` ile çizilir. Yeni tür = yalnız config'e satır ekle.
- `fields`: emlak → m²/oda/yaş/özellikler · vasita → marka/model/yıl/km ·
  **diger → sade** (başlık, açıklama, fiyat, konum, fotoğraf).
- `valuation: false` olan türde (tüm "diger" türleri) AI DEĞERLEME YAPILMAZ:
  `estimate()` null döner, fiyat etiketi/AI analizi/kredi kutusu ve AI fiyat
  önerisi düğmesi gizlenir, `describe()` sade metin üretir. Ana sayfadaki AI
  vitrinleri (seçki, fırsatlar, günün önerisi) "diger" ilanlarını ALMAZ; son
  eklenenler ve kategori sayfalarında görünürler.
- ARSA/ARAZİ (`arsa`, `tarla`, `bagbahce` — ai.js `LAND_KINDS`, app.js `LAND`):
  oda/yaş/ısıtma sorulmaz; kira getirisi hesaplanmaz. Birim fiyat parsel
  büyüdükçe düşer (`config.valuation.landSize`: refArea 1000 m², decay 0.35) —
  yoksa 5 dönüm tarla, daire m² fiyatıyla çarpılıp saçma değer veriyordu.
- Kategori kartları listesi `app.js pageIndex()` ve `server.js renderHomeHtml`
  içinde AYNI dizidir — birini değiştirirsen diğerini de değiştir. "diger"
  türlerinde kart başlığına "Satılık/Kiralık" öneki YAZILMAZ.

### TÜRE ÖZEL İLAN ALANLARI (`config.fieldDefs` + grup `fields`)
Arsada ada/parsel/pafta/imar/KAKS/gabari, konutta kat/ısıtma/aidat/kullanım
durumu, araçta renk/kasa/motor/hasar kaydı sorulur. Tanım TEK YERDE:
`config.fieldDefs` (label + type: select|text|number|bool) ve hangi türün hangi
alanları sorduğu `config.segments` içindeki grup `fields` dizisi.
- Form (`ilan-ver.html` `#kindFields`) ve düzenleme penceresi (`#eKindFields`)
  bunları `renderKindFields()` ile çizer, `collectKindFields()` ile toplar.
  Boş bırakılan alan YAZILMAZ; bool alanlar "Var/Yok" açılır listesidir.
- İlanda `details` nesnesinde saklanır. `data.js normalizeDetails()` bir GÜVEN
  SINIRIDIR: tanımsız anahtar, seçenek dışı değer, aşırı uzun metin ATILIR.
- Künye hem istemcide hem sunucuda `details`i etiketiyle listeler.
- Köprüler: `katNo` → değerlemedeki `floorPos` (`floorPosOf()`), `binaKat` →
  `totalFloors`, `banyoSayisi` → `bath`, `isitma` → `heating`. Yeni bir alan
  değerlemeyi etkileyecekse köprüyü de ekle.
- Arsa/arazide oda ve bina yaşı alanları GİZLENİR, m² etiketi "Yüz Ölçümü" olur.
- Balkon/Eşyalı/Site İçi "Özellikler" kutucuklarındadır; `fieldDefs`'te TEKRAR
  ETME (bir dönem iki yerde birden vardı).
- DÜZELTİLEN HATA: `data.js num()` boş değeri 0'a çeviriyordu (`+null === 0`) —
  belirtilmemiş bina yaşı "Sıfır bina" olarak yayınlanıyor ve değerlemeye sıfır
  bina katsayısı uygulanıyordu. Artık boş → null.

### Piyasa verisi: 81 İL · 474 ilçe (`config.market.cities`)
Tüm Türkiye kapsanır; değerler bölgesel ORTALAMA tahminidir (dönem
`config.seo.dataDate`). Bu tek tablo şunları besler: AI değerleme, fiyat
etiketi, kira/amortisman hesapları, `bolge-fiyatlari.html`, SEO kategori
sayfaları, SSS metinleri ve llms dosyaları. Fiyat güncellemesi = burayı
düzenle + `npm run build` + çıktıyı commit'le.
**ÇAKIŞAN İLÇE ADI TUZAĞI:** "Merkez" 51 ilde, ayrıca Gölbaşı · Edremit ·
Yenişehir · Ereğli iki ilde geçer. Bu yüzden:
- `DISTRICT_SLUGS` her slug için DİZİ tutar; `districtAmbiguous()` çakışmayı
  söyler. Kanonik adres çakışanlarda İL'i de taşır
  (`/sivas-merkez-satilik-daire`), çakışmayanda taşımaz (`/manavgat-...`).
- `parseSeoSlug()` önce İL'i okur; çakışan ilçe adı il olmadan gelirse sayfa
  ÜRETİLMEZ (404) — yanlış şehrin sayfasını açmaktansa doğrusu budur.
- `ai.js parseQuery()` aynı kuralı uygular: çakışan ilçe adı ancak il de
  yazılmışsa kabul edilir ("gölbaşı satılık villa" → il/ilçe boş).
- Ana sayfa bölge kartları (hem `app.js` hem `renderHomeHtml`) aynı kanonik
  slug'ı üretir — birini değiştirirsen diğerini de değiştir.

## Dosya mimarisi
- `assets/config.js` — konfig (yukarıda).
- `assets/data.js`   — ilan veri katmanı (`EMLAK.data`): demo/örnek ilan
  ÜRETİLMEZ, geri ekleme. İki gerçek kaynak: `REAL[]` (repoya işlenen gerçek
  ilanlar — herkese görünür; yeni ilan = listeye ekle + `npm run build` +
  commit) ve localStorage `emlakai.userListings` (yalnız o cihaz). localStorage
  bir GÜVEN SINIRIDIR: `normalizeListing` okurken her kaydı doğrular (tipler,
  fotoğraf beyaz listesi `SAFE_PHOTO`), tahrif edilmiş veriyi zararsız kılar.
  Fotoğraflar `assets/img/ilanlar/` altında ya da sunucunun yazdığı `u/<dosya>`
  yolunda (`SAFE_PHOTO` üç biçimi kabul eder: base64 · assets/img · u/).
  İlana özel `phone` alanı ara/WhatsApp düğmelerini o numaraya yönlendirir;
  `locality`, `m2Net`, `dues`, `deed`, `swap`, `creditOk`, `kitchen` isteğe
  bağlı alanlar detayda gösterilir. `views`/`favCount` taban sayılardır; detay
  sayfası üzerine cihaz içi sayaç ekler (localStorage `emlakai.views`).
  Şehir/tür/marka yardımcıları (`brands`, `modelsOf`).
- `assets/ai.js`     — AI motoru (`EMLAK.ai`): doğal dil arama (parseQuery),
  değerleme (estimate), fiyat etiketi (priceBadge), **analyze** (ilan analizi),
  açıklama üretimi (describe), benzer ilan (similar), sohbet (chat), kredi
  (mortgage), trend, öne çıkan sıralama (rank).
  - `parseQuery` şunları çıkarır: kategori/tür/şehir/ilçe/oda (+`minRooms`
    "3+1 ve üstü"), fiyat (alt/üst/aralık), m² (alt/üst/aralık), bina yaşı
    ("5 yaşından yeni"), ÖZELLİK LİSTESİ (`features[]`, eş anlamlılarla:
    asansör/otopark/eşyalı/site içi…), `creditOk`, `swap`, araç alanları ve
    SIRALAMA niyeti (`sort`: price-asc/price-desc/new/ai/m2).
    TUZAK: fiyat ayrıştırmadan önce m²/km/oda/model kalıpları sorgudan
    çıkarılır (`qp`) — yoksa "120 m2 üzeri" fiyat sanılır.
  - `estimate` ayrıca `rentMonthly`, `yieldPct`, `paybackYears` döndürür.
  - `analyze(l)` → `{summary, pros[], cons[], notes[], est, badge}`; ilan
    detayındaki `.ai-analysis` kutusunu besler (₺/m² ilçe kıyası, yaş, tapu,
    kira getirisi, amortisman).
  - `chat` site bilgisi niyetlerini de yanıtlar (üyelik, onay süreci, fotoğraf
    kuralları, güvenlik, favoriler, bölge fiyatları, kira getirisi).
- `assets/app.js`    — arayüz; sayfa yönlendirmesi `<body data-page="...">`.
  İlan listesinde: aktif filtre çipleri (`#activeChips`, tek tek kaldırılır),
  "🔔 Aramayı Kaydet" (üye girişinde görünür), "son gezdiğiniz ilanlar"
  (localStorage `emlakai.recent`, 8 kayıt). Detayda: fiyat geçmişi grafiği
  (`priceHistory` varsa), satıcının diğer ilanları ve mağaza bağlantısı.
- `assets/style.css` — tasarım sistemi (CSS değişkenleri, açık/koyu tema).
  **PALET TEK KAYNAKTAN**: renkler yalnız `:root` (açık) ve
  `html[data-theme="dark"]` bloklarındadır — şu anki palet *Kum + Siyah*
  (zemin #f2ede4, metin/vurgu #1a1a1a, altın detay #b08d3f). Açık paletin
  sabitleri ayrıca `--l-*` olarak saklanır; ana sayfa **koyu temada da**
  bu `--l-*` değerlerini kullanır (kullanıcı tercihi, `home.css` sonunda).
  Sayfalara/`home.css`'e sabit renk (hex) YAZMA — `var(--…)` ve
  `color-mix(in srgb, var(--…) …)` kullan; renk değişimi tek satırdan olsun.
  Portal stilleri: `.hero-portal`, `.stat-strip`, `.portal-layout`, `.cat-tree`,
  `.portal-sec`, `.region-grid`, `.tool-grid`.
- `.reveal` animasyonu: `observeReveals()` gözlemci yoksa içeriği doğrudan
  gösterir ve 1,2 sn sonra ekrana yakın kalanları açar — animasyon takılsa bile
  içerik GİZLİ KALMAZ.
- Görseller: dış görsel YOK; kartlar `thumbSVG()` ile üretilen SVG yer tutucu
  kullanır. Dış siteden hotlink YAPMA (egress kısıtı).
- GÖRSEL KIRPMA KURALI: boyut/kırpma yalnız CSS'ten gelir, `thumbHTML()`
  satır içi stil YAZMAZ. Kart vitrininde `.card .thumb` 16:10 kutudur ve
  görsel mutlak konumlanıp `cover` ile kırpılır (dikey foto kartı uzatmaz);
  ilan detayındaki `.gallery img` ise `contain` — fotoğrafın TAMAMI görünür,
  kenarları kırpılmaz, artan yer yumuşak zeminle doldurulur.

## Konvansiyonlar
- Sayfa linkleri `.html` uzantılı (GitHub Pages uyumu).
- Tema/mobil menü/favori sayacı `app.js` `initChrome()` ile; iletişim
  `data-c-tel` / `data-c-mail` / `data-c-addr` öznitelikleriyle enjekte edilir.
- Yeni AI özelliği eklerken katsayıları `config.js`'e koy, koda gömme.
- localStorage anahtarları `emlakai.` önekiyle başlar.

## Fotoğraf yükleme + DEPOLAMA KOTASI (config.upload — TEK KAYNAK)
Adet/biçim/boyut kuralları `config.upload`'tadır (maxPhotos, accept, maxFileMB,
maxWidth, quality, targetKB, minQuality, preferWebp, maxStoredKB, `quota`);
`app.js` ve `server.js` AYNI değerleri okur.
- KÜÇÜLTME (istemci, `resizePhoto`): destekleniyorsa **WebP** üretilir
  (JPEG'e göre çok daha küçük); dosya `targetKB` altına inene kadar önce
  kalite `minQuality`'ye kadar düşürülür, sonra genişlik %20 azaltılır
  (en fazla 3 tur, 900px'in altına inilmez). 4 MP'lik bir fotoğraf ~300 KB olur.
- KOTA ÜÇ KATMANDIR (`config.upload.quota`, hepsi SUNUCUDA zorlanır —
  istemci yalnızca erken uyarır): fotoğraf başına `maxStoredKB`, ilan başına
  `perListingMB`, üye başına `perUserMB`, site toplamı `totalGB`. Aşan fotoğraf
  YAZILMAZ; `photoWarning` ile sebebi kullanıcıya söylenir (ilanKota/uyeKota/depo).
- Depo defteri: `PHOTO_SIZES` (dosya→bayt) + `USAGE_BYTES` açılışta
  `scanUploads()` ile kurulur, her yazma/silmede güncellenir — her istekte disk
  taranmaz. `sweepOrphanPhotos()` açılışta hiçbir ilana bağlı olmayan (24 saatten
  eski) dosyaları siler. Üye kotası `userPhotoBytes(uid)` ile ilanlardan hesaplanır.
- İstek gövdesi sınırı `BODY_PHOTOS` = kota kadar (~8 MB) — sabit 16 MB değil.
- Panel: `/api/admin/listings` yanıtındaki `storage` alanı doluluk çubuğunu,
  eşik uyarısını (`warnPct`) ve en çok yer kaplayan üyeleri gösterir; üye kendi
  alanını `hesap.html` istatistiklerinde görür (`/api/my/listings` → `storage`).
- **CSP TUZAĞI (tekrar düşme):** sunucu `img-src 'self' data:` gönderir, bu
  yüzden `URL.createObjectURL()` (blob:) ile görsel ÇÖZÜLEMEZ. `decodeImage()`
  önce `createImageBitmap`, olmazsa FileReader → data: URL kullanır. Fotoğraf
  koduna blob: adres SOKMA (JSON yedeği indirmedeki blob: bağlantısı serbest).
- Atlanan hiçbir dosya SESSİZ kalmaz: istemci her dosya için neden yazar
  (HEIC/biçim/boyut/bozuk/adet), sunucu `photosDropped` + `photoWarning` döner
  ve konsola yazar. Yeni bir atlama yolu eklersen mesajını da ekle.
- Sunucu açılışta `UPLOAD_DIR`'e deneme dosyası yazar (`checkUploadDir`);
  yazamıyorsa `uploadsOk:false` döner ve panel kırmızı `#uploadWarn` gösterir.
- iPhone HEIC tarayıcıda açılmaz → kullanıcıya "En Uyumlu" ayarı önerilir.

## Üyelik (kayıt + giriş) — server.js + giris.html + hesap.html
Sahibinden mantığı: **ilan vermek üyelik ister** (yönetici oturumu hariç).
- Şifreler `crypto.scryptSync` ile tuzlanıp `users.json`'a `scrypt$tuz$özet`
  olarak yazılır; API hiçbir yerde şifre özetini DÖNDÜRMEZ (`publicUser`).
- Oturum jetonu STATELESS: `uid.sonKullanma.HMAC` (anahtar `DATA_DIR/session.key`
  ya da `SESSION_SECRET`); sunucu yeniden başlayınca üyeler düşmez. TTL 30 gün.
  İstemci `EMLAK.auth` ile localStorage `emlakai.session`'da tutar — jeton
  tahrif edilirse sunucu reddeder (istemci verisi GÜVEN SINIRIDIR).
- Uçlar: `/api/auth/register|login|me|update`, `/api/my/listings|messages|action`,
  `/api/my/searches` (GET: kayıtlı aramalar + `newCount`; POST: kaydet ya da
  `{sid, action:"seen"|"remove"}`). Eşleştirme `listingMatchesQuery()` ile
  yapılır — istemcideki `applyFilters`'ın sunucu karşılığıdır, filtre eklerken
  İKİSİNİ birlikte güncelle. Depo: `DATA_DIR/searches.json`.
- İlan sahibi `ownerId` ile hesaba bağlanır; ad/telefon boş bırakılırsa hesaptan
  alınır. Üye YALNIZCA kendi ilanını düzenler/siler (`/api/my/action`).
- Üye düzenlemesi ilanı yeniden `pending` yapar; TEK istisna `onlyPriceDrop()`
  (yalnız fiyat indirimi) — ilan yayında kalır. DİKKAT: düzenleyici fotoğraf
  listesini her zaman gönderir, bu yüzden karşılaştırma listenin VARLIĞINA değil
  içeriğine bakar.
- ÖNİZLEME: yayında olmayan ilanı sahibi ve yönetici `GET /api/listing?id=&full=1`
  ile görebilir; `ilan.html` bunu kullanıp turuncu "Önizleme" bandı + `noindex`
  ekler, görüntülenme saymaz. Yetkisiz istek 403 döner.
- ROL: üyenin `role` alanı `user` | `admin`. `admin` rolü panele şifresiz girer
  (`isAdminReq` = admin jetonu VEYA rolü admin oturum), ilanları doğrudan
  yayınlar ve nav'da "🛡 Yönetim" bağlantısı görür. İlk yönetici: `ADMIN_EMAIL`
  ortam değişkenindeki e-posta kayıt/girişte otomatik admin olur ya da şifreyle
  giren yönetici "Üyeler" sekmesinden "Yönetici yap" der.
- Yönetici kendi hesabını askıya alamaz/silemez/yetkisini düşüremez (sunucu engeli).
- Yönetici üyeleri panelin "Üyeler" sekmesinden yönetir: yönetici yap/yetkiyi al,
  askıya al/kaldır, şifre ata, sil (üyenin ilanları ve fotoğrafları da silinir).
- Hız sınırı: kayıt 5/saat, üye girişi 10/15 dk.
- Statik yayında (Pages) üyelik YOKTUR; `giris.html` uyarı gösterir, ilan verme
  eskisi gibi cihaz-yerel (localStorage) çalışır.

## Sunucu API'si & Yönetim Paneli (server.js + admin.html)
`server.js` statik sunucuya ek olarak ilan API'si taşır (bağımlılıksız):
- Açık uçlar: `GET/POST /api/listings`, `GET /api/listing?id=` (ilan takibi),
  `POST /api/view` (görüntülenme), `POST /api/messages` (ilana talep/mesaj),
  `POST /api/login`.
- Admin uçları (`X-Admin-Token`): `GET /api/admin/listings`,
  `POST /api/admin/action` (`approve|reject|remove|feature|unfeature|price|edit`),
  `GET /api/admin/messages`, `POST /api/admin/message`, `POST /api/admin/import`.
- ONAYSIZ YAYIN YOK (`config.moderation`): üye ilanları `pending` düşer;
  `data.js` REAL[] TOHUM ilanları da ilk açılışta `seedStatus` ("pending") ile
  yüklenir — depo tohumlaması ASLA doğrudan yayına almaz. Yönetici "✓ Yayınla"
  deyince `active` olur ve herkese görünür; "Yayından Kaldır" (`reject`) geri
  çeker (`rejected` = "Yayında Değil"). Yöneticinin KENDİ verdiği ilan
  `adminAutoPublish: true` ile doğrudan yayınlanır (false yaparsan o da kuyruğa
  girer).
- HIZ SINIRI (bellek içi, IP başına): ilan 10/saat, mesaj 10/saat, kayıt 5/saat,
  giriş 10/15 dk. Admin token'ı ilan sınırını atlar; mesajda bal küpü alanı var.
- FOTOĞRAF: istemci base64 gönderir, sunucu `DATA_DIR/uploads` altına dosya
  yazar ve ilanda `u/<dosya>` tutar; `/u/<dosya>` uzun önbellekle servis edilir.
  İlan silinince/fotoğraf çıkarılınca dosya da silinir. Fotoğrafı ASLA
  listings.json'a base64 gömme.
- FİYAT GEÇMİŞİ: fiyat değişince eski fiyat `priceHistory`'ye yazılır; detay
  sayfası son düşüşü rozetle gösterir.
- İSTEMCİ VERİSİ GÜVEN SINIRIDIR: ilan oluştururken `ownerId`, `priceHistory`,
  `updated`, sayaçlar ve `status` sunucuda SIFIRLANIR/atanır — normalize'ın
  taşıdığına güvenme.
- Görüntülenme yazımı 5 sn'de bir toplu yapılır (`saveListingsSoon`), SIGTERM/
  SIGINT'te boşaltılır — her istekte tüm JSON'u yazma.
- HTTPS arkasındayken (`x-forwarded-proto: https`) HSTS başlığı eklenir.
- `GET /sitemap.xml` sunucuda DİNAMİK üretilir (statik dosyayı ezer; yayındaki
  ilanları da içerir). `build-seo.js`'in ürettiği statik sitemap Pages içindir.
- Depolama: `DATA_DIR` (Railway Volume önerilir) ya da `./data` (gitignore'da):
  `listings.json`, `messages.json`, `users.json`, `session.key`, `uploads/`. İlk açılışta `data.js` REAL[]
  listesinden tohumlanır — Volume yoksa her dağıtımda sıfırlanır; panel bunu
  kırmızı uyarıyla söyler (`persistent:false`). Kalıcı ilan = Volume bağla ya
  da REAL'e işleyip commit'le; panelden JSON yedek al / yedekten yükle.
- Şifre: `ADMIN_PASS` ortam değişkeni (yoksa `config.admin.pass` — değiştir!).
  `admin.html` girişi İKİ SEKMELİDİR: "Yönetici Şifresi" ve "Hesabımla Giriş"
  (yalnız `role:"admin"` üyeler). Panelden çıkış `emlakai.adminPanelClosed`
  bayrağıyla işaretlenir — yönetici üyenin site oturumu düşmez.
- Panel üç sekmelidir: İlanlar (arama + durum filtresi, onay/red, tam düzenleme
  penceresi `.modal-back`, öne çıkarma, fiyat, silme, yedek al/yükle), Mesajlar
  (ara/WhatsApp, okundu, sil) ve Üyeler (askıya al, şifre ata, sil).
- Düzenleme penceresi `openListingEditor(l, save)` ORTAKTIR: yönetim paneli
  admin ucuna, hesap sayfası `/api/my/action`'a yazar — ikisini ayırma.
- İstemci: `data.js` `init()` API'yi yoklar; yoksa (GitHub Pages) REAL +
  localStorage'a düşer, `admin.html` "statik yayın" uyarısı gösterir.

## Ana sayfa (index.html) — canlı tasarım + portal blokları
Ana sayfa iki katmandır; İKİSİNİ DE koru:
1. **Keşif katmanı** (`assets/home.js` + `assets/home.css`): kompakt hero,
   arama paneli, Son Eklenen İlanlar rayı, AI'nin Seçtikleri, Fırsat İlanları,
   Son Fiyatı Düşenler, Koleksiyonlar, AI Günün Önerisi, yayınla CTA'sı.
2. **Portal katmanı** (`app.js pageIndex()` + `style.css`): `#statStrip`
   istatistikler, `#catGrid` kategori kartları (SEO rotalarına), `#regionGrid`
   bölge kartları, `#popularTags` popüler doğal dil aramaları. Her blok
   VARSA çizilir (`if (el)`) — düzen değişse de sayfa kırılmaz.
Hero'daki kategori etiketleri gerçek bağlantıdır (`/satilik-daire` vb.).
`npm start` artık `visitor-server.js` üzerinden çalışır (ziyaretçi sayacı
`/api/site-stats`'ı ekler, sonra `server.js`'i yükler).
TUZAK: `<link rel="icon" href="data:image/svg+xml,<svg …>">` satırındaki
kapanış tırnağı BOZULURSA tarayıcı `<body data-page="index">` özniteliğini
yutar; sayfa kimliği kaybolur, JSON-LD gövdede düz metin olarak görünür.

## Ağ Kısıtı (ÖNEMLİ)
Buluttaki Claude Code dış sitelere erişemez (egress izin listesi). Dış veri
gerekiyorsa dosya olarak repoya ekle.

## Çalıştırma & Test (commit öncesi)
- `npm run build` → SEO çıktıları; `npm start` → build + sunucu (http://localhost:3000).
- `node -c assets/app.js && node -c assets/ai.js && node -c assets/data.js && node -c assets/config.js && node -c server.js && node -c build-seo.js`
- Sunucuyu başlatıp ana sayfaların 200 döndüğünü doğrula.
