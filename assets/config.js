/**
 * EmlakAI — TEK DOĞRU KAYNAK
 * Marka, iletişim, şehir/ilçe piyasa verileri ve yapay zekâ katsayıları
 * YALNIZCA burada tutulur. Sayfalara/JS'e elle gömülmez.
 */
window.EMLAK = window.EMLAK || {};
EMLAK.config = {
  brand: {
    name: "EmlakAI",
    tagline: "Yapay zekâ destekli taşınmaz ve araç ilan platformu",
    domain: "emlakai.example",
  },

  // ── Segmentler: taşınmaz (emlak) + araç (vasita) ────────────────────────
  segments: {
    emlak: { label: "Taşınmaz" },
    vasita: { label: "Araç" },
  },
  company: {
    title: "EmlakAI Teknoloji Ltd. Şti.",
    phone: { display: "0543 743 42 09", intl: "+905437434209", wa: "905437434209" },
    email: "gesmarketim@gmail.com",
    address: "Örnek Mah. 1551 Sok. No:10/1, Manavgat / Antalya",
  },

  // ── SEO / AEO — canonical, sitemap, JSON-LD ve llms.txt buradan üretilir ─
  // Özel alan adı alınınca yalnızca siteUrl'i güncelle ve `npm run build` çalıştır.
  seo: {
    siteUrl: "https://mg7434209-hue.github.io/emlak",
    ogImage: "/assets/img/og.png",
    locale: "tr_TR",
    sameAs: [], // sosyal medya profilleri eklendikçe buraya
    dataDate: "2026-07", // piyasa verisinin referans dönemi (llms.txt + Dataset)
  },

  // ── İlan öne çıkarma ────────────────────────────────────────────────────
  featured: { label: "⭐ Öne Çıkan" },

  // ── Piyasa verisi: il → ilçe → ortalama satılık ₺/m² (konut) ─────────────
  // Kira ₺/m²/ay = satılık m² fiyatı × rentYieldMonthly
  market: {
    rentYieldMonthly: 0.0042, // aylık brüt kira getirisi oranı
    cities: {
      "İstanbul": {
        yieldTrend: 1.9, // yıllık % reel değer artış eğilimi (AI trend grafiği için)
        districts: {
          "Kadıköy": 95000, "Beşiktaş": 125000, "Üsküdar": 78000,
          "Maltepe": 56000, "Kartal": 48000, "Esenyurt": 27000,
          "Bakırköy": 98000, "Sarıyer": 110000,
        },
      },
      "Ankara": {
        yieldTrend: 1.4,
        districts: {
          "Çankaya": 45000, "Keçiören": 26000, "Yenimahalle": 32000,
          "Etimesgut": 28000, "Mamak": 22000,
        },
      },
      "İzmir": {
        yieldTrend: 1.7,
        districts: {
          "Karşıyaka": 52000, "Bornova": 42000, "Konak": 46000,
          "Çeşme": 95000, "Urla": 78000, "Buca": 33000,
        },
      },
      "Antalya": {
        yieldTrend: 2.2,
        districts: {
          "Muratpaşa": 52000, "Konyaaltı": 68000, "Lara": 62000,
          "Manavgat": 40000, "Alanya": 47000, "Kepez": 30000, "Side": 55000,
        },
      },
      "Bursa": {
        yieldTrend: 1.3,
        districts: {
          "Nilüfer": 38000, "Osmangazi": 28000, "Mudanya": 44000, "Yıldırım": 22000,
        },
      },
    },
  },

  // ── AI değerleme katsayıları ─────────────────────────────────────────────
  valuation: {
    kind: { daire: 1.0, residence: 1.18, villa: 1.55, mustakil: 1.25, dukkan: 1.35, ofis: 1.10, arsa: 0.45 },
    age: [ // [maksYaş, çarpan]
      [0, 1.15], [5, 1.08], [10, 1.0], [20, 0.92], [30, 0.84], [999, 0.75],
    ],
    floorBonus: { zemin: 0.94, ara: 1.0, ust: 1.04, cati: 0.97, bahce: 1.02 },
    roomFactor: { "1+0": 1.06, "1+1": 1.03, "2+1": 1.0, "3+1": 0.97, "4+1": 0.95, "5+2": 0.93 },
    features: { // her özelliğin değere katkısı (%)
      "Deniz Manzarası": 12, "Havuz": 7, "Otopark": 4, "Asansör": 3,
      "Güvenlik": 4, "Balkon": 2, "Eşyalı": 5, "Akıllı Ev": 6,
      "Isı Yalıtımı": 3, "Site İçi": 5, "Doğalgaz": 2, "Jeneratör": 2,
    },
    confidence: 0.08, // ± bant genişliği (%8)
    fairBand: 0.07,   // piyasa uygunu bandı (±%7) — AI fiyat etiketi
  },

  // ── Araç piyasa verisi & değerleme katsayıları ──────────────────────────
  // brands: marka → model → sıfır km liste fiyatı (₺, referans dönem seo.dataDate)
  vehicles: {
    brands: {
      "Renault":    { "Clio": 1150000, "Megane": 1750000, "Duster": 1950000 },
      "Fiat":       { "Egea": 1250000, "Egea Cross": 1550000 },
      "Toyota":     { "Corolla": 1950000, "C-HR": 2550000 },
      "Volkswagen": { "Polo": 1650000, "Passat": 3450000, "Tiguan": 3950000 },
      "Ford":       { "Focus": 1900000, "Puma": 2350000 },
      "Hyundai":    { "i20": 1400000, "Tucson": 3150000 },
      "Honda":      { "Civic": 2250000 },
      "Peugeot":    { "208": 1550000, "3008": 3250000 },
      "BMW":        { "3 Serisi": 4850000, "X3": 6500000 },
      "Mercedes":   { "C Serisi": 5250000, "E Serisi": 7300000 },
      "Tesla":      { "Model Y": 3250000 },
    },
    // yaş → sıfır fiyata oran (yıl üst sınırı, çarpan)
    ageCurve: [ [0, 0.97], [1, 0.88], [3, 0.76], [5, 0.65], [8, 0.52], [12, 0.40], [99, 0.28] ],
    kmNormPerYear: 15000,   // yıllık olağan km
    kmEffectPer10k: 1.2,    // norm sapması her 10.000 km için değer etkisi (±%)
    kmEffectCapPct: 18,     // km etkisinin üst sınırı (±%)
    fuelFactor: { "Benzin": 1, "Dizel": 1.03, "LPG & Benzin": 0.96, "Hibrit": 1.06, "Elektrik": 1.08 },
    gearFactor: { "Otomatik": 1.04, "Manuel": 1 },
    rentDailyFactor: 0.0011, // günlük kiralama ≈ araç değerinin %0,11'i
    fuels: ["Benzin", "Dizel", "LPG & Benzin", "Hibrit", "Elektrik"],
    gears: ["Otomatik", "Manuel"],
    minYear: 2008,           // form/filtre alt sınırı
  },

  // ── Kredi hesaplayıcı varsayılanları ────────────────────────────────────
  credit: {
    defaultRate: 2.89, maxLtv: 0.8, terms: [60, 120, 180, 240],
    vehicle: { defaultRate: 3.15, maxLtv: 0.7, terms: [12, 24, 36, 48] },
  },

  // ── Yayın onayı (moderasyon) ────────────────────────────────────────────
  // Hiçbir ilan yönetici onayı olmadan yayına girmez; repodaki REAL[] tohum
  // ilanları da ilk açılışta onay bekler.
  moderation: {
    seedStatus: "pending",    // tohum ilanların ilk durumu ("active" = onaysız yayın)
    adminAutoPublish: true,   // yöneticinin KENDİ girdiği ilan doğrudan yayınlanır
  },

  // ── Fotoğraf yükleme kuralları (ilan-ver + yönetim düzenleyicisi) ───────
  // Sunucu da bu değerleri okur (maxPhotos / maxStoredKB) — tek kaynak burasıdır.
  upload: {
    maxPhotos: 6,            // ilan başına en fazla fotoğraf
    maxFileMB: 15,           // seçilebilecek TEK dosyanın ham boyutu
    maxWidth: 1600,          // yüklemeden önce küçültülen uzun kenar (px)
    quality: 0.82,           // JPEG sıkıştırma kalitesi
    maxStoredKB: 1800,       // sunucuda saklanan tek dosya üst sınırı
    accept: ["image/jpeg", "image/png", "image/webp"],
    acceptLabel: "JPG · PNG · WEBP",
  },

  // ── AI asistan ayarları ─────────────────────────────────────────────────
  assistant: { name: "EVA", maxResults: 6 },

  // ── Yönetim paneli (admin.html) ─────────────────────────────────────────
  // Sunucu tarafında ADMIN_PASS ortam değişkeni bunu GEÇERSİZ KILAR (önerilen).
  // Buradaki değer yalnızca yerel geliştirme varsayılanıdır.
  admin: { pass: "emlak2026" },
};
