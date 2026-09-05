/**
 * EmlakAI — statik dosya sunucusu + ilan API'si (Railway için)
 * Bağımlılık gerektirmez: Node.js'in yerleşik modülleriyle çalışır.
 *
 * API (sahibinden benzeri onaylı yayın akışı):
 *   POST /api/login              {pass} → {token}    (admin girişi)
 *   GET  /api/listings           → {listings:[...aktif...]}  (herkese açık)
 *   POST /api/listings           ilan gönder → pending (admin token'la → active)
 *   POST /api/auth/register      {name,email,phone,password} → {token,user}
 *   POST /api/auth/login         {email,password} → {token,user}
 *   GET  /api/auth/me            (X-User-Token) → {user}
 *   POST /api/auth/update        (X-User-Token) profil / şifre değiştirme
 *   GET  /api/my/listings        (X-User-Token) → kendi ilanları (tüm durumlar)
 *   POST /api/my/action          (X-User-Token) {id, action: edit|remove}
 *   GET  /api/my/messages        (X-User-Token) → kendi ilanlarına gelen mesajlar
 *   GET  /api/listing?id=        → {status} (ilan takibi: gönderilen ilanın durumu)
 *   POST /api/view               {id} → görüntülenme sayacı (IP+ilan başına 12 saat)
 *   POST /api/messages           {id, name, phone, message} → satıcıya mesaj (lead)
 *   GET  /api/admin/listings     (token) → tüm ilanlar (pending dahil)
 *   POST /api/admin/action       (token) {id, action, value}
 *        action: approve | reject | remove | feature | unfeature | price | edit
 *   GET  /api/admin/messages     (token) → gelen mesajlar
 *   POST /api/admin/message      (token) {id, action: read|remove}
 *   POST /api/admin/import       (token) {listings} → yedekten geri yükle
 *   GET  /api/admin/users        (token) → üyeler
 *   POST /api/admin/user         (token) {id, action: ban|unban|remove|admin|unadmin|password}
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
const MOD = (CONF && CONF.moderation) || {};
function loadListings() {
  try { return JSON.parse(fs.readFileSync(STORE, "utf8")); }
  catch (e) {
    // İlk açılış: repodaki gerçek ilanlarla (REAL) tohumla — bunlar da
    // yönetici onayından geçer (config.moderation.seedStatus).
    const seeded = SEED.map((l) => Object.assign({}, l, { status: MOD.seedStatus || "pending" }));
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
const UP = (CONF && CONF.upload) || {};
const MAX_PHOTOS = UP.maxPhotos || 6;
const MAX_PHOTO_BYTES = (UP.maxStoredKB || 1800) * 1024;

// Yükleme dizini açılışta hazırlanır ve GERÇEKTEN yazılabilir mi denenir —
// yazılamıyorsa fotoğraflar sessizce kaybolmasın, panel/istemci haber alsın.
let UPLOADS_OK = false, UPLOADS_ERR = "";
function checkUploadDir() {
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const probe = path.join(UPLOAD_DIR, ".probe");
    fs.writeFileSync(probe, "ok");
    fs.unlinkSync(probe);
    UPLOADS_OK = true; UPLOADS_ERR = "";
  } catch (e) {
    UPLOADS_OK = false; UPLOADS_ERR = e.code || String(e.message || e);
    console.error("UYARI: fotoğraf dizini yazılamıyor (" + UPLOAD_DIR + "):", UPLOADS_ERR);
  }
  return UPLOADS_OK;
}
checkUploadDir();

// base64 fotoğrafları dosyaya yazar.
// Dönüş: { photos:[yollar], dropped:n, reason:"..."|null } — atlanan varsa
// çağıran bunu istemciye BİLDİRİR (eskiden sessizce yutuluyordu).
function persistPhotos(id, photos) {
  const out = [];
  let dropped = 0, reason = null;
  const note = (r) => { dropped++; if (!reason) reason = r; };
  (photos || []).slice(0, MAX_PHOTOS).forEach((p, i) => {
    if (typeof p !== "string") { note("bicim"); return; }
    if (/^u\/[\w.-]+$/.test(p) || /^assets\/img\//.test(p)) { out.push(p); return; } // zaten dosya
    const m = DATA_URI.exec(p);
    if (!m) { note("bicim"); return; }
    const buf = Buffer.from(m[2], "base64");
    if (!buf.length) { note("bicim"); return; }
    if (buf.length > MAX_PHOTO_BYTES) { note("boyut"); return; }
    const name = id + "-" + (i + 1) + "-" + crypto.randomBytes(3).toString("hex") + (EXT_OF[m[1]] || ".jpg");
    try {
      if (!UPLOADS_OK && !checkUploadDir()) throw new Error(UPLOADS_ERR || "disk");
      fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
      out.push("u/" + name);
    } catch (e) {
      UPLOADS_OK = false;
      note("disk");
      console.error("Fotoğraf yazılamadı:", name, e.code || e.message);
    }
  });
  if ((photos || []).length > MAX_PHOTOS) { dropped += photos.length - MAX_PHOTOS; if (!reason) reason = "adet"; }
  return { photos: out, dropped, reason };
}
const PHOTO_MSG = {
  disk: "Fotoğraflar sunucuya kaydedilemedi (depolama sorunu). İlan fotoğrafsız kaydedildi; yönetici depolamayı düzelttikten sonra fotoğraf ekleyebilirsiniz.",
  boyut: "Bazı fotoğraflar çok büyük olduğu için eklenemedi.",
  bicim: "Bazı dosyalar desteklenmeyen biçimde olduğu için eklenemedi (yalnızca JPG, PNG, WEBP).",
  adet: "En fazla " + MAX_PHOTOS + " fotoğraf eklenebilir; fazlası atlandı.",
};
const photoWarning = (r) => (r.dropped ? { photosDropped: r.dropped, photoWarning: PHOTO_MSG[r.reason] || PHOTO_MSG.bicim } : null);
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

// ── Üyelik: kullanıcı hesapları (kayıt + giriş) ───────────────────────────
// Şifreler scrypt ile tuzlanarak saklanır; oturum jetonu HMAC ile imzalanır
// (sunucu yeniden başlayınca kullanıcılar düşmez, gizli anahtar DATA_DIR'de).
const USER_STORE = path.join(DATA_DIR, "users.json");
function loadUsers() {
  try { return JSON.parse(fs.readFileSync(USER_STORE, "utf8")); } catch (e) { return []; }
}
function saveUsers(list) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = USER_STORE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(list, null, 1));
  fs.renameSync(tmp, USER_STORE);
}
let USERS = loadUsers();

const SECRET_FILE = path.join(DATA_DIR, "session.key");
function loadSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  try { return fs.readFileSync(SECRET_FILE, "utf8").trim(); } catch (e) {}
  const key = crypto.randomBytes(32).toString("hex");
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(SECRET_FILE, key, { mode: 0o600 });
  } catch (e) { /* yazılamadı: jetonlar yeniden başlatmada geçersiz olur */ }
  return key;
}
const SESSION_SECRET = loadSecret();
const SESSION_TTL = 30 * 24 * 60 * 60 * 1000; // 30 gün

function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString("hex");
  return "scrypt$" + salt + "$" + crypto.scryptSync(pw, salt, 64).toString("hex");
}
function verifyPassword(pw, stored) {
  const parts = String(stored || "").split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const calc = crypto.scryptSync(pw, parts[1], 64).toString("hex");
  return timingSafeEq(calc, parts[2]);
}
function signSession(uid) {
  const payload = uid + "." + (Date.now() + SESSION_TTL);
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex").slice(0, 32);
  return payload + "." + sig;
}
function userFromToken(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  const payload = parts[0] + "." + parts[1];
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex").slice(0, 32);
  if (!timingSafeEq(sig, parts[2])) return null;
  if (!(+parts[1] > Date.now())) return null;
  const u = USERS.find((x) => x.uid === parts[0]);
  return u && !u.banned ? u : null;
}
const currentUser = (req) => userFromToken(req.headers["x-user-token"] || "");
// Panel yetkisi iki yoldan gelir: admin şifresiyle alınan jeton ya da rolü
// "admin" olan üye oturumu (üyeler panelden yönetici yapılır).
const isAdminReq = (req) => checkToken(req) || ((currentUser(req) || {}).role === "admin");
const publicUser = (u) => ({ uid: u.uid, name: u.name, email: u.email, phone: u.phone || "", role: u.role || "user" });
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@.]+(\.[^\s@.]+)+$/;
const normEmail = (v) => String(v || "").trim().toLowerCase().slice(0, 120);
// Telefonu normalize eder: "0543 743 42 09" → {display, intl, wa} (yoksa null)
function normPhoneSrv(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("90")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length !== 10) return null;
  return {
    display: "0" + d.replace(/(\d{3})(\d{3})(\d{2})(\d{2})/, "$1 $2 $3 $4"),
    intl: "+90" + d, wa: "90" + d,
  };
}

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
// Bu e-posta ile açılan/giren hesap otomatik yönetici olur (ilk kurulum kolaylığı)
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
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
  // ── Üyelik uçları ─────────────────────────────────────────────────────
  // POST /api/auth/register — yeni hesap
  if (urlPath === "/api/auth/register" && req.method === "POST") {
    if (!rateLimit(req, "reg", 5, 60 * 60 * 1000)) {
      return sendJson(res, 429, { error: "Çok fazla kayıt denemesi. Daha sonra tekrar deneyin." });
    }
    const b = await readBody(req, 8192);
    const name = str(b.name, 80), email = normEmail(b.email), pw = String(b.password || "");
    const phone = normPhoneSrv(b.phone);
    if (name.length < 2) return sendJson(res, 400, { error: "Ad soyad en az 2 karakter olmalı." });
    if (!EMAIL_RE.test(email)) return sendJson(res, 400, { error: "Geçerli bir e-posta girin." });
    if (pw.length < 8) return sendJson(res, 400, { error: "Şifre en az 8 karakter olmalı." });
    if (!phone) return sendJson(res, 400, { error: "Geçerli bir telefon girin (örn. 0543 743 42 09)." });
    if (USERS.some((u) => u.email === email)) return sendJson(res, 409, { error: "Bu e-posta ile zaten bir hesap var. Giriş yapın." });
    if (USERS.length >= 5000) return sendJson(res, 429, { error: "Üye kapasitesi dolu." });
    const u = {
      uid: "U" + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString("hex").toUpperCase(),
      name, email, phone, pass: hashPassword(pw),
      role: ADMIN_EMAIL && email === ADMIN_EMAIL ? "admin" : "user",
      created: new Date().toISOString(),
    };
    USERS.push(u);
    saveUsers(USERS);
    return sendJson(res, 200, { ok: true, token: signSession(u.uid), user: publicUser(u) });
  }

  // POST /api/auth/login — e-posta + şifre
  if (urlPath === "/api/auth/login" && req.method === "POST") {
    if (!rateLimit(req, "ulogin", 10, 15 * 60 * 1000)) {
      return sendJson(res, 429, { error: "Çok fazla deneme. 15 dakika sonra tekrar deneyin." });
    }
    const b = await readBody(req, 4096);
    const u = USERS.find((x) => x.email === normEmail(b.email));
    if (!u || !verifyPassword(String(b.password || ""), u.pass)) {
      return sendJson(res, 401, { error: "E-posta ya da şifre hatalı." });
    }
    if (u.banned) return sendJson(res, 403, { error: "Hesabınız askıya alınmış. Bizimle iletişime geçin." });
    if (ADMIN_EMAIL && u.email === ADMIN_EMAIL) u.role = "admin";
    u.lastLogin = new Date().toISOString();
    saveUsers(USERS);
    return sendJson(res, 200, { ok: true, token: signSession(u.uid), user: publicUser(u) });
  }

  // GET /api/auth/me — oturum doğrulama
  if (urlPath === "/api/auth/me" && req.method === "GET") {
    const u = currentUser(req);
    if (!u) return sendJson(res, 401, { error: "Oturum geçersiz." });
    return sendJson(res, 200, { user: publicUser(u) });
  }

  // POST /api/auth/update — profil ve şifre güncelleme
  if (urlPath === "/api/auth/update" && req.method === "POST") {
    const u = currentUser(req);
    if (!u) return sendJson(res, 401, { error: "Oturum geçersiz." });
    const b = await readBody(req, 8192);
    if (b.newPassword != null) {
      if (!verifyPassword(String(b.currentPassword || ""), u.pass)) {
        return sendJson(res, 401, { error: "Mevcut şifre hatalı." });
      }
      if (String(b.newPassword).length < 8) return sendJson(res, 400, { error: "Yeni şifre en az 8 karakter olmalı." });
      u.pass = hashPassword(String(b.newPassword));
    }
    if (b.name != null) {
      const name = str(b.name, 80);
      if (name.length < 2) return sendJson(res, 400, { error: "Ad soyad en az 2 karakter olmalı." });
      u.name = name;
    }
    if (b.phone != null) {
      const ph = normPhoneSrv(b.phone);
      if (!ph) return sendJson(res, 400, { error: "Geçerli bir telefon girin." });
      u.phone = ph;
    }
    saveUsers(USERS);
    return sendJson(res, 200, { ok: true, user: publicUser(u) });
  }

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
    const user = currentUser(req);
    const isAdmin = checkToken(req) || (user && user.role === "admin");
    // İlan vermek üyelik ister (yönetici oturumu hariç)
    if (!isAdmin && !user) {
      return sendJson(res, 401, { error: "İlan vermek için giriş yapın ya da ücretsiz hesap oluşturun." });
    }
    if (!isAdmin && !rateLimit(req, "post", 10, 60 * 60 * 1000)) {
      return sendJson(res, 429, { error: "Saatlik ilan sınırına ulaştınız. Daha sonra tekrar deneyin." });
    }
    const b = await readBody(req, 16 * 1024 * 1024); // fotoğraflar base64
    const l = NORMALIZE(b);
    if (!l) return sendJson(res, 400, { error: "Geçersiz ilan verisi." });
    if (!l.title || !l.price || !l.district) return sendJson(res, 400, { error: "Başlık, fiyat ve ilçe zorunludur." });
    if (LISTINGS.length >= 2000) return sendJson(res, 429, { error: "İlan kapasitesi dolu." });
    delete l.user;
    l.id = "EA" + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString("hex").toUpperCase();
    l.date = new Date().toISOString();
    // Yayın kararı yöneticinindir: yalnızca yöneticinin KENDİ girdiği ilan
    // (config.moderation.adminAutoPublish) doğrudan yayına girer.
    l.status = isAdmin && MOD.adminAutoPublish !== false ? "active" : "pending";
    l.views = 0; l.favCount = 0;
    if (user) {
      // İlan sahibi hesaba bağlanır; ad ve telefon boş bırakılırsa hesaptan alınır
      // (NORMALIZE boş adı "Sahibinden"e çevirdiği için ham gövdeye bakılır).
      const rawSeller = b.seller && typeof b.seller === "object" ? b.seller : {};
      const rawName = str(rawSeller.name, 80);
      l.ownerId = user.uid;
      l.seller = { name: rawName || user.name, type: rawSeller.type === "ofis" ? "ofis" : "sahibinden" };
      if (!l.phone && user.phone) l.phone = user.phone;
    }
    const ph = persistPhotos(l.id, b.photos); // base64 → DATA_DIR/uploads dosyaları
    l.photos = ph.photos;
    if (!isAdmin) l.featured = false; // öne çıkarma yalnızca admin kararıyla
    LISTINGS.unshift(l);
    saveListings(LISTINGS);
    return sendJson(res, 200, Object.assign(
      { ok: true, id: l.id, status: l.status, photosSaved: l.photos.length },
      photoWarning(ph)));
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

  // ── Üyenin kendi ilanları ve mesajları ────────────────────────────────
  if (urlPath === "/api/my/listings" && req.method === "GET") {
    const u = currentUser(req);
    if (!u) return sendJson(res, 401, { error: "Oturum geçersiz." });
    return sendJson(res, 200, { listings: LISTINGS.filter((l) => l.ownerId === u.uid) });
  }

  if (urlPath === "/api/my/messages" && req.method === "GET") {
    const u = currentUser(req);
    if (!u) return sendJson(res, 401, { error: "Oturum geçersiz." });
    const own = new Set(LISTINGS.filter((l) => l.ownerId === u.uid).map((l) => l.id));
    return sendJson(res, 200, { messages: MESSAGES.filter((m) => own.has(m.listingId)) });
  }

  // POST /api/my/action — {id, action: edit|remove}
  if (urlPath === "/api/my/action" && req.method === "POST") {
    const u = currentUser(req);
    if (!u) return sendJson(res, 401, { error: "Oturum geçersiz." });
    const b = await readBody(req, 12 * 1024 * 1024);
    const i = LISTINGS.findIndex((l) => l.id === b.id && l.ownerId === u.uid);
    if (i < 0) return sendJson(res, 404, { error: "İlan bulunamadı." });
    const l = LISTINGS[i];
    if (b.action === "remove") {
      dropPhotos(l.photos);
      LISTINGS.splice(i, 1);
      saveListings(LISTINGS);
      return sendJson(res, 200, { ok: true });
    }
    if (b.action !== "edit") return sendJson(res, 400, { error: "Bilinmeyen eylem." });
    const patch = b.value && typeof b.value === "object" ? b.value : null;
    if (!patch) return sendJson(res, 400, { error: "Geçersiz düzenleme verisi." });
    const merged = NORMALIZE(Object.assign({}, l, patch));
    if (!merged || !merged.title || !merged.price || !merged.district) {
      return sendJson(res, 400, { error: "Başlık, fiyat ve ilçe zorunludur." });
    }
    const ph = Array.isArray(patch.photos) ? persistPhotos(l.id, patch.photos) : null;
    const keptPhotos = ph ? ph.photos : l.photos;
    if (ph) dropPhotos((l.photos || []).filter((x) => keptPhotos.indexOf(x) < 0));
    pushPriceHistory(l, merged.price);
    const hist = l.priceHistory;
    Object.assign(l, merged, {
      id: l.id, date: l.date, ownerId: l.ownerId, views: l.views || 0,
      favCount: l.favCount || 0, photos: keptPhotos, priceHistory: hist,
      // Düzenlenen ilan yeniden yönetici onayından geçer (yalnız fiyat
      // indirimi anında yayında kalır — alıcı için önemli olan bilgi).
      status: onlyPriceDrop(l, merged, patch) ? l.status : "pending",
      featured: l.featured, updated: new Date().toISOString(),
    });
    saveListings(LISTINGS);
    return sendJson(res, 200, Object.assign(
      { ok: true, status: l.status, photosSaved: l.photos.length },
      ph ? photoWarning(ph) : null));
  }

  // Buradan sonrası admin ister (şifre jetonu ya da yönetici rolü)
  if (!isAdminReq(req)) return sendJson(res, 401, { error: "Yetkisiz." });

  // GET /api/admin/listings — tümü (pending/rejected dahil)
  if (urlPath === "/api/admin/listings" && req.method === "GET") {
    // persistent=false → DATA_DIR ayarlı değil: dağıtımda veriler silinebilir
    return sendJson(res, 200, {
      listings: LISTINGS,
      persistent: !!process.env.DATA_DIR,
      uploadsOk: UPLOADS_OK, uploadsError: UPLOADS_ERR, uploadDir: UPLOAD_DIR,
    });
  }

  // POST /api/admin/action — {id, action, value}
  if (urlPath === "/api/admin/action" && req.method === "POST") {
    const b = await readBody(req, 16 * 1024 * 1024); // "edit" fotoğraf taşıyabilir
    let editPhotoResult = null;
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
        const aph = Array.isArray(patch.photos) ? persistPhotos(l.id, patch.photos) : null;
        const keptPhotos = aph ? aph.photos : l.photos;
        if (aph) dropPhotos((l.photos || []).filter((x) => keptPhotos.indexOf(x) < 0));
        editPhotoResult = aph;
        pushPriceHistory(l, merged.price);
        const hist = l.priceHistory;
        Object.assign(l, merged, {
          id: l.id, date: l.date, status: l.status, ownerId: l.ownerId, views: l.views || 0,
          favCount: l.favCount || 0, photos: keptPhotos, priceHistory: hist,
          updated: new Date().toISOString(),
        });
        break;
      }
      default: return sendJson(res, 400, { error: "Bilinmeyen eylem." });
    }
    saveListings(LISTINGS);
    return sendJson(res, 200, Object.assign({ ok: true },
      editPhotoResult ? photoWarning(editPhotoResult) : null));
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

  // GET /api/admin/users — üye listesi (şifre özeti ASLA dönmez)
  if (urlPath === "/api/admin/users" && req.method === "GET") {
    return sendJson(res, 200, {
      users: USERS.map((u) => Object.assign(publicUser(u), {
        created: u.created, lastLogin: u.lastLogin || null, banned: !!u.banned,
        listings: LISTINGS.filter((l) => l.ownerId === u.uid).length,
      })),
    });
  }

  // POST /api/admin/user — {id, action: ban|unban|remove|admin|unadmin|password}
  if (urlPath === "/api/admin/user" && req.method === "POST") {
    const b = await readBody(req, 4096);
    const i = USERS.findIndex((u) => u.uid === b.id);
    if (i < 0) return sendJson(res, 404, { error: "Üye bulunamadı." });
    const u = USERS[i];
    // Oturumdaki yönetici kendi yetkisini düşüremez / kendini silemez
    const self = currentUser(req);
    if (self && self.uid === u.uid && ["unadmin", "remove", "ban"].includes(b.action)) {
      return sendJson(res, 400, { error: "Kendi hesabınız üzerinde bu işlemi yapamazsınız." });
    }
    switch (b.action) {
      case "ban": u.banned = true; break;
      case "unban": u.banned = false; break;
      case "admin": u.role = "admin"; break;
      case "unadmin": u.role = "user"; break;
      case "password": {
        const pw = String(b.value || "");
        if (pw.length < 8) return sendJson(res, 400, { error: "Şifre en az 8 karakter olmalı." });
        u.pass = hashPassword(pw);
        break;
      }
      case "remove": {
        // Üye silinince ilanları da kaldırılır (fotoğraflarıyla birlikte)
        for (let k = LISTINGS.length - 1; k >= 0; k--) {
          if (LISTINGS[k].ownerId === u.uid) { dropPhotos(LISTINGS[k].photos); LISTINGS.splice(k, 1); }
        }
        USERS.splice(i, 1);
        saveListings(LISTINGS);
        break;
      }
      default: return sendJson(res, 400, { error: "Bilinmeyen eylem." });
    }
    saveUsers(USERS);
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

// Üye düzenlemesi yalnızca fiyat indiriminden mi ibaret? (öyleyse ilan
// yeniden onaya düşmez — metin/fotoğraf değişmediği için moderasyon gerekmez)
function onlyPriceDrop(before, merged, patch) {
  if (merged.price >= before.price) return false;
  if (Array.isArray(patch.photos)) return false;
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  return ["title", "desc", "city", "district", "category", "kind", "features", "seller"]
    .every((k) => same(before[k], merged[k]));
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
    "/bolge-fiyatlari.html", "/rehber.html", "/asistan.html", "/favoriler.html",
    "/giris.html"];
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
