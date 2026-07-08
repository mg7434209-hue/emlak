# CLAUDE.md — EmlakAI

> Repo kök dizinindedir; Claude Code her oturum başında otomatik okur.

## Proje
EmlakAI: sahibinden.com / emlakjet mantığında, **yapay zekâ destekli emlak ilan
platformu**. Çok sayfalı statik site: saf HTML + CSS + Vanilla JS, bağımlılıksız
Node statik sunucu (`server.js`, Railway uyumlu). Sunucu tarafı yok; tüm AI
özellikleri istemcide çalışır (çevrimdışı dâhil).

Sayfalar (kök dizinde):
`index.html` (AI arama + fırsatlar) · `ilanlar.html` (filtreli liste) ·
`ilan.html?id=` (detay: AI açıklama, değerleme bandı, trend, benzer ilanlar,
kredi) · `ilan-ver.html` (AI fiyat önerisi + AI başlık/açıklama yazarı) ·
`degerleme.html` (AI değerleme sihirbazı + kredi hesaplayıcı) ·
`asistan.html` (EVA sohbet asistanı) · `favoriler.html` (favoriler +
karşılaştırma) · `404.html`.
Nav menü: Ana Sayfa · İlanlar · AI Değerleme · AI Asistan · Favoriler ·
İlan Ver — yeni sayfa eklenince TÜM sayfalarda güncelle.

## TEK DOĞRU KAYNAK — `assets/config.js`
Marka, iletişim, şehir/ilçe m² piyasa fiyatları, değerleme katsayıları, kredi
varsayılanları YALNIZCA burada. Sayfalara/JS'e sayı gömme; değişiklik = config.

## Dosya mimarisi
- `assets/config.js` — konfig (yukarıda).
- `assets/data.js`   — deterministik örnek ilan üreteci (~72 ilan, sabit seed)
  + localStorage kullanıcı ilanları (`EMLAK.data`).
- `assets/ai.js`     — AI motoru (`EMLAK.ai`): doğal dil arama (parseQuery),
  değerleme (estimate), fiyat etiketi (priceBadge), açıklama üretimi (describe),
  benzer ilan (similar), sohbet (chat), kredi (mortgage), trend serisi (trend).
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
- `npm start` → `node server.js` (http://localhost:3000).
- `node -c assets/app.js && node -c assets/ai.js && node -c assets/data.js && node -c assets/config.js && node -c server.js`
- Sunucuyu başlatıp ana sayfaların 200 döndüğünü doğrula.
