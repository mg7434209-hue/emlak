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
    cwd: ROOT, env: Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR: DATA, ADMIN_PASS, FX_AUTO: "0" }),
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
  await t("yetkisiz yönetici uçları kapalı", async () => {
    assert.strictEqual((await call("api/admin/listings")).s, 401);
    assert.strictEqual((await call("api/admin/users", {}, hS)).s, 401);
  });

  console.log(`\n${passed} geçti, ${failures.length} başarısız`);
  if (failures.length) { console.log("Başarısız: " + failures.join(" | ")); console.log("\nSunucu günlüğü (son 15 satır):\n" + log.split("\n").slice(-15).join("\n")); }
  done(failures.length ? 1 : 0);
})();
