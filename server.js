/**
 * EmlakAI — statik dosya sunucusu + ilan API'si (Railway için)
 * Bağımlılık gerektirmez: Node.js'in yerleşik modülleriyle çalışır.
 *
 * API (sahibinden benzeri onaylı yayın akışı):
 *   POST /api/login              {pass} → {token}    (admin girişi)
 *   GET  /api/listings           → {listings:[...aktif...]}  (herkese açık)
 *   POST /api/listings           ilan gönder → pending (admin token'la → active)
 *   GET  /api/admin/listings     (token) → tüm ilanlar (pending dahil)
 *   POST /api/admin/action       (token) {id, action, value}
 *        action: approve | reject | remove | feature | unfeature | price
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
    const b = await readBody(req, 8 * 1024 * 1024); // fotoğraflar base64 (≤5 × ~300KB)
    const l = NORMALIZE(b);
    if (!l) return sendJson(res, 400, { error: "Geçersiz ilan verisi." });
    if (!l.title || !l.price || !l.district) return sendJson(res, 400, { error: "Başlık, fiyat ve ilçe zorunludur." });
    if (LISTINGS.length >= 2000) return sendJson(res, 429, { error: "İlan kapasitesi dolu." });
    delete l.user;
    l.id = "EA" + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString("hex").toUpperCase();
    l.date = new Date().toISOString();
    l.status = isAdmin ? "active" : "pending";
    l.views = 0; l.favCount = 0;
    if (!isAdmin) l.featured = false; // öne çıkarma yalnızca admin kararıyla
    LISTINGS.unshift(l);
    saveListings(LISTINGS);
    return sendJson(res, 200, { ok: true, id: l.id, status: l.status });
  }

  // Buradan sonrası admin ister
  if (!checkToken(req)) return sendJson(res, 401, { error: "Yetkisiz." });

  // GET /api/admin/listings — tümü (pending/rejected dahil)
  if (urlPath === "/api/admin/listings" && req.method === "GET") {
    return sendJson(res, 200, { listings: LISTINGS });
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
      case "remove": LISTINGS.splice(i, 1); break;
      case "feature": l.featured = true; break;
      case "unfeature": l.featured = false; break;
      case "price": {
        const p = Math.round(+b.value);
        if (!Number.isFinite(p) || p <= 0) return sendJson(res, 400, { error: "Geçersiz fiyat." });
        l.price = p; break;
      }
      default: return sendJson(res, 400, { error: "Bilinmeyen eylem." });
    }
    saveListings(LISTINGS);
    return sendJson(res, 200, { ok: true });
  }

  return sendJson(res, 404, { error: "Bulunamadı." });
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
