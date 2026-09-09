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
  market: {
    rentYieldMonthly: 0.0042,
    cities: {
      "İstanbul": {
        yieldTrend: 1.9,
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
  // Katsayılar özellikle ilanı "uçuk" biçimde yukarı taşımayacak şekilde
  // kontrollüdür. Model ilçe referansını temel alır; mülk tipi, yaş ve
  // özellikler yalnızca sınırlı düzeltme yapar.
  valuation: {
    kind: { daire: 1.0, residence: 1.08, villa: 1.05, mustakil: 1.08, dukkan: 1.12, ofis: 1.05, arsa: 0.45 },
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
  moderation: {
    seedStatus: "pending",
    adminAutoPublish: true,
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
    maxPhotos: 6,
    maxFileMB: 15,          // seçilebilecek ham dosya sınırı
    maxWidth: 1400,         // küçültme sonrası en fazla genişlik (px)
    quality: 0.82,          // başlangıç sıkıştırma kalitesi
    minQuality: 0.5,        // hedefe inmek için düşülebilecek en düşük kalite
    targetKB: 320,          // istemcinin hedeflediği fotoğraf başına boyut
    preferWebp: true,       // destekleniyorsa WebP (JPEG'e göre ~%40 küçük)
    maxStoredKB: 900,       // sunucunun kabul ettiği fotoğraf başına üst sınır
    accept: ["image/jpeg", "image/png", "image/webp"],
    acceptLabel: "JPG · PNG · WEBP",
    quota: {
      perListingMB: 5,      // tek ilanın tüm fotoğrafları
      perUserMB: 40,        // bir üyenin tüm ilanları toplamı
      totalGB: 2,           // sitenin tamamı (disk/Volume koruması)
      warnPct: 80,          // panelde uyarı eşiği (%)
    },
  },

  // ── AI asistan ayarları ─────────────────────────────────────────────────
  assistant: { name: "EVA", maxResults: 6 },

  // ── Yönetim paneli (admin.html) ─────────────────────────────────────────
  admin: { pass: "emlak2026" },
};
