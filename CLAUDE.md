# CLAUDE.md — EmlakAI

> Repo kök dizinindedir; Claude Code her oturum başında otomatik okur.

## Proje
EmlakAI: **yapay zekâ destekli, iki segmentli ilan platformu** — taşınmaz
(`segment: "emlak"`) + araç (`segment: "vasita"`), her ikisi satılık/kiralık.
Çok sayfalı statik site: saf HTML + CSS + Vanilla JS, bağımlılıksız Node statik
sunucu (`server.js`, Railway uyumlu). Sunucu tarafı yok; tüm AI özellikleri
istemcide çalışır (çevrimdışı dâhil). Tasarım ilkesi: **Google sadeliği** —
ana sayfa yalnızca logo + tek arama kutusu + segment seçimi + 4 hızlı bağlantı.

Sayfalar (kök dizinde):
`index.html` (Google tarzı merkez arama; kart/vitrin YOK) · `ilanlar.html`
(segment seçicili filtreli liste; `?q=` doğal dil sorgusunu da ayrıştırır;
araçta marka/model/yıl/km/yakıt/vites filtreleri; sayfa başına 24 ilan +
`.pager` sayfalama — filtre/sıralama değişince 1. sayfaya döner) · `ilan.html?id=`
(detay: açıklama, değerleme bandı, trend (yalnız emlak), benzer ilanlar,
konut/taşıt kredisi, fiyat düştüyse `.price-drop` rozeti, sunucu varken
"Satıcıya Mesaj Gönder" formu; dinamik canonical + JSON-LD) · `ilan-ver.html`
(segment seçimli form; AI fiyat önerisi + AI başlık/açıklama yazarı + en fazla
8 fotoğraf + ⭐ öne çıkarma + sunucu varken "İlanlarım" ilan takibi) ·
`degerleme.html` (AI değerleme: taşınmaz + araç, kredi) · `asistan.html` (EVA) ·
`rehber.html` (SSS/rehber, FAQPage JSON-LD — elle yazılır) ·
`bolge-fiyatlari.html` (ÜRETİLİR, elle düzenlenmez) · `favoriler.html` ·
`404.html` · `admin.html` (yönetim paneli — menüde YOK, robots'ta engelli,
noindex; yalnızca sunucu API'si varken çalışır).
Nav menü SADE tutulur (5 öğe): Ana Sayfa · İlanlar · Değerleme · Favoriler ·
İlan Ver. İkincil sayfalar (Bölge Fiyatları · Rehber · AI Asistan) footer'daki
`.footer-links` bloğundadır; asistana ayrıca her sayfadaki FAB düğmesi götürür.
Nav/footer değişince TÜM sayfalarda + `build-seo.js` iskeletinde güncelle.

## SEO / AEO — `build-seo.js`
`bolge-fiyatlari.html`, `sitemap.xml`, `robots.txt`, `llms.txt` bu betikle
`assets/config.js`'ten ÜRETİLİR (elle düzenleme; kaynak değişince
`npm run build` çalıştırıp çıktıyı da commit'le — `npm start` de önce build
çalıştırır). `config.seo.siteUrl` özel alan adı alınınca güncellenmeli; statik
sayfalardaki canonical/OG URL'leri de aynı domain'i kullanır. JSON-LD:
Organization + WebSite(SearchAction) `app.js`'ten enjekte edilir; FAQPage
`rehber.html`'de statik; Dataset build ile üretilir. OG görseli:
`assets/img/og.png` (1200×630).

## TEK DOĞRU KAYNAK — `assets/config.js`
Marka, iletişim, şehir/ilçe m² piyasa fiyatları, araç marka/model taban
fiyatları ve amortisman eğrisi (`config.vehicles`), değerleme katsayıları,
kredi varsayılanları (konut + taşıt) YALNIZCA burada. Sayfalara/JS'e sayı
gömme; değişiklik = config.

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
- `assets/ai.js`     — AI motoru (`EMLAK.ai`): doğal dil arama (parseQuery —
  marka/model/yıl/km/yakıt/vites dâhil), değerleme (estimate; `segment:
  "vasita"` ise araç dalı), fiyat etiketi (priceBadge), açıklama üretimi
  (describe), benzer ilan (similar), sohbet (chat), kredi (mortgage), trend
  serisi (trend — yalnız emlak), öne çıkan sıralama (rank).
- `assets/app.js`    — arayüz; sayfa yönlendirmesi `<body data-page="...">`.
- `assets/style.css` — tasarım sistemi (CSS değişkenleri, açık/koyu tema).
- Görseller: dış görsel YOK; kartlar `thumbSVG()` ile üretilen SVG yer tutucu
  kullanır. Dış siteden hotlink YAPMA (egress kısıtı).

## Konvansiyonlar
- Sayfa linkleri `.html` uzantılı (GitHub Pages uyumu).
- Tema/mobil menü/favori sayacı `app.js` `initChrome()` ile; iletişim
  `data-c-tel` / `data-c-mail` / `data-c-addr` öznitelikleriyle enjekte edilir.
- Yeni AI özelliği eklerken katsayıları `config.js`'e koy, koda gömme.
- localStorage anahtarları `emlakai.` önekiyle başlar.

## Sunucu API'si & Yönetim Paneli (server.js + admin.html)
`server.js` statik sunucuya ek olarak ilan API'si taşır (bağımlılıksız):
- Açık uçlar: `GET/POST /api/listings`, `GET /api/listing?id=` (ilan takibi),
  `POST /api/view` (görüntülenme), `POST /api/messages` (ilana talep/mesaj),
  `POST /api/login`.
- Admin uçları (`X-Admin-Token`): `GET /api/admin/listings`,
  `POST /api/admin/action` (`approve|reject|remove|feature|unfeature|price|edit`),
  `GET /api/admin/messages`, `POST /api/admin/message`, `POST /api/admin/import`.
- Akış sahibinden benzeri: ziyaretçi ilanı `pending` düşer; admin onaylayınca
  `active` olur ve HERKESE görünür. Admin oturumu açıkken verilen ilan
  doğrudan `active`.
- HIZ SINIRI (bellek içi, IP başına): ilan 5/saat, mesaj 10/saat, giriş
  10/15 dk. Admin token'ı ilan sınırını atlar; mesaj formunda bal küpü alanı var.
- FOTOĞRAF: istemci base64 gönderir, sunucu `DATA_DIR/uploads` altına dosya
  yazar ve ilanda `u/<dosya>` tutar; `/u/<dosya>` uzun önbellekle servis edilir.
  İlan silinince/fotoğraf çıkarılınca dosya da silinir. Fotoğrafı ASLA
  listings.json'a base64 gömme.
- FİYAT GEÇMİŞİ: fiyat değişince eski fiyat `priceHistory`'ye yazılır; detay
  sayfası son düşüşü rozetle gösterir.
- `GET /sitemap.xml` sunucuda DİNAMİK üretilir (statik dosyayı ezer; yayındaki
  ilanları da içerir). `build-seo.js`'in ürettiği statik sitemap Pages içindir.
- Depolama: `DATA_DIR` (Railway Volume önerilir) ya da `./data` (gitignore'da):
  `listings.json`, `messages.json`, `uploads/`. İlk açılışta `data.js` REAL[]
  listesinden tohumlanır — Volume yoksa her dağıtımda sıfırlanır; panel bunu
  kırmızı uyarıyla söyler (`persistent:false`). Kalıcı ilan = Volume bağla ya
  da REAL'e işleyip commit'le; panelden JSON yedek al / yedekten yükle.
- Şifre: `ADMIN_PASS` ortam değişkeni (yoksa `config.admin.pass` — değiştir!).
- Panel iki sekmelidir: İlanlar (arama + durum filtresi, onay/red, tam
  düzenleme penceresi `.modal-back`, öne çıkarma, fiyat, silme, yedek al/yükle)
  ve Mesajlar (ara/WhatsApp, okundu, sil).
- İstemci: `data.js` `init()` API'yi yoklar; yoksa (GitHub Pages) REAL +
  localStorage'a düşer, `admin.html` "statik yayın" uyarısı gösterir.

## Ağ Kısıtı (ÖNEMLİ)
Buluttaki Claude Code dış sitelere erişemez (egress izin listesi). Dış veri
gerekiyorsa dosya olarak repoya ekle.

## Çalıştırma & Test (commit öncesi)
- `npm run build` → SEO çıktıları; `npm start` → build + sunucu (http://localhost:3000).
- `node -c assets/app.js && node -c assets/ai.js && node -c assets/data.js && node -c assets/config.js && node -c server.js && node -c build-seo.js`
- Sunucuyu başlatıp ana sayfaların 200 döndüğünü doğrula.
