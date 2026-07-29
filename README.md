# 🏠 EmlakAI — AI Destekli Taşınmaz & Araç İlan Platformu

**Google sadeliğinde** tasarlanmış, iki segmentli (taşınmaz + araç,
satılık/kiralık) ilan platformu. Tamamı istemci tarafında çalışan yapay zekâ
özellikleri; saf HTML + CSS + Vanilla JS, bağımlılık yok, API anahtarı yok,
çevrimdışı bile çalışır.

## 🤖 AI Özellikleri

| Özellik | Açıklama |
|---|---|
| **Doğal dil arama** | "Manavgat'ta 5 milyon altı havuzlu villa" ya da "2020 üstü dizel Corolla" → otomatik filtre |
| **Akıllı fiyat etiketi** | Her ilan piyasayla kıyaslanır: 🟢 Fırsat / ⚪ Piyasa Uygunu / 🔴 Piyasa Üstü |
| **Anında değerleme** | Taşınmaz: konum + özellik → ₺ bandı · Araç: marka/model/yıl/km → ₺ bandı |
| **AI ilan yazarı** | İlan verirken başlık & açıklama otomatik yazılır, fiyat önerilir |
| **Benzer ilan önerisi** | Özellik vektörü benzerliğiyle en yakın 4 alternatif |
| **EVA sohbet asistanı** | Niyet tabanlı asistan: arama, değerleme, kredi hesabı |
| **Fiyat trendi** | İlçe bazlı 12 aylık ₺/m² eğilim grafiği |
| **Kredi hesaplayıcı** | Anüite formülüyle taksit/toplam faiz |
| **Karşılaştırma** | Favorilerdeki ilanlar yan yana, ₺/m² ve AI etiketiyle |
| **⭐ Öne çıkarma** | Öne çıkarılan ilanlar AI arama ve listelerde önceliklenir |

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

- `index.html` — Google tarzı merkez arama (segment seçimi + tek kutu)
- `ilanlar.html` — segment seçicili filtreli liste (araçta marka/model/yıl/km/yakıt/vites)
- `ilan.html?id=…` — detay: AI açıklama, değerleme bandı, trend, benzerler, konut/taşıt kredisi
- `ilan-ver.html` — AI destekli ücretsiz ilan verme, taşınmaz + araç (localStorage'a kaydeder)
- `degerleme.html` — taşınmaz + araç değerleme sihirbazı + kredi hesaplayıcı
- `asistan.html` — EVA sohbet asistanı
- `favoriler.html` — favoriler + karşılaştırma tablosu

## Yönetim Paneli (admin.html)

Sahibinden benzeri onaylı yayın akışı — sunucu (Railway) üzerinde çalışır:

- Ziyaretçi ilan verir → **onay bekler**; admin onaylayınca **herkese yayınlanır**
- `admin.html`: şifreli giriş (12 saat oturum), bekleyen ilanları onaylama/reddetme,
  öne çıkarma, fiyat güncelleme, silme, JSON yedek indirme
- Şifre: `ADMIN_PASS` ortam değişkeni (önerilen) ya da `config.admin.pass`
- Depolama: `DATA_DIR` (Railway **Volume** bağlayın — yoksa her dağıtımda ilanlar
  repodaki `REAL[]` tohumuna sıfırlanır) ya da `./data/listings.json`
- Statik yayında (GitHub Pages) API yoktur; site otomatik olarak repo + cihaz-yerel
  ilan moduna düşer

## Çalıştırma

```bash
npm start   # http://localhost:3000
```

Railway'e `npm start` ile, GitHub Pages'e doğrudan statik olarak yayınlanabilir.

## Mimari

- `assets/config.js` — tek doğru kaynak: marka, iletişim, piyasa verisi, katsayılar
- `assets/data.js` — ilan veri katmanı: yalnızca gerçek kullanıcı ilanları (localStorage); demo ilan yok
- `assets/ai.js` — AI motoru (arama ayrıştırma, değerleme, NLG, öneri, sohbet)
- `assets/app.js` — arayüz; `server.js` — bağımlılıksız statik sunucu

> AI analizleri piyasa ortalamalarına dayalı tahminlerdir; resmi ekspertiz ve
> yatırım tavsiyesi yerine geçmez.
