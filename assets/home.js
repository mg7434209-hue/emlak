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
  let latestTimer = null;

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
    const palettes = {
      daire: ["#2259db", "#7a91f0"], residence: ["#5b2ac9", "#ad7cff"],
      villa: ["#087a5b", "#49cda0"], mustakil: ["#a85a12", "#ebb45d"],
      dukkan: ["#a32465", "#ee78ac"], ofis: ["#0a788c", "#56c9d0"],
      arsa: ["#4a6f20", "#a1c86d"], otomobil: ["#35415d", "#6d7f9f"],
    };
    const glyphs = {
      daire: "🏢", residence: "🏙️", villa: "🏡", mustakil: "🏠",
      dukkan: "🏪", ofis: "🏛️", arsa: "🌳", otomobil: "🚗",
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
    if (options && options.latest && date.today) badges.push('<span class="home-card-badge today">Bugün eklendi</span>');
    else if (options && options.latest && date.fresh) badges.push('<span class="home-card-badge new">Yeni ilan</span>');
    if (options && options.drop && drop) badges.push('<span class="home-card-badge drop">Fiyatı düştü · %' + drop.pct + '</span>');
    if (l.featured) badges.push('<span class="home-card-badge featured">⭐ Öne çıkan</span>');
    if (options && options.deal && price && price.key === "firsat") badges.push('<span class="home-card-badge ai">AI fırsat fiyatı</span>');
    if (options && options.ai) badges.push('<span class="home-card-badge ai">AI ' + aiScore(l) + '/100</span>');
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

  function renderGrid(element, items, options, emptyTitle, emptyText) {
    if (!element) return;
    element.innerHTML = items.length ? items.map((l) => card(l, options)).join("") : emptyState(emptyTitle, emptyText);
  }

  function renderLatest(list) {
    const track = $("#latestTrack");
    const viewport = $("#latestViewport");
    if (!track || !viewport) return;
    const items = list.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);
    track.innerHTML = items.length
      ? items.map((l) => card(l, { latest: true, deal: true })).join("")
      : emptyState("İlk ilanlar burada görünecek", "Yayınlanan gerçek ilanlar geldikçe bu vitrin otomatik güncellenecek.");
    const controls = $$(".home-rail-control[data-rail=\"latest\"]");
    controls.forEach((button) => { button.style.display = items.length > 1 ? "grid" : "none"; });
    if (latestTimer) clearInterval(latestTimer);
    if (items.length > 1) {
      latestTimer = setInterval(() => {
        const end = viewport.scrollLeft + viewport.clientWidth >= viewport.scrollWidth - 10;
        viewport.scrollTo({ left: end ? 0 : viewport.scrollLeft + viewport.clientWidth * .84, behavior: "smooth" });
      }, 5200);
    }
  }

  function collectionDefinitions() {
    const has = (l, words) => {
      const text = [l.title, l.desc, ...(l.features || [])].filter(Boolean).join(" ").toLocaleLowerCase("tr-TR");
      return words.some((word) => text.includes(word));
    };
    return [
      { icon: "🏝️", name: "Antalya Villaları", query: "segment=emlak&city=Antalya&kind=villa", test: (l) => l.city === "Antalya" && l.kind === "villa" },
      { icon: "🌊", name: "Deniz Manzaralı", query: "segment=emlak&feature=Deniz%20Manzaras%C4%B1", test: (l) => has(l, ["deniz", "sahil", "akdeniz"]) },
      { icon: "☀️", name: "Yazlıklar", query: "segment=emlak&category=satilik", test: (l) => has(l, ["yazlık", "yazlik", "sezonluk"]) },
      { icon: "💎", name: "Lüks Konutlar", query: "segment=emlak&kind=villa", test: (l) => Number(l.price) >= 10000000 || has(l, ["lüks", "lux", "akıllı ev", "özel havuz"]) },
      { icon: "⚡", name: "Acil Satılık", query: "segment=emlak&category=satilik", test: (l) => has(l, ["acil", "hemen satılık", "ivedi"]) },
      { icon: "📈", name: "Yatırımlık Arsalar", query: "segment=emlak&kind=arsa", test: (l) => l.kind === "arsa" || has(l, ["yatırımlık arsa", "yatirimlik arsa"]) },
      { icon: "🏢", name: "Ticari Gayrimenkuller", query: "segment=emlak&kind=ofis", test: (l) => ["ofis", "dukkan"].includes(l.kind) || has(l, ["ticari", "dükkan", "ofis"]) },
    ];
  }

  function renderCollections(list) {
    const root = $("#collectionsGrid");
    if (!root) return;
    root.innerHTML = collectionDefinitions().map((collection) => {
      const count = list.filter(collection.test).length;
      return '<a class="home-collection" href="ilanlar.html?' + collection.query + '">' +
        '<span class="home-collection-icon">' + collection.icon + '</span>' +
        '<span class="home-collection-name">' + esc(collection.name) + '</span>' +
        '<span class="home-collection-count">' + count + (count === 1 ? " ilan" : " ilan") + (count ? "" : " · yakında") + '</span>' +
      '</a>';
    }).join("");
  }

  function recommendationReason(l) {
    const price = AI && typeof AI.priceBadge === "function" ? AI.priceBadge(l) : null;
    if (price && price.key === "firsat") return "Piyasa tahminine göre avantajlı";
    if (l.featured) return "Öne çıkarılan ilan";
    if ((l.features || []).length >= 3) return "Özellikleri güçlü eşleşme";
    return "Veri kapsamı yüksek ilan";
  }

  function renderRecommendation(list) {
    const root = $("#dailyRecommendation");
    if (!root) return;
    if (!list.length) {
      root.innerHTML = emptyState("Günün önerisi hazırlanıyor", "Her gün yayınlanan ilanlar arasından veri kapsamı ve piyasa sinyalleri güçlü olan bir ilan seçilecek.");
      return;
    }
    const ranked = list.slice().sort((a, b) => aiScore(b) - aiScore(a) || new Date(b.date) - new Date(a.date));
    const day = Math.floor(Date.now() / 86400000);
    const l = ranked[day % ranked.length];
    root.innerHTML = '<div class="home-recommendation-card">' +
      '<div class="home-card-media">' + thumb(l) + '</div>' +
      '<div class="home-card-body">' +
        '<span class="home-ai-reason">✦ ' + esc(recommendationReason(l)) + '</span>' +
        '<div class="home-card-price">' + priceText(l) + '</div>' +
        '<div class="home-card-title">' + esc(l.title || "Başlıksız ilan") + '</div>' +
        '<div class="home-card-meta"><span>AI ' + aiScore(l) + '/100</span><span>·</span><span>' + esc(l.kindLabel || "Taşınmaz") + '</span></div>' +
        '<div class="home-card-location">📍 ' + esc([l.city, l.district].filter(Boolean).join(" / ")) + '</div>' +
        '<a class="btn sm" href="ilan.html?id=' + encodeURIComponent(l.id) + '">İlanı İncele →</a>' +
      '</div>' +
    '</div>';
  }

  function renderAll(list) {
    const safeList = (Array.isArray(list) ? list : []).filter((l) => l && l.id);
    renderLatest(safeList);
    renderGrid($("#aiPicksGrid"), safeList.slice().sort((a, b) => aiScore(b) - aiScore(a) || Number(b.featured) - Number(a.featured)).slice(0, 6), { ai: true }, "AI seçkisi hazırlanıyor", "İlan verisi geldikçe güçlü fiyat ve özellik sinyalleri taşıyan ilanlar burada sıralanacak.");
    renderGrid($("#dealGrid"), safeList.filter((l) => {
      const badge = AI && typeof AI.priceBadge === "function" ? AI.priceBadge(l) : null;
      return badge && badge.key === "firsat";
    }).sort((a, b) => aiScore(b) - aiScore(a)).slice(0, 6), { deal: true }, "Fırsat sinyali bekleniyor", "AI fiyat karşılaştırması piyasanın altında kalan bir ilan tespit ettiğinde burada gösterecek.");
    renderGrid($("#dropGrid"), safeList.filter((l) => priceDrop(l)).sort((a, b) => new Date(b.updated || b.date) - new Date(a.updated || a.date)).slice(0, 6), { drop: true }, "Fiyat değişikliği bekleniyor", "Fiyatı güncellenen ilanlar eski fiyatı ve indirim oranıyla burada görünecek.");
    renderCollections(safeList);
    renderRecommendation(safeList);
    const status = $("#homeDataStatus");
    if (status) status.textContent = safeList.length ? safeList.length + " gerçek ilan · vitrinler veri geldikçe otomatik güncellenir." : "Henüz yayınlanmış ilan yok · ilk ilanı siz verebilirsiniz.";
  }

  function bindRailControls() {
    $$(".home-rail-control[data-rail=\"latest\"]").forEach((button) => {
      button.addEventListener("click", () => {
        const viewport = $("#latestViewport");
        if (!viewport) return;
        const direction = button.dataset.direction === "prev" ? -1 : 1;
        viewport.scrollBy({ left: direction * viewport.clientWidth * .84, behavior: "smooth" });
      });
    });
  }

  function bindQueryChips() {
    $$(".home-query-chip[data-home-query]").forEach((chip) => {
      chip.addEventListener("click", () => {
        const input = $("#aiQuery");
        if (!input) return;
        input.value = chip.dataset.homeQuery || chip.textContent.trim();
        input.focus();
      });
    });
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
    bindRailControls();
    bindQueryChips();
    updateFavCount();
    if (!D || typeof D.init !== "function") {
      renderAll([]);
      return;
    }
    try { await D.init(); } catch (e) {}
    renderAll(typeof D.all === "function" ? D.all() : []);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
