/**
 * EmlakAI — ilan veri katmanı
 * Örnek/demo ilan YOKTUR; platformda yalnızca kullanıcıların girdiği gerçek
 * ilanlar bulunur. Kullanıcı ilanları localStorage'da tutulur
 * (`emlakai.userListings`). Şehir/ilçe, tür ve marka/model listeleri
 * `assets/config.js`'ten okunur.
 */
(function () {
  "use strict";
  const C = EMLAK.config;

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
    all: () => userListings(),
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
