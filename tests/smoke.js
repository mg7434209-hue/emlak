/**
 * İlan AI — uçtan uca duman testi:  npm test
 * Sunucuyu geçici veri klasörüyle başlatır, kritik akışları API üzerinden dener.
 * Bağımlılık yok (Node 18+ fetch). Hata varsa çıkış kodu 1.
 */
"use strict";
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("assert");

const ROOT = path.join(__dirname, "..");
const PORT = 3900 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}/`;
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), "emlak-test-"));
const ADMIN_PASS = "test-admin-pass-1";

let passed = 0;
const failures = [];
async function t(name, fn) {
  try { await fn(); passed++; console.log("  ✓ " + name); }
  catch (e) { failures.push(name); console.log("  ✗ " + name + "\n      " + (e && e.message)); }
}
const call = async (p, opts = {}, headers = {}) => {
  const r = await fetch(BASE + p, Object.assign({ headers: Object.assign({ "Content-Type": "application/json" }, headers) }, opts));
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch (e) { /* html/text */ }
  return { s: r.status, j: json, text };
};
const post = (p, body, h) => call(p, { method: "POST", body: JSON.stringify(body) }, h);

async function waitReady() {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(BASE + "api/ai/status"); if (r.ok) return; } catch (e) { /* henüz değil */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("Sunucu açılmadı");
}

const daire = (over) => Object.assign({
  segment: "emlak", category: "satilik", kind: "daire", kindLabel: "Daire", city: "Antalya", district: "Manavgat",
  price: 4000000, m2: 120, rooms: "3+1", title: "Test Daire", desc: "açıklama", photos: [],
  seller: { name: "Test", type: "sahibinden" }, details: {},
}, over || {});

(async () => {
  const srv = spawn("node", ["server.js"], {
    cwd: ROOT, env: Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR: DATA, ADMIN_PASS, FX_AUTO: "0", AUCTION_EXT_MIN: "1", AUCTION_MIN_HOURS: "0.01" }),
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  srv.stdout.on("data", (d) => { log += d; }); srv.stderr.on("data", (d) => { log += d; });
  const done = (code) => { try { srv.kill(); } catch (e) { /* kapalı */ } try { fs.rmSync(DATA, { recursive: true, force: true }); } catch (e) { /* temizlik */ } process.exit(code); };
  try { await waitReady(); } catch (e) { console.log(log); done(1); return; }
  console.log(`İlan AI duman testi (port ${PORT})`);

  await t("sayfalar açılıyor (200)", async () => {
    for (const p of ["", "ilanlar.html", "ilan-ver.html", "kvkk.html", "kullanim-kosullari.html", "cerez-politikasi.html", "giris.html"]) {
      const r = await call(p); assert.strictEqual(r.s, 200, p + " → " + r.s);
    }
  });
  await t("sitemap yasal sayfaları içeriyor", async () => {
    const r = await call("sitemap.xml"); assert.ok(r.text.includes("kvkk.html") && r.text.includes("kullanim-kosullari.html"));
  });
  await t("hassas dosyalar kapalı (404)", async () => {
    for (const p of ["server.js", "package.json", ".git/config", "data/session.key", "CLAUDE.md", "tests/smoke.js", "node_modules/.package-lock.json"]) {
      const r = await call(p); assert.strictEqual(r.s, 404, p + " → " + r.s);
    }
  });
  await t("yönetici şifresi: yanlış 401, doğru 200; depoda varsayılan şifre yok", async () => {
    assert.strictEqual((await post("api/login", { pass: "emlak2026" })).s, 401);
    assert.strictEqual((await post("api/login", { pass: "yanlis" })).s, 401);
    assert.strictEqual((await post("api/login", { pass: ADMIN_PASS })).s, 200);
  });

  const stamp = Date.now();
  const mk = async (tag) => (await post("api/auth/register", { name: "Üye " + tag, email: `${tag}${stamp}@ex.com`, phone: "05321112233", password: "Sifre12345!", consent: true })).j;
  await t("kayıt: onay olmadan 400, onayla 200 ve onay kaydı", async () => {
    assert.strictEqual((await post("api/auth/register", { name: "Onaysız", email: `x${stamp}@ex.com`, phone: "05321112233", password: "Sifre12345!" })).s, 400);
    const u = await mk("kayit");
    assert.ok(u.token);
    const users = JSON.parse(fs.readFileSync(path.join(DATA, "users.json"), "utf8"));
    assert.ok(users.some((x) => x.consent && x.consent.v), "onay kaydı yok");
  });

  const A = await mk("alici"), S = await mk("satici"), O = await mk("diger");
  const hS = { "X-User-Token": S.token }, hA = { "X-User-Token": A.token }, hO = { "X-User-Token": O.token };
  const adm = (await post("api/login", { pass: ADMIN_PASS })).j.token;
  const hAdm = { "X-Admin-Token": adm };
  let id1;

  await t("TAŞINMAZ NO ZORUNLU: yoksa 400, kısa/harfli 400", async () => {
    assert.strictEqual((await post("api/listings", daire(), hS)).s, 400);
    assert.strictEqual((await post("api/listings", daire({ details: { tasinmazNo: "123" } }), hS)).s, 400);
    assert.strictEqual((await post("api/listings", daire({ details: { tasinmazNo: "abcdefgh" } }), hS)).s, 400);
  });
  await t("geçerli numara (noktalı yazım dahil) kabul, yalnız rakam saklanır", async () => {
    const r = await post("api/listings", daire({ details: { tasinmazNo: "103.555.719" } }), hS);
    assert.strictEqual(r.s, 200, JSON.stringify(r.j)); id1 = r.j.id;
    const mine = (await call("api/my/listings", {}, hS)).j.listings.find((l) => l.id === id1);
    assert.strictEqual(mine.details.tasinmazNo, "103555719");
  });
  await t("aynı üye aynı numarayla ikinci ilan veremez (409)", async () => {
    assert.strictEqual((await post("api/listings", daire({ details: { tasinmazNo: "103555719" } }), hS)).s, 409);
  });
  await t("başka üye aynı numarayı kullanırsa ilan alınır ama yönetici uyarısı işaretlenir", async () => {
    const r = await post("api/listings", daire({ details: { tasinmazNo: "103555719" } }), hO);
    assert.strictEqual(r.s, 200);
    const all = (await call("api/admin/listings", {}, hAdm)).j.listings;
    assert.ok((all.find((l) => l.id === r.j.id).dupOf || []).includes(id1), "dupOf yok");
  });
  await t("emlak ofisi yetki belgesi olmadan 400; araç ilanında taşınmaz no istenmez", async () => {
    assert.strictEqual((await post("api/listings", daire({ seller: { name: "Ofis", type: "ofis" }, details: { tasinmazNo: "209111332" } }), hO)).s, 400);
    const car = { segment: "vasita", category: "satilik", kind: "otomobil", kindLabel: "Otomobil", city: "Antalya", district: "Muratpaşa",
      price: 1000000, brand: "Toyota", model: "Corolla", year: 2019, km: 80000, fuel: "Benzin", gear: "Otomatik", title: "Corolla", photos: [] };
    assert.strictEqual((await post("api/listings", car, hO)).s, 200);
  });
  await t("yayında taşınmaz no HERKESE MASKELİ; sahibine ve yöneticiye tam", async () => {
    await post("api/admin/action", { id: id1, action: "approve" }, hAdm);
    const pub = await call("api/listings");
    assert.ok(!pub.text.includes("103555719"), "tam numara herkese açık listede!");
    assert.ok(pub.text.includes("719"), "maskeli son hane yok");
    const page = await call("ilan.html?id=" + id1);
    assert.ok(!page.text.includes("103555719"), "tam numara ilan sayfasında!");
    assert.ok(!(await call("api/seller?u=" + S.user.uid)).text.includes("103555719"), "mağaza sayfasında sızdı");
    assert.ok((await call("api/my/listings", {}, hS)).text.includes("103555719"), "sahibe tam dönmeli");
    assert.ok((await call("api/admin/listings", {}, hAdm)).text.includes("103555719"), "yöneticiye tam dönmeli");
    assert.ok(!(await call("veri/ilanlar.json")).text.includes("103555719"));
    assert.ok(!(await call("llms-full.txt")).text.includes("103555719"));
  });
  await t("düzenlemede de numara zorunlu kalır (üye numarayı silemez)", async () => {
    const r = await post("api/my/action", { id: id1, action: "edit", value: { details: {} } }, hS);
    assert.strictEqual(r.s, 400);
  });

  let mid;
  await t("mesajlaşma: alıcı yazar, satıcı yanıtlar, alıcıya okunmamış düşer, telefon sızmaz", async () => {
    assert.strictEqual((await post("api/messages", { id: id1, message: "Merhaba, hâlâ satılık mı?" }, hA)).j.threaded, true);
    assert.strictEqual((await post("api/messages", { id: id1, message: "x" }, hS)).s, 400, "kendi ilanına mesaj");
    mid = (await call("api/my/messages", {}, hS)).j.messages[0].mid;
    assert.strictEqual((await post("api/my/reply", { mid, text: "Evet, yarın gösterebilirim." }, hS)).s, 200);
    assert.strictEqual((await call("api/auth/me", {}, hA)).j.unread, 1);
    const sent = (await call("api/my/messages", {}, hA)).j.sent;
    assert.ok(!JSON.stringify(sent).includes("05321112233") && !JSON.stringify(sent).includes("0532"));
    assert.strictEqual((await post("api/my/reply", { mid, text: "x" }, {})).s, 401);
    assert.strictEqual((await post("api/my/reply", { mid, text: "x" }, hO)).s, 403);
  });
  await t("şikayet: 3 farklı kişi → ilan incelemeye düşer; asılsız → geri yayına", async () => {
    const reason = "Dolandırıcılık şüphesi / kapora istiyor";
    let last;
    for (const ip of ["1.1.1.1", "2.2.2.2", "3.3.3.3"]) last = await post("api/report", { id: id1, reason }, { "X-Forwarded-For": ip });
    assert.strictEqual(last.j.hidden, true);
    assert.ok(!(await call("api/listings")).text.includes(id1), "şikayetli ilan hâlâ yayında");
    const reps = (await call("api/admin/reports", {}, hAdm)).j.reports;
    assert.ok(reps.length >= 3 && !reps.some((r) => r.who), "şikayet eden kimliği sızdı");
    assert.strictEqual((await call("api/admin/reports")).s, 401);
    for (const r of reps) await post("api/admin/report", { rid: r.rid, action: "dismiss" }, hAdm);
    assert.ok((await call("api/listings")).text.includes(id1), "asılsız sonrası geri gelmedi");
  });
  await t("İHALE: teminat şart, adım/uzatma kuralları, kendi ihalene teklif yok, maskeli isim", async () => {
    const soon = (m) => new Date(Date.now() + m * 60000).toISOString();
    const base = { declare: true, marketValue: 1250000, vatPct: "0", deedPct: "2", commissionPct: "2", listingId: id1, startPrice: 1000000, minStep: 10000, depositPct: 5, startsAt: soon(0), endsAt: soon(0.8) };
    assert.strictEqual((await post("api/auction/create", base, hA)).s, 403, "başkasının ilanı");
    assert.strictEqual((await post("api/auction/create", Object.assign({}, base, { declare: false }), hS)).s, 400, "beyan şart");
    assert.strictEqual((await post("api/auction/create", Object.assign({}, base, { depositPct: 3 }), hS)).s, 400, "teminat %5 altı");
    assert.strictEqual((await post("api/auction/create", Object.assign({}, base, { depositPct: 11 }), hS)).s, 400, "teminat %10 üstü");
    assert.strictEqual((await post("api/auction/create", Object.assign({}, base, { marketValue: 0 }), hS)).s, 400, "gerçek değer şart");
    assert.strictEqual((await post("api/auction/create", Object.assign({}, base, { deedPct: "55" }), hS)).s, 400, "oran sınırı");
    const c = await post("api/auction/create", base, hS);
    assert.strictEqual(c.s, 200, JSON.stringify(c.j)); assert.ok(c.j.pending);
    const aid = c.j.aid;
    assert.strictEqual((await call("api/auction?id=" + aid)).s, 404, "onaysız ihale herkese açık");
    assert.strictEqual((await post("api/admin/auction", { aid, action: "approve" })).s, 401);
    assert.strictEqual((await post("api/admin/auction", { aid, action: "approve" }, hAdm)).s, 400, "belgesiz onay");
    const png = "data:image/png;base64," + Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]).toString("base64");
    assert.strictEqual((await post("api/auction/doc", { id: aid, key: "tapu", name: "x.png", data: png }, hA)).s, 403, "başkası belge yükleyemez");
    assert.strictEqual((await post("api/auction/doc", { id: aid, key: "tapu", name: "x.exe", data: "data:application/x-msdownload;base64,AAAA" }, hS)).s, 400, "türü yasak");
    assert.strictEqual((await post("api/auction/doc", { id: aid, key: "tapu", name: "x.png", data: "data:image/png;base64," + Buffer.from("MZ...").toString("base64") }, hS)).s, 400, "imza uyuşmuyor");
    for (const key of ["tapu", "takyidat", "icra"]) assert.strictEqual((await post("api/auction/doc", { id: aid, key, name: key + ".png", data: png }, hS)).s, 200);
    assert.strictEqual((await call("api/auction/doc?id=" + aid + "&key=tapu", {}, hA)).s, 403, "belgeyi başkası indirdi");
    assert.strictEqual((await call("api/auction/doc?id=" + aid + "&key=tapu", {}, hS)).s, 200);
    assert.strictEqual((await post("api/admin/auction", { aid, action: "approve" }, hAdm)).s, 400, "değer onayı olmadan yayın");
    const adminList = (await call("api/admin/auctions", {}, hAdm)).j.auctions.find((x) => x.aid === aid);
    assert.ok(adminList.comparables && Array.isArray(adminList.comparables.list), "yönetici emsal listesi yok");
    assert.strictEqual(adminList.declaredValue, 1250000);
    assert.strictEqual((await post("api/admin/auction", { aid, action: "set-value", value: 0 }, hAdm)).s, 400);
    assert.strictEqual((await post("api/admin/auction", { aid, action: "set-value", value: 1200000, ids: [], note: "emsal yok" }, hAdm)).s, 200);
    assert.strictEqual((await post("api/admin/auction", { aid, action: "approve" }, hAdm)).s, 200);
    assert.strictEqual((await post("api/auction/doc", { id: aid, key: "tapu", name: "x.png", data: png }, hS)).s, 400, "onaydan sonra belge değişmez");
    assert.strictEqual((await post("api/auction/bid", { id: aid, amount: 1000000 }, hA)).s, 403, "teminatsız teklif");
    const d = await post("api/auction/deposit", { id: aid }, hA);
    assert.strictEqual(d.j.deposit.amount, 50000);
    assert.strictEqual((await post("api/auction/bid", { id: aid, amount: 1000000 }, hA)).s, 403, "teminat onaysız");
    await post("api/admin/auction", { aid, action: "deposit-paid", uid: JSON.parse(fs.readFileSync(path.join(DATA, "users.json"), "utf8")).find((x) => x.email.startsWith("alici")).uid }, hAdm);
    assert.strictEqual((await post("api/auction/bid", { id: aid, amount: 900000 }, hA)).s, 400, "başlangıç altı");
    const b1 = await post("api/auction/bid", { id: aid, amount: 1000000 }, hA);
    assert.strictEqual(b1.s, 200, JSON.stringify(b1.j));
    assert.ok(b1.j.extended, "bitişe 1 dk kala gelen teklif süreyi uzatmadı");
    assert.strictEqual((await post("api/auction/bid", { id: aid, amount: 1010000 }, hA)).s, 400, "önde olan kendini artıramaz");
    assert.strictEqual((await post("api/auction/bid", { id: aid, amount: 1010000 }, hS)).s, 400, "satıcı kendi ihalesine teklif veremez");
    const det = (await call("api/auction?id=" + aid, {}, hA)).j;
    assert.strictEqual(det.current, 1000000); assert.strictEqual(det.nextMin, 1010000);
    assert.ok(det.bids[0].who.includes("***") && !det.bids[0].who.toLowerCase().includes("alici"), "teklif veren maskeli değil");
    assert.ok(!JSON.stringify(det).includes("deposits") && !JSON.stringify(det).includes("ownerId"), "iç alan sızdı");
    assert.ok(!det.docs, "belgeler başkasına görünüyor");
    assert.strictEqual(det.docsVerified, true);
    assert.strictEqual(det.marketValue, 1200000); assert.strictEqual(det.valueVerified, true); assert.strictEqual(det.deedPct, 2); assert.strictEqual(det.commissionPct, 2);
    assert.ok((await call("api/auction/doc?id=" + aid + "&key=tapu", {}, { "X-Admin-Token": adm })).s === 200, "yönetici belgeyi göremiyor");
  });
  await t("SATICI GİZLİLİĞİ: ad/telefon gizlenir, e-posta ve fotoğraf yalnız seçilirse görünür; sahibi hepsini görür", async () => {
    const find = async () => (await call("api/listings")).j.listings.find((l) => l.id === id1);
    let l = await find();
    assert.ok(l.phone, "başlangıçta telefon açık olmalı"); assert.strictEqual(l.contact.phone, true); assert.strictEqual(l.contact.email, "");
    const u = await post("api/auth/update", { alias: "Gizli Satıcı", privacy: { hideName: true, hidePhone: true, showEmail: false, showAvatar: false } }, hS);
    assert.strictEqual(u.s, 200, JSON.stringify(u.j));
    l = await find();
    assert.strictEqual(l.seller.name, "Gizli Satıcı"); assert.ok(!l.phone, "telefon sızdı"); assert.strictEqual(l.contact.phone, false); assert.strictEqual(l.contact.email, "");
    assert.ok(!(await call("api/listings")).text.includes("05321112233") && !(await call("api/listings")).text.includes("Üye satici"), "ad/telefon herkese açık yanıtta");
    const sel = (await call("api/seller?u=" + l.ownerId)).j.seller;
    assert.strictEqual(sel.name, "Gizli Satıcı"); assert.strictEqual(sel.phone, null); assert.strictEqual(sel.email, "");
    const mine = (await call("api/my/listings", {}, hS)).j.listings.find((x) => x.id === id1);
    assert.ok(mine.phone, "sahibi kendi telefonunu görmeli");
    assert.strictEqual((await post("api/auth/avatar", { data: "data:image/png;base64," + Buffer.from("x".repeat(400 * 1024)).toString("base64") }, hS)).s, 413, "büyük avatar");
    const png = "data:image/png;base64," + Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]).toString("base64");
    const av = await post("api/auth/avatar", { data: png }, hS);
    assert.strictEqual(av.s, 200); assert.ok(/^a\//.test(av.j.user.avatar));
    l = await find(); assert.ok(!l.seller.avatar, "fotoğraf seçilmeden görünmemeli");
    await post("api/auth/update", { privacy: { hideName: true, hidePhone: true, showEmail: true, showAvatar: true } }, hS);
    l = await find();
    assert.ok(/^a\//.test(l.seller.avatar)); assert.ok(l.contact.email.includes("@"));
    assert.strictEqual((await call(l.seller.avatar)).s, 200, "avatar dosyası açılmıyor");
    assert.strictEqual((await call("a/..%2Fusers.json")).s, 404, "avatar rotasından kaçış");
  });
  await t("yetkisiz yönetici uçları kapalı", async () => {
    assert.strictEqual((await call("api/admin/listings")).s, 401);
    assert.strictEqual((await call("api/admin/users", {}, hS)).s, 401);
  });

  console.log(`\n${passed} geçti, ${failures.length} başarısız`);
  if (failures.length) { console.log("Başarısız: " + failures.join(" | ")); console.log("\nSunucu günlüğü (son 15 satır):\n" + log.split("\n").slice(-15).join("\n")); }
  done(failures.length ? 1 : 0);
})();
