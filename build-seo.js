/**
 * EmlakAI — SEO/AEO üretim betiği
 * `assets/config.js` TEK KAYNAK kalır; bu betik oradaki veriden şunları üretir:
 *   - bolge-fiyatlari.html : statik bölge fiyat tabloları (arama motorları ve
 *     AI tarayıcıları JS çalıştırmadan okuyabilsin diye tamamen statik HTML)
 *   - sitemap.xml          : statik sayfalar + repodaki gerçek ilanlar (data.js REAL)
 *   - robots.txt           : klasik + AI tarayıcı (GPTBot, ClaudeBot…) izinleri
 *   - llms.txt             : LLM'ler için site özeti (AEO)
 * Kaynak değişince `npm run build` çalıştırıp çıktıyı da commit'le.
 */
const fs = require("fs");
const path = require("path");

// Tarayıcı globali taklidi ile config + data yükle
global.window = global;
global.localStorage = { getItem: () => null, setItem: () => {} };
new Function(fs.readFileSync(path.join(__dirname, "assets/config.js"), "utf8"))();
new Function(fs.readFileSync(path.join(__dirname, "assets/data.js"), "utf8"))();

const C = EMLAK.config;
const URL0 = C.seo.siteUrl.replace(/\/$/, "");
const fmt = (n) => new Intl.NumberFormat("tr-TR").format(Math.round(n));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ── Ortak sayfa iskeleti (nav "Bölge Fiyatları" aktif) ────────────────────
function chrome(body, { title, desc, canonical, jsonld }) {
  const ldTags = (jsonld || []).map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join("\n  ");
  return `<!DOCTYPE html>
<!-- BU DOSYA build-seo.js TARAFINDAN ÜRETİLİR — elle düzenleme; assets/config.js'i değiştirip \`npm run build\` çalıştır. -->
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${esc(C.brand.name)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${URL0 + C.seo.ogImage}">
  <meta property="og:locale" content="${C.seo.locale}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="stylesheet" href="assets/style.css">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏠</text></svg>">
  ${ldTags}
</head>
<body data-page="bolge-fiyatlari">
  <header class="site-header">
    <div class="container header-in">
      <a class="logo" href="index.html"><span class="logo-mark">🏠</span>Emlak<span class="ai">AI</span></a>
      <nav class="main-nav" id="mainNav">
        <a href="index.html">Ana Sayfa</a>
        <a href="ilanlar.html">İlanlar</a>
        <a href="degerleme.html">Değerleme</a>
        <a href="favoriler.html" style="position:relative">Favoriler<span class="fav-count" id="favCount">0</span></a>
        <a href="ilan-ver.html" class="cta">+ İlan Ver</a>
      </nav>
      <button class="icon-btn" id="themeToggle" title="Tema değiştir">🌙</button>
      <button class="icon-btn menu-toggle" id="menuToggle" title="Menü">☰</button>
    </div>
  </header>
  <main>${body}</main>
  <footer class="site-footer">
    <div class="container">
      <div class="footer-links">
        <a href="rehber.html">Rehber</a>
        <a href="asistan.html">AI Asistan</a>
        <a data-c-tel href="#">—</a>
        <a data-c-mail href="#">—</a>
      </div>
      <div class="copyright">© 2026 ${esc(C.brand.name)} — Veriler ${C.seo.dataDate} dönemi piyasa ortalamalarıdır; bilgi amaçlıdır, yatırım tavsiyesi değildir.</div>
    </div>
  </footer>
  <a class="fab" href="asistan.html">🤖 AI Asistan</a>
  <script src="assets/config.js"></script>
  <script src="assets/data.js"></script>
  <script src="assets/ai.js"></script>
  <script src="assets/app.js"></script>
</body>
</html>
`;
}

// ── 1) bolge-fiyatlari.html ───────────────────────────────────────────────
const cities = C.market.cities;
const allRows = [];
Object.entries(cities).forEach(([city, cd]) =>
  Object.entries(cd.districts).forEach(([d, p]) => allRows.push({ city, district: d, perM2: p, trend: cd.yieldTrend })));
allRows.sort((a, b) => b.perM2 - a.perM2);
const top = allRows[0], bottom = allRows[allRows.length - 1];
const avgAll = allRows.reduce((s, r) => s + r.perM2, 0) / allRows.length;

let body = `
    <div class="container page-head prose">
      <h1>Türkiye Bölge Bazlı Konut m² Fiyatları (${C.seo.dataDate})</h1>
      <p>${esc(C.brand.name)} piyasa verisine göre, takip edilen ${allRows.length} ilçede ortalama satılık konut
      fiyatı <b>${fmt(avgAll)} ₺/m²</b> düzeyindedir. En yüksek birim fiyat <b>${esc(top.city)} ${esc(top.district)}</b>
      ilçesinde (<b>${fmt(top.perM2)} ₺/m²</b>), en erişilebilir birim fiyat ise <b>${esc(bottom.city)} ${esc(bottom.district)}</b>
      ilçesindedir (<b>${fmt(bottom.perM2)} ₺/m²</b>). Aylık kira değerleri, satış değerinin yaklaşık
      %${(C.market.rentYieldMonthly * 100).toFixed(2)}'i olarak hesaplanır. Bu sayfadaki değerler
      <a href="degerleme.html">AI Değerleme</a> aracının da temel aldığı piyasa ortalamalarıdır.</p>
    </div>
    <div class="container section" style="padding-top:10px">`;

for (const [city, cd] of Object.entries(cities)) {
  const rows = Object.entries(cd.districts).sort((a, b) => b[1] - a[1]);
  const cityAvg = rows.reduce((s, r) => s + r[1], 0) / rows.length;
  body += `
      <div class="prose">
        <h2 id="${esc(city.toLocaleLowerCase("tr-TR").replace(/[^a-zçğıöşü]/g, ""))}">${esc(city)} Konut Fiyatları</h2>
        <p>${esc(city)} genelinde takip edilen ${rows.length} ilçenin ortalama satılık konut fiyatı
        <b>${fmt(cityAvg)} ₺/m²</b>; yıllık reel değer artış eğilimi yaklaşık <b>%${cd.yieldTrend}</b>'dir.
        En pahalı ilçe <b>${esc(rows[0][0])}</b> (${fmt(rows[0][1])} ₺/m²), en uygun ilçe
        <b>${esc(rows[rows.length - 1][0])}</b> (${fmt(rows[rows.length - 1][1])} ₺/m²).</p>
      </div>
      <div class="table-wrap">
        <table class="price-table">
          <thead><tr><th>İlçe</th><th>Satılık ₺/m²</th><th>100 m² Daire (tahmini)</th><th>Kira ₺/m²/ay (tahmini)</th><th>Yıllık Eğilim</th><th></th></tr></thead>
          <tbody>${rows.map(([d, p]) => `
            <tr><td><b>${esc(d)}</b></td><td><b>${fmt(p)} ₺</b></td><td>${fmt(p * 100)} ₺</td><td>${fmt(p * C.market.rentYieldMonthly)} ₺</td><td>+%${cd.yieldTrend}</td>
            <td><a href="ilanlar.html?city=${encodeURIComponent(city)}&district=${encodeURIComponent(d)}">İlanları gör →</a></td></tr>`).join("")}
          </tbody>
        </table>
      </div>`;
}

body += `
      <div class="prose">
        <h2>Bu veriler nasıl hesaplanıyor?</h2>
        <p>Tablolardaki değerler ${C.seo.dataDate} dönemi bölgesel piyasa ortalamalarıdır ve ${esc(C.brand.name)}
        yapay zekâ değerleme motorunun temel katsayılarını oluşturur. Nihai konut değeri; gayrimenkul türü, bina
        yaşı, kat konumu, oda düzeni ve özelliklere (deniz manzarası, havuz, otopark vb.) göre bu taban değerin
        üzerine katsayılarla hesaplanır. Kendi gayrimenkulünüz için <a href="degerleme.html">ücretsiz AI değerleme</a>
        yapabilir ya da <a href="asistan.html">EVA asistanına</a> doğal dille sorabilirsiniz.</p>
      </div>
    </div>`;

const datasetLd = {
  "@context": "https://schema.org", "@type": "Dataset",
  name: `Türkiye bölge bazlı konut m² fiyatları (${C.seo.dataDate})`,
  description: `${Object.keys(cities).length} il, ${allRows.length} ilçe için ortalama satılık konut ₺/m² fiyatları ve kira tahminleri. ${C.brand.name} AI değerleme motorunun temel verisi.`,
  url: URL0 + "/bolge-fiyatlari.html",
  creator: { "@type": "Organization", name: C.brand.name, url: URL0 },
  temporalCoverage: C.seo.dataDate, inLanguage: "tr", license: URL0 + "/",
  variableMeasured: ["Satılık konut fiyatı (TRY/m²)", "Tahmini aylık kira (TRY/m²)", "Yıllık değer artış eğilimi (%)"],
};
const bcLd = {
  "@context": "https://schema.org", "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: URL0 + "/" },
    { "@type": "ListItem", position: 2, name: "Bölge Fiyatları", item: URL0 + "/bolge-fiyatlari.html" },
  ],
};

fs.writeFileSync(path.join(__dirname, "bolge-fiyatlari.html"), chrome(body, {
  title: `Bölge Bazlı Konut m² Fiyatları ${C.seo.dataDate} — İstanbul, Ankara, İzmir, Antalya, Bursa | ${C.brand.name}`,
  desc: `${allRows.length} ilçe için güncel ortalama satılık konut ₺/m² fiyatları, 100 m² daire maliyeti ve kira tahminleri. En pahalı: ${top.city} ${top.district} (${fmt(top.perM2)} ₺/m²).`,
  canonical: URL0 + "/bolge-fiyatlari.html",
  jsonld: [datasetLd, bcLd],
}));

// ── 2) sitemap.xml ────────────────────────────────────────────────────────
const staticPages = [
  ["", "1.0", "daily"],
  ["ilanlar.html", "0.9", "daily"],
  ["bolge-fiyatlari.html", "0.9", "weekly"],
  ["degerleme.html", "0.8", "weekly"],
  ["asistan.html", "0.7", "weekly"],
  ["rehber.html", "0.8", "weekly"],
  ["ilan-ver.html", "0.7", "monthly"],
];
// Repoya işlenen gerçek ilanlar (Node ortamında localStorage boş → yalnız REAL)
const listingUrls = EMLAK.data.all().map((l) => `  <url><loc>${URL0}/ilan.html?id=${l.id}</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>`);
fs.writeFileSync(path.join(__dirname, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages.map(([p, pr, cf]) => `  <url><loc>${URL0}/${p}</loc><changefreq>${cf}</changefreq><priority>${pr}</priority></url>`).join("\n")}${listingUrls.length ? "\n" + listingUrls.join("\n") : ""}
</urlset>
`);

// ── 3) robots.txt ─────────────────────────────────────────────────────────
fs.writeFileSync(path.join(__dirname, "robots.txt"),
  `# ${C.brand.name} — klasik arama motorları ve AI tarayıcıları için
User-agent: *
Allow: /
Disallow: /favoriler.html

# AI arama/asistan tarayıcıları açıkça hoş karşılanır (AEO)
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: ${URL0}/sitemap.xml
`);

// ── 4) llms.txt (LLM'ler için site özeti — AEO) ──────────────────────────
const cityLines = Object.entries(cities).map(([city, cd]) => {
  const rows = Object.entries(cd.districts).sort((a, b) => b[1] - a[1]);
  return `- ${city}: ortalama ${fmt(rows.reduce((s, r) => s + r[1], 0) / rows.length)} TL/m² — en pahalı ${rows[0][0]} (${fmt(rows[0][1])} TL/m²), en uygun ${rows[rows.length - 1][0]} (${fmt(rows[rows.length - 1][1])} TL/m²)`;
}).join("\n");

fs.writeFileSync(path.join(__dirname, "llms.txt"),
  `# ${C.brand.name}

> ${C.brand.tagline}. Satılık/kiralık konut, iş yeri, arsa ve araç ilanları;
> tamamı istemci tarafında çalışan yapay zekâ araçları: doğal dil arama, anında
> değerleme (taşınmaz + araç), fiyat-piyasa analizi, ilan yazarı ve EVA asistanı.

## Önemli sayfalar

- [Ana sayfa](${URL0}/): AI destekli ilan arama (taşınmaz + araç)
- [İlanlar](${URL0}/ilanlar.html): filtreli satılık/kiralık taşınmaz ve araç listesi
- [Bölge fiyatları](${URL0}/bolge-fiyatlari.html): il/ilçe bazlı güncel konut m² fiyat tabloları (${C.seo.dataDate})
- [AI Değerleme](${URL0}/degerleme.html): ücretsiz anında gayrimenkul değerleme
- [Rehber](${URL0}/rehber.html): ev alma-satma ve kredi SSS/rehberi
- [AI Asistan](${URL0}/asistan.html): doğal dille emlak sorularına yanıt

## Bölge fiyat özeti (${C.seo.dataDate}, satılık konut)

${cityLines}

Aylık kira tahmini = satış değerinin ~%${(C.market.rentYieldMonthly * 100).toFixed(2)}'i.

## İletişim

- Telefon/WhatsApp: ${C.company.phone.display}
- E-posta: ${C.company.email}

Not: Veriler bölgesel piyasa ortalamasıdır; bilgi amaçlıdır, yatırım tavsiyesi
değildir. Kesin değerleme için yerinde ekspertiz gerekir.
`);

console.log("SEO çıktıları üretildi: bolge-fiyatlari.html, sitemap.xml, robots.txt, llms.txt");
