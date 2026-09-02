/**
 * EmlakAI — statik dosya sunucusu + ilan API'si (Railway için)
 * Bağımlılık gerektirmez: Node.js'in yerleşik modülleriyle çalışır.
 *
 * API (sahibinden benzeri onaylı yayın akışı):
 *   POST /api/login              {pass} → {token}    (admin girişi)
 *   GET  /api/listings           → {listings:[...aktif...]}  (herkese açık)
 *   POST /api/listings           ilan gönder → pending (admin token'la → active)
 *   GET  /api/listing?id=        → {status} (ilan takibi: gönderilen ilanın durumu)
 *   POST /api/view               {id} → görüntülenme sayacı (IP+ilan başına 12 saat)
 *   POST /api/messages           {id, name, phone, message} → satıcıya mesaj (lead)
 *   GET  /api/admin/listings     (token) → tüm ilanlar (pending dahil)
 *   POST /api/admin/action       (token) {id, action, value}
 *        action: approve | reject | remove | feature | unfeature | price | edit
 *   GET  /api/admin/messages     (token) → gelen mesajlar
 *   POST /api/admin/message      (token) {id, action: read|remove}
 *   POST /api/admin/import       (token) {listings} → yedekten geri yükle
 *
 * Fotoğraflar: istemci base64 gönderir, sunucu DATA_DIR/uploads altına dosya
 * olarak yazar ve ilanda `u/<dosya>` yolunu tutar (/u/... ile servis edilir).
 *
 * Depolama: DATA_DIR (Railway Volume önerilir) ya da ./data altında
 * listings.json. İlk açılışta assets/data.js REAL[] listesinden tohumlanır.
 * Admin şifresi: ADMIN_PASS ortam değişkeni (yoksa config.admin.pass).
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

// ── Config + veri katmanını tarayıcı taklidiyle yükle (normalize için) ────
global.window = global;
global.localStorage = { getItem: () => null, setItem: () => {} };
new Function(fs.readFileSync(path.join(ROOT, "assets/config.js"), "utf8"))();
new Function(fs.readFileSync(path.join(ROOT, "assets/data.js"), "utf8"))();
const CONF = global.EMLAK.config;
const NORMALIZE = global.EMLAK.data.normalize;
const SEED = global.EMLAK.data.all(); // Node ortamında yalnız REAL[]

// ── İlan deposu (JSON dosyası; Railway'de kalıcılık için Volume + DATA_DIR) ─
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, "data");
const STORE = path.join(DATA_DIR, "listings.json");
function loadListings() {
  try { return JSON.parse(fs.readFileSync(STORE, "utf8")); }
  catch (e) {
    // İlk açılış: repodaki gerçek ilanlarla (REAL) tohumla
    const seeded = SEED.map((l) => Object.assign({}, l, { status: "active" }));
    saveListings(seeded);
    return seeded;
  }
}
function saveListings(list) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = STORE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(list, null, 1));
  fs.renameSync(tmp, STORE);
}
let LISTINGS = loadListings();

// ── Fotoğraf deposu: base64 → dosya (DATA_DIR/uploads, /u/<dosya> ile servis) ─
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const DATA_URI = /^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)$/;
const EXT_OF = { png: ".png", jpg: ".jpg", jpeg: ".jpg", webp: ".webp" };
const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024;
function persistPhotos(id, photos) {
  const out = [];
  (photos || []).slice(0, 8).forEach((p, i) => {
    if (typeof p !== "string") return;
    if (/^u\/[\w.-]+$/.test(p) || /^assets\/img\//.test(p)) { out.push(p); return; } // zaten dosya
    const m = DATA_URI.exec(p);
    if (!m) return;
    const buf = Buffer.from(m[2], "base64");
    if (!buf.length || buf.length > MAX_PHOTO_BYTES) return;
    const name = id + "-" + (i + 1) + "-" + crypto.randomBytes(3).toString("hex") + (EXT_OF[m[1]] || ".jpg");
    try {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
      out.push("u/" + name);
    } catch (e) { /* disk yazılamadı — fotoğraf atlanır, ilan yine de kaydedilir */ }
  });
  return out;
}
function dropPhotos(photos) {
  (photos || []).forEach((p) => {
    if (!/^u\/[\w.-]+$/.test(p)) return;
    try { fs.unlinkSync(path.join(UPLOAD_DIR, p.slice(2))); } catch (e) {}
  });
}

// ── Mesajlar (ilan sahibine gelen talepler) ───────────────────────────────
const MSG_STORE = path.join(DATA_DIR, "messages.json");
function loadMessages() {
  try { return JSON.parse(fs.readFileSync(MSG_STORE, "utf8")); } catch (e) { return []; }
}
function saveMessages(list) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = MSG_STORE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(list, null, 1));
  fs.renameSync(tmp, MSG_STORE);
}
let MESSAGES = loadMessages();

// ── Basit hız sınırı (bellek içi; IP + kova başına saatlik) ───────────────
const HITS = new Map(); // "kova|ip" → [zaman damgaları]
function rateLimit(req, bucket, max, windowMs) {
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    (req.socket && req.socket.remoteAddress) || "?";
  const key = bucket + "|" + ip;
  const now = Date.now();
  const hits = (HITS.get(key) || []).filter((t) => now - t < windowMs);
  if (HITS.size > 5000) HITS.clear(); // bellek tavanı
  if (hits.length >= max) { HITS.set(key, hits); return false; }
  hits.push(now);
  HITS.set(key, hits);
  return true;
}
// Görüntülenme tekilleştirme: aynı IP aynı ilanı 12 saatte bir sayar
const VIEW_SEEN = new Map();
const VIEW_TTL = 12 * 60 * 60 * 1000;

const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// ── Admin oturumları (bellek içi token; yeniden başlatınca sıfırlanır) ────
const ADMIN_PASS = process.env.ADMIN_PASS || (CONF.admin && CONF.admin.pass) || "";
const TOKENS = new Map(); // token → sonGeçerlilik (ms)
const TOKEN_TTL = 12 * 60 * 60 * 1000; // 12 saat
function checkToken(req) {
  const t = req.headers["x-admin-token"] || "";
  const exp = TOKENS.get(t);
  if (!exp || exp < Date.now()) { TOKENS.delete(t); return false; }
  return true;
}
function timingSafeEq(a, b) {
  const ba = Buffer.from(String(a)), bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(body);
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) { reject(new Error("too-large")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); }
      catch (e) { reject(new Error("bad-json")); }
    });
    req.on("error", reject);
  });
}

async function handleApi(req, res, urlPath) {
  // POST /api/login — admin girişi
  if (urlPath === "/api/login" && req.method === "POST") {
    if (!rateLimit(req, "login", 10, 15 * 60 * 1000)) {
      return sendJson(res, 429, { error: "Çok fazla deneme. 15 dakika sonra tekrar deneyin." });
    }
    const b = await readBody(req, 4096);
    if (!ADMIN_PASS || !timingSafeEq(b.pass || "", ADMIN_PASS)) {
      return sendJson(res, 401, { error: "Şifre hatalı." });
    }
    const token = crypto.randomBytes(24).toString("hex");
    TOKENS.set(token, Date.now() + TOKEN_TTL);
    return sendJson(res, 200, { ok: true, token });
  }

  // GET /api/listings — herkese açık: yalnız aktif ilanlar
  if (urlPath === "/api/listings" && req.method === "GET") {
    return sendJson(res, 200, { listings: LISTINGS.filter((l) => l.status === "active") });
  }

  // POST /api/listings — ilan gönder (herkes; admin token'la doğrudan aktif)
  if (urlPath === "/api/listings" && req.method === "POST") {
    const isAdmin = checkToken(req);
    if (!isAdmin && !rateLimit(req, "post", 5, 60 * 60 * 1000)) {
      return sendJson(res, 429, { error: "Saatlik ilan sınırına ulaştınız. Daha sonra tekrar deneyin." });
    }
    const b = await readBody(req, 12 * 1024 * 1024); // fotoğraflar base64 (≤5 × ~300KB)
    const l = NORMALIZE(b);
    if (!l) return sendJson(res, 400, { error: "Geçersiz ilan verisi." });
    if (!l.title || !l.price || !l.district) return sendJson(res, 400, { error: "Başlık, fiyat ve ilçe zorunludur." });
    if (LISTINGS.length >= 2000) return sendJson(res, 429, { error: "İlan kapasitesi dolu." });
    delete l.user;
    l.id = "EA" + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString("hex").toUpperCase();
    l.date = new Date().toISOString();
    l.status = isAdmin ? "active" : "pending";
    l.views = 0; l.favCount = 0;
    l.photos = persistPhotos(l.id, b.photos); // base64 → DATA_DIR/uploads dosyaları
    if (!isAdmin) l.featured = false; // öne çıkarma yalnızca admin kararıyla
    LISTINGS.unshift(l);
    saveListings(LISTINGS);
    return sendJson(res, 200, { ok: true, id: l.id, status: l.status });
  }

  // GET /api/listing?id= — ilan takibi: gönderilen ilanın yayın durumu
  if (urlPath === "/api/listing" && req.method === "GET") {
    const id = String(req.__query.get("id") || "");
    const l = LISTINGS.find((x) => x.id === id);
    if (!l) return sendJson(res, 404, { error: "İlan bulunamadı." });
    return sendJson(res, 200, {
      id: l.id, status: l.status, title: l.title, price: l.price,
      date: l.date, featured: !!l.featured, views: l.views || 0,
    });
  }

  // POST /api/view — görüntülenme sayacı (IP + ilan başına 12 saatte bir)
  if (urlPath === "/api/view" && req.method === "POST") {
    const b = await readBody(req, 512);
    const l = LISTINGS.find((x) => x.id === b.id && x.status === "active");
    if (!l) return sendJson(res, 404, { error: "İlan bulunamadı." });
    const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
      (req.socket && req.socket.remoteAddress) || "?";
    const key = ip + "|" + l.id;
    const now = Date.now();
    if (VIEW_SEEN.size > 20000) VIEW_SEEN.clear();
    if (!(VIEW_SEEN.get(key) > now - VIEW_TTL)) {
      VIEW_SEEN.set(key, now);
      l.views = (l.views || 0) + 1;
      saveListings(LISTINGS);
    }
    return sendJson(res, 200, { ok: true, views: l.views || 0 });
  }

  // POST /api/messages — ilana mesaj/talep bırak (yönetim panelinde görünür)
  if (urlPath === "/api/messages" && req.method === "POST") {
    if (!rateLimit(req, "msg", 10, 60 * 60 * 1000)) {
      return sendJson(res, 429, { error: "Çok fazla mesaj gönderdiniz. Daha sonra tekrar deneyin." });
    }
    const b = await readBody(req, 16 * 1024);
    const l = LISTINGS.find((x) => x.id === b.id && x.status === "active");
    if (!l) return sendJson(res, 404, { error: "İlan bulunamadı." });
    const name = str(b.name, 80), phone = str(b.phone, 25), text = str(b.message, 1200);
    if (!name || !phone || !text) return sendJson(res, 400, { error: "Ad, telefon ve mesaj zorunludur." });
    if (b.hp) return sendJson(res, 200, { ok: true }); // bal küpü: bot doldurur, sessizce yut
    if (MESSAGES.length >= 1000) MESSAGES.length = 999;
    MESSAGES.unshift({
      mid: "M" + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString("hex").toUpperCase(),
      listingId: l.id, listingTitle: l.title, name, phone, email: str(b.email, 120),
      message: text, date: new Date().toISOString(), read: false,
    });
    saveMessages(MESSAGES);
    return sendJson(res, 200, { ok: true });
  }

  // Buradan sonrası admin ister
  if (!checkToken(req)) return sendJson(res, 401, { error: "Yetkisiz." });

  // GET /api/admin/listings — tümü (pending/rejected dahil)
  if (urlPath === "/api/admin/listings" && req.method === "GET") {
    // persistent=false → DATA_DIR ayarlı değil: dağıtımda veriler silinebilir
    return sendJson(res, 200, { listings: LISTINGS, persistent: !!process.env.DATA_DIR });
  }

  // POST /api/admin/action — {id, action, value}
  if (urlPath === "/api/admin/action" && req.method === "POST") {
    const b = await readBody(req, 4096);
    const i = LISTINGS.findIndex((l) => l.id === b.id);
    if (i < 0) return sendJson(res, 404, { error: "İlan bulunamadı." });
    const l = LISTINGS[i];
    switch (b.action) {
      case "approve": l.status = "active"; break;
      case "reject": l.status = "rejected"; break;
      case "remove": dropPhotos(l.photos); LISTINGS.splice(i, 1); break;
      case "feature": l.featured = true; break;
      case "unfeature": l.featured = false; break;
      case "price": {
        const p = Math.round(+b.value);
        if (!Number.isFinite(p) || p <= 0) return sendJson(res, 400, { error: "Geçersiz fiyat." });
        pushPriceHistory(l, p);
        l.price = p; break;
      }
      case "edit": {
        const patch = b.value && typeof b.value === "object" ? b.value : null;
        if (!patch) return sendJson(res, 400, { error: "Geçersiz düzenleme verisi." });
        // Düzenlenebilir alanlar birleştirilip normalize edilir; kimlik ve
        // sayaç alanları ilanın kendisinden korunur.
        const merged = NORMALIZE(Object.assign({}, l, patch));
        if (!merged || !merged.title || !merged.price || !merged.district) {
          return sendJson(res, 400, { error: "Başlık, fiyat ve ilçe zorunludur." });
        }
        const keptPhotos = Array.isArray(patch.photos) ? persistPhotos(l.id, patch.photos) : l.photos;
        if (Array.isArray(patch.photos)) {
          dropPhotos((l.photos || []).filter((x) => keptPhotos.indexOf(x) < 0));
        }
        pushPriceHistory(l, merged.price);
        const hist = l.priceHistory;
        Object.assign(l, merged, {
          id: l.id, date: l.date, status: l.status, views: l.views || 0,
          favCount: l.favCount || 0, photos: keptPhotos, priceHistory: hist,
          updated: new Date().toISOString(),
        });
        break;
      }
      default: return sendJson(res, 400, { error: "Bilinmeyen eylem." });
    }
    saveListings(LISTINGS);
    return sendJson(res, 200, { ok: true });
  }

  // GET /api/admin/messages — gelen mesajlar
  if (urlPath === "/api/admin/messages" && req.method === "GET") {
    return sendJson(res, 200, { messages: MESSAGES });
  }

  // POST /api/admin/message — {id, action: read|unread|remove}
  if (urlPath === "/api/admin/message" && req.method === "POST") {
    const b = await readBody(req, 4096);
    const i = MESSAGES.findIndex((m) => m.mid === b.id);
    if (i < 0) return sendJson(res, 404, { error: "Mesaj bulunamadı." });
    if (b.action === "remove") MESSAGES.splice(i, 1);
    else if (b.action === "read") MESSAGES[i].read = true;
    else if (b.action === "unread") MESSAGES[i].read = false;
    else return sendJson(res, 400, { error: "Bilinmeyen eylem." });
    saveMessages(MESSAGES);
    return sendJson(res, 200, { ok: true });
  }

  // POST /api/admin/import — JSON yedeğinden geri yükleme (depoyu değiştirir)
  if (urlPath === "/api/admin/import" && req.method === "POST") {
    const b = await readBody(req, 24 * 1024 * 1024);
    if (!Array.isArray(b.listings)) return sendJson(res, 400, { error: "Geçersiz yedek dosyası." });
    const fresh = [];
    b.listings.slice(0, 2000).forEach((raw) => {
      const l = NORMALIZE(raw);
      if (!l || !l.id || !l.title) return;
      l.status = ["active", "pending", "rejected"].includes(raw.status) ? raw.status : "pending";
      l.photos = persistPhotos(l.id, raw.photos);
      if (Array.isArray(raw.priceHistory)) l.priceHistory = raw.priceHistory.slice(0, 10);
      fresh.push(l);
    });
    if (!fresh.length) return sendJson(res, 400, { error: "Yedekte geçerli ilan yok." });
    LISTINGS = fresh;
    saveListings(LISTINGS);
    return sendJson(res, 200, { ok: true, count: fresh.length });
  }

  return sendJson(res, 404, { error: "Bulunamadı." });
}

// Fiyat geçmişi: değişiklikte eski fiyat kaydedilir (detayda "fiyat düştü").
function pushPriceHistory(l, newPrice) {
  if (!Number.isFinite(newPrice) || newPrice === l.price) return;
  l.priceHistory = (l.priceHistory || []).slice(-9);
  l.priceHistory.push({ price: l.price, date: new Date().toISOString() });
}

// Dinamik sitemap: statik sayfalar + yayındaki ilanlar (SEO için kritik)
function sitemapXml() {
  const base = (CONF.seo.siteUrl || "").replace(/\/$/, "");
  const pages = ["", "/ilanlar.html", "/degerleme.html", "/ilan-ver.html",
    "/bolge-fiyatlari.html", "/rehber.html", "/asistan.html", "/favoriler.html"];
  const esc = (u) => u.replace(/&/g, "&amp;");
  const urls = pages.map((u) => `  <url><loc>${esc(base + (u || "/"))}</loc><changefreq>daily</changefreq></url>`)
    .concat(LISTINGS.filter((l) => l.status === "active").map((l) =>
      `  <url><loc>${esc(base + "/ilan.html?id=" + encodeURIComponent(l.id))}</loc>` +
      `<lastmod>${String(l.updated || l.date).slice(0, 10)}</lastmod><changefreq>weekly</changefreq></url>`));
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.join("\n") + "\n</urlset>\n";
}

// Sıkıştırılması anlamlı (metin tabanlı) içerik tipleri
const COMPRESSIBLE = /^(text\/|application\/(javascript|json|manifest\+json|xml)|image\/svg)/;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function safeJoin(base, target) {
  // path traversal koruması: çözülen yol, kökün KENDİSİ ya da kök + ayraç ile
  // başlamalı ("/emlak" ile başlayan kardeş dizinler, ör. "/emlak-x", ELENİR)
  const targetPath = path.normalize(path.join(base, target));
  if (targetPath !== base && !targetPath.startsWith(base + path.sep)) return null;
  return targetPath;
}

// Host başlığı doğrulaması: yalnızca bilinen yayın host'larına yönlendirme
// yapılır (istemci kontrollü Host ile açık yönlendirme engellenir).
const HOST_OK = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$|(^|\.)up\.railway\.app$|(^|\.)github\.io$/;

const server = http.createServer((req, res) => {
  try {
    // HTTP → HTTPS (yalnızca proxy açıkça http dediğinde ve host bilinen bir
    // yayın host'uysa; aksi halde yönlendirme yapılmaz, istek normal servis edilir).
    const host = (req.headers.host || "").toLowerCase();
    const xfp = req.headers["x-forwarded-proto"];
    if (xfp === "http" && HOST_OK.test(host) && !/^(localhost|127\.|0\.0\.0\.0)/.test(host)) {
      res.writeHead(301, { Location: "https://" + host + req.url });
      return res.end();
    }

    let urlPath = decodeURIComponent(req.url.split("?")[0]);
    req.__query = new URLSearchParams(req.url.split("?")[1] || "");

    // Dinamik sitemap: yayındaki ilanları da içerir (statik dosyayı ezer)
    if (urlPath === "/sitemap.xml") {
      const xml = sitemapXml();
      res.writeHead(200, {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      });
      return res.end(xml);
    }

    // Yüklenen ilan fotoğrafları: /u/<dosya> → DATA_DIR/uploads/<dosya>
    if (urlPath.startsWith("/u/")) {
      const name = urlPath.slice(3);
      if (!/^[\w.-]+$/.test(name) || name.indexOf("..") >= 0) {
        res.writeHead(400); return res.end("Bad request");
      }
      const f = path.join(UPLOAD_DIR, name);
      if (!fs.existsSync(f) || !fs.statSync(f).isFile()) {
        res.writeHead(404); return res.end("404");
      }
      res.writeHead(200, {
        "Content-Type": MIME[path.extname(name).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      });
      return fs.createReadStream(f).pipe(res);
    }

    // API istekleri
    if (urlPath.startsWith("/api/")) {
      handleApi(req, res, urlPath).catch((e) => {
        sendJson(res, e.message === "too-large" ? 413 : 400,
          { error: e.message === "too-large" ? "İstek çok büyük (fotoğrafları azaltın)." : "Geçersiz istek." });
      });
      return;
    }

    if (urlPath.endsWith("/")) urlPath += "index.html";

    let filePath = safeJoin(ROOT, urlPath);
    if (!filePath) {
      res.writeHead(400);
      return res.end("Bad request");
    }

    // Uzantısız istekler için .html dene (ör. /ilanlar → ilanlar.html)
    if (!path.extname(filePath) && fs.existsSync(filePath + ".html")) {
      filePath += ".html";
    }

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      const nf = path.join(ROOT, "404.html");
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      if (fs.existsSync(nf)) return fs.createReadStream(nf).pipe(res);
      return res.end("404 — Sayfa bulunamadı");
    }

    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || "application/octet-stream";
    const headers = {
      "Content-Type": mime,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=86400",
      // Satır içi script yok (script-src 'self'); satır içi style= üretildiği
      // için style-src'de 'unsafe-inline' gerekli. img data: → base64 ilan
      // fotoğrafları ve SVG favicon için.
      "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; connect-src 'self'",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Frame-Options": "DENY",
    };

    const accept = req.headers["accept-encoding"] || "";
    if (COMPRESSIBLE.test(mime) && /\bgzip\b/.test(accept)) {
      headers["Content-Encoding"] = "gzip";
      headers["Vary"] = "Accept-Encoding";
      res.writeHead(200, headers);
      return fs.createReadStream(filePath).pipe(zlib.createGzip()).pipe(res);
    }

    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
  } catch (e) {
    res.writeHead(500);
    res.end("Sunucu hatası");
  }
});

server.listen(PORT, () => {
  console.log("EmlakAI sunucusu çalışıyor: http://localhost:" + PORT);
});
