# CLAUDE.md — EmlakAI

> Repo kök dizinindedir; Claude Code her oturum başında otomatik okur.

## Proje
EmlakAI: sahibinden.com / emlakjet mantığında, **yapay zekâ destekli emlak ilan
platformu**. Çok sayfalı statik site: saf HTML + CSS + Vanilla JS, bağımlılıksız
Node statik sunucu (`server.js`, Railway uyumlu). Sunucu tarafı yok; tüm AI
özellikleri istemcide çalışır (çevrimdışı dâhil).

Sayfalar (kök dizinde):
`index.html` (AI arama + öne çıkanlar + fırsatlar) · `ilanlar.html` (filtreli
liste; `?q=` doğal dil sorgusunu da ayrıştırır) · `ilan.html?id=` (detay: AI
açıklama, değerleme bandı, trend, benzer ilanlar, kredi; dinamik canonical +
RealEstateListing JSON-LD) · `ilan-ver.html` (AI fiyat önerisi + AI başlık/
açıklama yazarı + fotoğraf + ⭐ öne çıkarma + AI Görünürlük Skoru) ·
`degerleme.html` (AI değerleme + kredi) · `asistan.html` (EVA) ·
`rehber.html` (SSS/rehber, FAQPage JSON-LD — elle yazılır) ·
`bolge-fiyatlari.html` (ÜRETİLİR, elle düzenlenmez) · `favoriler.html` ·
`404.html`.
Nav menü: Ana Sayfa · İlanlar · Bölge Fiyatları · AI Değerleme · AI Asistan ·
Rehber · Favoriler · İlan Ver — yeni sayfa eklenince TÜM sayfalarda güncelle.

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
Marka, iletişim, şehir/ilçe m² piyasa fiyatları, değerleme katsayıları, kredi
varsayılanları YALNIZCA burada. Sayfalara/JS'e sayı gömme; değişiklik = config.

## Dosya mimarisi
- `assets/config.js` — konfig (yukarıda).
- `assets/data.js`   — deterministik örnek ilan üreteci (~72 ilan, sabit seed)
  + localStorage kullanıcı ilanları (`EMLAK.data`).
- `assets/ai.js`     — AI motoru (`EMLAK.ai`): doğal dil arama (parseQuery),
  değerleme (estimate), fiyat etiketi (priceBadge), açıklama üretimi (describe),
  benzer ilan (similar), sohbet (chat), kredi (mortgage), trend serisi (trend),
  öne çıkan sıralama (rank), AI Görünürlük Skoru (visibilityScore).
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
