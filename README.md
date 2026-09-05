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
| **Fiyat değişimi rozeti** | Fiyat düşünce ilan detayında eski fiyat + indirim yüzdesi gösterilir |

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
- `ilan-ver.html` — AI destekli ücretsiz ilan verme (taşınmaz + araç); gönderilen
  ilanlar "İlanlarım" bölümünden ilan numarasıyla takip edilir
- `degerleme.html` — taşınmaz + araç değerleme sihirbazı + kredi hesaplayıcı
- `asistan.html` — EVA sohbet asistanı
- `favoriler.html` — favoriler + karşılaştırma tablosu

## 👤 Üyelik — herkes kayıt olup ilan verebilir

- `giris.html`: e-posta + şifre ile **ücretsiz kayıt** ve giriş (şifreler scrypt
  ile tuzlanarak saklanır; oturum jetonu HMAC imzalı, 30 gün geçerli)
- İlan vermek üyelik ister; giriş yapmamış ziyaretçi `ilan-ver.html`'de üyelik
  kapısını görür. İlan sahibinin adı/telefonu hesaptan otomatik doldurulur
- `hesap.html` (**Hesabım**): İlanlarım (durum, görüntülenme, düzenle/sil),
  Mesajlarım (kendi ilanlarına gelen talepler, tek tıkla WhatsApp) ve
  hesap bilgileri + şifre değiştirme
- İlan metni/fotoğrafı değişince ilan yeniden yönetici onayına düşer; yalnızca
  **fiyat indirimi** yapıldığında ilan yayında kalır
- Yönetici panelinden üye yönetimi: askıya alma, geçici şifre atama, silme
  (üyeyle birlikte ilanları ve fotoğrafları da silinir)

## 📸 Fotoğraf yükleme

- Kurallar tek yerde (`config.upload`): ilan başına **6 fotoğraf**, yalnızca
  **JPG · PNG · WEBP**, dosya başına 15 MB; yüklemeden önce tarayıcıda 1600 px'e
  küçültülüp sıkıştırılır, sunucuda dosya olarak saklanır
- Eklenemeyen her dosya için **açık gerekçe** gösterilir (HEIC, desteklenmeyen
  biçim, çok büyük, bozuk dosya, adet sınırı) — sessizce atlanmaz
- iPhone HEIC fotoğrafları tarayıcılar açamaz; kullanıcıya Ayarlar › Kamera ›
  Biçimler › "En Uyumlu" önerilir
- Sunucu fotoğrafı diske yazamazsa ilan yine kaydedilir ama kullanıcı uyarılır
  ve panelde kırmızı "Fotoğraflar kaydedilemiyor" bandı çıkar

## Yönetim Paneli (admin.html)

Sahibinden benzeri onaylı yayın akışı — sunucu (Railway) üzerinde çalışır:

- **Onaysız hiçbir ilan yayına girmez**: üye ilanları ve repodaki tohum ilan
  "Onay Bekliyor" durumunda başlar; yönetici **✓ Yayınla** deyince herkese görünür,
  **Yayından Kaldır** ile geri çekilir (davranış `config.moderation`'dan ayarlanır)
- İki giriş yolu: **yönetici şifresi** ya da **yönetici yetkili üye hesabı**
  (üyeyi "Üyeler" sekmesinden "Yönetici yap" ile yetkilendirin; `ADMIN_EMAIL`
  ortam değişkenindeki e-posta kayıt/girişte otomatik yönetici olur).
  Yönetici üyeler menüde "🛡 Yönetim" bağlantısını görür ve ilanları onay
  beklemeden yayınlanır
- `admin.html`: şifreli giriş (12 saat oturum), arama + durum filtresi, ilan
  onaylama/reddetme, **tam düzenleme** (tüm alanlar + fotoğraf ekleme/çıkarma),
  öne çıkarma, fiyat güncelleme, silme, JSON yedek indirme ve **yedekten yükleme**
- **Mesajlar sekmesi**: ilan detayındaki "Satıcıya Mesaj Gönder" formundan gelen
  talepler (ad, telefon, e-posta, mesaj) — tek tıkla arama/WhatsApp, okundu/sil
- Şifre: `ADMIN_PASS` ortam değişkeni (önerilen) ya da `config.admin.pass`
- Depolama: `DATA_DIR` (Railway **Volume** bağlayın — yoksa her dağıtımda ilanlar
  repodaki `REAL[]` tohumuna sıfırlanır; panel bu durumda kırmızı uyarı gösterir)
- Fotoğraflar `DATA_DIR/uploads` altında dosya olarak saklanır, `/u/<dosya>` ile
  servis edilir (paylaşım kartlarında da gerçek fotoğraf görünür)
- Statik yayında (GitHub Pages) API yoktur; site otomatik olarak repo + cihaz-yerel
  ilan moduna düşer

## 🚀 Yayına alma ve ilan girmeye başlama

1. **Railway'de yayınla** (`npm start`). Ortam değişkenleri:
   `ADMIN_PASS=<güçlü şifre>` ve `DATA_DIR=/data` (aynı yola bir **Volume** bağlayın).
   Volume yoksa ilanlar/fotoğraflar/mesajlar her dağıtımda silinir.
2. `config.seo.siteUrl` değerini yayın adresine çevirip `npm run build` çalıştırın
   (canonical, sitemap ve llms.txt bu adresi kullanır).
3. `/admin.html` → şifreyle giriş yapın (menüde yoktur, `robots.txt`'te engellidir).
   İsterseniz `SESSION_SECRET` de tanımlayın (yoksa `DATA_DIR/session.key` üretilir).
4. Yönetici oturumu açıkken `/ilan-ver.html` üzerinden ilan girin — bu ilanlar
   **onay beklemeden doğrudan yayına** girer. Fotoğrafları (en fazla 8) ekleyin;
   fiyat/başlık/açıklama için AI düğmelerini kullanabilirsiniz.
5. Ziyaretçilerin gönderdiği ilanlar panelde **Onay Bekleyen** olarak listelenir;
   düzenleyip onaylayın.
6. Düzenli olarak **JSON Yedek İndir** ile yedek alın; gerektiğinde
   **Yedekten Yükle** ile geri yükleyin.

### Sunucu API'si

| Uç | Açıklama |
|---|---|
| `GET /api/listings` | Yayındaki ilanlar |
| `POST /api/auth/register` · `login` · `me` · `update` | Üyelik: kayıt (5/saat), giriş (10/15 dk), oturum doğrulama, profil/şifre |
| `GET /api/my/listings` · `GET /api/my/messages` · `POST /api/my/action` | Üyenin kendi ilanları, mesajları; kendi ilanını düzenleme/silme |
| `POST /api/listings` | İlan gönder — **üyelik ister** (saatte 10; admin token'la sınırsız ve doğrudan yayında) |
| `GET /api/listing?id=` | İlan durumu (ilan takibi) |
| `POST /api/view` | Görüntülenme sayacı (IP + ilan başına 12 saatte bir) |
| `POST /api/messages` | İlana mesaj/talep bırakma (saatte 10) |
| `POST /api/login` | Yönetici girişi (15 dakikada 10 deneme) |
| `GET /api/admin/listings` · `POST /api/admin/action` | İlan yönetimi (`approve/reject/remove/feature/unfeature/price/edit`) |
| `GET /api/admin/messages` · `POST /api/admin/message` | Mesaj yönetimi |
| `GET /api/admin/users` · `POST /api/admin/user` | Üye yönetimi (`ban/unban/password/remove/admin`) |
| `POST /api/admin/import` | Yedekten geri yükleme |
| `GET /sitemap.xml` | Yayındaki ilanları da içeren dinamik site haritası |

## Alan adı / canlı adres

Canlı adres tek yerde: `assets/config.js` → `seo.siteUrl`
(şu an `https://emlak-production.up.railway.app`). Değiştirip `npm run build`
çalıştırdığınızda tüm sayfaların canonical/Open Graph adresleri, sitemap,
robots.txt ve llms.txt bu adrese göre yeniden üretilir.

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
