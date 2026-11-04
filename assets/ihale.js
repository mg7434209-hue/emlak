/* İlan AI — İhale (açık artırma) arayüzü: ihaleler · ihale · ihale-olustur · ihale-yonetim */
(function () {
  "use strict";
  const E = window.EMLAK || {};
  const A = E.auth;
  const page = document.body.dataset.page;
  if (["ihaleler", "ihale", "ihale-olustur", "ihale-yonetim"].indexOf(page) < 0) return;

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n) => new Intl.NumberFormat("tr-TR").format(Math.round(Number(n) || 0));
  const money = (n) => fmt(n) + " ₺";
  const dt = (iso) => new Date(iso).toLocaleString("tr-TR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const safePhoto = (p) => (/^(u\/[\w.-]+|assets\/img\/[\w./-]+)$/.test(p || "") ? p : "");
  const qs = new URLSearchParams(location.search);
  let skew = 0;                       // sunucu saati − istemci saati (ms)
  const nowMs = () => Date.now() + skew;
  const syncClock = (iso) => { const t = new Date(iso).getTime(); if (Number.isFinite(t)) skew = t - Date.now(); };

  async function api(path, opts, admin) {
    const headers = { "Content-Type": "application/json" };
    if (A && A.token && A.token()) headers["X-User-Token"] = A.token();
    if (admin) { const t = sessionStorage.getItem("emlakai.adminToken"); if (t) headers["X-Admin-Token"] = t; }
    const r = await fetch(path, Object.assign({ headers }, opts || {}));
    let j = {}; try { j = await r.json(); } catch (e) {}
    j.__status = r.status; j.__ok = r.ok;
    return j;
  }
  const post = (path, body, admin) => api(path, { method: "POST", body: JSON.stringify(body) }, admin);

  function cd(ms) {
    if (ms <= 0) return "00:00:00";
    const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    const p = (n) => String(n).padStart(2, "0");
    return (d ? d + " gün " : "") + p(h) + ":" + p(m) + ":" + p(x);
  }
  const PHASE = { live: ["Canlı", "live"], scheduled: ["Yaklaşan", "soon"], ended: ["Sona erdi", "end"], pending: ["Onay bekliyor", "soon"], cancelled: ["İptal", "end"] };

  // ── Liste ───────────────────────────────────────────────────────────────
  function card(a) {
    const ph = PHASE[a.phase] || PHASE.ended;
    const target = a.phase === "scheduled" ? a.startsAt : a.endsAt;
    const photo = safePhoto(a.photo);
    return '<a class="auc-card" href="ihale.html?id=' + encodeURIComponent(a.aid) + '">' +
      '<div class="auc-media">' + (photo ? '<img src="' + photo + '" alt="' + esc(a.title) + '" loading="lazy">' : '<div class="auc-noimg">🔨</div>') +
      '<span class="auc-badge ' + ph[1] + '">' + ph[0] + '</span></div>' +
      '<div class="auc-body"><div class="auc-title">' + esc(a.title) + '</div>' +
      '<div class="auc-loc">📍 ' + esc([a.city, a.district].filter(Boolean).join(" / ") || "—") + '</div>' +
      '<div class="auc-price"><small>' + (a.bidCount ? "Güncel teklif" : "Başlangıç bedeli") + '</small><b>' + money(a.current) + '</b></div>' +
      '<div class="auc-meta"><span>' + a.bidCount + ' teklif</span><span data-cd="' + esc(target) + '" data-phase="' + a.phase + '"></span></div></div></a>';
  }
  async function pageList() {
    const root = $("#auctionList");
    const draw = async () => {
      const j = await api("api/auctions");
      if (j.serverNow) syncClock(j.serverNow);
      const all = j.auctions || [];
      const group = (title, list) => list.length ? '<h2 class="auc-h">' + title + '</h2><div class="auc-grid">' + list.map(card).join("") + "</div>" : "";
      const live = all.filter((a) => a.phase === "live").sort((a, b) => new Date(a.endsAt) - new Date(b.endsAt));
      const soon = all.filter((a) => a.phase === "scheduled").sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
      const done = all.filter((a) => a.phase === "ended").sort((a, b) => new Date(b.endsAt) - new Date(a.endsAt));
      root.innerHTML = all.length
        ? group("Şu an canlı", live) + group("Yaklaşan ihaleler", soon) + group("Sona erenler", done)
        : '<div class="home-empty"><b>Henüz ihale yok</b><span>İlk ihaleyi siz açabilirsiniz: yayındaki ilanınızı ihaleye çıkarın.</span><a class="btn" href="ihale-olustur.html">İlanımı ihaleye çıkar</a></div>';
      tickCountdowns();
    };
    await draw();
    setInterval(draw, 15000);
  }
  function tickCountdowns() {
    $$("[data-cd]").forEach((el) => {
      const left = new Date(el.dataset.cd).getTime() - nowMs();
      el.textContent = el.dataset.phase === "ended" ? "" : (el.dataset.phase === "scheduled" ? "Açılışa " : "Kalan ") + cd(left);
    });
  }
  setInterval(tickCountdowns, 1000);

  // ── Detay ───────────────────────────────────────────────────────────────
  async function pageDetail() {
    const root = $("#auctionDetail");
    const id = qs.get("id");
    let a = null, busy = false, flash = "";
    const load = async () => {
      const j = await api("api/auction?id=" + encodeURIComponent(id));
      if (!j.__ok) { root.innerHTML = '<div class="home-empty"><b>İhale bulunamadı</b><a class="btn" href="ihaleler.html">İhalelere dön</a></div>'; return false; }
      syncClock(j.serverNow); a = j; return true;
    };
    function depositBox() {
      const u = A && A.user && A.user();
      if (a.phase === "ended" || a.phase === "cancelled") return "";
      if (a.owner) return '<div class="auc-box">Bu sizin ihaleniz. Kendi ihalenize teklif veremezsiniz.</div>';
      if (!u) return '<div class="auc-box"><b>Teklif vermek için giriş yapın.</b><p>Üye olduktan sonra teminat yatırarak ihaleye katılabilirsiniz.</p><a class="btn" href="giris.html?next=' + encodeURIComponent("ihale.html?id=" + id) + '">Giriş yap / üye ol</a></div>';
      const d = a.myDeposit;
      if (!d) return '<div class="auc-box"><b>Teminat gerekli: ' + money(a.depositAmount) + '</b> <span class="muted">(başlangıç bedelinin %' + a.depositPct + '’i)</span>' +
        '<p>Teminat iade edilebilirdir: ihaleyi kazanmazsanız tamamen iade edilir, kazanırsanız bedelden düşülür. Kazanıp satın almaktan vazgeçerseniz teminat irat kaydedilir.</p>' +
        '<button class="btn" id="aucDep">Teminat talebi oluştur</button></div>';
      if (d.status === "requested") return '<div class="auc-box warn"><b>Teminat bekleniyor</b><p>Tutar: <b>' + money(d.amount) + '</b> · Açıklamaya şu kodu yazın: <b class="auc-ref">' + esc(d.ref) + '</b></p>' +
        (a.depositInfo ? '<p class="auc-pre">' + esc(a.depositInfo) + '</p>' : '<p>Ödeme bilgileri size iletilecektir. Ödemeniz yönetici tarafından onaylandığında teklif verebilirsiniz.</p>') + '</div>';
      if (d.status === "paid") return '<div class="auc-box ok"><b>✓ Teminatınız onaylandı</b> <span class="muted">(' + money(d.amount) + ')</span></div>';
      return '<div class="auc-box"><b>Teminat durumu:</b> ' + ({ refund_due: "iade edilecek", refunded: "iade edildi", applied_pending: "bedele mahsup edilecek", applied: "bedele mahsup edildi", forfeited: "irat kaydedildi" }[d.status] || esc(d.status)) + '</div>';
    }
    function bidBox() {
      if (a.phase !== "live" || a.owner) return "";
      const d = a.myDeposit;
      if (!d || d.status !== "paid") return "";
      const step = a.minStep, min = a.nextMin;
      return '<div class="auc-box bid"><div class="auc-leading">' + (a.leading ? "✓ En yüksek teklif sizin" : "Teklifiniz geçildi ya da henüz teklif vermediniz") + '</div>' +
        '<div class="auc-quick">' + [0, 1, 2, 5].map((k) => '<button type="button" class="chip" data-amt="' + (min + k * step) + '">' + money(min + k * step) + "</button>").join("") + '</div>' +
        '<div class="auc-form"><input id="aucAmt" type="text" inputmode="numeric" value="' + fmt(min) + '" aria-label="Teklif tutarı (₺)"><button class="btn" id="aucBid">Teklif ver</button></div>' +
        '<small class="muted">En az ' + money(min) + ' · artış adımı ' + money(step) + '. Verilen teklif geri alınamaz.</small></div>';
    }
    function render() {
      const ph = PHASE[a.phase] || PHASE.ended;
      const photo = safePhoto(a.photo);
      const target = a.phase === "scheduled" ? a.startsAt : a.endsAt;
      let res = "";
      if (a.phase === "ended" && a.result) {
        res = a.result.hasWinner
          ? '<div class="auc-box ' + (a.won ? "ok" : "") + '"><b>İhale sona erdi.</b> Kazanan teklif: <b>' + money(a.result.amount) + '</b> (' + esc(a.result.winner) + ')' +
            (a.hasReserve && !a.result.reserveMet ? '<p>Asgari satış fiyatına ulaşılmadığı için satıcı satışı onaylamak zorunda değildir.</p>' : "") +
            (a.won ? '<p><b>Tebrikler!</b> Satın alma ve tapu/devir işlemleri için yöneticimiz sizinle iletişime geçecek. Teminatınız bedelden düşülecektir.</p>' : "") + "</div>"
          : '<div class="auc-box"><b>İhale sona erdi.</b> Teklif gelmedi.</div>';
      }
      root.innerHTML = '<div class="auc-detail">' +
        '<div class="auc-left">' + (photo ? '<img class="auc-hero" src="' + photo + '" alt="' + esc(a.title) + '">' : '<div class="auc-hero auc-noimg">🔨</div>') +
        '<h1>' + esc(a.title) + '</h1><div class="auc-loc">📍 ' + esc([a.city, a.district].filter(Boolean).join(" / ") || "—") + '</div>' +
        '<p><a href="ilan.html?id=' + encodeURIComponent(a.listingId) + '">İlan ayrıntıları ve fotoğraflar →</a></p>' +
        '<div class="auc-rules"><h3>İhale kuralları</h3><ul>' +
        '<li>Açılış: ' + dt(a.startsAt) + '</li><li>Kapanış: ' + dt(a.endsAt) + '</li>' +
        '<li>Son ' + a.ext + ' dakikada gelen her teklif süreyi ' + a.ext + ' dakikaya tamamlar (toplam en çok ' + a.maxExtend + ' dk).</li>' +
        '<li>Teminat: başlangıç bedelinin %' + a.depositPct + '’i (' + money(a.depositAmount) + '), iade edilebilir.</li>' +
        (a.hasReserve ? '<li>Gizli asgari satış fiyatı vardır: ' + (a.reserveMet ? "karşılandı" : "henüz karşılanmadı") + '.</li>' : "") +
        '<li>Teklifler bağlayıcıdır; kazanıp vazgeçenin teminatı irat kaydedilir.</li></ul></div></div>' +
        '<div class="auc-right"><div class="auc-panel"><span class="auc-badge ' + ph[1] + '">' + ph[0] + '</span>' +
        '<div class="auc-cdbox"><small>' + (a.phase === "scheduled" ? "Açılışa kalan" : a.phase === "live" ? "Kalan süre" : "") + '</small>' +
        '<div class="auc-cd" id="aucCd" data-cd="' + esc(target) + '" data-phase="' + a.phase + '"></div>' + (a.extended ? '<small class="muted">Toplam ' + Math.round(a.extended) + ' dk uzatıldı</small>' : "") + '</div>' +
        '<div class="auc-cur"><small>' + (a.bidCount ? "Güncel en yüksek teklif" : "Başlangıç bedeli") + '</small><b>' + money(a.current) + '</b><span class="muted">' + a.bidCount + ' teklif</span></div>' +
        (flash ? '<div class="auc-flash">' + esc(flash) + "</div>" : "") + res + depositBox() + bidBox() +
        (a.bids && a.bids.length ? '<div class="auc-bids"><h3>Teklifler</h3>' + a.bids.slice(0, 15).map((b) => '<div class="auc-bid' + (b.mine ? " mine" : "") + '"><span>' + esc(b.who) + (b.mine ? " (siz)" : "") + '</span><b>' + money(b.amount) + '</b><small>' + new Date(b.at).toLocaleTimeString("tr-TR") + "</small></div>").join("") + "</div>" : "") +
        '</div></div></div>';
      document.title = a.title + " — İhale | İlan AI";
      tickCd();
      bind();
    }
    function tickCd() {
      const el = $("#aucCd"); if (!el) return;
      const left = new Date(el.dataset.cd).getTime() - nowMs();
      el.textContent = el.dataset.phase === "ended" || el.dataset.phase === "cancelled" ? "" : cd(left);
      el.classList.toggle("hot", el.dataset.phase === "live" && left < 180000);
    }
    function bind() {
      const dep = $("#aucDep");
      if (dep) dep.onclick = async () => {
        dep.disabled = true;
        const r = await post("api/auction/deposit", { id });
        flash = r.__ok ? "" : (r.error || "İşlem başarısız.");
        await load(); render();
      };
      $$("[data-amt]").forEach((b) => (b.onclick = () => { $("#aucAmt").value = fmt(b.dataset.amt); }));
      const bid = $("#aucBid");
      if (bid) bid.onclick = async () => {
        if (busy) return; busy = true; bid.disabled = true;
        const amount = parseInt(($("#aucAmt").value || "").replace(/\D/g, ""), 10) || 0;
        if (!confirm(money(amount) + " teklif vermek istediğinize emin misiniz? Teklif geri alınamaz.")) { busy = false; bid.disabled = false; return; }
        const r = await post("api/auction/bid", { id, amount });
        busy = false;
        flash = r.__ok ? (r.extended ? "Teklifiniz alındı. Süre uzatıldı." : "Teklifiniz alındı.") : (r.error || "Teklif verilemedi.");
        if (r.__ok && r.auction) { syncClock(r.auction.serverNow); a = r.auction; render(); } else { await load(); render(); }
      };
    }
    if (!(await load())) return;
    render();
    setInterval(tickCd, 250);
    setInterval(async () => {
      if (busy || document.activeElement === $("#aucAmt")) { return; }
      const before = JSON.stringify([a.current, a.bidCount, a.endsAt, a.phase, a.myDeposit && a.myDeposit.status]);
      if (await load() && JSON.stringify([a.current, a.bidCount, a.endsAt, a.phase, a.myDeposit && a.myDeposit.status]) !== before) render();
    }, a.phase === "live" ? 2500 : 8000);
  }

  // ── İhale oluştur ──────────────────────────────────────────────────────
  async function pageCreate() {
    const root = $("#auctionForm");
    const u = A && A.user && A.user();
    if (!u) { root.innerHTML = '<div class="home-empty"><b>İhale açmak için giriş yapın</b><a class="btn" href="giris.html?next=ihale-olustur.html">Giriş yap</a></div>'; return; }
    const j = await api("api/my/listings");
    const ls = (j.listings || []).filter((l) => l.status === "active");
    if (!ls.length) { root.innerHTML = '<div class="home-empty"><b>Yayında ilanınız yok</b><span>İhaleye çıkarmak için önce bir ilan verin ve onaylanmasını bekleyin.</span><a class="btn" href="ilan-ver.html">İlan ver</a></div>'; return; }
    const pre = qs.get("ilan");
    const lt = (d) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };
    const start0 = new Date(Date.now() + 24 * 3600000); start0.setMinutes(0, 0, 0);
    const end0 = new Date(start0.getTime() + 3600000);
    root.innerHTML =
      '<div class="form-grid">' +
      '<div class="full"><label for="aListing">İhaleye çıkacak ilan</label><select id="aListing">' + ls.map((l) => '<option value="' + esc(l.id) + '" data-price="' + (l.price || 0) + '"' + (l.id === pre ? " selected" : "") + ">" + esc(l.title) + " — " + money(l.price) + "</option>").join("") + "</select></div>" +
      '<div><label for="aStart">Başlangıç bedeli (₺)</label><input id="aStart" type="text" inputmode="numeric"></div>' +
      '<div><label for="aStep">Teklif artış adımı (₺)</label><input id="aStep" type="text" inputmode="numeric"></div>' +
      '<div><label for="aPct">Teminat oranı</label><select id="aPct">' + [5, 6, 7, 8, 9, 10].map((p) => '<option value="' + p + '">%' + p + "</option>").join("") + "</select><small id=\"aDep\" class=\"muted\"></small></div>" +
      '<div><label for="aRes">Gizli asgari satış fiyatı (₺) <small>isteğe bağlı</small></label><input id="aRes" type="text" inputmode="numeric" placeholder="Boşsa en yüksek teklif kazanır"></div>' +
      '<div><label for="aFrom">Açılış tarihi ve saati</label><input id="aFrom" type="datetime-local" value="' + lt(start0) + '"></div>' +
      '<div><label for="aTo">Kapanış tarihi ve saati</label><input id="aTo" type="datetime-local" value="' + lt(end0) + '"></div>' +
      '<div class="full"><p class="muted">Son 3 dakikada gelen teklifler süreyi uzatır (toplam en çok 1 saat). İhale yönetici onayından sonra yayınlanır. Teklif verenler başlangıç bedelinin seçtiğiniz oranı kadar iade edilebilir teminat yatırır.</p></div>' +
      '<div class="full"><div id="aErr" class="auc-flash" hidden></div><button class="btn" id="aSend">İhaleyi oluştur</button></div></div>';
    const num = (id) => parseInt(($(id).value || "").replace(/\D/g, ""), 10) || 0;
    const fill = () => {
      const price = +$("#aListing").selectedOptions[0].dataset.price || 0;
      $("#aStart").value = fmt(price || 0); $("#aStep").value = fmt(Math.max(1000, Math.round(price * 0.01 / 1000) * 1000));
      dep();
    };
    const dep = () => { $("#aDep").textContent = "Teminat: " + money(num("#aStart") * (+$("#aPct").value) / 100); };
    $("#aListing").onchange = fill; $("#aPct").onchange = dep; $("#aStart").oninput = dep; fill();
    $("#aSend").onclick = async () => {
      const err = $("#aErr"); err.hidden = true;
      const r = await post("api/auction/create", {
        listingId: $("#aListing").value, startPrice: num("#aStart"), minStep: num("#aStep"), depositPct: +$("#aPct").value,
        reservePrice: num("#aRes") || 0, startsAt: new Date($("#aFrom").value).toISOString(), endsAt: new Date($("#aTo").value).toISOString(),
      });
      if (!r.__ok) { err.textContent = r.error || "İhale oluşturulamadı."; err.hidden = false; return; }
      root.innerHTML = '<div class="home-empty"><b>' + (r.pending ? "İhaleniz onaya gönderildi" : "İhaleniz yayında") + '</b><span>' + (r.pending ? "Yönetici onayladığında ihaleler sayfasında görünür." : "") + '</span><a class="btn" href="ihale.html?id=' + encodeURIComponent(r.aid) + '">İhaleyi aç</a></div>';
    };
  }

  // ── Yönetim ────────────────────────────────────────────────────────────
  async function pageAdmin() {
    const root = $("#auctionAdmin");
    const DS = { requested: "talep edildi", paid: "yatırıldı", refund_due: "İADE EDİLECEK", refunded: "iade edildi", applied_pending: "KAZANAN — mahsup bekliyor", applied: "mahsup edildi", forfeited: "irat" };
    const draw = async () => {
      const j = await api("api/admin/auctions", null, true);
      if (!j.__ok) { root.innerHTML = '<div class="home-empty"><b>Yetki gerekli</b><span>Önce <a href="admin.html">yönetim panelinden</a> giriş yapın.</span></div>'; return; }
      root.innerHTML = (j.auctions || []).map((a) =>
        '<div class="auc-admin"><div class="auc-admin-h"><b>' + esc(a.title) + '</b> <span class="auc-badge ' + (PHASE[a.phase] || PHASE.ended)[1] + '">' + (PHASE[a.phase] || PHASE.ended)[0] + "</span> <small>" + esc(a.aid) + " · satıcı: " + esc(a.ownerName) + "</small></div>" +
        "<div>Başlangıç " + money(a.startPrice) + " · güncel " + money(a.current) + " · teminat " + money(a.depositAmount) + " (%" + a.depositPct + ") · " + dt(a.startsAt) + " → " + dt(a.endsAt) + (a.reservePrice ? " · asgari " + money(a.reservePrice) : "") + "</div>" +
        '<div class="auc-admin-act">' + (a.state === "pending" ? '<button class="btn" data-a="approve" data-id="' + a.aid + '">Onayla</button>' : "") +
        (a.state !== "cancelled" && a.phase !== "ended" ? '<button class="btn ghost" data-a="cancel" data-id="' + a.aid + '">İptal et</button>' : "") + "</div>" +
        (a.deposits.length ? '<table class="spec-table"><tr><th>Üye</th><th>Kod</th><th>Tutar</th><th>Durum</th><th></th></tr>' + a.deposits.map((d) =>
          "<tr><td>" + esc(d.name) + (d.uid === a.winnerUid ? " 🏆" : "") + "</td><td>" + esc(d.ref) + "</td><td>" + money(d.amount) + "</td><td>" + (DS[d.status] || esc(d.status)) + "</td><td>" +
          ({ requested: '<button class="btn" data-a="deposit-paid" data-id="' + a.aid + '" data-u="' + d.uid + '">Ödeme alındı</button>',
            refund_due: '<button class="btn" data-a="deposit-refunded" data-id="' + a.aid + '" data-u="' + d.uid + '">İade edildi</button>',
            applied_pending: '<button class="btn" data-a="deposit-applied" data-id="' + a.aid + '" data-u="' + d.uid + '">Bedele mahsup</button> <button class="btn ghost" data-a="deposit-forfeit" data-id="' + a.aid + '" data-u="' + d.uid + '">Vazgeçti: irat</button>' }[d.status] || "") + "</td></tr>").join("") + "</table>" : "<small class=\"muted\">Teminat talebi yok.</small>") + "</div>").join("") || '<div class="home-empty">İhale yok.</div>';
      $$("[data-a]", root).forEach((b) => (b.onclick = async () => {
        if (!confirm("Bu işlemi onaylıyor musunuz?")) return;
        const r = await post("api/admin/auction", { aid: b.dataset.id, action: b.dataset.a, uid: b.dataset.u }, true);
        if (!r.__ok) alert(r.error || "İşlem başarısız.");
        draw();
      }));
    };
    await draw();
    setInterval(draw, 20000);
  }

  const boot = { ihaleler: pageList, ihale: pageDetail, "ihale-olustur": pageCreate, "ihale-yonetim": pageAdmin }[page];
  const go = () => setTimeout(boot, 0);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
})();
