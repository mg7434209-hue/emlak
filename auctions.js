/* İlan AI — İHALE (açık artırma) modülü
 *
 * UYAP usulü: bitişe 3 dakikadan az kala gelen her teklif süreyi bitişten itibaren
 * `extendMin` (3) dakikaya tamamlar; toplam uzatma `maxExtendMin` (60) ile sınırlıdır.
 * Teklif vermek için ihalenin başlangıç bedelinin %5–%10'u kadar TEMİNAT gerekir
 * (kazanıp vazgeçmeye karşı). Teminat iade edilebilirdir: kaybedene iade, kazanana
 * bedele mahsup, kazanıp vazgeçene irat.
 *
 * PİLOT NOTU: teminat parası bu modülde TUTULMAZ; yönetici havale/EFT'yi kendi
 * hesabında görünce "yatırıldı" işaretler. Gerçek para akışı için lisanslı ödeme
 * kuruluşu (emanet/pazar yeri) gerekir — bkz. CLAUDE.md "İHALE".
 *
 * Bu dosya server.js'ten `handle(req,res,urlPath,ctx)` ile çağrılır.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function create(ctx) {
  const { DATA_DIR, CONF } = ctx;
  const AC = (CONF && CONF.auction) || {};
  const EXT_MIN = +process.env.AUCTION_EXT_MIN || AC.extendMin || 3;   // env yalnız test içindir
  const MAX_EXT_MIN = AC.maxExtendMin || 60;
  const PCT_MIN = AC.depositPctMin || 5;
  const PCT_MAX = AC.depositPctMax || 10;
  const MIN_HOURS = +process.env.AUCTION_MIN_HOURS || AC.minDurationHours || 1;
  const MAX_DAYS = AC.maxDurationDays || 30;
  const STORE = path.join(DATA_DIR, "auctions.json");
  const DOC_DIR = path.join(DATA_DIR, "ihale-docs");          // herkese AÇIK DEĞİL
  const PAY_DAYS = AC.payDays || 10;
  const DOC_MAX = (AC.docMaxMB || 5) * 1048576;
  const DOC_TYPES = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  const DOC_DEFS = (seg) => ((AC.docs || {})[seg] || (AC.docs || {}).diger || []);

  function load() { try { return JSON.parse(fs.readFileSync(STORE, "utf8")); } catch (e) { return []; } }
  let AUCTIONS = load();
  function save() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = STORE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(AUCTIONS, null, 1));
    fs.renameSync(tmp, STORE);
  }
  const now = () => Date.now();
  const ms = (iso) => new Date(iso).getTime();
  const rid = (p) => p + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString("hex").toUpperCase();
  const mask = (name) => {
    const s = String(name || "Üye").trim();
    return s.length <= 2 ? s[0] + "*" : s[0] + "***" + s[s.length - 1];
  };
  const topBid = (a) => (a.bids.length ? a.bids[a.bids.length - 1] : null);
  const currentPrice = (a) => (topBid(a) ? topBid(a).amount : a.startPrice);
  const nextMin = (a) => (topBid(a) ? topBid(a).amount + a.minStep : a.startPrice);

  // Durum zamandan türetilir; "ended"e geçişte sonuç ve teminat durumları kesinleşir.
  function phase(a) {
    if (a.state === "cancelled") return "cancelled";
    if (a.state === "pending") return "pending";
    if (a.state === "ended") return "ended";
    const t = now();
    if (t < ms(a.startsAt)) return "scheduled";
    if (t < ms(a.endsAt)) return "live";
    return "ended";
  }
  function settle(a) {
    if (a.state === "ended" || a.state === "cancelled" || a.state === "pending") return false;
    if (now() < ms(a.endsAt)) return false;
    a.state = "ended";
    const top = topBid(a);
    const reserveMet = !a.reservePrice || (top && top.amount >= a.reservePrice);
    a.result = top
      ? { winnerUid: top.uid, amount: top.amount, reserveMet: !!reserveMet, at: new Date().toISOString(),
          payDeadline: new Date(ms(a.endsAt) + PAY_DAYS * 86400000).toISOString(), sale: reserveMet ? "awaiting_payment" : "reserve_not_met" }
      : { winnerUid: null, amount: 0, reserveMet: false, at: new Date().toISOString() };
    Object.keys(a.deposits).forEach((uid) => {
      const d = a.deposits[uid];
      if (d.status !== "paid") return;
      d.status = top && uid === top.uid && reserveMet ? "applied_pending" : "refund_due";
    });
    return true;
  }
  function tick() {
    let changed = false;
    AUCTIONS.forEach((a) => { if (settle(a)) changed = true; });
    if (changed) save();
  }
  setInterval(tick, 5000).unref();

  function view(a, u, full) {
    const ph = phase(a);
    const l = ctx.listing(a.listingId) || {};
    const photo = (l.photos || []).find((p) => typeof p === "string" && /^(u\/[\w.-]+|assets\/img\/[\w./-]+|data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+)$/.test(p)) || "";
    const top = topBid(a);
    const out = {
      aid: a.aid, listingId: a.listingId, title: a.title, city: l.city || a.city || "", district: l.district || a.district || "",
      segment: l.segment || a.segment || "", photo: photo.startsWith("data:") ? "" : photo,
      phase: ph, startsAt: a.startsAt, endsAt: a.endsAt, startPrice: a.startPrice, minStep: a.minStep,
      current: currentPrice(a), nextMin: nextMin(a), bidCount: a.bids.length,
      depositPct: a.depositPct, depositAmount: a.depositAmount,
      hasReserve: !!a.reservePrice, reserveMet: a.reservePrice ? !!(top && top.amount >= a.reservePrice) : true,
      extended: a.extendedMin || 0, maxExtend: MAX_EXT_MIN, ext: EXT_MIN,
      docsVerified: !!a.docsVerified, payDays: PAY_DAYS,
      docLabels: DOC_DEFS(a.segment || (ctx.listing(a.listingId) || {}).segment).map((d) => d.label),
      serverNow: new Date().toISOString(),
    };
    if (ph === "ended" && a.result) out.result = { payDeadline: a.result.payDeadline, sale: a.result.sale, amount: a.result.amount, reserveMet: a.result.reserveMet, hasWinner: !!a.result.winnerUid, winner: a.result.winnerUid ? mask((a.bids[a.bids.length - 1] || {}).name) : "" };
    if (full) {
      out.bids = a.bids.slice(-50).reverse().map((b) => ({ n: b.n, amount: b.amount, at: b.at, who: mask(b.name), mine: !!(u && b.uid === u.uid) }));
      out.depositInfo = AC.depositInfo || "";
      out.owner = !!(u && u.uid === a.ownerId);
      if (u) {
        const d = a.deposits[u.uid];
        out.myDeposit = d ? { status: d.status, ref: d.ref, amount: d.amount } : null;
        out.leading = !!(top && top.uid === u.uid);
        out.won = ph === "ended" && a.result && a.result.winnerUid === u.uid && a.result.reserveMet;
        if (out.won) out.remaining = Math.max(0, a.result.amount - ((a.deposits[u.uid] || {}).amount || 0));
      }
      // Belgeler: yalnız satıcı ve yönetici görür
      if (u && (u.uid === a.ownerId || u.role === "admin")) {
        out.docs = docState(a);
        out.docNote = a.docNote || "";
      }
    }
    return out;
  }

  function docState(a) {
    const seg = a.segment || (ctx.listing(a.listingId) || {}).segment;
    return DOC_DEFS(seg).map((d) => {
      const f = (a.docs || {})[d.key];
      return { key: d.key, label: d.label, uploaded: !!f, name: f ? f.name : "", size: f ? f.size : 0, at: f ? f.at : "" };
    });
  }
  const docsComplete = (a) => docState(a).every((d) => d.uploaded);

  const adminView = (a) => Object.assign(view(a, null, true), {
    state: a.state, ownerId: a.ownerId, ownerName: a.ownerName, reservePrice: a.reservePrice || 0, created: a.created,
    deposits: Object.keys(a.deposits).map((uid) => Object.assign({ uid }, a.deposits[uid])),
    winnerUid: a.result ? a.result.winnerUid : null,
    docs: docState(a), docNote: a.docNote || "", sale: a.result ? a.result.sale : "", payDeadline: a.result ? a.result.payDeadline : "",
    declared: !!a.declaration,
  });

  const intIn = (v, lo, hi) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= lo && n <= hi ? n : NaN; };

  async function handle(req, res, urlPath) {
    const { sendJson, readBody, currentUser, isAdminReq, rateLimit, str } = ctx;
    const q = req.__query || new URLSearchParams("");
    tick();

    // GET /api/auctions — herkese açık liste (onaylı ihaleler)
    if (urlPath === "/api/auctions" && req.method === "GET") {
      const list = AUCTIONS.filter((a) => a.state !== "pending" && a.state !== "cancelled")
        .filter((a) => phase(a) !== "ended" || now() - ms(a.endsAt) < 14 * 86400000)
        .map((a) => view(a, null, false));
      return sendJson(res, 200, { auctions: list, serverNow: new Date().toISOString() });
    }
    // GET /api/auction?id=
    if (urlPath === "/api/auction" && req.method === "GET") {
      const u = currentUser(req);
      const a = AUCTIONS.find((x) => x.aid === q.get("id"));
      if (!a || a.state === "cancelled") return sendJson(res, 404, { error: "İhale bulunamadı." });
      const mine = u && (u.uid === a.ownerId || isAdminReq(req));
      if (a.state === "pending" && !mine) return sendJson(res, 404, { error: "İhale bulunamadı." });
      return sendJson(res, 200, view(a, u, true));
    }
    // GET /api/my/auctions — kendi ihalelerim + katıldıklarım
    if (urlPath === "/api/my/auctions" && req.method === "GET") {
      const u = currentUser(req);
      if (!u) return sendJson(res, 401, { error: "Oturum geçersiz." });
      return sendJson(res, 200, {
        owned: AUCTIONS.filter((a) => a.ownerId === u.uid).map((a) => Object.assign(view(a, u, false), { state: a.state })),
        joined: AUCTIONS.filter((a) => a.deposits[u.uid]).map((a) => Object.assign(view(a, u, true), { bids: undefined })),
      });
    }

    // POST /api/auction/create
    if (urlPath === "/api/auction/create" && req.method === "POST") {
      const u = currentUser(req);
      if (!u) return sendJson(res, 401, { error: "İhale açmak için giriş yapın." });
      if (!rateLimit(req, "aucnew", 10, 60 * 60 * 1000)) return sendJson(res, 429, { error: "Çok fazla deneme. Biraz sonra tekrar deneyin." });
      const b = await readBody(req, 4096);
      const l = ctx.listing(b.listingId);
      const admin = isAdminReq(req);
      if (!l || (l.ownerId !== u.uid && !admin)) return sendJson(res, 403, { error: "Yalnızca kendi ilanınızı ihaleye çıkarabilirsiniz." });
      if (l.status !== "active") return sendJson(res, 400, { error: "İhaleye çıkarmak için ilanın yayında olması gerekir." });
      if (AUCTIONS.some((a) => a.listingId === l.id && a.state !== "ended" && a.state !== "cancelled")) {
        return sendJson(res, 409, { error: "Bu ilan için zaten açık bir ihale var." });
      }
      if (b.declare !== true) return sendJson(res, 400, { error: "İhaleye çıkmak için, konunun üzerinde icra, haciz veya ihtiyati tedbir bulunmadığını ve satmaya yetkili olduğunuzu beyan etmeniz gerekir." });
      const startPrice = intIn(b.startPrice, 1000, 1e11);
      const minStep = intIn(b.minStep, 100, 1e10);
      const depositPct = intIn(b.depositPct, PCT_MIN, PCT_MAX);
      const reserve = b.reservePrice ? intIn(b.reservePrice, startPrice || 0, 1e11) : 0;
      if (!startPrice) return sendJson(res, 400, { error: "Başlangıç bedeli geçersiz." });
      if (!minStep) return sendJson(res, 400, { error: "Teklif artış adımı en az 100 ₺ olmalı." });
      if (!depositPct) return sendJson(res, 400, { error: `Teminat oranı %${PCT_MIN} ile %${PCT_MAX} arasında olmalı.` });
      if (b.reservePrice && !reserve) return sendJson(res, 400, { error: "Asgari satış fiyatı başlangıç bedelinden düşük olamaz." });
      const s = ms(b.startsAt), e = ms(b.endsAt);
      if (!Number.isFinite(s) || !Number.isFinite(e)) return sendJson(res, 400, { error: "Açılış ve kapanış tarihi geçersiz." });
      if (s < now() - 5 * 60000) return sendJson(res, 400, { error: "Açılış zamanı geçmişte olamaz." });
      if (e - s < MIN_HOURS * 3600000) return sendJson(res, 400, { error: `İhale en az ${MIN_HOURS} saat sürmeli.` });
      if (e - s > MAX_DAYS * 86400000) return sendJson(res, 400, { error: `İhale en fazla ${MAX_DAYS} gün sürebilir.` });
      const a = {
        aid: rid("IH"), listingId: l.id, ownerId: l.ownerId || u.uid, ownerName: u.name, title: str(l.title, 120),
        city: l.city, district: l.district, segment: l.segment,
        startPrice, minStep, depositPct, depositAmount: Math.round(startPrice * depositPct / 100), reservePrice: reserve || 0,
        startsAt: new Date(s).toISOString(), endsAt: new Date(e).toISOString(), extendedMin: 0,
        state: "pending", docs: {}, docsVerified: false, declaration: { at: new Date().toISOString(), by: u.uid },
        bids: [], deposits: {}, created: new Date().toISOString(),
      };
      AUCTIONS.unshift(a);
      save();
      return sendJson(res, 200, { ok: true, aid: a.aid, pending: true, needDocs: true });
    }

    // POST /api/auction/doc {id, key, name, data:"data:...;base64,..."} — satıcı belge yükler (yalnız onay öncesi)
    if (urlPath === "/api/auction/doc" && req.method === "POST") {
      const u = currentUser(req);
      if (!u) return sendJson(res, 401, { error: "Giriş yapın." });
      if (!rateLimit(req, "aucdoc", 30, 60 * 60 * 1000)) return sendJson(res, 429, { error: "Çok fazla yükleme. Biraz sonra tekrar deneyin." });
      let b; try { b = await readBody(req, Math.ceil(DOC_MAX * 1.4) + 4096); } catch (e) { return sendJson(res, 413, { error: "Dosya çok büyük (en fazla " + (AC.docMaxMB || 5) + " MB)." }); }
      const a = AUCTIONS.find((x) => x.aid === b.id);
      if (!a || (a.ownerId !== u.uid && !isAdminReq(req))) return sendJson(res, 403, { error: "Yetkisiz." });
      if (a.state !== "pending") return sendJson(res, 400, { error: "Onaylanmış ihalenin belgeleri değiştirilemez." });
      const def = docState(a).find((d) => d.key === b.key);
      if (!def) return sendJson(res, 400, { error: "Geçersiz belge türü." });
      const m = /^data:([a-z/+.-]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(b.data || ""));
      if (!m || !DOC_TYPES[m[1]]) return sendJson(res, 400, { error: "Yalnızca PDF, JPG, PNG ya da WEBP yükleyebilirsiniz." });
      const buf = Buffer.from(m[2], "base64");
      if (!buf.length || buf.length > DOC_MAX) return sendJson(res, 413, { error: "Dosya çok büyük (en fazla " + (AC.docMaxMB || 5) + " MB)." });
      // içerik imzası: uzantı/MIME yalan söylemesin
      const sig = buf.slice(0, 4).toString("latin1");
      const okSig = (m[1] === "application/pdf" && sig.startsWith("%PDF")) || (m[1] === "image/png" && buf[0] === 0x89 && sig.slice(1, 4) === "PNG") ||
        (m[1] === "image/jpeg" && buf[0] === 0xff && buf[1] === 0xd8) || (m[1] === "image/webp" && sig === "RIFF");
      if (!okSig) return sendJson(res, 400, { error: "Dosya içeriği seçilen biçimle uyuşmuyor." });
      fs.mkdirSync(DOC_DIR, { recursive: true });
      const file = a.aid + "-" + b.key + "." + DOC_TYPES[m[1]];
      const old = (a.docs || {})[b.key];
      if (old && old.file !== file) { try { fs.unlinkSync(path.join(DOC_DIR, old.file)); } catch (e) { /* yok */ } }
      fs.writeFileSync(path.join(DOC_DIR, file), buf);
      a.docs = a.docs || {};
      a.docs[b.key] = { file, mime: m[1], name: str(b.name, 80) || file, size: buf.length, at: new Date().toISOString() };
      a.docNote = "";
      save();
      return sendJson(res, 200, { ok: true, docs: docState(a) });
    }
    // GET /api/auction/doc?id=&key= — belgeyi yalnız satıcı ve yönetici indirir
    if (urlPath === "/api/auction/doc" && req.method === "GET") {
      const u = currentUser(req);
      const a = AUCTIONS.find((x) => x.aid === q.get("id"));
      if (!a || !((u && u.uid === a.ownerId) || isAdminReq(req))) return sendJson(res, 403, { error: "Yetkisiz." });
      const f = (a.docs || {})[q.get("key")];
      if (!f) return sendJson(res, 404, { error: "Belge yok." });
      let data; try { data = fs.readFileSync(path.join(DOC_DIR, path.basename(f.file))); } catch (e) { return sendJson(res, 404, { error: "Dosya bulunamadı." }); }
      res.writeHead(200, { "Content-Type": f.mime, "Content-Length": data.length, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" });
      return res.end(data);
    }

    // POST /api/auction/deposit {id} — teminat talebi (referans kodu üretir)
    if (urlPath === "/api/auction/deposit" && req.method === "POST") {
      const u = currentUser(req);
      if (!u) return sendJson(res, 401, { error: "Giriş yapın." });
      if (!rateLimit(req, "aucdep", 20, 60 * 60 * 1000)) return sendJson(res, 429, { error: "Çok fazla deneme." });
      const b = await readBody(req, 1024);
      const a = AUCTIONS.find((x) => x.aid === b.id);
      if (!a || phase(a) === "pending" || phase(a) === "cancelled") return sendJson(res, 404, { error: "İhale bulunamadı." });
      if (phase(a) === "ended") return sendJson(res, 400, { error: "İhale sona erdi." });
      if (u.uid === a.ownerId) return sendJson(res, 400, { error: "Kendi ihalenize teminat yatıramazsınız." });
      if (!u.phone) return sendJson(res, 400, { error: "Teminat talebi için hesabınızda telefon numarası kayıtlı olmalı (Hesabım › Profil)." });
      let d = a.deposits[u.uid];
      if (!d) {
        d = a.deposits[u.uid] = { status: "requested", amount: a.depositAmount, ref: "TMN-" + crypto.randomBytes(3).toString("hex").toUpperCase(), name: u.name, at: new Date().toISOString() };
        save();
      }
      return sendJson(res, 200, { ok: true, deposit: { status: d.status, ref: d.ref, amount: d.amount }, info: AC.depositInfo || "" });
    }

    // POST /api/auction/bid {id, amount}
    if (urlPath === "/api/auction/bid" && req.method === "POST") {
      const u = currentUser(req);
      if (!u) return sendJson(res, 401, { error: "Teklif için giriş yapın." });
      if (!rateLimit(req, "aucbid", 40, 60 * 1000)) return sendJson(res, 429, { error: "Çok hızlı teklif. Birkaç saniye bekleyin." });
      const b = await readBody(req, 1024);
      const a = AUCTIONS.find((x) => x.aid === b.id);
      if (!a) return sendJson(res, 404, { error: "İhale bulunamadı." });
      if (settle(a)) save();
      const ph = phase(a);
      if (ph === "scheduled") return sendJson(res, 400, { error: "İhale henüz başlamadı." });
      if (ph !== "live") return sendJson(res, 400, { error: "İhale sona erdi." });
      if (u.uid === a.ownerId) return sendJson(res, 400, { error: "Kendi ihalenize teklif veremezsiniz." });
      const d = a.deposits[u.uid];
      if (!d || d.status !== "paid") return sendJson(res, 403, { error: "Teklif vermek için teminatınızın onaylanmış olması gerekir.", needDeposit: true });
      const top = topBid(a);
      if (top && top.uid === u.uid) return sendJson(res, 400, { error: "Zaten en yüksek teklif sizin." });
      const amount = intIn(b.amount, 1, 1e12);
      if (!amount) return sendJson(res, 400, { error: "Tutar geçersiz." });
      const min = nextMin(a);
      if (amount < min) return sendJson(res, 400, { error: "Teklif en az " + min.toLocaleString("tr-TR") + " ₺ olmalı.", nextMin: min });
      // Son 3 dakikada gelen teklif süreyi bitişten itibaren 3 dakikaya tamamlar (üst sınırlı)
      const t = now();
      let extended = false;
      const remain = ms(a.endsAt) - t;
      if (remain < EXT_MIN * 60000) {
        const want = t + EXT_MIN * 60000;
        const add = Math.round((want - ms(a.endsAt)) / 60000 * 100) / 100;
        if ((a.extendedMin || 0) + add <= MAX_EXT_MIN) {
          a.endsAt = new Date(want).toISOString();
          a.extendedMin = Math.round(((a.extendedMin || 0) + add) * 100) / 100;
          extended = true;
        }
      }
      a.bids.push({ n: a.bids.length + 1, uid: u.uid, name: u.name, amount, at: new Date(t).toISOString() });
      save();
      return sendJson(res, 200, { ok: true, extended, auction: view(a, u, true) });
    }

    // ── Yönetici ─────────────────────────────────────────────────────────
    if (urlPath === "/api/admin/auctions" && req.method === "GET") {
      if (!isAdminReq(req)) return sendJson(res, 401, { error: "Yetkisiz." });
      return sendJson(res, 200, { auctions: AUCTIONS.map(adminView) });
    }
    if (urlPath === "/api/admin/auction" && req.method === "POST") {
      if (!isAdminReq(req)) return sendJson(res, 401, { error: "Yetkisiz." });
      const b = await readBody(req, 2048);
      const a = AUCTIONS.find((x) => x.aid === b.aid);
      if (!a) return sendJson(res, 404, { error: "İhale bulunamadı." });
      const dep = b.uid ? a.deposits[b.uid] : null;
      switch (b.action) {
        case "approve":
          if (a.state !== "pending") break;
          if (!docsComplete(a)) return sendJson(res, 400, { error: "Zorunlu belgelerin tümü yüklenmeden ihale onaylanamaz." });
          a.state = "approved"; a.docsVerified = true; a.docNote = ""; break;
        case "reject-docs": a.docNote = str(b.note, 400) || "Belgeler yetersiz; lütfen yeniden yükleyin."; break;
        case "sale-paid":
          if (!a.result || a.result.sale !== "awaiting_payment") return sendJson(res, 400, { error: "Ödeme bekleyen satış yok." });
          a.result.sale = "paid";
          { const w = a.deposits[a.result.winnerUid]; if (w && w.status === "applied_pending") w.status = "applied"; }
          break;
        case "cancel":
          if (a.bids.length && phase(a) === "live") return sendJson(res, 400, { error: "Teklif almış canlı ihale iptal edilemez." });
          a.state = "cancelled";
          Object.keys(a.deposits).forEach((k) => { if (a.deposits[k].status === "paid") a.deposits[k].status = "refund_due"; });
          break;
        case "deposit-paid": if (dep && (dep.status === "requested")) { dep.status = "paid"; dep.paidAt = new Date().toISOString(); } break;
        case "deposit-refunded": if (dep && dep.status === "refund_due") dep.status = "refunded"; break;
        case "deposit-applied": if (dep && dep.status === "applied_pending") dep.status = "applied"; break;
        // Kazanan vazgeçti: teminat irat, ihale sonucu boşa düşer
        case "deposit-forfeit": if (dep && dep.status === "applied_pending") { dep.status = "forfeited"; if (a.result) { a.result.defaulted = true; a.result.sale = "defaulted"; } } break;
        default: return sendJson(res, 400, { error: "Geçersiz işlem." });
      }
      save();
      return sendJson(res, 200, { ok: true, auction: adminView(a) });
    }
    return false;
  }

  return { handle, tick, all: () => AUCTIONS, view };
}

module.exports = { create };
