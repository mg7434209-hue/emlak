# 🏠 EmlakAI — Yapay Zekâ Destekli Emlak Platformu

Sahibinden.com / Emlakjet mantığında, **tamamı istemci tarafında çalışan yapay
zekâ özellikleriyle** donatılmış emlak ilan platformu. Saf HTML + CSS + Vanilla
JS; bağımlılık yok, API anahtarı yok, çevrimdışı bile çalışır.

## 🤖 AI Özellikleri

| Özellik | Açıklama |
|---|---|
| **Doğal dil arama** | "Manavgat'ta 5 milyon altı havuzlu villa" → otomatik filtre |
| **Akıllı fiyat etiketi** | Her ilan bölge piyasasıyla kıyaslanır: 🟢 Fırsat / ⚪ Piyasa Uygunu / 🔴 Piyasa Üstü |
| **Anında değerleme** | Konum + özellik → değer bandı, ₺/m², etki faktörleri dökümü |
| **AI ilan yazarı** | İlan verirken başlık & açıklama otomatik yazılır, fiyat önerilir |
| **Benzer ilan önerisi** | Özellik vektörü benzerliğiyle en yakın 4 alternatif |
| **EVA sohbet asistanı** | Niyet tabanlı asistan: arama, değerleme, kredi hesabı |
| **Fiyat trendi** | İlçe bazlı 12 aylık ₺/m² eğilim grafiği |
| **Kredi hesaplayıcı** | Anüite formülüyle taksit/toplam faiz |
| **Karşılaştırma** | Favorilerdeki ilanlar yan yana, ₺/m² ve AI etiketiyle |
| **⭐ Öne çıkarma** | Öne çıkarılan ilanlar AI arama ve listelerde önceliklenir |
| **AI Görünürlük Skoru** | Yayın öncesi ilan kalitesi 100 üzerinden puanlanır + ipuçları |

## 🔍 SEO & AI Görünürlüğü (AEO)

- `sitemap.xml`, `robots.txt` (GPTBot/ClaudeBot/PerplexityBot açık), `llms.txt`
- Statik **Bölge Fiyatları** sayfası: AI motorlarının alıntılayabileceği il/ilçe m² fiyat tabloları
- **Rehber/SSS** sayfası: `FAQPage` JSON-LD ile soru-cevap içeriği
- JSON-LD: `Organization`, `WebSite`+`SearchAction`, `RealEstateListing` (ilan detayında dinamik), `Dataset`, `BreadcrumbList`
- Tüm sayfalarda canonical + Open Graph/Twitter kartları + OG görseli
- `ilanlar.html?q=<doğal dil sorgu>` doğrudan çalışır (SearchAction hedefi)

Bunların çoğu `node build-seo.js` ile `assets/config.js`'ten üretilir —
alan adı değişince `config.seo.siteUrl` güncellenip `npm run build` çalıştırılır.

## Sayfalar

- `index.html` — AI arama, fırsat ilanları, kategoriler
- `ilanlar.html` — filtreli/sıralanabilir liste (AI fırsat skoru sıralaması dâhil)
- `ilan.html?id=…` — detay: AI açıklama, değerleme bandı, trend, benzerler, kredi
- `ilan-ver.html` — AI destekli ücretsiz ilan verme (localStorage'a kaydeder)
- `degerleme.html` — değerleme sihirbazı + kredi hesaplayıcı
- `asistan.html` — EVA sohbet asistanı
- `favoriler.html` — favoriler + karşılaştırma tablosu

## Çalıştırma

```bash
npm start   # http://localhost:3000
```

Railway'e `npm start` ile, GitHub Pages'e doğrudan statik olarak yayınlanabilir.

## Mimari

- `assets/config.js` — tek doğru kaynak: marka, iletişim, piyasa verisi, katsayılar
- `assets/data.js` — deterministik örnek ilan üreteci (~72 ilan) + kullanıcı ilanları
- `assets/ai.js` — AI motoru (arama ayrıştırma, değerleme, NLG, öneri, sohbet)
- `assets/app.js` — arayüz; `server.js` — bağımlılıksız statik sunucu

> AI analizleri piyasa ortalamalarına dayalı tahminlerdir; resmi ekspertiz ve
> yatırım tavsiyesi yerine geçmez.
