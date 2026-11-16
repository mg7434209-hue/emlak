# İlan AI — eksikler ve iş listesi (16 Kas 2026)

> Bu liste başka bir oturumun (Sonnet) sırayla uygulaması için yazıldı.
> Her madde kendi başına yapılabilir. Satır numaraları yaklaşıktır; önce `grep` ile doğrula.

## Her işte geçerli kurallar

- Önce `CLAUDE.md`'yi oku. ÇELİŞKİDE SONDAKİ TARİHLİ BÖLÜMLER ESASTIR (üst yarı eski; bkz. D1).
- Çalışma dalı `claude/vibrant-noether-pgasqr`; canlı dal `claude/ai-real-estate-platform-89ai1h` (Railway buradan yayınlar). PR'ı yalnız kullanıcı isterse aç.
- JS/CSS/HTML değişince `npm run build` çalıştır ve çıktıyı da commit'le (varlık damgaları). Commit öncesi `npm test` yeşil olmalı.
- HİÇBİR VERİYİ SİLME (ilan, üye, belge). Mevcut ilanların durumunu değiştiren iş ayrı betik + önce dry-run.
- Canlı EİDS'e (eids.ticaret.gov.tr, ws.gtb.gov.tr) İSTEK ATMA. `/eids/callback` YOLUNU DEĞİŞTİRME.
- Yayın kilidi (`LISTINGS_PUBLISH_ENABLED`) açılmaz; kilidi atlayan yol ekleme.
- Rakam, tarih sözü, yorum, telefon, e-posta, mevzuat oranı UYDURMA. Bilinmeyen değer yazılmaz.
- T.C. kimlik no saklama. Parola/anahtar yalnız ENV. Log'da kod/kimlik maskeli.
- Herkese açık her ilan çıktısı `server.js pub()`'dan geçer.
- Yeni kişisel veri toplarsan `kvkk.html`'i de güncelle.

## A — Güvenlik ve veri (önce bunlar)

**A1. `/api/listing?id=` yayında olmayan ilanı sızdırıyor.** `server.js` ~866: `full=1` olmayan istek, `pending`/`rejected` ilanın `id, status, title, price` alanlarını herkese döndürüyor.
Yap: ilan `active` değilse ve istek sahibi/yönetici değilse 404 dön. İlan takibi (sahibin durumu görmesi) oturumla çalışmaya devam etsin.
Kabul: testte anonim istek pending ilana 404, sahibi 200 alır.

**A2. Yedekten yükleme tüm ilanları eziyor.** `server.js` ~1324 `LISTINGS = fresh`.
Yap: yüklemeden önce mevcut `listings.json`'ı `DATA_DIR/backups/listings-<zaman>.json` olarak kopyala; yanıtta kaç ilanın değişeceğini bildir; panelde onay metni bunu söylesin. Kilit açıkken `active → pending` kuralı KALIR.
Kabul: test, yükleme sonrası yedek dosyasının oluştuğunu ve eski ilan sayısını içerdiğini denetler.

**A3. İhale yayın kilidini tanımıyor.** `auctions.js` yalnız `l.status === "active"` şartına bakıyor; kilitliyken kimse ihale açamıyor ama arayüz bunu söylemiyor.
Yap: `ctx`'e `publishEnabled` geçir; kilitliyken `POST /api/auction/create` 403 + açıklayıcı mesaj dönsün; `ihale-olustur.html` ve `ihaleler.html`'deki "İlanımı ihaleye çıkar" çağrısı kilitliyken "EİDS tamamlanınca açılacak" notuna dönsün (`/api/site/status`).
Kabul: kilitli sunucu testinde create 403.

**A4. Hız sınırları yalnız bellekte.** Yeniden başlatmada sıfırlanıyor. Düşük öncelik: belgelendir (CLAUDE.md), kod değişikliği gerekmez.

## B — Yayın kilidiyle çelişen metinler

**B1. Ana sayfa karşılama paneli.** `index.html` ~79 `.h-welcome`: "İlanını dakikalar içinde yayına hazırla" / "+ Ücretsiz ilan ver". Kilitliyken yanıltıcı.
Yap: `window.EMLAK_STATUS.publishEnabled === false` iken başlık/metin "Şimdi üye olun, ilanınızı taslak olarak hazırlayın; yayın EİDS tamamlanınca açılacak" anlamına dönsün (metin `config.launch`'tan). Sunucu `renderHomeHtml()` de aynı metni bassın (botlar için).

**B2. Boş durum metni.** Ana sayfa/ilanlar "ilk ilanı siz verebilirsiniz" benzeri metinler: kilitliyken taslak diline çevir.

**B3. `rehber.html` SSS.** "İlanlar yönetici incelemesinden sonra yayına girer" artık eksik. Yap: yayın kilidi/EİDS, ihale, satıcı gizliliği ve site içi mesaj için soru-cevap ekle; FAQPage JSON-LD'yi görünen metinle AYNI tut (elle yazılıyor). TARİH SÖZÜ YOK.

**B4. Hesabım metinleri.** `hesap.html` ve `app.js`'te "yayına alınır" ifadelerini tara, kilit durumuna göre düzelt.

## C — Hukuki metinler (taslak; hukukçu onayı kullanıcıda)

**C1. `kvkk.html` yeni verileri anlatmıyor.** Eksik: profil fotoğrafı, takma ad/gizlilik tercihleri, EİDS izin belgesi ve bitiş tarihi, ihale belgeleri (tapu/ruhsat/takyidat), teminat talebi kayıtları, `userType`, `launchNotify` (açık rıza), `/eids/callback` ile gelen yetki kodu (saklanmıyor, maskeli log), isteğe bağlı Anthropic görsel analizi (yurt dışı aktarım).
Yap: işlenen veri, amaç, saklama süresi, aktarım bölümlerine ekle. Saklama süresi bilinmiyorsa UYDURMA; "hesap silinene kadar" gibi koddaki gerçek davranışı yaz.

**C2. Sürüm ve tarih.** Koşullar 5–9 Kas'ta değişti ama `LEGAL_VERSION = "2026-10-31"` ve üç sayfada "Son güncelleme: 31 Ekim 2026" duruyor. Yap: C1 ile birlikte sürümü ve tarihleri ilerlet; eski sürümle onay vermiş üyeye girişte yeniden onay sor (bunu yapmadan sürümü ilerletme).

## D — Belgeler ve ölü kod

**D1. `CLAUDE.md` üst yarısı eski.** Çelişenler: "Google sadeliği" ana sayfa, 5 öğeli menü, `degerleme.html`/`asistan.html`/`bolge-fiyatlari.html`, "tasinmazNo zorunlu değildir", `adminAutoPublish: true`, "Organization şeması app.js'ten". Yap: eski cümleleri güncel duruma göre yeniden yaz, sondaki tarihli bölümleri ilgili başlıklara taşı. Bilgi KAYBETME; dosyayı kısalt.

**D2. `README.md` ve `package.json` description** eski ("emlak ilan platformu (statik)"). Güncelle.

**D3. Ölü kod.** `app.js` `pageDegerleme`, `pageAsistan`; `assets/market-analysis.js` (hiçbir sayfa yüklemiyor, önce `grep` ile doğrula); `ai.js chat` içindeki kaldırılan sayfalara yönlendiren yanıtlar; `build-seo.js` bölge fiyatları üretimi (`marketData.enabled=false` iken çalışmıyorsa). Yap: kaldır; `marketData.enabled` anahtarı ve onu okuyan kod KALIR.

## E — Dürüstlük

**E1. Ziyaretçi sayacı tabanı 1000** (`visitor-server.js`). Gerçek veri değil. Kullanıcıya sor: 0'dan mı başlasın, rozet eşik altında gizlensin mi. Karar gelene dek dokunma.

**E2. Tohum ilan EA1001** (`assets/data.js`): `views: 5780`, `favCount: 50` taban sayıları. Gerçek değilse 0 yap (kullanıcıya sor).

**E3. Statik `sitemap.xml`** yayında olmayan EA1001'i ve Railway adresini içeriyor. Yap: `build-seo.js` statik sitemap'e ilan URL'si YAZMASIN (sunucu dinamik olanı zaten yalnız `active` ilanlarla üretiyor).

## F — Yönetim paneli ve arayüz

**F1. Üyeler sekmesi** `userType` ve `launchNotify`'ı göstermiyor. Yap: sütun + süzgeç (emlak işletmesi / galeri / duyuru isteyenler) + CSV dışa aktarma (yalnız yönetici; ad, e-posta, tür, kayıt tarihi, rıza tarihi). Şifre özeti ASLA çıkmaz.

**F2. 34 adet `prompt/alert/confirm`** (`app.js` 28, `ihale.js` 6). Yap: mevcut `.modal-back` penceresi ve `.toast` ile değiştir. Öncelik: "EİDS izni yenile" (tarih + dosya alanı `prompt` ile alınamıyor), fiyat değiştir, şifre ata, silme onayları.

**F3. İhale.** (a) İlan detayında ve Hesabım › İlanlarım'da "İhaleye çıkar" düğmesi yok. (b) İhale bitince kazanan/satıcıya site içi bildirim yok: mesaj kutusuna sistem mesajı düşür. (c) `pending` aşamasındaki geri sayımda etiket yok.

**F4. Mobil.** Başlıktaki `#userMenu` açılır menüsü ve ✉ rozeti 320/360/390 px'te Playwright ile ölçülmedi. Taşma varsa düzelt.

**F5. AI Stüdyo.** (a) Tapu/ekran görüntüsü fotoğrafı 66 puanla ilana dahil edildi: belge tespiti eşiğini sıkılaştır, belge sanılan kare varsayılan olarak DIŞARIDA kalsın ve nedeni yazılsın. (b) Satıcı notu temizliği zayıf. (c) "Merkez" ilçesi olmayan illerde (ör. Konya) konum yedeği.

## G — Test

**G1.** Yalnız `tests/smoke.js` (20 API testi) var. Yap: Playwright ile 4 arayüz testi: kayıt → ilan ver (taslak) akışı; kilitliyken üst bant + admin pasif düğme; site içi mesajlaşma; ihale teklif + süre uzatma. Chromium hazır kurulu (`require('playwright')`), `playwright install` ÇALIŞTIRMA.

## H — Kullanıcı kararı / kullanıcı işi (Sonnet BAŞLAMASIN)

1. **Alan adı.** `config.seo.siteUrl` hâlâ `https://emlak-production.up.railway.app`; `server.js HOST_OK` (~2104) `ilanai.info`'yu tanımıyor; oysa Bakanlığa `https://www.ilanai.info/eids/callback` bildirildi. Kullanıcı alan adını Railway'e bağladığını doğrulayınca: `siteUrl` + `HOST_OK` + apex→www 301 + `npm run build`. Eski Railway adresinden yeni alana 301 düşünülmeli.
2. **EİDS entegrasyon planı onay bekliyor** + 4 soru: alan adı teyidi · "diğer" segmenti kilide dahil mi · elle belge akışı `legacy` olarak dondurulsun mu · ihalelere uygulanacak mı. Onaydan sonra: `eids/` modülü (arayüz + Mock + Live iskelet), durum makinesi, `eids_audit_log`, günlük iş, `GET /internal/egress-ip`, dry-run'lı geçiş betiği.
3. **Şirket e-postası ve telefonu** verilmedi; sitede `gesmarketim@gmail.com` görünüyor, telefon boş.
4. **SMTP yok:** şifre sıfırlama, e-posta doğrulama, yeni mesaj bildirimi, açılış duyurusu çalışmıyor. Sağlayıcı + ENV kararı gerekli; duyuru için İYS/ticari ileti izni hukukçuya sorulmalı.
5. **Railway:** Volume + `DATA_DIR` (yoksa ilan, üye, belge, profil fotoğrafı her dağıtımda silinir), `ADMIN_PASS`, `ADMIN_EMAIL`, `SESSION_SECRET`, `LISTINGS_PUBLISH_ENABLED=false`, isteğe bağlı `ANTHROPIC_API_KEY`; EİDS için sabit çıkış IP'si.
6. **Hukukçu:** KVKK, kullanım koşulları, ihale/teminat (gerçek para için lisanslı ödeme kuruluşu), EİDS sorumluluk maddesi.
7. **Canlı testler** bu ortamdan yapılamıyor: `/eids/callback` 200/400, kilitli panel.
8. Depodaki eski açık PR #1 (ajan ayarı): kapatılsın mı?

## Önerilen sıra

A1 → A2 → A3 → B1–B4 → C1+C2 → E3 → D3 → D1+D2 → F1 → F2 → F3 → F5 → F4 → G1.
E1, E2 ve H başlığı kullanıcı yanıtını bekler.
