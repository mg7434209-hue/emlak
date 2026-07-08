/**
 * EmlakAI — TEK DOĞRU KAYNAK
 * Marka, iletişim, şehir/ilçe piyasa verileri ve yapay zekâ katsayıları
 * YALNIZCA burada tutulur. Sayfalara/JS'e elle gömülmez.
 */
window.EMLAK = window.EMLAK || {};
EMLAK.config = {
  brand: {
    name: "EmlakAI",
    tagline: "Türkiye'nin yapay zekâ destekli emlak platformu",
    domain: "emlakai.example",
  },
  company: {
    title: "EmlakAI Teknoloji Ltd. Şti.",
    phone: { display: "0543 743 42 09", intl: "+905437434209", wa: "905437434209" },
    email: "gesmarketim@gmail.com",
    address: "Örnek Mah. 1551 Sok. No:10/1, Manavgat / Antalya",
  },

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

  // ── Kredi hesaplayıcı varsayılanları ────────────────────────────────────
  credit: { defaultRate: 2.89, maxLtv: 0.8, terms: [60, 120, 180, 240] },

  // ── AI asistan ayarları ─────────────────────────────────────────────────
  assistant: { name: "EVA", maxResults: 6 },
};
