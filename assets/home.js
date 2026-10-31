/* EmlakAI ana sayfa — ilan keşfi, vitrinler ve veri odaklı sıralama */
(function () {
  "use strict";

  // Canlı sunucu body özniteliklerini düşürse bile ana sayfanın tema kapsamını koru.
  if (document.body) {
    if (!document.body.dataset.page) document.body.dataset.page = "index";
    document.body.classList.add("home-page");
  }

  const E = window.EMLAK || {};
  const D = E.data;
  const AI = E.ai;
  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));
  const FAV_KEY = "emlakai.favs";

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function fmt(value) {
    if (AI && typeof AI.fmtNum === "function") return AI.fmtNum(value);
    return new Intl.NumberFormat("tr-TR").format(Number(value) || 0);
  }

  function safePhoto(value) {
    if (typeof value !== "string") return "";
    return /^(data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+|assets\/img\/[\w./-]+|u\/[\w.-]+)$/.test(value) ? value : "";
  }

  function thumb(l) {
    const photo = safePhoto(l && l.photos && l.photos[0]);
    if (photo) return '<img src="' + photo + '" alt="' + esc(l.title) + '" loading="lazy">';
    // Türlere göre yer tutucu renk/simge — app.js PALETTES/GLYPHS ile AYNI
    const palettes = {
      daire: ["#2456d8", "#4d8bf5"], residence: ["#5b2ac9", "#9b6bff"],
      villa: ["#0c8a54", "#3cc98a"], mustakil: ["#b06b12", "#e8a94b"],
      yazlik: ["#0f7d8c", "#46c3d4"],
      dukkan: ["#b3266b", "#ef6aa8"], ofis: ["#0e7d93", "#3fb9cf"],
      depo: ["#5a5f6b", "#8e95a3"], fabrika: ["#4a4f63", "#7d84a0"],
      arsa: ["#557a1f", "#93bf4e"], tarla: ["#6a7c22", "#a8c256"], bagbahce: ["#3f7a34", "#79bb62"],
      bina: ["#3d4a63", "#6f80a3"], devremulk: ["#8a5a2b", "#c79355"], turistik: ["#1a6f8c", "#57b3cd"],
      otomobil: ["#37415e", "#5f6f9e"], suv: ["#2f4858", "#5c7c8f"], elektrikli: ["#12796b", "#3fc0aa"],
      klasik: ["#6b4b2a", "#a8804f"], motosiklet: ["#8c2f2f", "#cf6a6a"], atv: ["#7a4a1f", "#c08a4a"],
      minivan: ["#41506b", "#7383a3"], ticari: ["#3a4a5c", "#6d8095"], kamyon: ["#4c4438", "#8a7c66"],
      otobus: ["#2f5d72", "#5f96ab"], karavan: ["#57683a", "#93a86c"], deniz: ["#15546f", "#4f9cbc"],
      hasarli: ["#6b3030", "#a86363"],
      ikinciel: ["#4b3a75", "#8873bb"], yedekparca: ["#4a4a4a", "#828282"], antika: ["#6b5327", "#ab8c4c"],
      hizmet: ["#1f6b5e", "#4fae9c"], ozelders: ["#2a5a8c", "#5f93c4"], isilani: ["#3f5a3a", "#7a9a72"],
      ismakinesi: ["#8a6a12", "#cba33f"], tarim: ["#5a7a22", "#93b955"], hayvan: ["#7a4a6b", "#b481a5"],
    };
    const glyphs = {
      daire: "🏢", residence: "🏙️", villa: "🏡", mustakil: "🏠", yazlik: "🏖️",
      dukkan: "🏪", ofis: "🏛️", depo: "📦", fabrika: "🏭",
      arsa: "🌳", tarla: "🌾", bagbahce: "🍇", bina: "🏬", devremulk: "🗓️", turistik: "🏨",
      otomobil: "🚗", suv: "🚙", elektrikli: "⚡", klasik: "🚘", motosiklet: "🏍️", atv: "🛻",
      minivan: "🚐", ticari: "🚚", kamyon: "🚛", otobus: "🚌", karavan: "🚙", deniz: "⛵", hasarli: "🔧",
      ikinciel: "🛒", yedekparca: "🔩", antika: "🏺", hizmet: "🛠️", ozelders: "📚", isilani: "💼",
      ismakinesi: "🚜", tarim: "🌱", hayvan: "🐾",
    };

    const colors = palettes[l.kind] || palettes.daire;
    const glyph = glyphs[l.kind] || "🏠";
    const seed = String(l.id || "home").split("").reduce((total, c) => total + c.charCodeAt(0), 0);
    let bars = "";
    for (let i = 0; i < 10; i += 1) {
      const width = 36 + ((seed * (i + 3)) % 44);
      const height = 48 + ((seed * (i + 7)) % 110);
      bars += '<rect x="' + (i * 50) + '" y="' + (270 - height) + '" width="' + width + '" height="' + height + '" fill="rgba(255,255,255,.13)" rx="4"/>';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 270" preserveAspectRatio="xMidYMid slice" role="img" aria-label="' + esc(l.kindLabel || "İlan görseli") + '">' +
      '<defs><linearGradient id="hg' + seed + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + colors[0] + '"/><stop offset="1" stop-color="' + colors[1] + '"/></linearGradient></defs>' +
      '<rect width="500" height="270" fill="url(#hg' + seed + ')"/>' + bars +
      '<text x="250" y="125" font-size="70" text-anchor="middle" dominant-baseline="middle">' + glyph + '</text>' +
      '<text x="250" y="246" font-size="15" font-weight="700" text-anchor="middle" fill="rgba(255,255,255,.92)" font-family="system-ui">' + esc(l.segment === "vasita" ? ((l.brand || "") + " " + (l.model || "")).trim() : (l.kindLabel || "Taşınmaz")) + '</text></svg>';
  }

  function readFavs() {
    try {
      const value = JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (e) { return []; }
  }

  function updateFavCount() {
    const el = $("#favCount");
    if (!el) return;
    const count = readFavs().length;
    el.textContent = count;
    el.style.display = count ? "grid" : "none";
  }

  function toggleFav(id) {
    const favs = readFavs();
    const index = favs.indexOf(id);
    if (index >= 0) favs.splice(index, 1);
    else favs.push(id);
    try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); } catch (e) {}
    updateFavCount();
    return index < 0;
  }

  function dateInfo(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return { days: 999, today: false, fresh: false, label: "" };
    const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
    return {
      days,
      today: days < 1,
      fresh: days < 7,
      label: days === 0 ? "Bugün" : days === 1 ? "Dün" : days < 30 ? days + " gün önce" : date.toLocaleDateString("tr-TR"),
    };
  }

  function priceDrop(l) {
    const history = Array.isArray(l.priceHistory) ? l.priceHistory : [];
    const previous = history.filter((item) => item && Number(item.price) > Number(l.price || 0)).pop();
    if (!previous || !l.price) return null;
    return { old: Number(previous.price), pct: Math.round((1 - (Number(l.price) / previous.price)) * 100) };
  }

  function badgeFor(l, options) {
    const badges = [];
    const date = dateInfo(l.date);
    const drop = priceDrop(l);
    const price = AI && typeof AI.priceBadge === "function" ? AI.priceBadge(l) : null;
    if (options && options.daily) badges.push('<span class="home-card-badge ai">✦ Günün önerisi</span>');
    if (options && options.latest && date.today) badges.push('<span class="home-card-badge today">Bugün eklendi</span>');
    else if (options && options.latest && date.fresh) badges.push('<span class="home-card-badge new">Yeni ilan</span>');
    if (options && options.drop && drop) badges.push('<span class="home-card-badge drop">Fiyatı düştü · %' + drop.pct + '</span>');
    if (l.featured) badges.push('<span class="home-card-badge featured">⭐ Öne çıkan</span>');
    if (options && options.deal && price && price.key === "firsat") badges.push('<span class="home-card-badge ai">AI fırsat fiyatı</span>');
    return badges.join("");
  }

  function aiScore(l) {
    let score = 54;
    const price = AI && typeof AI.priceBadge === "function" ? AI.priceBadge(l) : null;
    const photos = Array.isArray(l.photos) ? l.photos.length : 0;
    const features = Array.isArray(l.features) ? l.features.length : 0;
    if (price && price.key === "firsat") score += 19;
    else if (price && price.key === "uygun") score += 9;
    else if (price && price.key === "ustu") score -= 8;
    if (l.featured) score += 7;
    if (l.desc) score += 7;
    score += Math.min(9, photos * 3);
    score += Math.min(8, features * 2);
    if (l.creditOk) score += 3;
    if (dateInfo(l.date).days < 30) score += 4;
    return Math.max(45, Math.min(98, Math.round(score)));
  }

  function priceText(l) {
    if (!l.price) return "Fiyat için iletişim";
    const suffix = l.category === "kiralik" ? (l.segment === "vasita" ? " /gün" : " /ay") : "";
    return fmt(l.price) + " ₺" + suffix;
  }

  function card(l, options) {
    const opts = options || {};
    const drop = priceDrop(l);
    const meta = [];
    if (l.segment === "vasita") {
      [l.year, l.km ? fmt(l.km) + " km" : "", l.fuel, l.gear].forEach((v) => { if (v) meta.push(v); });
    } else {
      [l.rooms, l.m2 ? fmt(l.m2) + " m²" : "", l.age != null && l.kind !== "arsa" ? (l.age === 0 ? "Sıfır" : l.age + " yaş") : ""].forEach((v) => { if (v) meta.push(v); });
    }
    const fav = readFavs().includes(l.id);
    const badges = badgeFor(l, opts);
    const oldPrice = drop ? '<span class="home-card-old-price">' + fmt(drop.old) + ' ₺</span>' : "";
    return '<article class="home-card">' +
      '<div class="home-card-media">' + thumb(l) +
        (badges ? '<div class="home-card-badges">' + badges + '</div>' : "") +
        '<button class="home-card-fav" type="button" data-home-fav="' + esc(l.id) + '" aria-label="Favorilere ekle" aria-pressed="' + fav + '">' + (fav ? "❤️" : "🤍") + '</button>' +
      '</div>' +
      '<div class="home-card-body">' +
        '<div class="home-card-price">' + priceText(l) + oldPrice + '</div>' +
        '<div class="home-card-title">' + esc(l.title || "Başlıksız ilan") + '</div>' +
        '<div class="home-card-meta">' + meta.map(esc).join("<span>·</span>") + '</div>' +
        '<div class="home-card-location">📍 ' + esc([l.city, l.district].filter(Boolean).join(" / ") || "Konum bilgisi belirtilmemiş") + '</div>' +
      '</div>' +
      '<a class="home-card-link" href="ilan.html?id=' + encodeURIComponent(l.id) + '" aria-label="' + esc(l.title || "İlan detayı") + '"></a>' +
    '</article>';
  }

  function emptyState(title, text) {
    return '<div class="home-empty"><span class="home-empty-icon">✦</span><b>' + esc(title) + '</b><span>' + esc(text) + '</span></div>';
  }

  // TEK AKIŞ (Google sadeliği): ayrı "AI seçkisi / fırsatlar / fiyatı düşenler /
  // son eklenenler" bölümleri yerine tek ızgara. Sıra: günün önerisi → AI fırsat
  // fiyatı → fiyatı düşenler → en yeni; tekrar yok, en çok FEED_MAX kart.
  // server.js renderHomeHtml bot görünümü için AYNI sırayı basar.
  const FEED_MAX = 8;
  function feedOf(list) {
    const safeList = (Array.isArray(list) ? list : []).filter((l) => l && l.id);
    // Piyasa verisi olmayan "diğer" segmenti AI sıralamasına girmez, yeni ilanlara girer
    const valuable = safeList.filter((l) => (l.segment || "emlak") !== "diger");
    const byDate = (a, b) => new Date(b.updated || b.date) - new Date(a.updated || a.date);
    const isDeal = (l) => { const b = AI && AI.priceBadge ? AI.priceBadge(l) : null; return !!(b && b.key === "firsat"); };
    const out = [];
    const tag = new Map();
    const push = (l, why) => { if (out.length < FEED_MAX && !tag.has(l.id)) { out.push(l); tag.set(l.id, why); } };
    if (valuable.length) {
      const ranked = valuable.slice().sort((a, b) => aiScore(b) - aiScore(a) || new Date(b.date) - new Date(a.date));
      push(ranked[Math.floor(Date.now() / 86400000) % ranked.length], "daily");
    }
    valuable.filter(isDeal).sort((a, b) => aiScore(b) - aiScore(a)).forEach((l) => push(l, "deal"));
    safeList.filter(priceDrop).sort(byDate).forEach((l) => push(l, "drop"));
    safeList.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).forEach((l) => push(l, "new"));
    return { items: out, tag };
  }

  function renderAll(list) {
    const root = $("#homeFeed");
    if (!root) return;
    const feed = feedOf(list);
    root.innerHTML = feed.items.length
      ? feed.items.map((l) => {
          const why = feed.tag.get(l.id);
          return card(l, { latest: why === "new", deal: why === "deal", drop: why === "drop", daily: why === "daily" });
        }).join("")
      : emptyState("İlk ilanlar burada görünecek", "Yayınlanan ilanlar geldikçe bu akış kendiliğinden dolar — ilk ilanı siz verebilirsiniz.");
  }

  // Sağ vitrin: fotoğraflı en iyi ilan büyük kart olur; yoksa karşılama paneli kalır.
  function renderShow(list) {
    const root = $("#heroShow");
    if (!root) return;
    const pool = (Array.isArray(list) ? list : []).filter((l) => l && l.id && safePhoto(l.photos && l.photos[0]));
    if (!pool.length) return;
    pool.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || new Date(b.date) - new Date(a.date));
    const l = pool[0];
    const meta = (l.segment === "vasita" ? [l.year, l.km ? fmt(l.km) + " km" : ""] : [l.rooms, l.m2 ? fmt(l.m2) + " m²" : ""]).filter(Boolean).join(" · ");
    root.innerHTML = '<div class="h-feat">' +
      '<div class="h-feat-media">' + thumb(l) + '<span class="h-feat-tag">' + (l.featured ? "Öne çıkan ilan" : "Yeni ilan") + '</span></div>' +
      '<div class="h-feat-body"><div class="h-feat-title">' + esc(l.title || "İlan") + '</div>' +
      '<div class="h-feat-loc">📍 ' + esc([l.city, l.district].filter(Boolean).join(", ") || "Konum belirtilmemiş") + '</div>' +
      '<div class="h-feat-row"><span class="h-feat-price">' + priceText(l) + '</span><span class="h-feat-meta">' + esc(meta) + '</span></div></div>' +
      '<a class="h-feat-link" href="ilan.html?id=' + encodeURIComponent(l.id) + '" aria-label="' + esc(l.title || "İlan detayı") + '"></a></div>';
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-home-fav]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const active = toggleFav(button.dataset.homeFav);
    button.textContent = active ? "❤️" : "🤍";
    button.setAttribute("aria-pressed", active);
  });

  async function boot() {
    updateFavCount();
    if (!D || typeof D.init !== "function") {
      renderAll([]);
      return;
    }
    try { await D.init(); } catch (e) {}
    const all = typeof D.all === "function" ? D.all() : [];
    renderAll(all);
    renderShow(all);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
