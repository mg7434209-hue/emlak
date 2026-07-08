/**
 * EmlakAI — örnek ilan veri seti
 * Deterministik üreteç: her yüklemede aynı ~72 ilan üretilir (seed sabit).
 * Kullanıcı ilanları localStorage'da tutulur ve bu listeye eklenir.
 */
(function () {
  "use strict";
  const C = EMLAK.config;

  // mulberry32 — tohumlu sözde rastgele üreteç (deterministik veri için)
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = rng(20260708);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const ri = (min, max) => Math.floor(min + rand() * (max - min + 1));

  const KINDS = [
    { kind: "daire", label: "Daire", w: 46 },
    { kind: "residence", label: "Rezidans", w: 8 },
    { kind: "villa", label: "Villa", w: 14 },
    { kind: "mustakil", label: "Müstakil Ev", w: 8 },
    { kind: "dukkan", label: "Dükkan", w: 8 },
    { kind: "ofis", label: "Ofis", w: 8 },
    { kind: "arsa", label: "Arsa", w: 8 },
  ];
  const ROOMS = ["1+0", "1+1", "2+1", "2+1", "3+1", "3+1", "4+1", "5+2"];
  const HEATING = ["Kombi (Doğalgaz)", "Merkezi", "Klima", "Yerden Isıtma"];
  const FLOORS = ["zemin", "ara", "ara", "ust", "cati", "bahce"];
  const FLOOR_LABEL = { zemin: "Zemin Kat", ara: "Ara Kat", ust: "Üst Kat", cati: "Çatı Katı", bahce: "Bahçe Katı" };
  const SELLERS = [
    { name: "Sahibinden", type: "sahibinden" },
    { name: "Yuva Emlak", type: "ofis" },
    { name: "Akdeniz Gayrimenkul", type: "ofis" },
    { name: "Prestij Emlak Ofisi", type: "ofis" },
    { name: "Sahibinden", type: "sahibinden" },
    { name: "Marmara Invest", type: "ofis" },
  ];
  const FEATURE_POOL = Object.keys(C.valuation.features);

  function ageFactor(age) {
    for (const [max, f] of C.valuation.age) if (age <= max) return f;
    return 0.75;
  }

  const listings = [];
  let id = 1000;

  // Ağırlıklı tür seçimi
  const kindBag = [];
  KINDS.forEach((k) => { for (let i = 0; i < k.w; i++) kindBag.push(k); });

  const cityNames = Object.keys(C.market.cities);
  for (let n = 0; n < 72; n++) {
    const city = cityNames[n % cityNames.length];
    const districts = Object.keys(C.market.cities[city].districts);
    const district = pick(districts);
    const baseM2 = C.market.cities[city].districts[district];
    const k = pick(kindBag);
    const category = rand() < 0.68 ? "satilik" : "kiralik";

    let m2, rooms = null, age = 0, floorPos = null, floor = 0, totalFloors = 0, bath = 1;
    if (k.kind === "arsa") {
      m2 = ri(250, 5000);
    } else if (k.kind === "dukkan" || k.kind === "ofis") {
      m2 = ri(45, 400); age = ri(0, 25); floor = ri(0, 5);
    } else {
      rooms = k.kind === "villa" ? pick(["3+1", "4+1", "5+2"]) : pick(ROOMS);
      m2 = { "1+0": ri(38, 55), "1+1": ri(55, 75), "2+1": ri(85, 120), "3+1": ri(120, 165), "4+1": ri(160, 220), "5+2": ri(220, 320) }[rooms];
      age = ri(0, 35);
      floorPos = k.kind === "daire" || k.kind === "residence" ? pick(FLOORS) : null;
      totalFloors = k.kind === "residence" ? ri(12, 30) : ri(3, 9);
      floor = floorPos ? ri(0, totalFloors) : 0;
      bath = rooms === "1+0" || rooms === "1+1" ? 1 : ri(1, 3);
    }

    // Özellikler
    const nf = k.kind === "arsa" ? 0 : ri(2, 6);
    const feats = [];
    const poolCopy = FEATURE_POOL.slice();
    for (let i = 0; i < nf && poolCopy.length; i++) {
      feats.push(poolCopy.splice(Math.floor(rand() * poolCopy.length), 1)[0]);
    }
    // Deniz manzarası yalnızca kıyı illerinde kalsın
    if (!["İstanbul", "İzmir", "Antalya", "Bursa"].includes(city)) {
      const ix = feats.indexOf("Deniz Manzarası");
      if (ix >= 0) feats.splice(ix, 1);
    }

    // Fiyat: piyasa m² fiyatı × tür × yaş × özellik katkısı × gürültü
    const V = C.valuation;
    let perM2 = baseM2 * (V.kind[k.kind] || 1) * ageFactor(age);
    if (rooms) perM2 *= V.roomFactor[rooms] || 1;
    if (floorPos) perM2 *= V.floorBonus[floorPos] || 1;
    let featPct = 0;
    feats.forEach((f) => { featPct += V.features[f] || 0; });
    perM2 *= 1 + featPct / 100;
    perM2 *= 0.82 + rand() * 0.36; // piyasa gürültüsü: kimi fırsat, kimi pahalı

    let price = Math.round((perM2 * m2) / 10000) * 10000;
    if (category === "kiralik") {
      price = Math.round((perM2 * m2 * C.market.rentYieldMonthly) / 250) * 250;
    }

    const catLabel = category === "satilik" ? "Satılık" : "Kiralık";
    const title = `${district} ${rooms ? rooms + " " : ""}${catLabel} ${k.label}`;

    listings.push({
      id: "EA" + (id++),
      title, category, kind: k.kind, kindLabel: k.label,
      city, district,
      price, m2, rooms, bath, age,
      floor: floorPos ? floor : null, totalFloors: totalFloors || null,
      floorPos, floorLabel: floorPos ? FLOOR_LABEL[floorPos] : null,
      heating: k.kind === "arsa" ? null : pick(HEATING),
      features: feats,
      seller: pick(SELLERS),
      date: new Date(2026, 5, ri(1, 30), ri(8, 21)).toISOString(),
      views: ri(40, 4200),
      featured: rand() < 0.14, // öne çıkarılmış ilanlar (AI arama sonuçlarında önceliklenir)
      photos: [],
      desc: null, // detay sayfasında AI tarafından üretilir
    });
  }

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

  EMLAK.data = {
    all: () => userListings().concat(listings),
    byId: (id) => EMLAK.data.all().find((l) => l.id === id) || null,
    saveUserListing,
    cities: cityNames,
    districtsOf: (city) => (C.market.cities[city] ? Object.keys(C.market.cities[city].districts) : []),
    kinds: KINDS.map((k) => ({ kind: k.kind, label: k.label })),
  };
})();
