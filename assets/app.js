/**
 * EmlakAI — arayüz mantığı
 * Sayfa yönlendirmesi <body data-page="..."> özniteliğiyle yapılır.
 */
(function () {
  "use strict";
  const C = EMLAK.config, D = EMLAK.data, AI = EMLAK.ai;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const fmt = AI.fmtNum;
  const priceSuffix = (l) => (l.category === "kiralik" ? (l.segment === "vasita" ? "/gün" : "/ay") : "");
  const fmtPrice = (l) => fmt(l.price) + " ₺" + priceSuffix(l);

  // ── Tema ────────────────────────────────────────────────────────────────
  const themeKey = "emlakai.theme";
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    const b = $("#themeToggle");
    if (b) b.textContent = t === "dark" ? "☀️" : "🌙";
  }
  applyTheme(localStorage.getItem(themeKey) || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

  // ── Favoriler ───────────────────────────────────────────────────────────
  const favKey = "emlakai.favs";
  const favs = () => { try { return JSON.parse(localStorage.getItem(favKey) || "[]"); } catch (e) { return []; } };
  function toggleFav(id) {
    const f = favs();
    const i = f.indexOf(id);
    i >= 0 ? f.splice(i, 1) : f.push(id);
    localStorage.setItem(favKey, JSON.stringify(f));
    updateFavCount();
    return i < 0;
  }
  function updateFavCount() {
    const el = $("#favCount");
    if (!el) return;
    const n = favs().length;
    el.textContent = n;
    el.style.display = n ? "grid" : "none";
  }

  // ── Görüntülenme sayacı (cihaz bazlı; ilanın taban sayısına eklenir) ───
  const viewsKey = "emlakai.views";
  function bumpViews(id) {
    let m = {};
    try { m = JSON.parse(localStorage.getItem(viewsKey) || "{}"); } catch (e) {}
    m[id] = (m[id] || 0) + 1;
    localStorage.setItem(viewsKey, JSON.stringify(m));
    return m[id];
  }

  // ── SVG görsel üreteci (dış görsel yok; tür bazlı yer tutucu) ──────────
  const PALETTES = {
    daire: ["#2456d8", "#4d8bf5"], residence: ["#5b2ac9", "#9b6bff"],
    villa: ["#0c8a54", "#3cc98a"], mustakil: ["#b06b12", "#e8a94b"],
    dukkan: ["#b3266b", "#ef6aa8"], ofis: ["#0e7d93", "#3fb9cf"], arsa: ["#557a1f", "#93bf4e"],
    otomobil: ["#37415e", "#5f6f9e"],
  };
  const GLYPHS = {
    daire: "🏢", residence: "🏙️", villa: "🏡", mustakil: "🏠", dukkan: "🏪", ofis: "🏛️", arsa: "🌳",
    otomobil: "🚗",
  };
  function thumbHTML(l, big) {
    if (l.photos && l.photos.length) {
      return `<img src="${l.photos[0]}" alt="${esc(l.title)}" style="width:100%;height:100%;object-fit:cover">`;
    }
    return thumbSVG(l, big);
  }
  function thumbSVG(l, big) {
    const [c1, c2] = PALETTES[l.kind] || PALETTES.daire;
    const g = GLYPHS[l.kind] || "🏠";
    const label = l.segment === "vasita" ? `${l.brand} ${l.model}` : `${l.kindLabel} · ${l.district}`;
    const seed = l.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const h = big ? 420 : 300;
    // arka plana ilana özgü "şehir silüeti" çubukları
    let bars = "";
    for (let i = 0; i < 9; i++) {
      const bw = 46 + ((seed * (i + 3)) % 40);
      const bh = 60 + ((seed * (i + 7)) % 140);
      bars += `<rect x="${i * 55}" y="${h - bh}" width="${bw}" height="${bh}" fill="rgba(255,255,255,0.12)" rx="4"/>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 ${h}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${esc(l.kindLabel)}">
      <defs><linearGradient id="g${seed}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
      <rect width="480" height="${h}" fill="url(#g${seed})"/>${bars}
      <text x="240" y="${h / 2 + 6}" font-size="${big ? 84 : 64}" text-anchor="middle" dominant-baseline="middle">${g}</text>
      <text x="240" y="${h - 22}" font-size="17" font-weight="700" text-anchor="middle" fill="rgba(255,255,255,0.92)" font-family="system-ui">${esc(label)}</text>
    </svg>`;
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

  // Telefon normalizasyonu: "0543 743 42 09" → {display, intl, wa}
  function normPhone(raw) {
    let d = String(raw || "").replace(/\D/g, "");
    if (d.startsWith("90")) d = d.slice(2);
    if (d.startsWith("0")) d = d.slice(1);
    if (d.length !== 10) return null;
    return {
      display: "0" + d.replace(/(\d{3})(\d{3})(\d{2})(\d{2})/, "$1 $2 $3 $4"),
      intl: "+90" + d,
      wa: "90" + d,
    };
  }

  // ── İlan kartı ──────────────────────────────────────────────────────────
  function cardHTML(l) {
    const b = AI.priceBadge(l);
    const isFav = favs().includes(l.id);
    const meta = [];
    if (l.segment === "vasita") {
      meta.push(l.year, fmt(l.km) + " km", l.fuel, l.gear);
    } else {
      if (l.rooms) meta.push(l.rooms);
      meta.push(fmt(l.m2) + " m²");
      if (l.age != null && l.kind !== "arsa") meta.push(l.age === 0 ? "Sıfır" : l.age + " yaş");
    }
    return `<article class="card reveal">
      <div class="thumb">${thumbHTML(l)}
        ${l.featured ? `<span class="badge badge-feat">${C.featured.label}</span>` : ""}
        ${b ? `<span class="badge ${b.cls}" ${l.featured ? 'style="top:40px"' : ""}>${b.label}${b.pct ? " (%" + b.pct + ")" : ""}</span>` : ""}
        <span class="badge badge-cat">${l.category === "satilik" ? "Satılık" : "Kiralık"}</span>
        <button class="fav-btn" data-fav="${l.id}" title="Favorilere ekle" style="z-index:3">${isFav ? "❤️" : "🤍"}</button>
      </div>
      <div class="body">
        <div class="price">${fmtPrice(l)}</div>
        <h3>${esc(l.title)}</h3>
        <div class="meta">${meta.map(esc).join(" · ")}</div>
        <div class="loc">📍 ${esc(l.city)} / ${esc(l.district)}</div>
      </div>
      <a class="overlay" href="ilan.html?id=${l.id}" aria-label="${esc(l.title)}"></a>
    </article>`;
  }
  function bindFavButtons(root) {
    $$("[data-fav]", root).forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault(); e.stopPropagation();
        btn.textContent = toggleFav(btn.dataset.fav) ? "❤️" : "🤍";
        if (document.body.dataset.page === "favoriler") pageFavoriler();
      });
    });
  }
  function renderCards(el, list, emptyMsg) {
    if (!list.length) {
      el.innerHTML = `<div class="empty" style="grid-column:1/-1"><p style="font-size:2.4rem">🔍</p><p>${esc(emptyMsg || "Bu kriterlere uygun ilan bulunamadı.")}</p></div>`;
      return;
    }
    el.innerHTML = list.map(cardHTML).join("");
    bindFavButtons(el);
    observeReveals(el);
  }

  // ── Ortak başlık/menü/tema/FAB ─────────────────────────────────────────
  function initChrome() {
    const t = $("#themeToggle");
    if (t) t.addEventListener("click", () => {
      const now = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      localStorage.setItem(themeKey, now);
      applyTheme(now);
    });
    const m = $("#menuToggle");
    if (m) m.addEventListener("click", () => $("#mainNav").classList.toggle("open"));
    updateFavCount();
    // İletişim enjeksiyonu
    $$("[data-c-tel]").forEach((a) => { a.href = "tel:" + C.company.phone.intl; a.textContent = C.company.phone.display; });
    $$("[data-c-mail]").forEach((a) => { a.href = "mailto:" + C.company.email; a.textContent = C.company.email; });
    $$("[data-c-addr]").forEach((el) => { el.textContent = C.company.address; });
    injectSiteJsonLd();
    observeReveals(document);
  }

  // ── SEO: JSON-LD yapılandırılmış veri (config'ten üretilir) ─────────────
  function addJsonLd(obj) {
    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.textContent = JSON.stringify(obj);
    document.head.appendChild(s);
  }
  function injectSiteJsonLd() {
    const url = C.seo.siteUrl;
    addJsonLd({
      "@context": "https://schema.org", "@type": "Organization",
      name: C.brand.name, legalName: C.company.title, url,
      logo: url + C.seo.ogImage, email: C.company.email,
      telephone: C.company.phone.intl,
      address: { "@type": "PostalAddress", streetAddress: C.company.address, addressCountry: "TR" },
      sameAs: C.seo.sameAs,
    });
    addJsonLd({
      "@context": "https://schema.org", "@type": "WebSite",
      name: C.brand.name, url, inLanguage: "tr",
      description: C.brand.tagline,
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: url + "/ilanlar.html?q={search_term_string}" },
        "query-input": "required name=search_term_string",
      },
    });
  }
  function observeReveals(root) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.08 });
    $$(".reveal:not(.in)", root).forEach((el) => io.observe(el));
  }

  // ── Trend grafiği (SVG sparkline) ───────────────────────────────────────
  function sparkline(el, pts, label) {
    if (!pts || !el) return;
    const w = 560, h = 130, pad = 8;
    const min = Math.min(...pts), max = Math.max(...pts);
    const x = (i) => pad + (i * (w - 2 * pad)) / (pts.length - 1);
    const y = (v) => h - pad - ((v - min) / (max - min || 1)) * (h - 2 * pad - 18);
    const path = pts.map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1)).join(" ");
    el.innerHTML = `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <path d="${path} L ${x(pts.length - 1)} ${h} L ${x(0)} ${h} Z" fill="color-mix(in srgb, var(--primary) 15%, transparent)"/>
      <path d="${path}" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="${x(pts.length - 1)}" cy="${y(pts[pts.length - 1])}" r="4" fill="var(--primary)"/>
      <text x="${pad}" y="${h - 2}" font-size="11" fill="var(--muted)" font-family="system-ui">${esc(label || "")} — son 12 ay ₺/m²: ${fmt(pts[0])} → ${fmt(pts[pts.length - 1])}</text>
    </svg>`;
  }

  // ── Select doldurucular ─────────────────────────────────────────────────
  function fillCitySelect(sel, withAll) {
    sel.innerHTML = (withAll ? '<option value="">Tüm Şehirler</option>' : "") +
      D.cities.map((c) => `<option>${esc(c)}</option>`).join("");
  }
  function fillDistrictSelect(sel, city, withAll) {
    const ds = city ? D.districtsOf(city) : [];
    sel.innerHTML = (withAll ? '<option value="">Tüm İlçeler</option>' : '<option value="">İlçe seçin</option>') +
      ds.map((d) => `<option>${esc(d)}</option>`).join("");
  }

  // ═════════════════════════ SAYFALAR ═════════════════════════

  // ── Ana sayfa (Google sadeliği: logo + tek arama kutusu) ───────────────
  function pageIndex() {
    let seg = "emlak";
    const PH = {
      emlak: 'Örn. "Manavgat\'ta 5 milyon altı satılık villa" ya da "İzmir\'de kiralık 1+1"',
      vasita: 'Örn. "2020 üstü dizel otomatik Corolla" ya da "kiralık araç Antalya"',
    };
    const input = $("#aiQuery");
    input.placeholder = PH.emlak;
    $$("#segTabs .tab-btn").forEach((b) => b.addEventListener("click", () => {
      $$("#segTabs .tab-btn").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      seg = b.dataset.seg;
      input.placeholder = PH[seg];
      input.focus();
    }));
    const doSearch = () => {
      const text = input.value.trim();
      const f = text ? AI.parseQuery(text) : {};
      if (!f.segment) f.segment = seg;
      location.href = "ilanlar.html?" + AI.filtersToQS(f) + (text ? "&q=" + encodeURIComponent(text) : "");
    };
    $("#aiSearchBtn").addEventListener("click", doSearch);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") doSearch(); });
    input.focus();
  }

  // ── İlanlar ────────────────────────────────────────────────────────────
  function pageIlanlar() {
    const qs = new URLSearchParams(location.search);
    const f = {};
    ["segment", "category", "kind", "city", "district", "rooms", "feature", "brand", "model", "fuel", "gear"].forEach((k) => { if (qs.get(k)) f[k] = qs.get(k); });
    if (qs.get("min")) f.minPrice = +qs.get("min");
    if (qs.get("max")) f.maxPrice = +qs.get("max");
    if (qs.get("minYear")) f.minYear = +qs.get("minYear");
    if (qs.get("maxKm")) f.maxKm = +qs.get("maxKm");
    const rawQ = qs.get("q");
    // Yalnızca ?q= ile gelinirse (arama motoru SearchAction / dış bağlantı)
    // doğal dil sorgusunu ayrıştırıp filtrelere dönüştür; açık paramlar önceliklidir.
    if (rawQ) {
      const parsed = AI.parseQuery(rawQ);
      ["segment", "category", "kind", "city", "district", "rooms", "feature", "minPrice", "maxPrice", "brand", "model", "minYear", "maxKm", "fuel", "gear"].forEach((k) => {
        if (f[k] == null && parsed[k] != null) f[k] = parsed[k];
      });
    }
    if (!f.segment) f.segment = "emlak";

    // Filtre alanlarını doldur
    fillCitySelect($("#fCity"), true);
    fillDistrictSelect($("#fDistrict"), f.city || "", true);
    $("#fKind").innerHTML = '<option value="">Tüm Türler</option>' + D.kinds.map((k) => `<option value="${k.kind}">${esc(k.label)}</option>`).join("");
    $("#fBrand").innerHTML = '<option value="">Tüm Markalar</option>' + D.brands.map((b) => `<option>${esc(b)}</option>`).join("");
    $("#fFuel").innerHTML = '<option value="">Tümü</option>' + C.vehicles.fuels.map((x) => `<option>${esc(x)}</option>`).join("");
    $("#fGear").innerHTML = '<option value="">Tümü</option>' + C.vehicles.gears.map((x) => `<option>${esc(x)}</option>`).join("");
    function fillModels() {
      const models = $("#fBrand").value ? D.modelsOf($("#fBrand").value) : [];
      $("#fModel").innerHTML = '<option value="">Tüm Modeller</option>' + models.map((m) => `<option>${esc(m)}</option>`).join("");
    }
    fillModels();

    $("#fSeg").value = f.segment;
    if (f.category) $("#fCat").value = f.category;
    if (f.city) $("#fCity").value = f.city;
    if (f.district) $("#fDistrict").value = f.district;
    if (f.kind) $("#fKind").value = f.kind;
    if (f.rooms) $("#fRooms").value = f.rooms;
    if (f.minPrice) $("#fMin").value = f.minPrice;
    if (f.maxPrice) $("#fMax").value = f.maxPrice;
    if (f.brand) { $("#fBrand").value = f.brand; fillModels(); }
    if (f.model) $("#fModel").value = f.model;
    if (f.minYear) $("#fMinYear").value = f.minYear;
    if (f.maxKm != null) $("#fMaxKm").value = f.maxKm;
    if (f.fuel) $("#fFuel").value = f.fuel;
    if (f.gear) $("#fGear").value = f.gear;

    // Segmente göre filtre alanlarını göster/gizle
    function syncSegmentUI() {
      const seg = $("#fSeg").value;
      $$(".f-emlak").forEach((el) => { el.style.display = seg === "emlak" ? "" : "none"; });
      $$(".f-vasita").forEach((el) => { el.style.display = seg === "vasita" ? "" : "none"; });
      document.querySelector('#fSort option[value="m2"]').hidden = seg !== "emlak";
    }
    syncSegmentUI();

    $("#fCity").addEventListener("change", () => fillDistrictSelect($("#fDistrict"), $("#fCity").value, true));
    $("#fBrand").addEventListener("change", fillModels);

    if (rawQ) {
      $("#aiNote").style.display = "block";
      $("#aiNote").innerHTML = `<b>AI aramanızı anladı:</b> "${esc(rawQ)}" sorgusu filtrelere dönüştürüldü. Filtreleri dilediğiniz gibi ayarlayabilirsiniz.`;
    }

    function currentFilters() {
      const seg = $("#fSeg").value;
      const g = { segment: seg };
      if ($("#fCat").value) g.category = $("#fCat").value;
      if ($("#fCity").value) g.city = $("#fCity").value;
      if ($("#fDistrict").value) g.district = $("#fDistrict").value;
      if ($("#fMin").value) g.minPrice = +$("#fMin").value;
      if ($("#fMax").value) g.maxPrice = +$("#fMax").value;
      if (seg === "emlak") {
        if ($("#fKind").value) g.kind = $("#fKind").value;
        if ($("#fRooms").value) g.rooms = $("#fRooms").value;
        if (f.feature) g.feature = f.feature;
      } else {
        if ($("#fBrand").value) g.brand = $("#fBrand").value;
        if ($("#fModel").value) g.model = $("#fModel").value;
        if ($("#fMinYear").value) g.minYear = +$("#fMinYear").value;
        if ($("#fMaxKm").value) g.maxKm = +$("#fMaxKm").value;
        if ($("#fFuel").value) g.fuel = $("#fFuel").value;
        if ($("#fGear").value) g.gear = $("#fGear").value;
      }
      return g;
    }
    function run() {
      let list = AI.applyFilters(D.all(), currentFilters());
      const sort = $("#fSort").value;
      if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
      else if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
      else if (sort === "m2") list.sort((a, b) => (b.m2 || 0) - (a.m2 || 0));
      else if (sort === "ai") {
        list = list.map((l) => ({ l, b: AI.priceBadge(l) }))
          .sort((a, b) => (b.b && b.b.key === "firsat" ? b.b.pct : -(b.b ? b.b.pct : 0)) - (a.b && a.b.key === "firsat" ? a.b.pct : -(a.b ? a.b.pct : 0)))
          .map((x) => x.l);
      } else {
        list.sort((a, b) => new Date(b.date) - new Date(a.date));
        list = AI.rank(list); // öne çıkan ilanlar varsayılan sıralamada önce gelir
      }
      $("#count").textContent = fmt(list.length) + " ilan bulundu";
      renderCards($("#grid"), list, D.all().length === 0
        ? "Henüz yayında ilan yok. İlk ilanı siz verebilirsiniz — İlan Ver sayfası bir dakikanızı alır."
        : "Bu kriterlere uygun ilan bulunamadı. Filtreleri genişletmeyi deneyin.");
    }
    $("#fSeg").addEventListener("change", () => { syncSegmentUI(); run(); });
    const ft = $("#filtersToggle");
    if (ft) ft.addEventListener("click", () => $(".filters").classList.toggle("open"));
    $("#applyBtn").addEventListener("click", run);
    $("#fSort").addEventListener("change", run);
    $("#clearBtn").addEventListener("click", () => { location.href = "ilanlar.html?segment=" + $("#fSeg").value; });
    ["fCat", "fCity", "fDistrict", "fKind", "fRooms", "fBrand", "fModel", "fFuel", "fGear"].forEach((id) => $("#" + id).addEventListener("change", run));
    run();
  }

  // ── İlan detay ──────────────────────────────────────────────────────────
  function pageIlan() {
    const id = new URLSearchParams(location.search).get("id");
    const l = id && D.byId(id);
    const root = $("#detailRoot");
    if (!l) {
      root.innerHTML = '<div class="empty"><p style="font-size:2.4rem">😕</p><p>İlan bulunamadı ya da yayından kaldırılmış.</p><p style="margin-top:14px"><a class="btn" href="ilanlar.html">Tüm İlanlara Dön</a></p></div>';
      return;
    }
    document.title = l.title + " — " + C.brand.name;
    // Dinamik SEO: description, canonical ve ilan JSON-LD'si
    const metaDesc = document.querySelector('meta[name="description"]');
    const descText = `${l.title} — ${fmt(l.price)} ₺${l.category === "kiralik" ? "/ay" : ""}, ${fmt(l.m2)} m²${l.rooms ? ", " + l.rooms : ""}, ${l.city}/${l.district}. AI değerleme ve fiyat analiziyle.`;
    if (metaDesc) metaDesc.setAttribute("content", descText);
    let canon = document.querySelector('link[rel="canonical"]');
    if (!canon) { canon = document.createElement("link"); canon.rel = "canonical"; document.head.appendChild(canon); }
    canon.href = C.seo.siteUrl + "/ilan.html?id=" + l.id;
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": l.category === "kiralik" ? "RealEstateListing" : "RealEstateListing",
      name: l.title, url: canon.href, description: descText,
      datePosted: l.date,
      offers: { "@type": "Offer", price: l.price, priceCurrency: "TRY", availability: "https://schema.org/InStock" },
      address: { "@type": "PostalAddress", addressLocality: l.district, addressRegion: l.city, addressCountry: "TR" },
      floorSize: { "@type": "QuantitativeValue", value: l.m2, unitCode: "MTK" },
      numberOfRooms: l.rooms || undefined,
      image: (l.photos && l.photos[0]) || C.seo.siteUrl + C.seo.ogImage,
    });
    document.head.appendChild(ld);
    const ldBc = document.createElement("script");
    ldBc.type = "application/ld+json";
    ldBc.textContent = JSON.stringify({
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: C.seo.siteUrl + "/" },
        { "@type": "ListItem", position: 2, name: "İlanlar", item: C.seo.siteUrl + "/ilanlar.html" },
        { "@type": "ListItem", position: 3, name: l.city, item: C.seo.siteUrl + "/ilanlar.html?city=" + encodeURIComponent(l.city) },
        { "@type": "ListItem", position: 4, name: l.title, item: canon.href },
      ],
    });
    document.head.appendChild(ldBc);

    const est = AI.estimate(l);
    const b = AI.priceBadge(l);
    const desc = l.desc || AI.describe(l);
    const catLabel = l.category === "satilik" ? "Satılık" : "Kiralık";
    const specs = (l.segment === "vasita" ? [
      ["İlan No", l.id], ["Kategori", catLabel],
      ["Marka", l.brand], ["Model", l.model],
      ["Model Yılı", l.year], ["Kilometre", fmt(l.km) + " km"],
      ["Yakıt", l.fuel], ["Vites", l.gear],
      ["Konum", l.city + " / " + l.district],
      ["İlan Tarihi", new Date(l.date).toLocaleDateString("tr-TR")],
    ] : [
      ["İlan No", l.id], ["Kategori", catLabel],
      ["Tür", l.kindLabel], ["Konum", l.city + " / " + l.district],
      l.locality && ["Mahalle / Site", l.locality],
      ["Alan (Brüt)", fmt(l.m2) + " m²"],
      l.m2Net && ["Alan (Net)", fmt(l.m2Net) + " m²"],
      l.rooms && ["Oda Sayısı", l.rooms], l.bath && l.kind !== "arsa" && ["Banyo", l.bath],
      l.age != null && l.kind !== "arsa" && ["Bina Yaşı", l.age === 0 ? "Sıfır" : l.age],
      l.floor != null && ["Kat", l.floor + (l.totalFloors ? " / " + l.totalFloors : "")],
      l.totalFloors && l.floor == null && ["Kat Sayısı", l.totalFloors],
      l.heating && ["Isıtma", l.heating],
      l.kitchen && ["Mutfak", l.kitchen],
      l.dues != null && ["Aidat", fmt(l.dues) + " ₺/ay"],
      l.deed && ["Tapu Durumu", l.deed],
      l.creditOk != null && ["Krediye Uygun", l.creditOk ? "Evet" : "Hayır"],
      l.swap != null && ["Takas", l.swap ? "Evet" : "Hayır"],
      ["İlan Tarihi", new Date(l.date).toLocaleDateString("tr-TR")],
    ]).filter(Boolean);

    const dotPos = est ? Math.max(4, Math.min(96, 50 + ((l.price / est.mid - 1) / 0.25) * 50)) : 50;
    const contact = l.phone || C.company.phone; // ilana özel telefon varsa o kullanılır
    // İstatistikler: taban (kaynak ilan) + bu cihazdaki görüntülenme/favori
    const totalViews = (l.views || 0) + bumpViews(l.id);
    const statHTML = () => `👁 ${fmt(totalViews)} görüntülenme &nbsp;·&nbsp; ❤️ ${fmt((l.favCount || 0) + (favs().includes(l.id) ? 1 : 0))} favori`;
    const wa = "https://wa.me/" + contact.wa + "?text=" + encodeURIComponent(`Merhaba, ${l.id} numaralı "${l.title}" ilanı hakkında bilgi almak istiyorum.`);

    root.innerHTML = `
      <div class="breadcrumb container">
        <a href="index.html">Ana Sayfa</a> › <a href="ilanlar.html">İlanlar</a> ›
        <a href="ilanlar.html?city=${encodeURIComponent(l.city)}">${esc(l.city)}</a> › ${esc(l.title)}
      </div>
      <div class="detail-layout container">
        <div>
          <div class="gallery" id="galleryMain">${thumbHTML(l, true)}</div>
          ${(l.photos || []).length > 1 ? `<div class="photo-strip">${l.photos.map((p, i) => `<img src="${p}" data-photo="${i}" alt="Fotoğraf ${i + 1}" class="${i === 0 ? "sel" : ""}">`).join("")}</div>` : ""}
          <div class="detail-card">
            <h2>Açıklama</h2>
            <p>${esc(desc)}</p>
          </div>
          <div class="detail-card">
            <h2>İlan Bilgileri</h2>
            <table class="spec-table">${specs.map(([k, v]) => `<tr><td>${esc(k)}</td><td><b>${esc(v)}</b></td></tr>`).join("")}</table>
            ${(l.features || []).length ? `<div class="tags" style="margin-top:14px">${l.features.map((f) => `<span class="chip">✓ ${esc(f)}</span>`).join("")}</div>` : ""}
          </div>
          ${l.segment !== "vasita" ? `<div class="detail-card">
            <h2>${esc(l.district)} Fiyat Eğilimi</h2>
            <div id="trendChart"></div>
          </div>` : ""}
          <div class="detail-card">
            <h2>Benzer İlanlar</h2>
            <div class="grid" id="similarGrid"></div>
          </div>
        </div>
        <aside class="side-card">
          <div class="price">${fmtPrice(l)}</div>
          <div class="stat-line" id="statLine">${statHTML()}</div>
          ${l.featured ? `<span class="chip" style="border-color:var(--accent);color:var(--accent);font-weight:700">${C.featured.label} İlan</span>` : ""}
          ${b ? `<span class="chip" style="border-color:currentColor;color:${b.key === "firsat" ? "var(--deal)" : b.key === "ustu" ? "var(--over)" : "var(--fair)"}">${b.label}${b.pct ? " — piyasadan %" + b.pct + (b.key === "firsat" ? " ucuz" : " pahalı") : ""}</span>` : ""}
          ${est ? `<div class="est-box">
              <b>AI Değerleme</b><br>
              Tahmini değer: <b class="mid">${fmt(est.mid)} ₺${priceSuffix(l)}</b><br>
              <small>Bant: ${fmt(est.low)} – ${fmt(est.high)} ₺${est.perM2 ? " · " + fmt(est.perM2) + " ₺/m²" : ""}</small>
              <div class="range-bar"><span class="dot" style="left:${dotPos}%"></span></div>
              <small style="color:var(--muted)">← ucuz | piyasa | pahalı →</small>
            </div>` : ""}
          <div class="seller">
            <div class="avatar">${esc(l.seller.name[0])}</div>
            <div><b>${esc(l.seller.name)}</b><br><small style="color:var(--muted)">${l.seller.type === "sahibinden" ? "Bireysel Satıcı" : l.segment === "vasita" ? "Galeri" : "Emlak Ofisi"}</small></div>
          </div>
          <a class="btn" id="callBtn" href="tel:${contact.intl}">📞 ${esc(contact.display)}</a>
          <a class="btn" style="background:#25d366" href="${wa}" target="_blank" rel="noopener">WhatsApp ile Sor</a>
          <button class="btn ghost" data-fav="${l.id}">${favs().includes(l.id) ? "❤️ Favorilerde" : "🤍 Favorilere Ekle"}</button>
          <div style="display:flex;gap:8px">
            <button class="btn ghost sm" id="shareBtn" type="button" style="flex:1">Paylaş</button>
            <button class="btn ghost sm" id="printBtn" type="button" style="flex:1">Yazdır / PDF</button>
          </div>
          ${l.user ? `<button class="btn ghost" id="removeBtn" style="color:var(--over);border-color:var(--over)">İlanı Kaldır</button>` : ""}
          ${l.category === "satilik" ? (() => {
            const cr = l.segment === "vasita" ? C.credit.vehicle : C.credit;
            return `<div class="est-box">
            <b>${l.segment === "vasita" ? "Taşıt Kredisi" : "Konut Kredisi"} Taksiti</b><br>
            <small>%${cr.defaultRate} aylık faiz, %${cr.maxLtv * 100} kredi ile:</small>
            <ul class="factor-list">${cr.terms.map((t) => { const m = AI.mortgage(l.price * cr.maxLtv, cr.defaultRate, t); return `<li><span>${t >= 12 && t % 12 === 0 ? t / 12 + " yıl" : t + " ay"} vade</span><b>${fmt(Math.round(m.monthly))} ₺/ay</b></li>`; }).join("")}</ul>
          </div>`; })() : ""}
        </aside>
      </div>`;

    sparkline($("#trendChart"), AI.trend(l.city, l.district), l.city + " / " + l.district);
    renderCards($("#similarGrid"), AI.similar(l, D.all(), 4));
    $$(".photo-strip img", root).forEach((im) => im.addEventListener("click", () => {
      $("#galleryMain").innerHTML = `<img src="${l.photos[+im.dataset.photo]}" alt="${esc(l.title)}" style="width:100%;display:block">`;
      $$(".photo-strip img", root).forEach((x) => x.classList.remove("sel"));
      im.classList.add("sel");
    }));
    const favBtn = $(".side-card [data-fav]", root);
    favBtn.addEventListener("click", () => {
      favBtn.textContent = toggleFav(l.id) ? "❤️ Favorilerde" : "🤍 Favorilere Ekle";
      $("#statLine").innerHTML = statHTML();
    });
    const rmBtn = $("#removeBtn", root);
    if (rmBtn) rmBtn.addEventListener("click", () => {
      if (confirm("Bu ilan kalıcı olarak kaldırılacak. Emin misiniz?")) {
        D.removeUserListing(l.id);
        location.href = "ilanlar.html";
      }
    });

    // Paylaş: özet metin + bağlantı (mobilde sistem paylaşımı, masaüstünde pano)
    const shareBtn = $("#shareBtn", root);
    shareBtn.addEventListener("click", async () => {
      const summary = l.segment === "vasita"
        ? `${l.title}\n${fmtPrice(l)} · ${l.year} · ${fmt(l.km)} km · ${l.fuel} · ${l.gear}\n📍 ${l.city} / ${l.district}`
        : `${l.title}\n${fmtPrice(l)}${l.rooms ? " · " + l.rooms : ""} · ${fmt(l.m2)} m²\n📍 ${l.city} / ${l.district}${l.locality ? " · " + l.locality : ""}`;
      const url = canon.href;
      try {
        if (navigator.share) { await navigator.share({ title: l.title, text: summary, url }); return; }
        await navigator.clipboard.writeText(summary + "\n" + url);
        shareBtn.textContent = "Kopyalandı ✓";
        setTimeout(() => { shareBtn.textContent = "Paylaş"; }, 1800);
      } catch (e) { /* kullanıcı paylaşımı iptal etti */ }
    });
    $("#printBtn", root).addEventListener("click", () => window.print());
    observeReveals(root);
  }

  // ── İlan ver ────────────────────────────────────────────────────────────
  function pageIlanVer() {
    fillCitySelect($("#pCity"), false);
    fillDistrictSelect($("#pDistrict"), $("#pCity").value, false);
    $("#pCity").addEventListener("change", () => fillDistrictSelect($("#pDistrict"), $("#pCity").value, false));
    $("#pKind").innerHTML = D.kinds.map((k) => `<option value="${k.kind}">${esc(k.label)}</option>`).join("");
    $("#featBoxes").innerHTML = Object.keys(C.valuation.features)
      .map((f) => `<label><input type="checkbox" value="${esc(f)}"> ${esc(f)}</label>`).join("");
    $("#pBrand").innerHTML = D.brands.map((b) => `<option>${esc(b)}</option>`).join("");
    $("#pFuel").innerHTML = C.vehicles.fuels.map((x) => `<option>${esc(x)}</option>`).join("");
    $("#pGear").innerHTML = C.vehicles.gears.map((x) => `<option>${esc(x)}</option>`).join("");
    function fillPModels() {
      $("#pModel").innerHTML = D.modelsOf($("#pBrand").value).map((m) => `<option>${esc(m)}</option>`).join("");
    }
    fillPModels();
    $("#pBrand").addEventListener("change", fillPModels);

    // Segment geçişi (Taşınmaz / Araç)
    function syncSegmentUI() {
      const seg = $("#pSeg").value;
      $$(".p-emlak").forEach((el) => { el.style.display = seg === "emlak" ? "" : "none"; });
      $$(".p-vasita").forEach((el) => { el.style.display = seg === "vasita" ? "" : "none"; });
    }
    $("#pSeg").addEventListener("change", syncSegmentUI);
    syncSegmentUI();

    // Fotoğraf yükleme: canvas ile küçültülüp base64 olarak ilana gömülür
    const photos = [];
    $("#pPhotos").addEventListener("change", (e) => {
      const files = Array.from(e.target.files || []).slice(0, 5 - photos.length);
      files.forEach((file) => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, 900 / img.width);
          const cv = document.createElement("canvas");
          cv.width = Math.round(img.width * scale);
          cv.height = Math.round(img.height * scale);
          cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
          photos.push(cv.toDataURL("image/jpeg", 0.8));
          URL.revokeObjectURL(img.src);
          renderPhotoPreview();
        };
        img.src = URL.createObjectURL(file);
      });
      e.target.value = "";
    });
    function renderPhotoPreview() {
      $("#photoPreview").innerHTML = photos.map((p, i) =>
        `<span style="position:relative;display:inline-block"><img src="${p}" alt="Fotoğraf ${i + 1}" style="width:90px;height:64px;object-fit:cover;border-radius:8px;border:1px solid var(--border)">
         <button type="button" data-rm="${i}" style="position:absolute;top:-6px;right:-6px;background:var(--over);color:#fff;border:none;border-radius:999px;width:20px;height:20px;font-size:11px;line-height:1">✕</button></span>`).join("");
      $$("#photoPreview [data-rm]").forEach((b) => b.addEventListener("click", () => { photos.splice(+b.dataset.rm, 1); renderPhotoPreview(); }));
    }

    function collect() {
      const seg = $("#pSeg").value;
      const sellerType = $("#pSellerType").value;
      const sellerName = $("#pSellerName").value.trim() || (sellerType === "ofis" ? "Emlak Ofisi" : "Sahibinden");
      const base = {
        segment: seg,
        category: $("#pCat").value,
        city: $("#pCity").value, district: $("#pDistrict").value,
        price: +$("#pPrice").value || 0,
        title: $("#pTitle").value.trim(),
        desc: $("#pDesc").value.trim(),
        photos: photos.slice(),
        featured: $("#pFeatured").checked,
        seller: { name: sellerName, type: sellerType },
        phone: normPhone($("#pPhone").value),
      };
      if (seg === "vasita") {
        return Object.assign(base, {
          kind: "otomobil", kindLabel: "Otomobil",
          brand: $("#pBrand").value, model: $("#pModel").value,
          year: +$("#pYear").value || 0, km: +$("#pKm").value || 0,
          fuel: $("#pFuel").value, gear: $("#pGear").value,
          m2: null, rooms: null, bath: null, age: null,
          floorPos: null, floor: null, totalFloors: null, heating: null,
          features: [],
        });
      }
      const kind = $("#pKind").value;
      const kindLabel = (D.kinds.find((k) => k.kind === kind) || {}).label || kind;
      return Object.assign(base, {
        kind, kindLabel,
        m2: +$("#pM2").value || 0,
        rooms: kind === "arsa" ? null : $("#pRooms").value || null,
        age: kind === "arsa" ? null : +$("#pAge").value || 0,
        bath: 1, floorPos: null, floor: null, totalFloors: null,
        heating: kind === "arsa" ? null : "Kombi (Doğalgaz)",
        features: $$("#featBoxes input:checked").map((i) => i.value),
      });
    }

    function validate(l) {
      if (!l.district) return "Lütfen ilçe seçin.";
      if ($("#pPhone").value.trim() && !l.phone) return "Telefon numarası geçersiz görünüyor (örn. 0543 743 42 09).";
      if (l.segment === "vasita") {
        if (!l.brand || !l.model) return "Marka ve model seçin.";
        if (!l.year || l.year < C.vehicles.minYear || l.year > 2026) return "Geçerli bir model yılı girin.";
        if (l.km == null || l.km < 0) return "Geçerli bir kilometre girin.";
        return null;
      }
      if (!l.m2 || l.m2 < 10) return "Geçerli bir m² girin.";
      return null;
    }

    // AI fiyat önerisi
    $("#suggestBtn").addEventListener("click", () => {
      const l = collect();
      const err = validate(l);
      const out = $("#suggestOut");
      if (err) { out.innerHTML = `<span style="color:var(--over)">${esc(err)}</span>`; return; }
      const est = AI.estimate(l);
      if (!est) { out.textContent = "Bu seçim için piyasa verisi bulunamadı."; return; }
      out.innerHTML = `AI fiyat önerisi: <b>${fmt(est.low)} – ${fmt(est.high)} ₺${priceSuffix(l)}</b> (orta nokta ${fmt(est.mid)} ₺). Hızlı satış için bandın altını, pazarlık payı için üstünü seçebilirsiniz.`;
      if (!$("#pPrice").value) $("#pPrice").value = est.mid;
    });

    function autoTitle(l) {
      const catLabel = l.category === "satilik" ? "Satılık" : "Kiralık";
      if (l.segment === "vasita") return `${l.year} ${l.brand} ${l.model} ${catLabel}`;
      return `${l.district} ${l.rooms ? l.rooms + " " : ""}${catLabel} ${l.kindLabel}` + ((l.features || []).includes("Deniz Manzarası") ? " — Deniz Manzaralı" : "");
    }

    // AI başlık + açıklama
    $("#writeBtn").addEventListener("click", () => {
      const l = collect();
      const err = validate(l);
      if (err) { $("#suggestOut").innerHTML = `<span style="color:var(--over)">${esc(err)}</span>`; return; }
      l.id = "TMP" + Date.now();
      $("#pTitle").value = autoTitle(l);
      $("#pDesc").value = AI.describe(l);
    });

    // Yayınla
    $("#publishBtn").addEventListener("click", () => {
      const l = collect();
      const err = validate(l) || (!l.price ? "Fiyat girin ya da AI önerisini kullanın." : null);
      if (err) { $("#suggestOut").innerHTML = `<span style="color:var(--over)">${esc(err)}</span>`; return; }
      l.title = l.title || autoTitle(l);
      l.desc = l.desc || null;
      const saved = D.saveUserListing(l);
      location.href = "ilan.html?id=" + saved.id;
    });
  }

  // ── Değerleme ───────────────────────────────────────────────────────────
  function pageDegerleme() {
    fillCitySelect($("#vCity"), false);
    fillDistrictSelect($("#vDistrict"), $("#vCity").value, false);
    $("#vCity").addEventListener("change", () => fillDistrictSelect($("#vDistrict"), $("#vCity").value, false));
    $("#vKind").innerHTML = D.kinds.map((k) => `<option value="${k.kind}">${esc(k.label)}</option>`).join("");
    $("#vFeatBoxes").innerHTML = Object.keys(C.valuation.features)
      .map((f) => `<label><input type="checkbox" value="${esc(f)}"> ${esc(f)}</label>`).join("");
    $("#vBrand").innerHTML = D.brands.map((b) => `<option>${esc(b)}</option>`).join("");
    $("#vFuel").innerHTML = C.vehicles.fuels.map((x) => `<option>${esc(x)}</option>`).join("");
    $("#vGear").innerHTML = C.vehicles.gears.map((x) => `<option>${esc(x)}</option>`).join("");
    function fillVModels() {
      $("#vModel").innerHTML = D.modelsOf($("#vBrand").value).map((m) => `<option>${esc(m)}</option>`).join("");
    }
    fillVModels();
    $("#vBrand").addEventListener("change", fillVModels);

    function syncSegmentUI() {
      const seg = $("#vSeg").value;
      $$(".v-emlak").forEach((el) => { el.style.display = seg === "emlak" ? "" : "none"; });
      $$(".v-vasita").forEach((el) => { el.style.display = seg === "vasita" ? "" : "none"; });
      $("#vCatKira").textContent = seg === "vasita" ? "Günlük Kiralama Değeri" : "Kira Değeri (aylık)";
      $("#vResult").style.display = "none";
    }
    $("#vSeg").addEventListener("change", syncSegmentUI);
    syncSegmentUI();

    $("#vBtn").addEventListener("click", () => {
      const seg = $("#vSeg").value;
      const panel = $("#vResult");
      let p;
      if (seg === "vasita") {
        p = {
          segment: "vasita",
          brand: $("#vBrand").value, model: $("#vModel").value,
          year: +$("#vYear").value || 0, km: +$("#vKm").value || 0,
          fuel: $("#vFuel").value, gear: $("#vGear").value,
          category: $("#vCat").value,
        };
        if (!p.year || p.year < C.vehicles.minYear || p.year > 2026) {
          panel.style.display = "block";
          panel.innerHTML = '<p style="color:var(--over)">Lütfen geçerli bir model yılı girin.</p>';
          return;
        }
      } else {
        p = {
          city: $("#vCity").value, district: $("#vDistrict").value,
          kind: $("#vKind").value, category: $("#vCat").value,
          m2: +$("#vM2").value || 0, rooms: $("#vRooms").value || null,
          age: +$("#vAge").value || 0, floorPos: null,
          features: $$("#vFeatBoxes input:checked").map((i) => i.value),
        };
        if (!p.district || !p.m2) {
          panel.style.display = "block";
          panel.innerHTML = '<p style="color:var(--over)">Lütfen ilçe ve m² bilgisini girin.</p>';
          return;
        }
      }
      const est = AI.estimate(p);
      if (!est) { panel.style.display = "block"; panel.innerHTML = "<p>Bu seçim için piyasa verisi yok.</p>"; return; }
      const unit = p.category === "kiralik" ? (seg === "vasita" ? " ₺/gün" : " ₺/ay") : " ₺";
      panel.style.display = "block";
      panel.innerHTML = `
        <p style="color:var(--muted)">Yapay zekâ değerleme sonucu (güven: %${est.confidence})</p>
        <div class="big">${fmt(est.low)} – ${fmt(est.high)}${unit}</div>
        <p>Orta nokta: <b>${fmt(est.mid)}${unit}</b>${est.perM2 ? ` · Birim değer: <b>${fmt(est.perM2)} ₺/m²</b>` : ""}</p>
        <ul class="factor-list">${est.factors.map((f) => `<li><span>${esc(f.label)}</span><b>${esc(f.unit ? fmt(f.effect) + " " + f.unit : f.effect)}</b></li>`).join("")}</ul>
        ${seg === "emlak" ? '<h3 style="margin:18px 0 6px">Bölge fiyat eğilimi</h3><div id="vTrend"></div>' : ""}
        <p class="notice" style="margin-top:12px">Bu değerleme piyasa ortalamalarına dayalı bir tahmindir; kesin değer için ${seg === "vasita" ? "ekspertiz" : "yerinde ekspertiz"} gerekir.</p>`;
      if (seg === "emlak") sparkline($("#vTrend"), AI.trend(p.city, p.district), p.city + " / " + p.district);
      panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });

    // Kredi hesaplayıcı
    $("#kRate").value = C.credit.defaultRate;
    $("#kBtn").addEventListener("click", () => {
      const amount = +$("#kAmount").value || 0;
      const rate = +$("#kRate").value || 0;
      const months = +$("#kTerm").value;
      const out = $("#kOut");
      if (amount < 10000) { out.innerHTML = '<span style="color:var(--over)">Geçerli bir kredi tutarı girin.</span>'; return; }
      const m = AI.mortgage(amount, rate, months);
      out.innerHTML = `Aylık taksit: <b style="font-size:1.3rem;color:var(--primary)">${fmt(Math.round(m.monthly))} ₺</b><br>
        Toplam geri ödeme: <b>${fmt(Math.round(m.total))} ₺</b> · Toplam faiz: <b>${fmt(Math.round(m.interest))} ₺</b>
        <p class="notice" style="margin-top:8px">Bilgi amaçlıdır; bankaların güncel oranları farklılık gösterebilir.</p>`;
    });
  }

  // ── Asistan ─────────────────────────────────────────────────────────────
  function pageAsistan() {
    const box = $("#chatBox"), input = $("#chatText");
    function push(cls, html) {
      const d = document.createElement("div");
      d.className = "msg " + cls;
      d.innerHTML = html;
      box.appendChild(d);
      box.scrollTop = box.scrollHeight;
      return d;
    }
    function botReply(text) {
      const typing = push("bot", '<span class="typing"><i></i><i></i><i></i></span>');
      setTimeout(() => {
        const r = EMLAK.ai.chat(text);
        let html = esc(r.reply);
        if (r.listings) {
          html += r.listings.map((l) => `<a class="mini-card" href="ilan.html?id=${l.id}">
            <b>${fmtPrice(l)}</b> — ${esc(l.title)}<br><small>📍 ${esc(l.city)} / ${esc(l.district)} · ${fmt(l.m2)} m²${l.rooms ? " · " + l.rooms : ""}</small></a>`).join("");
        }
        if (r.action) html += `<a class="mini-card" style="text-align:center;font-weight:700;color:var(--primary)" href="${r.action.href}">${esc(r.action.label)} →</a>`;
        typing.innerHTML = html;
        box.scrollTop = box.scrollHeight;
      }, 450 + Math.random() * 500);
    }
    function send() {
      const t = input.value.trim();
      if (!t) return;
      push("user", esc(t));
      input.value = "";
      botReply(t);
    }
    $("#chatSend").addEventListener("click", send);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });
    $$(".chip[data-ask]").forEach((c) => c.addEventListener("click", () => { input.value = c.textContent; send(); }));
    push("bot", `Merhaba! Ben <b>${esc(C.assistant.name)}</b>, ${esc(C.brand.name)}'nin yapay zekâ asistanıyım. Doğal dille yazın: taşınmaz ya da araç ilanı bulayım, değer tahmin edeyim, kredi hesaplayayım.`);
  }

  // ── Favoriler ───────────────────────────────────────────────────────────
  function pageFavoriler() {
    const list = D.all().filter((l) => favs().includes(l.id));
    renderCards($("#favGrid"), list, "Henüz favori ilanınız yok. Kartlardaki kalp simgesiyle ekleyebilirsiniz.");
    const cmp = $("#compareWrap");
    if (list.length >= 2) {
      cmp.style.display = "block";
      const rows = [
        ["Fiyat", (l) => fmtPrice(l)],
        ["Konum", (l) => l.city + " / " + l.district],
        ["Tür", (l) => l.kindLabel],
        ["Alan", (l) => fmt(l.m2) + " m²"],
        ["₺/m²", (l) => fmt(Math.round(l.price / l.m2))],
        ["Oda", (l) => l.rooms || "—"],
        ["Yaş", (l) => (l.age != null ? l.age : "—")],
        ["AI Etiketi", (l) => { const b = AI.priceBadge(l); return b ? b.label.replace("AI: ", "") : "—"; }],
      ];
      $("#compareTable").innerHTML =
        "<tr><td></td>" + list.slice(0, 4).map((l) => `<td><b><a href="ilan.html?id=${l.id}">${esc(l.title)}</a></b></td>`).join("") + "</tr>" +
        rows.map(([k, fn]) => `<tr><td>${k}</td>` + list.slice(0, 4).map((l) => `<td>${fn(l)}</td>`).join("") + "</tr>").join("");
    } else cmp.style.display = "none";
  }

  // ── Başlat ──────────────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", () => {
    initChrome();
    const page = document.body.dataset.page;
    const routes = {
      index: pageIndex, ilanlar: pageIlanlar, ilan: pageIlan,
      "ilan-ver": pageIlanVer, degerleme: pageDegerleme,
      asistan: pageAsistan, favoriler: pageFavoriler,
    };
    if (routes[page]) routes[page]();
  });
})();
