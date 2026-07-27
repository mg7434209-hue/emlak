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
  // localStorage bir GÜVEN SINIRIDIR: başka bir betik/eklenti tarafından
  // tahrif edilmiş olabilir. Okurken her kayıt normalize edilir; geçersiz
  // tipler güvenli varsayılanlara çekilir (XSS ve TypeError'lara karşı).
  const LS_KEY = "emlakai.userListings";
  const SAFE_PHOTO = /^(data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+|assets\/img\/[\w./-]+)$/;
  const str = (v, max) => (typeof v === "string" ? v.slice(0, max) : "");
  const num = (v) => (Number.isFinite(+v) ? +v : null);
  function normalizeListing(l) {
    if (!l || typeof l !== "object") return null;
    const seg = l.segment === "vasita" ? "vasita" : "emlak";
    const seller = l.seller && typeof l.seller === "object" ? l.seller : {};
    const phone = l.phone && typeof l.phone === "object" &&
      /^\+90\d{10}$/.test(l.phone.intl) && /^90\d{10}$/.test(l.phone.wa)
      ? { display: str(l.phone.display, 20), intl: l.phone.intl, wa: l.phone.wa } : null;
    return {
      id: String(l.id || "").replace(/[^A-Z0-9]/gi, "").slice(0, 32),
      user: true, segment: seg,
      category: l.category === "kiralik" ? "kiralik" : "satilik",
      kind: KINDS.some((k) => k.kind === l.kind) || l.kind === "otomobil" ? l.kind : "daire",
      kindLabel: str(l.kindLabel, 40) || "Daire",
      title: str(l.title, 200), desc: str(l.desc, 4000) || null,
      city: cityNames.includes(l.city) ? l.city : "",
      district: str(l.district, 60),
      price: num(l.price) || 0,
      m2: num(l.m2), rooms: str(l.rooms, 10) || null, bath: num(l.bath),
      age: num(l.age), floor: num(l.floor), totalFloors: num(l.totalFloors),
      floorPos: str(l.floorPos, 10) || null, floorLabel: str(l.floorLabel, 30) || null,
      heating: str(l.heating, 40) || null,
      brand: brandNames.includes(l.brand) ? l.brand : (seg === "vasita" ? str(l.brand, 30) : undefined),
      model: str(l.model, 40) || undefined,
      year: num(l.year), km: num(l.km),
      fuel: str(l.fuel, 20) || undefined, gear: str(l.gear, 20) || undefined,
      features: (Array.isArray(l.features) ? l.features : []).map((f) => str(f, 40)).filter(Boolean).slice(0, 20),
      photos: (Array.isArray(l.photos) ? l.photos : []).filter((p) => typeof p === "string" && SAFE_PHOTO.test(p)).slice(0, 5),
      seller: { name: str(seller.name, 80) || "Sahibinden", type: seller.type === "ofis" ? "ofis" : "sahibinden" },
      phone,
      date: str(l.date, 40) || new Date(0).toISOString(),
      views: num(l.views) || 0, favCount: num(l.favCount) || 0,
      featured: !!l.featured,
    };
  }
  function userListings() {
    try {
      const raw = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
      return (Array.isArray(raw) ? raw : []).map(normalizeListing).filter((l) => l && l.id);
    } catch (e) { return []; }
  }
  function saveUserListing(l) {
    const all = userListings();
    l.id = "EU" + Date.now().toString(36).toUpperCase();
    l.date = new Date().toISOString();
    l.views = 0;
    l.user = true;
    all.unshift(l);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(all));
    } catch (e) {
      return null; // depolama kotası aşıldı (çok/büyük fotoğraf) — çağıran bildirir
    }
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
