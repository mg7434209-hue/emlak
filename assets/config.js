/**
 * İlan AI — TEK DOĞRU KAYNAK
 * Marka, iletişim, şehir/ilçe piyasa verileri ve yapay zekâ katsayıları
 * YALNIZCA burada tutulur. Sayfalara/JS'e elle gömülmez.
 */
window.EMLAK = window.EMLAK || {};
// ── Çizgi ikonlar (emoji YOK): EMLAK.icon("ad", "ek-sınıf") → satır içi SVG.
// Renk currentColor'dan gelir; boyut CSS'te .ic (1.1em). Yeni ikon = yalnız buraya satır.
EMLAK.ICONS = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-5.5h4V20"/>',
  building: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 7.5h2M13 7.5h2M9 11.5h2M13 11.5h2M9 15.5h2M13 15.5h2"/>',
  store: '<path d="M4 9.5 5.5 4h13L20 9.5"/><path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0"/><path d="M5 12.5V20h14v-7.5M10 20v-4.5h4V20"/>',
  land: '<path d="M12 21v-7"/><path d="M12 14c-3.5 0-5.5-2.5-5.5-5.5S9 3 12 3s5.5 2.5 5.5 5.5S15.500 14 12 14z"/><path d="M5 21h14"/>',
  car: '<path d="M5 16.5V12l1.8-4.5h10.4L19 12v4.5"/><path d="M3.5 12h17M5 16.5h14v2.5h-3v-2M8 16.500v2.500H5"/><circle cx="8" cy="14" r=".6"/><circle cx="16" cy="14" r=".6"/>',
  truck: '<path d="M3 6.5h11V16H3zM14 10h4l3 3v3h-7"/><circle cx="7.500" cy="17.500" r="1.800"/><circle cx="17" cy="17.500" r="1.800"/>',
  tag: '<path d="M3.500 12.500 12 4h7.500v7.500L11 20z"/><circle cx="15.500" cy="8.500" r="1.200"/>',
  sparkle: '<path d="M12 3.500 13.800 9l5.700 1.800-5.700 1.800L12 18.300l-1.800-5.700L4.500 10.800 10.200 9z"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11.500a6 6 0 0 0 12 0M12 17.500V21"/>',
  moon: '<path d="M20 14.500A8 8 0 0 1 9.500 4 8.500 8.500 0 1 0 20 14.500z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.500v2.200M12 19.300v2.200M2.500 12h2.200M19.300 12h2.200M5.200 5.200l1.600 1.600M17.200 17.200l1.600 1.600M5.200 18.800l1.600-1.600M17.200 6.800l1.600-1.600"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  pin: '<path d="M12 21s7-6 7-11.500a7 7 0 0 0-14 0C5 15 12 21 12 21z"/><circle cx="12" cy="9.500" r="2.500"/>',
  heart: '<path d="M12 20.500S4.500 16 4.500 10A4.300 4.300 0 0 1 12 7.300 4.300 4.300 0 0 1 19.500 10c0 6-7.500 10.500-7.500 10.500z"/>',
  bell: '<path d="M6 16.500V11a6 6 0 0 1 12 0v5.500l1.500 2h-15z"/><path d="M10 21a2 2 0 0 0 4 0"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.500 7.500 8.500 6 8.500-6"/>',
  phone: '<path d="M5 4h4l2 5-2.500 1.500a11 11 0 0 0 5 5L15 13l5 2v3.500a2 2 0 0 1-2 2A15.500 15.500 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  camera: '<path d="M4 8h3l1.800-2.500h6.400L17 8h3v11H4z"/><circle cx="12" cy="13.500" r="3.500"/>',
  star: '<path d="m12 3.500 2.700 5.500 6 .9-4.400 4.200 1 6L12 17.300 6.700 20.100l1-6L3.300 9.900l6-.9z"/>',
  eye: '<path d="M2.500 12S6 5.500 12 5.500 21.500 12 21.500 12 18 18.500 12 18.500 2.500 12 2.500 12z"/><circle cx="12" cy="12" r="3"/>',
  shield: '<path d="M12 3 19.500 6v6c0 4.500-3.200 7.500-7.500 9-4.300-1.500-7.500-4.500-7.500-9V6z"/><path d="m9 12 2.200 2.200L15.500 10"/>',
  flag: '<path d="M5.500 21V4M5.500 4.500h11l-2 3.700 2 3.800h-11"/>',
  gavel: '<path d="m14 4.500 6 6-3.500 3.500-6-6z"/><path d="m12.500 9.500-8 8a1.500 1.500 0 0 0 2.100 2.100l8-8"/><path d="M12 21h8"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5v2a3 3 0 0 0 3 3M16 6h3v2a3 3 0 0 1-3 3M12 13v4M8.500 20.500h7M10 17h4"/>',
  search: '<circle cx="11" cy="11" r="6.500"/><path d="m16 16 4.500 4.500"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.500M12 7.800v.2"/>',
  idcard: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6.500 16c.5-1.800 1.500-2.500 2.500-2.500s2 .7 2.500 2.500M14 10h4M14 13.500h3"/>',
  warn: '<path d="M12 4 21 19.500H3z"/><path d="M12 10v4.500M12 17v.2"/>',
  check: '<path d="m5 12.500 4.500 4.500L19 7.500"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  volume: '<path d="M4 9.500h3.500L12 6v12l-4.500-3.500H4z"/><path d="M15.500 9a4 4 0 0 1 0 6M18 6.500a7.500 7.500 0 0 1 0 11"/>',
  mute: '<path d="M4 9.500h3.500L12 6v12l-4.500-3.500H4z"/><path d="m16 9.500 5 5M21 9.500l-5 5"/>',
  inbox: '<path d="M4 13.500 6.500 5h11L20 13.500V19H4z"/><path d="M4 13.500h4.500a3.500 3.500 0 0 0 7 0H20"/>',
  send: '<path d="m21 3.500-9.500 17-2.500-7.500L1.500 10.500z"/><path d="M21 3.500 9 13"/>',
  bot: '<rect x="4" y="8" width="16" height="11" rx="3"/><path d="M12 4v4M9 13.500v.2M15 13.500v.2"/>',
  upload: '<path d="M12 16V5M7.500 9.500 12 5l4.500 4.500M5 19.500h14"/>',
  office: '<path d="M3.500 21h17M5 21V8l7-4 7 4v13M9 12h.2M12 12h.2M15 12h.2M9 16h.2M12 16h.2M15 16h.2"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="m5.600 5.600 12.800 12.800"/>',
  chat: '<path d="M4 5h16v11H9.500L4 20.500z"/>',
  pencil: '<path d="M4 20l1-4.500L16 4.500l3.500 3.500L8.500 19z"/><path d="m14 7 3.500 3.500"/>',
  image: '<rect x="3.500" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.600"/><path d="m4 17 5-4.500 4 3.500 3-2.500 4 3.500"/>',
  calendar: '<rect x="4" y="5.500" width="16" height="14.500" rx="2"/><path d="M4 10h16M8.500 3.500v4M15.500 3.500v4"/>'
};
EMLAK.icon = function (name, cls) {
  var p = EMLAK.ICONS[name];
  if (!p) return "";
  return '<svg class="ic' + (cls ? " " + cls : "") + '" viewBox="0 0 24 24" aria-hidden="true">' + p + "</svg>";
};
// Yer tutucu görsellerde tür → ikon (emoji yok)
EMLAK.kindIcon = function (kind) {
  var m = {
    daire: "building", residence: "building", bina: "building", ofis: "office", devremulk: "building", turistik: "building",
    villa: "home", mustakil: "home", yazlik: "home",
    dukkan: "store", depo: "store", fabrika: "office",
    arsa: "land", tarla: "land", bagbahce: "land", tarim: "land",
    otomobil: "car", suv: "car", elektrikli: "car", klasik: "car", motosiklet: "car", atv: "car", hasarli: "car", karavan: "car", deniz: "car",
    minivan: "truck", ticari: "truck", kamyon: "truck", otobus: "truck", ismakinesi: "truck"
  };
  return m[kind] || "tag";
};
EMLAK.config = {
  brand: {
    name: "İlan AI",
    tagline: "Yapay zekâ destekli taşınmaz ve araç ilan platformu",
    domain: "emlakai.example",
  },

  // ── Segmentler: taşınmaz (emlak) + araç (vasita) ────────────────────────
  segments: {
    emlak: { label: "Taşınmaz" },
    vasita: { label: "Araç" },
  },
  company: {
    // `title` görünen MARKA adıdır (İlan AI). Platformu İŞLETEN tüzel kişi aşağıdaki künyedir; footer, KVKK,
    // kullanım koşulları, çerez politikası, JSON-LD ve llms dosyaları BURADAN beslenir (npm run build).
    title: "İlan AI",
    legalName: "Gespa Enerji San. Tic. Ltd. Şti.",
    taxOffice: "Manavgat",           // "Manavgat V.D."
    taxNo: "3941259669",
    mersis: "0394125966900001",
    // Şimdilik İLETİŞİM YALNIZCA E-POSTA. 0800 hattı alınınca şu satırı doldurmak yeterli:
    //   phone: { display: "0800 000 00 00", intl: "+908000000000", wa: "" }  (wa boşsa WhatsApp düğmesi çıkmaz)
    // Boş (null/"") alanlar sitede, JSON-LD'de ve llms.txt'te HİÇ görünmez.
    phone: null,
    email: "gesmarketim@gmail.com",
    address: "Örnek Mah. 1551 Sk. No:10/Z1 Manavgat/ANTALYA",
  },

  // ── SEO / AEO — canonical, sitemap, JSON-LD ve llms.txt buradan üretilir ─
  // Özel alan adı alınınca yalnızca siteUrl'i güncelle ve `npm run build` çalıştır.
  seo: {
    siteUrl: "https://emlak-production.up.railway.app",
    ogImage: "/assets/img/og.png",
    locale: "tr_TR",
    sameAs: [],
    dataDate: "2026-07",
  },

  // ── İlan öne çıkarma ────────────────────────────────────────────────────
  featured: { label: "⭐ Öne Çıkan" },

  // ── Piyasa verisi: il → ilçe → ortalama satılık ₺/m² (konut) ─────────────
  // Kira ₺/m²/ay = satılık m² fiyatı × rentYieldMonthly
  // ── TÜRE ÖZEL İLAN ALANLARI (TEK KAYNAK) ───────────────────────────────
  // Arsada ada/parsel/imar, konutta kat/ısıtma/aidat gibi alanlar sorulur.
  // Tanım burada; formu `app.js` bu tanımdan çizer, ilanda `details` nesnesine
  // yazılır, detay künyesinde ve sunucu ön işlemesinde aynı etiketle görünür.
  // type: "select" (options zorunlu) · "text" · "number" · "bool"
  fieldDefs: {
    // — Arsa / arazi —
    imarDurumu: { label: "İmar Durumu", type: "select",
      hint: "Belediyeden alınan imar durum belgesine göre.", options: [
      "Konut İmarlı", "Ticari İmarlı", "Turizm İmarlı", "Sanayi İmarlı", "Tarla",
      "Bağ & Bahçe", "Zeytinlik", "Villa İmarlı", "İmarsız", "Belirtilmemiş"] },
    adaNo: { label: "Ada No", type: "text", max: 20, placeholder: "örn. 1453", section: "tapu",
      hint: "Tapu belgesinde ya da e-Devlet tapu bilgilerinde yazar." },
    parselNo: { label: "Parsel No", type: "text", max: 20, placeholder: "örn. 27", section: "tapu" },
    paftaNo: { label: "Pafta No", type: "text", max: 20, placeholder: "örn. K24", section: "tapu" },
    kaks: { label: "KAKS (Emsal)", type: "text", max: 20, placeholder: "örn. 0.30",
      hint: "İmar durum belgesindeki emsal oranı." },
    gabari: { label: "Gabari", type: "text", max: 20, placeholder: "örn. 6.50 m",
      hint: "İzin verilen en yüksek bina yüksekliği." },
    // — Konut / iş yeri —
    binaKat: { label: "Binadaki Kat Sayısı", type: "number", max: 100 },
    katNo: { label: "Bulunduğu Kat", type: "select", options: [
      "Bodrum", "Zemin", "Bahçe Katı", "Giriş Katı", "Yüksek Giriş", "1", "2", "3", "4", "5",
      "6-10 arası", "11-20 arası", "20 ve üzeri", "Çatı Katı", "Villa Tipi"] },
    isitma: { label: "Isıtma", type: "select", options: [
      "Kombi (Doğalgaz)", "Merkezi", "Merkezi (Pay Ölçer)", "Klima", "Soba", "Yerden Isıtma",
      "Şömine", "Güneş Enerjisi", "Isıtma Yok"] },
    banyoSayisi: { label: "Banyo Sayısı", type: "number", max: 10 },
    balkon: { label: "Balkon", type: "bool" },
    esyali: { label: "Eşyalı", type: "bool" },
    siteIcinde: { label: "Site İçerisinde", type: "bool" },
    siteAdi: { label: "Site Adı", type: "text", max: 60 },
    aidat: { label: "Aidat (₺/ay)", type: "number", max: 100000, placeholder: "örn. 1250" },
    kullanimDurumu: { label: "Kullanım Durumu", type: "select", options: [
      "Boş", "Kiracılı", "Mülk Sahibi Oturuyor"] },
    // — İş yeri —
    bolumSayisi: { label: "Bölüm / Oda Sayısı", type: "number", max: 100 },
    // — Bina —
    daireSayisi: { label: "Daire Sayısı", type: "number", max: 500 },
    // — Ortak (emlak) —
    tapuDurumu: { label: "Tapu Durumu", type: "select", section: "tapu", options: [
      "Kat Mülkiyetli", "Kat İrtifaklı", "Müstakil Tapulu", "Hisseli Tapu",
      "Arsa Tapulu", "Tarla Tapulu", "Bilinmiyor"] },
    krediyeUygun: { label: "Krediye Uygunluk", type: "select", section: "tapu", options: ["Evet", "Hayır", "Bilinmiyor"] },
    // Yeni ilanda "Hayır" hazır gelir (sahibinden gibi): çoğu ilan takassızdır, bir karar eksilir.
    takas: { label: "Takaslı", type: "select", section: "tapu", options: ["Evet", "Hayır"], default: "Hayır" },
    // Binalarda Enerji Performansı Yönetmeliği: satış/kiralamada Enerji Kimlik Belgesi sınıfı.
    enerjiSinifi: { label: "Enerji Kimlik Belgesi", type: "select", section: "tapu",
      options: ["A", "B", "C", "D", "E", "F", "G", "Belgesi yok"],
      hint: "Belgenizdeki enerji sınıfı. Belge yoksa “Belgesi yok” seçin." },
    // TAŞINMAZ NUMARASI — ZORUNLU (sahibinden.com ile aynı kural). Tapu senedinin
    // üzerinde ya da e-Devlet › Tapu Bilgilerim ekranında yazar. YALNIZ RAKAM.
    // Herkese açık yanıtlarda TAM GÖSTERİLMEZ (yalnız son 3 hane): numara açık olursa
    // başkasının taşınmazı için sahte ilan vermek kolaylaşır. pattern: rakam ya da
    // maskeleme noktası (•) — public liste maskeli geri okunabilsin diye.
    tasinmazNo: { label: "Taşınmaz Numarası", type: "text", max: 20, required: true, section: "tapu",
      pattern: "^[0-9•]{5,20}$", digits: [5, 12], inputmode: "numeric", placeholder: "örn. 103555719",
      hint: "Tapu senedinizin üzerinde ya da e-Devlet › Tapu Bilgilerim ekranında yazar. Yalnız rakam. Alıcılara tam görünmez (yalnız son 3 hane)." },
    // — Vasıta —
    renk: { label: "Renk", type: "select", options: [
      "Beyaz", "Siyah", "Gri", "Gümüş", "Kırmızı", "Mavi", "Lacivert", "Yeşil",
      "Kahverengi", "Bej", "Sarı", "Turuncu", "Diğer"] },
    kasaTipi: { label: "Kasa Tipi", type: "select", options: [
      "Sedan", "Hatchback", "Station Wagon", "SUV", "Coupe", "Cabrio", "MPV", "Pick-up", "Panelvan"] },
    motorHacmi: { label: "Motor Hacmi (cc)", type: "text", max: 20 },
    motorGucu: { label: "Motor Gücü (HP)", type: "text", max: 20 },
    cekis: { label: "Çekiş", type: "select", options: ["Önden Çekiş", "Arkadan İtiş", "4x4"] },
    hasarKaydi: { label: "Ağır Hasar Kaydı", type: "select", options: ["Yok", "Var", "Bilinmiyor"] },
    garanti: { label: "Garanti", type: "bool" },
    // — Diğer segmenti —
    urunDurumu: { label: "Ürün Durumu", type: "select", options: ["Sıfır", "İkinci El", "Yenilenmiş"] },
    garantiSuresi: { label: "Garanti Durumu", type: "select", options: ["Garantili", "Garantisiz"] },
  },

  // ── KATEGORİ AĞACI (TEK KAYNAK) ────────────────────────────────────────
  // Üç segment: emlak · vasita · diger. data.js KINDS'ı buradan üretir;
  // form, filtre, SEO slug'ı ve AI hep aynı listeyi görür.
  // `valuation:false` olan türde AI değerleme YAPILMAZ (piyasa verisi yok);
  // `fields` formda hangi alanların isteneceğini söyler.
  segments: [
    {
      segment: "emlak", label: "Emlak", short: "Taşınmaz", fields: "emlak",
      groups: [
        { label: "Konut",
          // NOT: Balkon / Eşyalı / Site İçi "Özellikler" kutucuklarında zaten var,
          // burada TEKRAR edilmez.
          fields: ["katNo", "binaKat", "banyoSayisi", "isitma", "siteAdi", "aidat", "kullanimDurumu",
                   "tapuDurumu", "tasinmazNo", "krediyeUygun", "takas", "enerjiSinifi"],
          kinds: [
          { kind: "daire", label: "Daire" },
          { kind: "residence", label: "Rezidans" },
          { kind: "villa", label: "Villa" },
          { kind: "mustakil", label: "Müstakil Ev" },
          { kind: "yazlik", label: "Yazlık" },
        ] },
        { label: "İş Yeri",
          fields: ["katNo", "binaKat", "bolumSayisi", "banyoSayisi", "isitma", "aidat", "kullanimDurumu",
                   "tapuDurumu", "tasinmazNo", "krediyeUygun", "takas", "enerjiSinifi"],
          kinds: [
          { kind: "dukkan", label: "Dükkan" },
          { kind: "ofis", label: "Ofis" },
          { kind: "depo", label: "Depo & Antrepo" },
          { kind: "fabrika", label: "Fabrika & Atölye" },
        ] },
        { label: "Arsa & Arazi",
          // sahibinden.com arsa formundaki alanlar: imar, ada/parsel/pafta, kaks, gabari
          fields: ["imarDurumu", "kaks", "gabari", "adaNo", "parselNo", "paftaNo",
                   "tapuDurumu", "tasinmazNo", "krediyeUygun", "takas"],
          kinds: [
          { kind: "arsa", label: "Arsa" },
          { kind: "tarla", label: "Tarla" },
          { kind: "bagbahce", label: "Bağ & Bahçe" },
        ] },
        { label: "Diğer Gayrimenkul",
          fields: ["binaKat", "daireSayisi", "isitma", "kullanimDurumu",
                   "tapuDurumu", "tasinmazNo", "krediyeUygun", "takas", "enerjiSinifi"],
          kinds: [
          { kind: "bina", label: "Komple Bina" },
          { kind: "devremulk", label: "Devre Mülk" },
          { kind: "turistik", label: "Turistik Tesis" },
        ] },
      ],
    },
    {
      segment: "vasita", label: "Vasıta", short: "Araç", fields: "vasita",
      groups: [
        { label: "Otomobil & Arazi",
          fields: ["renk", "kasaTipi", "motorHacmi", "motorGucu", "cekis", "hasarKaydi", "garanti", "takas"],
          kinds: [
          { kind: "otomobil", label: "Otomobil" },
          { kind: "suv", label: "Arazi, SUV & Pickup" },
          { kind: "elektrikli", label: "Elektrikli Araç" },
          { kind: "klasik", label: "Klasik Araç" },
        ] },
        { label: "Motosiklet",
          fields: ["renk", "motorHacmi", "motorGucu", "hasarKaydi", "garanti", "takas"],
          kinds: [
          { kind: "motosiklet", label: "Motosiklet" },
          { kind: "atv", label: "ATV & UTV" },
        ] },
        { label: "Ticari Araçlar",
          fields: ["renk", "kasaTipi", "motorHacmi", "motorGucu", "cekis", "hasarKaydi", "garanti", "takas"],
          kinds: [
          { kind: "minivan", label: "Minivan & Panelvan" },
          { kind: "ticari", label: "Ticari Araç" },
          { kind: "kamyon", label: "Kamyon & Kamyonet" },
          { kind: "otobus", label: "Otobüs & Midibüs" },
        ] },
        { label: "Diğer Araçlar",
          fields: ["renk", "motorHacmi", "hasarKaydi", "garanti", "takas"],
          kinds: [
          { kind: "karavan", label: "Karavan" },
          { kind: "deniz", label: "Deniz Aracı" },
          { kind: "hasarli", label: "Hasarlı Araç" },
        ] },
      ],
    },
    {
      // Emlak ve vasıta dışındaki her şey: AI değerleme uygulanmaz, form
      // sade tutulur (başlık, açıklama, fiyat, konum, fotoğraf).
      segment: "diger", label: "Diğer", short: "Diğer", fields: "sade",
      groups: [
        { label: "Alışveriş",
          fields: ["urunDurumu", "garantiSuresi", "takas"],
          kinds: [
          { kind: "ikinciel", label: "İkinci El & Sıfır Alışveriş", valuation: false },
          { kind: "yedekparca", label: "Yedek Parça & Aksesuar", valuation: false },
          { kind: "antika", label: "Antika & Koleksiyon", valuation: false },
        ] },
        { label: "Hizmet & İş",
          fields: [],
          kinds: [
          { kind: "hizmet", label: "Ustalar & Hizmetler", valuation: false },
          { kind: "ozelders", label: "Özel Ders", valuation: false },
          { kind: "isilani", label: "İş İlanı", valuation: false },
        ] },
        { label: "Sanayi & Tarım",
          fields: ["urunDurumu", "garantiSuresi", "takas"],
          kinds: [
          { kind: "ismakinesi", label: "İş Makineleri & Sanayi", valuation: false },
          { kind: "tarim", label: "Tarım & Hayvancılık Ekipmanı", valuation: false },
        ] },
        { label: "Hayvanlar",
          fields: [],
          kinds: [
          { kind: "hayvan", label: "Hayvanlar Alemi", valuation: false },
        ] },
      ],
    },
  ],

  // PİYASA VERİSİ KAPALI (31 Eki 2026): aşağıdaki ₺/m² tablosu (ve araç taban fiyatları, kira
  // getirisi, yıllık eğilim) kaynağı doğrulanmış GERÇEK veri DEĞİL, kaba tahmindir. Bunlardan
  // türetilen "Fırsat Fiyatı / Piyasa Üstü" etiketi, "AI Değerleme", fiyat önerisi, bölge fiyat sayfası,
  // trend grafiği ve kira/amortisman cümleleri yanıltıcı olacağı için sitede GÖSTERİLMEZ.
  // Gerçek bir veri kaynağı (TCMB konut fiyat endeksi, TKGM, lisanslı veri) eklenip tablo güncellenince
  // `enabled: true` yapılır; ilgili kod yerinde duruyor.
  marketData: { enabled: false },
  market: {
    rentYieldMonthly: 0.0042,
    // 81 İL · 474 ilçe · tahmini satılık konut ₺/m² (dönem: config.seo.dataDate).
    // Bölgesel piyasa ORTALAMASIDIR; kesin değer değildir. Güncelleme tek yerden:
    // burayı düzenle + `npm run build` (bolge-fiyatlari.html, llms dosyaları ve
    // değerleme motoru aynı kaynaktan beslenir).
    cities: {
      "Adana": {
        yieldTrend: 1.5,
        districts: {
          "Seyhan": 24000, "Çukurova": 36000, "Yüreğir": 18000,
          "Sarıçam": 22000, "Ceyhan": 15000, "Kozan": 13000,
        },
      },
      "Adıyaman": {
        yieldTrend: 1.2,
        districts: {
          "Merkez": 15000, "Kâhta": 11000, "Besni": 10000,
          "Gölbaşı": 11000,
        },
      },
      "Afyonkarahisar": {
        yieldTrend: 1.3,
        districts: {
          "Merkez": 17000, "Sandıklı": 11000, "Bolvadin": 10000,
          "Dinar": 10000, "Sinanpaşa": 9000,
        },
      },
      "Ağrı": {
        yieldTrend: 1.0,
        districts: {
          "Merkez": 11000, "Doğubayazıt": 10000, "Patnos": 9000,
          "Diyadin": 8000,
        },
      },
      "Aksaray": {
        yieldTrend: 1.2,
        districts: {
          "Merkez": 16000, "Ortaköy": 9000, "Eskil": 8500,
          "Gülağaç": 8000,
        },
      },
      "Amasya": {
        yieldTrend: 1.2,
        districts: {
          "Merkez": 17000, "Merzifon": 14000, "Suluova": 11000,
          "Taşova": 9000,
        },
      },
      "Ankara": {
        yieldTrend: 1.4,
        districts: {
          "Çankaya": 45000, "Keçiören": 26000, "Yenimahalle": 32000,
          "Etimesgut": 28000, "Mamak": 22000, "Gölbaşı": 30000,
          "Pursaklar": 22000, "Sincan": 21000, "Altındağ": 19000,
          "Polatlı": 16000, "Kahramankazan": 20000, "Beypazarı": 13000,
        },
      },
      "Antalya": {
        yieldTrend: 2.2,
        districts: {
          "Muratpaşa": 52000, "Konyaaltı": 68000, "Lara": 62000,
          "Manavgat": 40000, "Alanya": 47000, "Kepez": 30000,
          "Side": 55000, "Serik": 33000, "Kaş": 58000,
          "Kemer": 60000, "Belek": 52000, "Döşemealtı": 32000,
          "Gazipaşa": 28000, "Finike": 26000,
        },
      },
      "Ardahan": {
        yieldTrend: 1.0,
        districts: {
          "Merkez": 10000, "Göle": 8000, "Çıldır": 7500,
          "Posof": 7500,
        },
      },
      "Artvin": {
        yieldTrend: 1.3,
        districts: {
          "Merkez": 16000, "Hopa": 15000, "Arhavi": 16000,
          "Borçka": 12000, "Yusufeli": 11000,
        },
      },
      "Aydın": {
        yieldTrend: 1.8,
        districts: {
          "Efeler": 28000, "Kuşadası": 55000, "Didim": 42000,
          "Nazilli": 20000, "Söke": 24000, "Çine": 14000,
          "İncirliova": 17000,
        },
      },
      "Balıkesir": {
        yieldTrend: 1.7,
        districts: {
          "Altıeylül": 25000, "Karesi": 24000, "Edremit": 38000,
          "Ayvalık": 48000, "Burhaniye": 34000, "Bandırma": 28000,
          "Erdek": 40000, "Gönen": 18000,
        },
      },
      "Bartın": {
        yieldTrend: 1.3,
        districts: {
          "Merkez": 18000, "Amasra": 34000, "Ulus": 10000,
          "Kurucaşile": 13000,
        },
      },
      "Batman": {
        yieldTrend: 1.1,
        districts: {
          "Merkez": 15000, "Kozluk": 9000, "Sason": 8000,
          "Beşiri": 9000,
        },
      },
      "Bayburt": {
        yieldTrend: 1.0,
        districts: {
          "Merkez": 12000, "Demirözü": 8000, "Aydıntepe": 8000,
        },
      },
      "Bilecik": {
        yieldTrend: 1.2,
        districts: {
          "Merkez": 16000, "Bozüyük": 15000, "Söğüt": 11000,
          "Osmaneli": 13000,
        },
      },
      "Bingöl": {
        yieldTrend: 1.0,
        districts: {
          "Merkez": 12000, "Genç": 9000, "Solhan": 8500,
          "Karlıova": 8000,
        },
      },
      "Bitlis": {
        yieldTrend: 1.0,
        districts: {
          "Merkez": 11000, "Tatvan": 12000, "Ahlat": 10000,
          "Güroymak": 8500,
        },
      },
      "Bolu": {
        yieldTrend: 1.5,
        districts: {
          "Merkez": 24000, "Gerede": 14000, "Mudurnu": 15000,
          "Göynük": 13000, "Mengen": 11000,
        },
      },
      "Burdur": {
        yieldTrend: 1.2,
        districts: {
          "Merkez": 17000, "Bucak": 13000, "Gölhisar": 11000,
          "Yeşilova": 9000,
        },
      },
      "Bursa": {
        yieldTrend: 1.3,
        districts: {
          "Nilüfer": 38000, "Osmangazi": 28000, "Mudanya": 44000,
          "Yıldırım": 22000, "Gemlik": 26000, "İnegöl": 20000,
          "Gürsu": 24000, "Kestel": 23000, "Orhangazi": 19000,
          "İznik": 21000,
        },
      },
      "Çanakkale": {
        yieldTrend: 1.6,
        districts: {
          "Merkez": 32000, "Ayvacık": 30000, "Bozcaada": 75000,
          "Gökçeada": 45000, "Biga": 18000, "Çan": 15000,
          "Ezine": 17000,
        },
      },
      "Çankırı": {
        yieldTrend: 1.0,
        districts: {
          "Merkez": 13000, "Çerkeş": 8500, "Ilgaz": 10000,
          "Orta": 8000,
        },
      },
      "Çorum": {
        yieldTrend: 1.2,
        districts: {
          "Merkez": 17000, "Sungurlu": 11000, "Osmancık": 11000,
          "İskilip": 10000, "Alaca": 9000,
        },
      },
      "Denizli": {
        yieldTrend: 1.5,
        districts: {
          "Merkezefendi": 26000, "Pamukkale": 28000, "Çivril": 12000,
          "Acıpayam": 11000, "Tavas": 10000, "Sarayköy": 13000,
        },
      },
      "Diyarbakır": {
        yieldTrend: 1.2,
        districts: {
          "Kayapınar": 22000, "Bağlar": 14000, "Yenişehir": 20000,
          "Sur": 12000, "Ergani": 11000, "Bismil": 10000,
        },
      },
      "Düzce": {
        yieldTrend: 1.5,
        districts: {
          "Merkez": 24000, "Akçakoca": 30000, "Kaynaşlı": 16000,
          "Gölyaka": 17000,
        },
      },
      "Edirne": {
        yieldTrend: 1.3,
        districts: {
          "Merkez": 22000, "Keşan": 18000, "Uzunköprü": 14000,
          "İpsala": 11000, "Enez": 20000,
        },
      },
      "Elazığ": {
        yieldTrend: 1.2,
        districts: {
          "Merkez": 18000, "Kovancılar": 10000, "Karakoçan": 9000,
          "Palu": 8500,
        },
      },
      "Erzincan": {
        yieldTrend: 1.1,
        districts: {
          "Merkez": 16000, "Tercan": 9000, "Üzümlü": 11000,
          "Refahiye": 8500,
        },
      },
      "Erzurum": {
        yieldTrend: 1.2,
        districts: {
          "Yakutiye": 19000, "Palandöken": 22000, "Aziziye": 15000,
          "Horasan": 9000, "Oltu": 9500,
        },
      },
      "Eskişehir": {
        yieldTrend: 1.5,
        districts: {
          "Tepebaşı": 30000, "Odunpazarı": 28000, "Sivrihisar": 11000,
          "Çifteler": 10000, "Seyitgazi": 9000,
        },
      },
      "Gaziantep": {
        yieldTrend: 1.5,
        districts: {
          "Şahinbey": 24000, "Şehitkamil": 30000, "Oğuzeli": 14000,
          "Nizip": 13000, "İslahiye": 11000,
        },
      },
      "Giresun": {
        yieldTrend: 1.4,
        districts: {
          "Merkez": 22000, "Bulancak": 20000, "Espiye": 16000,
          "Tirebolu": 17000, "Görele": 16000,
        },
      },
      "Gümüşhane": {
        yieldTrend: 1.0,
        districts: {
          "Merkez": 13000, "Kelkit": 9000, "Şiran": 8500,
          "Torul": 10000,
        },
      },
      "Hakkâri": {
        yieldTrend: 1.0,
        districts: {
          "Merkez": 11000, "Yüksekova": 10000, "Şemdinli": 8000,
          "Çukurca": 7500,
        },
      },
      "Hatay": {
        yieldTrend: 1.4,
        districts: {
          "Antakya": 20000, "İskenderun": 26000, "Defne": 18000,
          "Dörtyol": 19000, "Samandağ": 18000, "Arsuz": 26000,
          "Kırıkhan": 14000,
        },
      },
      "Iğdır": {
        yieldTrend: 1.0,
        districts: {
          "Merkez": 11000, "Tuzluca": 8000, "Aralık": 8500,
          "Karakoyunlu": 8000,
        },
      },
      "Isparta": {
        yieldTrend: 1.3,
        districts: {
          "Merkez": 20000, "Eğirdir": 22000, "Yalvaç": 11000,
          "Şarkikaraağaç": 9500, "Gelendost": 9000,
        },
      },
      "İstanbul": {
        yieldTrend: 1.9,
        districts: {
          "Kadıköy": 95000, "Beşiktaş": 125000, "Üsküdar": 78000,
          "Maltepe": 56000, "Kartal": 48000, "Esenyurt": 27000,
          "Bakırköy": 98000, "Sarıyer": 110000, "Şişli": 88000,
          "Beyoğlu": 72000, "Ataşehir": 72000, "Pendik": 42000,
          "Tuzla": 40000, "Beylikdüzü": 38000, "Büyükçekmece": 42000,
          "Bahçelievler": 52000, "Bağcılar": 38000, "Küçükçekmece": 40000,
          "Zeytinburnu": 58000, "Fatih": 55000, "Eyüpsultan": 46000,
          "Sancaktepe": 34000, "Ümraniye": 52000, "Çekmeköy": 44000,
          "Beykoz": 65000, "Başakşehir": 45000, "Avcılar": 36000,
          "Sultanbeyli": 28000, "Esenler": 30000, "Gaziosmanpaşa": 32000,
          "Arnavutköy": 26000, "Silivri": 28000, "Şile": 38000,
          "Adalar": 90000,
        },
      },
      "İzmir": {
        yieldTrend: 1.7,
        districts: {
          "Karşıyaka": 52000, "Bornova": 42000, "Konak": 46000,
          "Çeşme": 95000, "Urla": 78000, "Buca": 33000,
          "Bayraklı": 40000, "Gaziemir": 42000, "Balçova": 48000,
          "Narlıdere": 50000, "Güzelbahçe": 58000, "Karabağlar": 32000,
          "Menemen": 26000, "Torbalı": 25000, "Seferihisar": 52000,
          "Foça": 56000, "Dikili": 38000, "Ödemiş": 16000,
          "Bergama": 16000,
        },
      },
      "Kahramanmaraş": {
        yieldTrend: 1.3,
        districts: {
          "Onikişubat": 20000, "Dulkadiroğlu": 16000, "Elbistan": 12000,
          "Afşin": 10000, "Pazarcık": 9000,
        },
      },
      "Karabük": {
        yieldTrend: 1.2,
        districts: {
          "Merkez": 17000, "Safranbolu": 24000, "Yenice": 10000,
          "Eskipazar": 9000,
        },
      },
      "Karaman": {
        yieldTrend: 1.2,
        districts: {
          "Merkez": 16000, "Ermenek": 9000, "Ayrancı": 8000,
          "Sarıveliler": 8000,
        },
      },
      "Kars": {
        yieldTrend: 1.0,
        districts: {
          "Merkez": 12000, "Sarıkamış": 13000, "Kağızman": 8500,
          "Selim": 8000,
        },
      },
      "Kastamonu": {
        yieldTrend: 1.2,
        districts: {
          "Merkez": 17000, "Tosya": 10000, "Taşköprü": 10000,
          "İnebolu": 16000, "Cide": 15000,
        },
      },
      "Kayseri": {
        yieldTrend: 1.4,
        districts: {
          "Melikgazi": 26000, "Kocasinan": 22000, "Talas": 28000,
          "İncesu": 14000, "Develi": 11000, "Hacılar": 16000,
        },
      },
      "Kırıkkale": {
        yieldTrend: 1.1,
        districts: {
          "Merkez": 15000, "Yahşihan": 12000, "Keskin": 9000,
          "Delice": 8000,
        },
      },
      "Kırklareli": {
        yieldTrend: 1.3,
        districts: {
          "Merkez": 19000, "Lüleburgaz": 18000, "Babaeski": 13000,
          "Vize": 13000, "Demirköy": 14000,
        },
      },
      "Kırşehir": {
        yieldTrend: 1.1,
        districts: {
          "Merkez": 15000, "Kaman": 10000, "Mucur": 9500,
          "Çiçekdağı": 8000,
        },
      },
      "Kilis": {
        yieldTrend: 1.1,
        districts: {
          "Merkez": 13000, "Musabeyli": 8000, "Elbeyli": 8000,
          "Polateli": 8000,
        },
      },
      "Kocaeli": {
        yieldTrend: 1.6,
        districts: {
          "İzmit": 32000, "Gebze": 34000, "Darıca": 33000,
          "Çayırova": 30000, "Körfez": 26000, "Gölcük": 28000,
          "Başiskele": 29000, "Kartepe": 27000, "Kandıra": 18000,
        },
      },
      "Konya": {
        yieldTrend: 1.4,
        districts: {
          "Selçuklu": 26000, "Meram": 22000, "Karatay": 20000,
          "Ereğli": 13000, "Akşehir": 12000, "Beyşehir": 13000,
          "Seydişehir": 11000,
        },
      },
      "Kütahya": {
        yieldTrend: 1.2,
        districts: {
          "Merkez": 17000, "Tavşanlı": 11000, "Simav": 11000,
          "Gediz": 9500, "Emet": 9000,
        },
      },
      "Malatya": {
        yieldTrend: 1.2,
        districts: {
          "Battalgazi": 16000, "Yeşilyurt": 21000, "Doğanşehir": 9000,
          "Akçadağ": 8500, "Darende": 9000,
        },
      },
      "Manisa": {
        yieldTrend: 1.4,
        districts: {
          "Yunusemre": 22000, "Şehzadeler": 20000, "Turgutlu": 18000,
          "Akhisar": 16000, "Salihli": 15000, "Alaşehir": 12000,
          "Soma": 11000,
        },
      },
      "Mardin": {
        yieldTrend: 1.2,
        districts: {
          "Artuklu": 18000, "Kızıltepe": 12000, "Midyat": 13000,
          "Nusaybin": 10000, "Derik": 9000,
        },
      },
      "Mersin": {
        yieldTrend: 1.7,
        districts: {
          "Yenişehir": 32000, "Mezitli": 34000, "Toroslar": 22000,
          "Akdeniz": 20000, "Erdemli": 26000, "Silifke": 22000,
          "Tarsus": 19000, "Anamur": 22000,
        },
      },
      "Muğla": {
        yieldTrend: 2.1,
        districts: {
          "Bodrum": 85000, "Marmaris": 62000, "Fethiye": 58000,
          "Menteşe": 36000, "Datça": 70000, "Milas": 30000,
          "Ortaca": 34000, "Dalaman": 32000, "Köyceğiz": 30000,
          "Seydikemer": 26000,
        },
      },
      "Muş": {
        yieldTrend: 1.0,
        districts: {
          "Merkez": 11000, "Bulanık": 8500, "Malazgirt": 8000,
          "Varto": 8000,
        },
      },
      "Nevşehir": {
        yieldTrend: 1.4,
        districts: {
          "Merkez": 18000, "Ürgüp": 30000, "Avanos": 24000,
          "Göreme": 38000, "Gülşehir": 11000,
        },
      },
      "Niğde": {
        yieldTrend: 1.1,
        districts: {
          "Merkez": 15000, "Bor": 10000, "Çamardı": 9000,
          "Ulukışla": 8000,
        },
      },
      "Ordu": {
        yieldTrend: 1.4,
        districts: {
          "Altınordu": 26000, "Ünye": 24000, "Fatsa": 22000,
          "Perşembe": 20000, "Gölköy": 11000,
        },
      },
      "Osmaniye": {
        yieldTrend: 1.2,
        districts: {
          "Merkez": 16000, "Kadirli": 11000, "Düziçi": 10000,
          "Bahçe": 9000,
        },
      },
      "Rize": {
        yieldTrend: 1.5,
        districts: {
          "Merkez": 28000, "Çayeli": 22000, "Ardeşen": 22000,
          "Pazar": 21000, "Fındıklı": 21000, "Çamlıhemşin": 24000,
        },
      },
      "Sakarya": {
        yieldTrend: 1.5,
        districts: {
          "Serdivan": 30000, "Adapazarı": 26000, "Erenler": 24000,
          "Sapanca": 40000, "Karasu": 28000, "Hendek": 20000,
          "Akyazı": 18000,
        },
      },
      "Samsun": {
        yieldTrend: 1.4,
        districts: {
          "Atakum": 32000, "İlkadım": 24000, "Canik": 20000,
          "Bafra": 15000, "Çarşamba": 15000, "Terme": 13000,
        },
      },
      "Siirt": {
        yieldTrend: 1.0,
        districts: {
          "Merkez": 12000, "Kurtalan": 9000, "Pervari": 8000,
          "Baykan": 8000,
        },
      },
      "Sinop": {
        yieldTrend: 1.3,
        districts: {
          "Merkez": 24000, "Gerze": 16000, "Ayancık": 13000,
          "Boyabat": 11000, "Türkeli": 13000,
        },
      },
      "Sivas": {
        yieldTrend: 1.1,
        districts: {
          "Merkez": 17000, "Şarkışla": 9000, "Suşehri": 9500,
          "Zara": 8500, "Gemerek": 8500,
        },
      },
      "Şanlıurfa": {
        yieldTrend: 1.2,
        districts: {
          "Haliliye": 20000, "Karaköprü": 22000, "Eyyübiye": 13000,
          "Siverek": 11000, "Viranşehir": 10000, "Birecik": 11000,
        },
      },
      "Şırnak": {
        yieldTrend: 1.0,
        districts: {
          "Merkez": 11000, "Cizre": 10000, "Silopi": 9500,
          "İdil": 8000,
        },
      },
      "Tekirdağ": {
        yieldTrend: 1.6,
        districts: {
          "Süleymanpaşa": 30000, "Çorlu": 26000, "Çerkezköy": 24000,
          "Kapaklı": 22000, "Marmaraereğlisi": 26000, "Malkara": 14000,
          "Şarköy": 30000,
        },
      },
      "Tokat": {
        yieldTrend: 1.1,
        districts: {
          "Merkez": 16000, "Turhal": 11000, "Erbaa": 12000,
          "Niksar": 11000, "Zile": 10000,
        },
      },
      "Trabzon": {
        yieldTrend: 1.6,
        districts: {
          "Ortahisar": 32000, "Yomra": 30000, "Akçaabat": 30000,
          "Araklı": 22000, "Of": 22000, "Vakfıkebir": 20000,
          "Sürmene": 21000,
        },
      },
      "Tunceli": {
        yieldTrend: 1.0,
        districts: {
          "Merkez": 13000, "Pertek": 9000, "Çemişgezek": 8500,
          "Ovacık": 8500,
        },
      },
      "Uşak": {
        yieldTrend: 1.2,
        districts: {
          "Merkez": 18000, "Banaz": 10000, "Eşme": 9000,
          "Sivaslı": 8500,
        },
      },
      "Van": {
        yieldTrend: 1.2,
        districts: {
          "İpekyolu": 16000, "Edremit": 20000, "Tuşba": 17000,
          "Erciş": 11000, "Gevaş": 11000,
        },
      },
      "Yalova": {
        yieldTrend: 1.8,
        districts: {
          "Merkez": 34000, "Çınarcık": 38000, "Termal": 36000,
          "Armutlu": 40000, "Çiftlikköy": 30000, "Altınova": 26000,
        },
      },
      "Yozgat": {
        yieldTrend: 1.0,
        districts: {
          "Merkez": 14000, "Sorgun": 11000, "Akdağmadeni": 9000,
          "Boğazlıyan": 9000,
        },
      },
      "Zonguldak": {
        yieldTrend: 1.2,
        districts: {
          "Merkez": 20000, "Ereğli": 22000, "Çaycuma": 14000,
          "Devrek": 13000, "Alaplı": 16000,
        },
      },
    }
  },

  // ── AI değerleme katsayıları ─────────────────────────────────────────────
  // Katsayılar özellikle ilanı "uçuk" biçimde yukarı taşımayacak şekilde
  // kontrollüdür. Model ilçe referansını temel alır; mülk tipi, yaş ve
  // özellikler yalnızca sınırlı düzeltme yapar.
  valuation: {
    // Tür çarpanları (emlak). Listede OLMAYAN tür için 1.0 kullanılır;
    // `config.segments` içinde valuation:false olan türlerde değerleme hiç
    // çalışmaz (ör. "Diğer" segmenti).
    kind: {
      daire: 1.0, residence: 1.08, villa: 1.05, mustakil: 1.08, yazlik: 1.06,
      dukkan: 1.12, ofis: 1.05, depo: 0.7, fabrika: 0.75,
      arsa: 0.45, tarla: 0.04, bagbahce: 0.09,
      bina: 0.95, devremulk: 0.6, turistik: 1.0,
    },
    age: [ // [maksYaş, çarpan]
      [0, 1.10], [5, 1.05], [10, 1.0], [20, 0.95], [30, 0.92], [999, 0.86],
    ],
    floorBonus: { zemin: 0.97, ara: 1.0, ust: 1.03, cati: 0.98, bahce: 1.02 },
    roomFactor: { "1+0": 1.04, "1+1": 1.02, "2+1": 1.0, "3+1": 0.99, "4+1": 0.98, "5+2": 0.97 },
    features: {
      "Deniz Manzarası": 8, "Havuz": 4, "Otopark": 2, "Asansör": 2,
      "Güvenlik": 2, "Balkon": 1, "Eşyalı": 3, "Akıllı Ev": 3,
      "Isı Yalıtımı": 2, "Site İçi": 3, "Doğalgaz": 1, "Jeneratör": 1,
    },
    // ARSA/ARAZİ ÖLÇEK ETKİSİ: birim fiyat parsel büyüdükçe düşer (5 dönüm
    // tarla, 500 m² arsanın 10 katı etmez). refArea üzerindeki alanlarda
    // çarpan = (refArea / alan) ^ decay, minFactor'da taban yapar.
    landSize: { refArea: 1000, decay: 0.35, minFactor: 0.25 },
    confidence: 0.12,
    fairBand: 0.07,
  },

  // ── Araç piyasa verisi & değerleme katsayıları ──────────────────────────
  vehicles: {
    brands: {
      "Renault":    { "Clio": 1150000, "Megane": 1750000, "Duster": 1950000 },
      "Fiat":       { "Egea": 1250000, "Egea Cross": 1550000 },
      "Toyota":     { "Corolla": 1950000, "C-HR": 2550000 },
      "Volkswagen": { "Polo": 1650000, "Passat": 3450000, "Tiguan": 3950000 },
      "Ford":       { "Focus": 1900000, "Puma": 2350000 },
      "Hyundai":    { "i20": 1400000, "Tucson": 3150000 },
      "Honda":     { "Civic": 2250000 },
      "Peugeot":    { "208": 1550000, "3008": 3250000 },
      "BMW":        { "3 Serisi": 4850000, "X3": 6500000 },
      "Mercedes":   { "C Serisi": 5250000, "E Serisi": 7300000 },
      "Tesla":      { "Model Y": 3250000 },
    },
    ageCurve: [ [0, 0.97], [1, 0.88], [3, 0.76], [5, 0.65], [8, 0.52], [12, 0.40], [99, 0.28] ],
    kmNormPerYear: 15000,
    kmEffectPer10k: 1.2,
    kmEffectCapPct: 18,
    fuelFactor: { "Benzin": 1, "Dizel": 1.03, "LPG & Benzin": 0.96, "Hibrit": 1.06, "Elektrik": 1.08 },
    gearFactor: { "Otomatik": 1.04, "Manuel": 1 },
    rentDailyFactor: 0.0011,
    fuels: ["Benzin", "Dizel", "LPG & Benzin", "Hibrit", "Elektrik"],
    gears: ["Otomatik", "Manuel"],
    minYear: 2008,
  },

  // ── Kredi hesaplayıcı varsayılanları ────────────────────────────────────
  credit: {
    defaultRate: 2.89, maxLtv: 0.8, terms: [60, 120, 180, 240],
    vehicle: { defaultRate: 3.15, maxLtv: 0.7, terms: [12, 24, 36, 48] },
  },

  // ── Yayın onayı (moderasyon) ────────────────────────────────────────────
  // İHALE (açık artırma): UYAP usulü süre uzatma + iade edilebilir teminat.
  // Teminat parası PİLOTTA sitede tutulmaz; yönetici havale/EFT'yi görünce onaylar.
  auction: {
    extendMin: 3,            // bitişe bu kadar dakikadan az kala gelen teklif süreyi tamamlar
    maxExtendMin: 60,        // toplam uzatma üst sınırı (1 saat)
    depositPctMin: 5,        // teminat = başlangıç bedelinin %5–%10'u
    depositPctMax: 10,
    minDurationHours: 1,
    maxDurationDays: 30,
    depositInfo: "",         // havale/EFT bilgisi (IBAN, alıcı). Boşsa yönetici size iletir.
    payDays: 10,             // kazanan, kalan bedeli bu kadar gün içinde öder; tapu/devir ödemeyle yapılır
    docMaxMB: 5,             // yüklenen belge başına üst sınır (PDF, JPG, PNG, WEBP)
    // Satıcıdan ZORUNLU belgeler: yönetici hepsini inceleyip onaylamadan ihale yayına girmez.
    // Belgeler herkese AÇIK DEĞİLDİR; yalnız satıcı ve yönetici görür (KVKK).
    docs: {
      emlak: [
        { key: "tapu", label: "Tapu senedi ya da tapu kayıt örneği" },
        { key: "takyidat", label: "Takyidat belgesi (haciz, ipotek, şerh, ihtiyati tedbir kayıtları)" },
        { key: "icra", label: "İcra / borç durumu belgesi (icra kaydı olmadığını gösteren belge)" },
      ],
      vasita: [
        { key: "ruhsat", label: "Araç ruhsatı" },
        { key: "takyidat", label: "Haciz / rehin kaydı belgesi" },
        { key: "icra", label: "İcra / borç durumu belgesi (icra kaydı olmadığını gösteren belge)" },
      ],
      diger: [
        { key: "mulkiyet", label: "Mülkiyet belgesi (fatura, sözleşme vb.)" },
        { key: "icra", label: "İcra / haciz durumu belgesi" },
      ],
    },
  },
  // ÜYE ÇAĞRISI (emlakçı / galerici duyurusu): yalnız ilan yayınlama KİLİTLİyken (sunucu LISTINGS_PUBLISH_ENABLED=false) görünür.
  // Tarih SÖZÜ VERİLMEZ: EİDS onayı Bakanlığa bağlıdır. Kapatmak: enabled:false.
  launch: {
    enabled: true,
    text: "Emlakçılar ve galericiler: ilan yayınlama, Ticaret Bakanlığı EİDS entegrasyonu tamamlandığında başlayacak. Şimdi ücretsiz üye olun; hesabınızı ve yetki belgenizi hazırlayın.",
    textMember: "İlan yayınlama, Ticaret Bakanlığı EİDS entegrasyonu tamamlandığında başlayacak. Hesabınız hazır; emlak ofisleri için hazırlık rehberine göz atın.",
    notice: "İlan yayınlama şu an kapalı: ilanınız taslak olarak kaydedilir ve EİDS entegrasyonu tamamlanana kadar yayınlanamaz. Hazırlığınızı şimdiden yapabilirsiniz.",
  },
  moderation: {
    seedStatus: "pending",
    adminAutoPublish: false,   // KALDIRILDI: yönetici dahil hiçbir ilan doğrudan yayına girmez (kod bu ayarı artık okumaz)
    // İLAN ŞİKAYETİ: farklı kişilerden bu kadar açık şikayet gelince ilan
    // kendiliğinden yayından çekilip yönetici incelemesine ("pending") düşer.
    reportThreshold: 3,
    reportReasons: [
      "Dolandırıcılık şüphesi / kapora istiyor",
      "İlan gerçek değil / satılmış",
      "Yanlış fiyat ya da yanıltıcı bilgi",
      "Fotoğraflar başka ilandan / alakasız",
      "Yanlış kategori",
      "Uygunsuz içerik",
      "Diğer",
    ],
  },
  // İlan detayındaki güvenli alışveriş uyarıları (segment başına)
  safety: {
    emlak: [
      "Görmediğiniz taşınmaz için kapora ya da ön ödeme GÖNDERMEYİN.",
      "Tapu bilgisini e-Devlet › Tapu Bilgilerim ya da tapu müdürlüğünden doğrulayın.",
      "Ödemeyi tapu devri sırasında, resmî kanallardan yapın.",
    ],
    vasita: [
      "Görmediğiniz araç için kapora ya da ön ödeme GÖNDERMEYİN.",
      "Satın almadan önce bağımsız ekspertiz yaptırın ve hasar kaydını sorgulayın.",
      "Satışı noterde yapın; ödemeyi noter işlemi sırasında gerçekleştirin.",
    ],
    diger: [
      "Görmediğiniz ürün için ön ödeme GÖNDERMEYİN; elden teslimde kontrol edin.",
      "Kargo ile alımda güvenli ödeme yöntemlerini tercih edin.",
    ],
  },

  // ── Fotoğraf yükleme kuralları (ilan-ver + yönetim düzenleyicisi) ───────
  // Fotoğraf yükleme + DEPOLAMA KOTASI (tek kaynak; app.js ve server.js okur).
  // Amaç: onlarca üye ilan verdiğinde disk kontrolden çıkmasın.
  //  1) İstemci fotoğrafı küçültür ve `targetKB` altına inene kadar kaliteyi
  //     düşürür (WebP destekleniyorsa çok daha küçük dosya çıkar).
  //  2) Sunucu tek fotoğraf (maxStoredKB), ilan, ÜYE ve SİTE toplamı için
  //     sert sınır uygular; sınır aşılırsa fotoğraf yazılmaz ve kullanıcıya
  //     nedeni söylenir.
  upload: {
    maxPhotos: 12,          // profesyonel ilan: dış cephe + her oda + manzara
    maxFileMB: 15,          // seçilebilecek ham dosya sınırı
    maxWidth: 1400,         // küçültme sonrası en fazla genişlik (px)
    quality: 0.82,          // başlangıç sıkıştırma kalitesi
    minQuality: 0.5,        // hedefe inmek için düşülebilecek en düşük kalite
    targetKB: 320,          // istemcinin hedeflediği fotoğraf başına boyut
    preferWebp: true,       // destekleniyorsa WebP (JPEG'e göre ~%40 küçük)
    maxStoredKB: 900,       // sunucunun kabul ettiği fotoğraf başına üst sınır
    accept: ["image/jpeg", "image/png", "image/webp", "image/bmp", "image/x-ms-bmp"],
    acceptLabel: "JPG · PNG · WEBP · BMP",
    quota: {
      perListingMB: 6,      // tek ilanın tüm fotoğrafları (12 × ~320 KB + pay)
      perUserMB: 40,        // bir üyenin tüm ilanları toplamı
      totalGB: 2,           // sitenin tamamı (disk/Volume koruması)
      warnPct: 80,          // panelde uyarı eşiği (%)
    },
  },

  // ── AI İlan Stüdyosu (ilan-ver.html · assets/studio.js · ai-studio.js) ──
  // Karışık metin + sıralanmamış fotoğraf → yayına hazır ilan. Tarayıcı
  // analizi her zaman çalışır; sunucuda ANTHROPIC_API_KEY varsa fotoğraflar
  // ayrıca Claude ile "görülerek" etiketlenir (oda, kalite, kapak, açıklama).
  studio: {
    maxInputPhotos: 30,     // stüdyoya bırakılabilecek ham fotoğraf
    minPhotos: 2,           // hazırlık puanında "yeterli fotoğraf" eşiği
    dupDistance: 6,         // dHash farkı ≤ bu ise "benzer kare" sayılır
    vibrance: 0.18,         // iyileştirme: canlılık (doğal kalsın, abartma)
    sharpen: 0.35,          // iyileştirme: keskinleştirme miktarı
    saleMinPrice: 250000,   // kategori yazılmadıysa: bu tutar üstü "satılık" tahmini
    maxNotes: 8,            // açıklamaya taşınacak satıcı notu sayısı
    maxTextChars: 6000,
    aiImageMax: 896,        // Claude'a gönderilen kopyanın uzun kenarı (px)
    aiMaxImages: 12,
    aiPerHour: 12,          // üye başına saatlik AI analizi
    aiBodyMB: 8,
    aiEffort: "medium",
  },

  // ── AI asistan ayarları ─────────────────────────────────────────────────
  assistant: { name: "EVA", maxResults: 6 },

  // ── Yönetim paneli (admin.html) ─────────────────────────────────────────
  // Yönetici şifresi BURADA TUTULMAZ (repo açık olabilir): Railway ortam değişkeni ADMIN_PASS.
  admin: {},
};
