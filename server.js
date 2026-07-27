/**
 * EmlakAI — basit statik dosya sunucusu (Railway için)
 * Bağımlılık gerektirmez: Node.js'in yerleşik http/fs modülleriyle çalışır.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

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
