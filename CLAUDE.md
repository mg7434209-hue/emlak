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
araçta marka/model/yıl/km/yakıt/vites filtreleri) · `ilan.html?id=`
(detay: açıklama, değerleme bandı, trend (yalnız emlak), benzer ilanlar,
konut/taşıt kredisi; dinamik canonical + JSON-LD) · `ilan-ver.html` (segment
seçimli form; AI fiyat önerisi + AI başlık/açıklama yazarı + fotoğraf +
⭐ öne çıkarma) ·
`degerleme.html` (AI değerleme: taşınmaz + araç, kredi) · `asistan.html` (EVA) ·
`rehber.html` (SSS/rehber, FAQPage JSON-LD — elle yazılır) ·
`bolge-fiyatlari.html` (ÜRETİLİR, elle düzenlenmez) · `favoriler.html` ·
`404.html`.
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
- `assets/data.js`   — ilan veri katmanı (`EMLAK.data`): YALNIZCA gerçek
  kullanıcı ilanları (localStorage `emlakai.userListings`); demo/örnek ilan
  ÜRETİLMEZ, geri ekleme. Şehir/tür/marka yardımcıları (`brands`, `modelsOf`).
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

## Ağ Kısıtı (ÖNEMLİ)
Buluttaki Claude Code dış sitelere erişemez (egress izin listesi). Dış veri
gerekiyorsa dosya olarak repoya ekle.

## Çalıştırma & Test (commit öncesi)
- `npm run build` → SEO çıktıları; `npm start` → build + sunucu (http://localhost:3000).
- `node -c assets/app.js && node -c assets/ai.js && node -c assets/data.js && node -c assets/config.js && node -c server.js && node -c build-seo.js`
- Sunucuyu başlatıp ana sayfaların 200 döndüğünü doğrula.
