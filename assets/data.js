/**
 * EmlakAI — ilan veri katmanı
 * Örnek/demo ilan YOKTUR. İki gerçek kaynak vardır:
 *   1) REAL[]  : repoya işlenen gerçek ilanlar (tüm ziyaretçiler görür;
 *                yeni ilan eklemek = bu listeye ekleyip commit'lemek).
 *   2) localStorage (`emlakai.userListings`): ziyaretçinin kendi girdiği
 *                ilanlar (yalnızca o cihazda görünür).
 * Fotoğraflar `assets/img/ilanlar/` altına konur ve `photos` dizisinde
 * göreli yolla listelenir (dış siteden hotlink YAPILMAZ).
 */
(function () {
  "use strict";
  const C = EMLAK.config;

  // ── GERÇEK İLANLAR (repoda yayınlanır) ─────────────────────────────────
  const REAL = [
    {
      id: "EA1001",
      segment: "emlak", category: "satilik", kind: "villa", kindLabel: "Villa",
      title: "Deniz Kenarında Tripleks Villa — Tek Tapu 2 Bağımsız Bölüm",
      city: "Antalya", district: "Manavgat",
      locality: "Karacalar Mah. · Akdeniz 87 Sitesi",
      price: 8800000,
      m2: 240, m2Net: 200, rooms: "3+2", bath: 3, age: 23,
      floor: null, totalFloors: 3, floorPos: null, floorLabel: null,
      heating: "Klima",
      features: ["Havuz", "Otopark", "Güvenlik", "Site İçi"],
      dues: 2000, deed: "Kat Mülkiyetli", swap: true, creditOk: true,
      kitchen: "Açık (Amerikan)",
      seller: { name: "Sahibinden", type: "sahibinden" },
      date: "2026-07-03T10:00:00.000Z",
      views: 5780,   // kaynak ilandaki görüntülenme (taban; site içi görüntülenmeler üzerine eklenir)
      favCount: 50,  // kaynak ilandaki favori sayısı (taban)
      featured: true,
      photos: [], // ör: ["assets/img/ilanlar/ea1001-1.jpg", "assets/img/ilanlar/ea1001-2.jpg"]
      desc: "Manavgat Karacalar Mahallesi'nde, Akdeniz 87 Sitesi içinde, denize yürüme mesafesinde tripleks villa. Tek tapuda 2 bağımsız bölüm: dubleks villa + eklenti giriş kat bağımsız bölüm — ister iki bölümü ayrı ayrı kiraya verin, ister birinde oturup diğerini değerlendirin. İçi komple yenilendi. Site içinde havuz, 24 saat güvenlik ve otomatik kumandalı kapı; kendine ait otopark ve siteye ait plaj mevcut. Brüt 240 m² / net 200 m², 3+2 oda düzeni, 3 banyo, açık (Amerikan) mutfak. Arsa payına düşen alan 262,5 m² (site yüzölçümü 26.777 m²). Tapu durumu kat mülkiyetli; krediye uygundur. Takas: mantıklı gelen arsa ile takas değerlendirilebilir. Aidat 2.000 ₺.",
    },
  ];

  const KINDS = [
    { kind: "daire", label: "Daire" },
    { kind: "residence", label: "Rezidans" },
    { kind: "villa", label: "Villa" },
    { kind: "mustakil", label: "Müstakil Ev" },
    { kind: "dukkan", label: "Dükkan" },
    { kind: "ofis", label: "Ofis" },
    { kind: "arsa", label: "Arsa" },
  ];

  const cityNames = Object.keys(C.market.cities);
  const brandNames = Object.keys(C.vehicles.brands);

  // ── Kullanıcı ilanları (localStorage) ──────────────────────────────────
  const LS_KEY = "emlakai.userListings";
  function userListings() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
    catch (e) { return []; }
  }
  function saveUserListing(l) {
    const all = userListings();
    l.id = "EU" + Date.now().toString(36).toUpperCase();
    l.date = new Date().toISOString();
    l.views = 0;
    l.user = true;
    all.unshift(l);
    localStorage.setItem(LS_KEY, JSON.stringify(all));
    return l;
  }
  function removeUserListing(id) {
    const all = userListings().filter((l) => l.id !== id);
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  }

  EMLAK.data = {
    all: () => userListings().concat(REAL),
    byId: (id) => EMLAK.data.all().find((l) => l.id === id) || null,
    saveUserListing,
    removeUserListing,
    cities: cityNames,
    districtsOf: (city) => (C.market.cities[city] ? Object.keys(C.market.cities[city].districts) : []),
    kinds: KINDS.map((k) => ({ kind: k.kind, label: k.label })),
    brands: brandNames,
    modelsOf: (brand) => (C.vehicles.brands[brand] ? Object.keys(C.vehicles.brands[brand]) : []),
  };
})();
