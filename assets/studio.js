/**
 * EmlakAI — AI İlan Stüdyosu (EMLAK.studio)
 * Karışık verilen bilgiyi (WhatsApp mesajı, not, ilan metni) ve sıralanmamış
 * fotoğrafları analiz edip YAYINA HAZIR bir ilana dönüştürür:
 *  - analyzeText   : serbest metinden yapılandırılmış alanlar (tür, konum,
 *                    fiyat, m², oda, kat, ısıtma, aidat, tapu, ada/parsel,
 *                    araç yılı/km…) + temizlenmiş satıcı notları
 *  - analyzePhoto  : ışık, kontrast, netlik, çözünürlük, renk ölçümü;
 *                    sahne tahmini; belge/ekran görüntüsü tespiti; dHash
 *  - enhancePhoto  : otomatik seviye, beyaz dengesi, ışık (gama), canlılık,
 *                    hafif keskinleştirme → yeni JPEG dosyası
 *  - pickPhotos    : kopyaları ayıklar, en iyi kareyi kapak yapar, sıralar
 *  - compose       : profesyonel başlık + bölümlü açıklama
 *  - readiness     : yayına hazırlık puanı + kontrol listesi
 * Tamamı tarayıcıda çalışır. Sunucuda ANTHROPIC_API_KEY tanımlıysa app.js
 * ayrıca /api/ai/studio ile görsel+metin analizini Claude'a yaptırır ve
 * sonuçları buradaki kurallarla doğrulayarak birleştirir.
 * KURAL: uydurma bilgi YAZILMAZ — açıklamaya yalnız metinde geçen ya da
 * kullanıcının onayladığı bilgi girer.
 */
(function () {
  "use strict";
  const C = EMLAK.config, AI = EMLAK.ai, D = EMLAK.data;
  const SC = C.studio || {};
  const LAND = ["arsa", "tarla", "bagbahce"];

  const lower = (s) => String(s || "").toLocaleLowerCase("tr-TR");
  const strip = (s) => lower(s).normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c");
  const deThousand = (s) => String(s).replace(/(\d)\.(?=\d{3}(?:\D|$))/g, "$1");
  const fmt = (n) => new Intl.NumberFormat("tr-TR").format(n);
  const capFirst = (s) => (s ? s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1) : s);
  const kindsOf = () => (D && D.kinds) || [];
  const kindLabel = (k) => (kindsOf().find((x) => x.kind === k) || {}).label || "";
  const fieldsOfKind = (kind) => {
    for (const sg of C.segments || []) for (const g of sg.groups || []) {
      if ((g.kinds || []).some((k) => k.kind === kind)) return g.fields || [];
    }
    return [];
  };

  // ── 1) METİN ANALİZİ ────────────────────────────────────────────────────
  // Sayı: "3,5 milyon", "3.500.000", "750 bin", "2.5m"
  function money(numStr, unit) {
    let v = parseFloat(String(numStr).replace(",", "."));
    if (!Number.isFinite(v)) return 0;
    const u = strip(unit || "");
    if (/^mil|^myn|^m$/.test(u)) v *= 1e6;
    else if (/^bin|^k$/.test(u)) v *= 1e3;
    return Math.round(v);
  }

  const PHONE_RE = /(?:\+?90[\s.-]*)?\(?0?\s*5\d{2}\)?[\s.-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/g;
  const URL_RE = /\bhttps?:\/\/\S+|\bwww\.\S+/gi;
  const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu;

  function normPhone(raw) {
    const d = String(raw || "").replace(/\D/g, "").replace(/^90/, "").replace(/^0/, "");
    if (!/^5\d{9}$/.test(d)) return "";
    return `0${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}`;
  }

  // Fiyat: anahtar sözcük yakınındaki tutar önce; aidat/depozito/kira geliri hariç.
  function findPrice(q) {
    const clean = q.replace(/aidat[^\n.;,]{0,25}/g, " ").replace(/depozito[^\n.;,]{0,25}/g, " ")
      .replace(/kira getirisi[^\n.;,]{0,25}/g, " ").replace(/\d+(?:[.,]\d+)?\s*(?:m2|m²|metrekare|km|donum|dekar)\b/g, " ");
    const AMT = "(\\d+(?:[.,]\\d+)?)\\s*(milyon|myn|bin|m\\b|k\\b)?";
    const near = clean.match(new RegExp("(?:fiyat[a-z]*|satis bedeli|kira bedeli|kirasi|bedel)\\s*[:=]?\\s*" + AMT));
    if (near) { const v = money(near[1], near[2]); if (v >= 100) return v; }
    const cands = [];
    const re = new RegExp(AMT + "\\s*(tl|try|lira|₺)?", "g");
    let m;
    while ((m = re.exec(clean))) {
      if (!m[2] && !m[3]) continue;                 // birimsiz çıplak sayı fiyat değildir
      const v = money(m[1], m[2]);
      if (v >= 1000) cands.push(v);
    }
    return cands.length ? Math.max.apply(null, cands) : 0;
  }

  // Konum: sözcük SINIRIYLA aranır ("pazarlık" → Pazar ilçesi, "Serik'te" → Serik).
  // Çakışan ilçe adı ("Merkez", "Gölbaşı"…) ancak il de yazılmışsa kabul edilir.
  const wordRe = (w) => new RegExp("(?:^|[^a-z0-9])" + strip(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![a-z0-9])");
  let DIST_INDEX = null;
  function findLocation(q) {
    const cities = C.market.cities;
    if (!DIST_INDEX) {
      DIST_INDEX = [];
      Object.keys(cities).forEach((c) => Object.keys(cities[c].districts).forEach((d) => DIST_INDEX.push({ c, d, re: wordRe(d) })));
    }
    const cityHits = Object.keys(cities).filter((c) => wordRe(c).test(q));
    const hits = DIST_INDEX.filter((x) => x.d !== "Merkez" && x.re.test(q));
    const inCity = hits.filter((x) => cityHits.indexOf(x.c) >= 0);
    const pool = inCity.length ? inCity : hits;
    const names = new Set(pool.map((x) => x.d));
    const amb = (d) => DIST_INDEX.filter((x) => x.d === d).length > 1;
    const best = pool.find((x) => !amb(x.d) || cityHits.indexOf(x.c) >= 0);
    if (best && names.size >= 1) return { city: best.c, district: best.d };
    return { city: cityHits[0] || "", district: "" };
  }

  function findFloor(q) {
    if (/\bbodrum kat/.test(q)) return "Bodrum";
    if (/\bbahce kat/.test(q)) return "Bahçe Katı";
    if (/\byuksek giris/.test(q)) return "Yüksek Giriş";
    if (/\bgiris kat/.test(q)) return "Giriş Katı";
    if (/\bzemin kat/.test(q)) return "Zemin";
    if (/\b(cati kat|cati dubleks|teras kat)/.test(q)) return "Çatı Katı";
    if (/\bvilla tipi/.test(q)) return "Villa Tipi";
    // "3. kat", "3.katta", "kat: 3" — "5 katlı bina" bulunduğu kat DEĞİLDİR
    const m = q.match(/(\d{1,2})\s*\.?\s*kat(?!li|\s*mulk|\s*irtifak)(?:ta|inda|in|i)?\b/) || q.match(/\bkat\s*[:]\s*(\d{1,2})\b/);
    if (!m) return "";
    const n = +m[1];
    if (n <= 5) return String(n);
    if (n <= 10) return "6-10 arası";
    if (n <= 20) return "11-20 arası";
    return "20 ve üzeri";
  }

  // Serbest metin → satıcı notu cümleleri (biçim düzeltilmiş, tekrarsız).
  // Telefon, bağlantı, emoji, bağırma (BÜYÜK HARF) ve ünlem yağmuru temizlenir.
  const SPAM = /\b(kacirmayin|kacirma|son firsat|acele edin|firsat firsat|super firsat|bu fiyata yok|ilk gelen alir|dm|whatsapp|wp)\b/;
  // Alanlara zaten işlenen bilgiyi taşıyan sözcükler: bir cümle bunlardan
  // ibaretse "Öne çıkanlar" listesinde zaten yer aldığı için notlara girmez.
  const COVERED = new Set(("satilik kiralik daire villa rezidans mustakil ev yazlik arsa tarla dukkan ofis brut net " +
    "m2 metrekare kat katta katli katinda bina binada binanin yasinda yas yasi yapimi sifir yeni kombi dogalgaz " +
    "isitma yerden merkezi klima soba somine cift banyo banyolu havuz havuzlu site sitesi icinde icerisinde " +
    "aidat aidati tl lira fiyat fiyati fiyatimiz mulkiyetli irtifakli hisseli tapu tapulu krediye uygun kredili " +
    "takas takasli bos kiracili oda salon ada parsel pafta imarli imarsiz imar kaks emsal gabari donum " +
    "model km benzin dizel otomatik manuel lpg hibrit hasar kaydi kayitsiz yok var beyaz siyah gri gumus " +
    "kirmizi mavi esyali otopark asansor guvenlik balkon mahallesi mah ve ile bir cok").split(" "));
  function informative(s, extra) {
    return strip(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !/^\d/.test(w) &&
      !COVERED.has(w) && !(extra && extra.has(w))).length;
  }
  function cleanNotes(text, extraWords) {
    const out = [];
    const seen = new Set();
    String(text || "")
      .replace(URL_RE, " ").replace(PHONE_RE, " ").replace(EMOJI_RE, " ")
      .replace(/(?:tel(?:efon)?|iletisim|whatsapp|wp)\s*[:.]?\s*(?=\n|$)/gi, " ")
      .replace(/\d{1,3}(?:\.\d{3})+(?:,\d+)?\s*(?:tl|₺|try)?|\d+(?:[.,]\d+)?\s*(?:milyon|bin)\s*(?:tl|₺)?|\d+\s*(?:tl|₺)/gi, " ")
      .split(/\n+|(?<=[^\d\s][.!?])\s+|\s+[-•*–]\s+|^[-•*–]\s*/m)
      .forEach((raw) => {
        let s = raw.replace(/[!]{1,}/g, ".").replace(/[?]{2,}/g, "?").replace(/\.{2,}/g, ".")
          .replace(/[#*_~|>]+/g, " ").replace(/\s+/g, " ").replace(/^[\s.,:;-]+|[\s,:;-]+$/g, "").trim();
        if (!s) return;
        const letters = s.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, "");
        if (letters.length > 6 && letters === letters.toLocaleUpperCase("tr-TR")) s = lower(s);
        const key = strip(s).replace(/[^a-z0-9]/g, "");
        if (key.length < 12 || seen.has(key)) return;    // çok kısa parça / tekrar
        if (SPAM.test(strip(s))) return;
        if (s.split(" ").length < 3) return;
        if (informative(s, extraWords) < 2) return;      // zaten alanlarda var
        seen.add(key);
        s = capFirst(s);
        if (!/[.?]$/.test(s)) s += ".";
        out.push(s);
      });
    return out.slice(0, SC.maxNotes || 8);
  }

  function analyzeText(text) {
    const raw = String(text || "");
    const q = deThousand(strip(raw));
    const f = AI.parseQuery(raw);                       // tür, oda, özellik, araç…
    const loc = findLocation(q);                         // konum: sözcük sınırıyla
    const r = { segment: f.segment || "", kind: f.kind || "", category: f.category || "",
      city: loc.city || "", district: loc.district || "", details: {}, features: (f.features || []).slice() };
    if (!r.segment && r.kind) r.segment = (kindsOf().find((k) => k.kind === r.kind) || {}).segment || "";
    if (/\b(kiralik|kiraya|aylik kira|kira bedeli)\b/.test(q)) r.category = "kiralik";
    else if (/\b(satilik|satiyorum|satisa|satis bedeli|satilir)\b/.test(q)) r.category = "satilik";
    if (!r.kind && r.segment === "emlak" && f.rooms) r.kind = "daire";
    if (!r.kind && f.brand) { r.segment = "vasita"; r.kind = "otomobil"; }

    const price = findPrice(q);
    if (price) r.price = price;

    const tel = (raw.match(PHONE_RE) || []).map(normPhone).find(Boolean);
    if (tel) r.phone = tel;

    const mah = raw.match(/([A-ZÇĞİÖŞÜ][\wçğıöşüÇĞİÖŞÜ]+(?:\s+[A-ZÇĞİÖŞÜ][\wçğıöşüÇĞİÖŞÜ]+){0,2})\s+(?:Mahallesi|Mah\.|Mh\.|Mahalle)/);
    if (mah) {
      // "Manavgat Sarılar Mahallesi" → "Sarılar Mahallesi" (ilçe/il adı ayrı alandadır)
      const skip = new Set([strip(r.city), strip(r.district)]);
      const words = mah[1].split(/\s+/).filter((w) => !skip.has(strip(w)));
      if (words.length) r.locality = words.join(" ") + " Mahallesi";
    }

    if (r.segment === "vasita") {
      const y = q.match(/\b((?:19|20)\d\d)\s*(?:model|mdl|yili)?\b/);
      if (y && +y[1] >= 1990 && +y[1] <= new Date().getFullYear() + 1) r.year = +y[1];
      const km = q.match(/(\d+(?:[.,]\d+)?)\s*(bin)?\s*km\b/);
      if (km) r.km = Math.round(parseFloat(km[1].replace(",", ".")) * (km[2] ? 1000 : 1));
      ["brand", "model", "fuel", "gear"].forEach((k) => { if (f[k]) r[k] = f[k]; });
      const renk = (C.fieldDefs.renk || {}).options || [];
      const rn = renk.find((c) => c !== "Diğer" && new RegExp("\\b" + strip(c) + "\\b").test(q));
      if (rn) r.details.renk = rn;
      if (/hasar kaydi yok|tramersiz|agir hasar kaydi yok|hasarsiz/.test(q)) r.details.hasarKaydi = "Yok";
      else if (/agir hasar kayitli|agir hasarli/.test(q)) r.details.hasarKaydi = "Var";
      const cc = q.match(/\b(\d\.\d)\s*(?:motor|lt|litre|tdi|tsi|dci|hdi|tce)?\b/);
      if (cc) r.details.motorHacmi = String(Math.round(parseFloat(cc[1]) * 1000));
      const hp = q.match(/(\d{2,4})\s*(?:hp|bg|beygir)\b/);
      if (hp) r.details.motorGucu = hp[1];
      const kasa = ((C.fieldDefs.kasaTipi || {}).options || []).find((k) => q.includes(strip(k)));
      if (kasa) r.details.kasaTipi = kasa;
      if (/\b4x4\b|dort ceker/.test(q)) r.details.cekis = "4x4";
      if (/garantili|garantisi devam/.test(q)) r.details.garanti = true;
    } else {
      // m²: brüt / net ayrımı; dönüm/dekar → m²
      // "brüt 140 m2 net 120 m2" ve "140 m2 brüt / 120 m2 net" — önce anahtar
      // sözcüğün ARDINDAKİ sayı denenir (yoksa "140 m2 net" yanlış eşleşir)
      const brut = q.match(/brut\s*[:]?\s*(\d{2,6})/) || q.match(/(\d{2,6})\s*(?:m2|m²|metrekare)\s*brut/);
      const net = q.match(/\bnet\s*[:]?\s*(\d{2,6})/) || q.match(/(\d{2,6})\s*(?:m2|m²|metrekare)\s*net/);
      const any = q.match(/(\d{2,7})\s*(?:m2|m²|metrekare|mt2)\b/);
      const don = q.match(/(\d+(?:[.,]\d+)?)\s*(?:donum|dekar)\b/);
      if (brut) r.m2 = +brut[1];
      if (net) r.m2Net = +net[1];
      if (!r.m2 && any) r.m2 = +any[1];
      if (!r.m2 && r.m2Net) r.m2 = r.m2Net;
      if (don && (!r.m2 || LAND.indexOf(r.kind) >= 0)) r.m2 = Math.round(parseFloat(don[1].replace(",", ".")) * 1000);
      if (don && !r.kind) { r.kind = "tarla"; r.segment = "emlak"; }
      if (f.rooms) r.rooms = f.rooms;
      else if (/\bstudyo|1\+0\b/.test(q)) r.rooms = "1+0";

      const age = q.match(/(\d{1,2})\s*yas(?:inda|li|indaki)?\b/) || q.match(/bina yasi\s*[:]?\s*(\d{1,2})/);
      const built = q.match(/\b((?:19|20)\d\d)\s*(?:yapimi|yapim|insa)/);
      if (/\b(sifir bina|yeni bina|sifir daire|yeni yapi|sifir)\b/.test(q)) r.age = 0;
      if (age) r.age = +age[1];
      else if (built) r.age = Math.max(0, new Date().getFullYear() - +built[1]);

      const floor = findFloor(q);
      if (floor) r.details.katNo = floor;
      const bk = q.match(/(\d{1,2})\s*katli\b/);
      if (bk) r.details.binaKat = +bk[1];
      const bath = q.match(/(\d)\s*(?:adet\s*)?banyo/);
      if (bath) r.details.banyoSayisi = +bath[1];
      else if (/cift banyo|ebeveyn banyo/.test(q)) r.details.banyoSayisi = 2;

      if (/yerden isitma/.test(q)) r.details.isitma = "Yerden Isıtma";
      else if (/kombi|dogalgaz|dogal gaz/.test(q)) r.details.isitma = "Kombi (Doğalgaz)";
      else if (/pay olcer/.test(q)) r.details.isitma = "Merkezi (Pay Ölçer)";
      else if (/merkezi (?:isitma|sistem)/.test(q)) r.details.isitma = "Merkezi";
      else if (/\bsomine/.test(q)) r.details.isitma = "Şömine";
      else if (/\bsoba/.test(q)) r.details.isitma = "Soba";
      else if (/\bklima/.test(q)) r.details.isitma = "Klima";

      const aid = q.match(/aidat\w*\s*[:]?\s*(\d+(?:[.,]\d+)?)\s*(bin)?/);
      if (aid) r.details.aidat = money(aid[1], aid[2]);
      if (/aidat (?:yok|bulunmuyor|yoktur)|aidatsiz/.test(q)) r.details.aidat = 0;

      if (/kat mulkiyet/.test(q)) r.details.tapuDurumu = "Kat Mülkiyetli";
      else if (/kat irtifak/.test(q)) r.details.tapuDurumu = "Kat İrtifaklı";
      else if (/hisseli/.test(q)) r.details.tapuDurumu = "Hisseli Tapu";
      else if (/mustakil tapu/.test(q)) r.details.tapuDurumu = "Müstakil Tapulu";
      else if (/arsa tapu/.test(q)) r.details.tapuDurumu = "Arsa Tapulu";
      else if (/tarla tapu/.test(q)) r.details.tapuDurumu = "Tarla Tapulu";

      if (/kiracili|kiraci var/.test(q)) r.details.kullanimDurumu = "Kiracılı";
      else if (/ev sahibi oturuyor|mulk sahibi oturuyor|sahibi oturuyor/.test(q)) r.details.kullanimDurumu = "Mülk Sahibi Oturuyor";
      else if (/\bbos(?:tur)?\b|hemen teslim/.test(q)) r.details.kullanimDurumu = "Boş";

      const site = raw.match(/([A-ZÇĞİÖŞÜ][\wçğıöşüÇĞİÖŞÜ]+(?:\s+[A-ZÇĞİÖŞÜ][\wçğıöşüÇĞİÖŞÜ]+){0,3})\s+(Sitesi|Evleri|Konutları|Rezidans)\b/);
      if (site) { r.details.siteAdi = (site[1] + " " + site[2]).slice(0, 60); if (r.features.indexOf("Site İçi") < 0) r.features.push("Site İçi"); }

      const ada = q.match(/\bada\s*(?:no)?\s*[:]?\s*(\d{1,6})/);
      const parsel = q.match(/\bparsel\s*(?:no)?\s*[:]?\s*(\d{1,6})/);
      const pafta = q.match(/\bpafta\s*(?:no)?\s*[:]?\s*([a-z0-9-]{1,10})/);
      if (ada) r.details.adaNo = ada[1];
      if (parsel) r.details.parselNo = parsel[1];
      if (pafta) r.details.paftaNo = pafta[1].toLocaleUpperCase("tr-TR");
      const kaks = q.match(/(?:kaks|emsal)\s*[:]?\s*(\d[.,]\d{1,2})/);
      if (kaks) r.details.kaks = kaks[1].replace(",", ".");
      const gab = q.match(/gabari\s*[:]?\s*(\d+(?:[.,]\d+)?)/);
      if (gab) r.details.gabari = gab[1].replace(",", ".") + " m";
      const imar = ((C.fieldDefs.imarDurumu || {}).options || [])
        .find((o) => o !== "Belirtilmemiş" && o !== "Tarla" && q.includes(strip(o)));
      if (imar) r.details.imarDurumu = imar;
      else if (/\bimarsiz\b/.test(q)) r.details.imarDurumu = "İmarsız";
      else if (/\bimarli\b/.test(q) && !r.details.imarDurumu) r.details.imarDurumu = "Konut İmarlı";

      const tno = q.match(/tasinmaz\s*(?:kimlik)?\s*(?:no|numarasi)\s*[:]?\s*(\d{5,12})/);
      if (tno) r.details.tasinmazNo = tno[1];
    }
    if (f.creditOk || /krediye uygun/.test(q)) r.details.krediyeUygun = "Evet";
    else if (/krediye uygun degil/.test(q)) r.details.krediyeUygun = "Hayır";
    if (f.swap) r.details.takas = "Evet";

    // Konum/tür adları da "işlenmiş" sayılır (notlarda tekrar etmesin)
    const extra = new Set(strip([r.city, r.district, r.locality, r.brand, r.model, kindLabel(r.kind),
      r.details.siteAdi].join(" ")).split(/[^a-z0-9]+/).filter(Boolean));
    // Kategori sözcüğü yoksa fiyattan makul tahmin (kira aylık, satış toplu tutar)
    if (!r.category && r.price) { r.category = r.price >= (SC.saleMinPrice || 250000) ? "satilik" : "kiralik"; r.categoryGuessed = true; }
    r.notes = cleanNotes(raw, extra);
    return r;
  }

  // ── 2) FOTOĞRAF ANALİZİ ─────────────────────────────────────────────────
  // CSP blob: adrese izin vermez → createImageBitmap(file) kullanılır.
  async function decode(file) {
    try { return await createImageBitmap(file, { imageOrientation: "from-image" }); }
    catch (e) {
      try { return await createImageBitmap(file); } catch (e2) { return null; }
    }
  }

  // 9×8 fark karması: neredeyse aynı kareleri (art arda çekilmiş) yakalar.
  // Hücre ORTALAMASIYLA hesaplanır — tuvali 9×8'e doğrudan küçültmek dokulu
  // fotoğrafta örnekleme gürültüsü üretip aynı kareyi farklı gösteriyordu.
  function dHash(g, w, h) {
    const cell = new Float32Array(72);
    for (let cy = 0; cy < 8; cy++) for (let cx = 0; cx < 9; cx++) {
      const x0 = Math.floor((cx * w) / 9), x1 = Math.max(x0 + 1, Math.floor(((cx + 1) * w) / 9));
      const y0 = Math.floor((cy * h) / 8), y1 = Math.max(y0 + 1, Math.floor(((cy + 1) * h) / 8));
      let t = 0, n = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { t += g[y * w + x]; n++; }
      cell[cy * 9 + cx] = t / n;
    }
    let bits = "";
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += cell[y * 9 + x] > cell[y * 9 + x + 1] ? "1" : "0";
    return bits;
  }
  const hamming = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; };

  async function analyzePhoto(file, segment) {
    const bmp = await decode(file);
    if (!bmp) return null;
    const W = bmp.width, H = bmp.height;
    const S = 256;
    const sc = Math.min(1, S / Math.max(W, H));
    const w = Math.max(8, Math.round(W * sc)), h = Math.max(8, Math.round(H * sc));
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(bmp, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data;
    const N = w * h;
    const g = new Float32Array(N);
    let sum = 0, sum2 = 0, sat = 0, white = 0, sky = 0, green = 0, rS = 0, gS = 0, bS = 0;
    const topRows = Math.round(h * 0.35);
    for (let i = 0, p = 0; p < N; i += 4, p++) {
      const r = d[i], gg = d[i + 1], b = d[i + 2];
      const L = 0.299 * r + 0.587 * gg + 0.114 * b;
      g[p] = L; sum += L; sum2 += L * L; rS += r; gS += gg; bS += b;
      const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
      const s = mx ? (mx - mn) / mx : 0;
      sat += s;
      if (L > 215 && s < 0.12) white++;
      if (p < topRows * w && b > r + 35 && b > gg + 8 && L > 105) sky++;
      if (gg > r + 12 && gg > b + 6 && L > 40) green++;
    }
    const mean = sum / N;
    const std = Math.sqrt(Math.max(0, sum2 / N - mean * mean));
    // Netlik: Laplace varyansı (kenar enerjisi)
    let lap = 0, lap2 = 0, cnt = 0;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      const v = 4 * g[p] - g[p - 1] - g[p + 1] - g[p - w] - g[p + w];
      lap += v; lap2 += v * v; cnt++;
    }
    const sharp = cnt ? lap2 / cnt - (lap / cnt) * (lap / cnt) : 0;
    const satMean = sat / N, whiteR = white / N;
    const skyR = sky / Math.max(1, topRows * w), greenR = green / N;
    const cast = { r: rS / N, g: gS / N, b: bS / N };
    const hash = dHash(g, w, h);
    if (bmp.close) bmp.close();

    const issues = [];
    let score = 100;
    const minSide = Math.min(W, H);
    const doc = whiteR > 0.5 && satMean < 0.1 && std > 40;
    if (doc) { issues.push("Belge, plan ya da ekran görüntüsü olabilir"); score -= 55; }
    if (mean < 45) { issues.push("Çok karanlık"); score -= 35; }
    else if (mean < 75) { issues.push("Karanlık"); score -= 15; }
    if (mean > 210) { issues.push("Aşırı pozlanmış (patlak)"); score -= 18; }
    if (std < 32 && !doc) { issues.push("Soluk (düşük kontrast)"); score -= 10; }
    if (sharp < 40) { issues.push("Bulanık"); score -= 32; }
    else if (sharp < 110) { issues.push("Hafif yumuşak odak"); score -= 12; }
    if (minSide < 600) { issues.push(`Düşük çözünürlük (${W}×${H})`); score -= 25; }
    else if (minSide < 900) { issues.push("Orta çözünürlük"); score -= 6; }
    if (H > W * 1.15) { issues.push("Dikey kare — yatay çekim daha iyi görünür"); score -= 6; }
    const castMax = Math.max(cast.r, cast.g, cast.b), castMin = Math.min(cast.r, cast.g, cast.b);
    if (castMax - castMin > 28 && satMean < 0.45) { issues.push("Renk kayması"); score -= 6; }
    score = Math.max(0, Math.min(100, Math.round(score)));

    let scene = "İç mekân";
    if (doc) scene = "Belge / ekran görüntüsü";
    else if (segment === "vasita") scene = "Araç";
    else if (segment === "diger") scene = "Ürün";
    else if (skyR > 0.2) scene = "Dış cephe / manzara";
    else if (greenR > 0.28) scene = "Bahçe / yeşil alan";

    return {
      width: W, height: H, mean: Math.round(mean), std: Math.round(std),
      sharp: Math.round(sharp), sat: +satMean.toFixed(2), hash, doc,
      scene, sceneGuess: true, score, issues,
      needsFix: mean < 100 || mean > 200 || std < 45 || castMax - castMin > 28,
    };
  }

  // ── 3) FOTOĞRAF İYİLEŞTİRME ─────────────────────────────────────────────
  // Seviye (yüzdelik germe) + gri-dünya beyaz dengesi (yarım) + gama + canlılık
  // + hafif keskinleştirme. Doğal görünüm için tüm etkiler sınırlıdır; abartılı
  // "HDR" görüntü ilanın güvenilirliğini düşürür.
  async function enhancePhoto(file, maxW) {
    const bmp = await decode(file);
    if (!bmp) return null;
    const limit = maxW || (C.upload && C.upload.maxWidth) || 1400;
    const sc = Math.min(1, limit / bmp.width);
    const w = Math.max(1, Math.round(bmp.width * sc)), h = Math.max(1, Math.round(bmp.height * sc));
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(bmp, 0, 0, w, h);
    if (bmp.close) bmp.close();
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const N = w * h;

    const hist = new Uint32Array(256);
    let rS = 0, gS = 0, bS = 0;
    for (let i = 0; i < d.length; i += 4) {
      rS += d[i]; gS += d[i + 1]; bS += d[i + 2];
      hist[Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])]++;
    }
    const pct = (p) => { let acc = 0; const t = N * p; for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= t) return v; } return 255; };
    let lo = pct(0.005), hi = pct(0.995);
    lo = Math.min(lo, 40); hi = Math.max(hi, 215);           // aşırı germe olmasın
    const range = Math.max(60, hi - lo);
    const avg = (rS + gS + bS) / (3 * N);
    // Beyaz dengesi: kanal ortalamalarını griye yarı yolda yaklaştır
    const wb = [rS / N, gS / N, bS / N].map((m) => Math.min(1.25, Math.max(0.8, 1 + 0.5 * (avg / Math.max(1, m) - 1))));
    // Gama: orta tonları hedef parlaklığa (≈125) çek
    const midAfter = Math.max(1, Math.min(254, ((pct(0.5) - lo) / range) * 255));
    let gamma = Math.log(125 / 255) / Math.log(midAfter / 255);
    gamma = Math.min(1.35, Math.max(0.6, gamma));
    const lut = new Uint8ClampedArray(256);
    for (let v = 0; v < 256; v++) {
      const x = Math.min(1, Math.max(0, (v - lo) / range));
      lut[v] = Math.round(255 * Math.pow(x, gamma));
    }
    const vib = SC.vibrance || 0.18;
    for (let i = 0; i < d.length; i += 4) {
      let r = lut[Math.min(255, Math.round(d[i] * wb[0]))];
      let g = lut[Math.min(255, Math.round(d[i + 1] * wb[1]))];
      let b = lut[Math.min(255, Math.round(d[i + 2] * wb[2]))];
      // Canlılık: az doygun pikseli daha çok, doygunu az artırır
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      const s = mx ? (mx - mn) / mx : 0;
      const k = vib * (1 - s);
      const L = (r + g + b) / 3;
      r += (r - L) * k; g += (g - L) * k; b += (b - L) * k;
      d[i] = r; d[i + 1] = g; d[i + 2] = b;
    }
    // Keskinleştirme (bulanıklaştırılmış kopyaya göre unsharp mask, hafif)
    const amt = SC.sharpen || 0.35;
    if (amt > 0 && N <= 4e6) {
      const src = new Uint8ClampedArray(d);
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const i = (y * w + x) * 4;
        for (let c = 0; c < 3; c++) {
          const blur = (src[i + c] * 4 + src[i - 4 + c] + src[i + 4 + c] + src[i - w * 4 + c] + src[i + w * 4 + c]) / 8;
          d[i + c] = src[i + c] + (src[i + c] - blur) * amt;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    const blob = await new Promise((res) => cv.toBlob(res, "image/jpeg", 0.92));
    if (!blob) return null;
    const name = String(file.name || "foto").replace(/\.[^.]+$/, "") + "-duzeltilmis.jpg";
    try { return new File([blob], name, { type: "image/jpeg" }); }
    catch (e) { blob.name = name; return blob; }
  }

  // Sunucuya (Claude görsel analizi) gidecek küçük kopya: maliyet ve hız için.
  async function thumbForAi(file, max) {
    const bmp = await decode(file);
    if (!bmp) return null;
    const lim = max || SC.aiImageMax || 896;
    const sc = Math.min(1, lim / Math.max(bmp.width, bmp.height));
    const cv = document.createElement("canvas");
    cv.width = Math.max(1, Math.round(bmp.width * sc));
    cv.height = Math.max(1, Math.round(bmp.height * sc));
    cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
    if (bmp.close) bmp.close();
    return cv.toDataURL("image/jpeg", 0.78);
  }

  // Önizleme için küçük data: URL (CSP blob: izin vermez)
  async function preview(file) {
    return thumbForAi(file, 360);
  }

  // ── 4) SEÇİM VE SIRALAMA ────────────────────────────────────────────────
  // Sahne sırası: alıcının gezinme alışkanlığı (dış görünüş → salon → mutfak…)
  const ORDER = {
    emlak: ["dış cephe", "manzara", "salon", "oturma", "mutfak", "yatak", "banyo", "balkon", "teras",
      "bahçe", "havuz", "koridor", "giriş", "iç mekân", "arsa", "plan", "belge"],
    vasita: ["ön", "yan", "arka", "iç", "konsol", "gösterge", "motor", "bagaj", "araç"],
  };
  function orderRank(label, segment) {
    const list = ORDER[segment] || [];
    const l = lower(label);
    const i = list.findIndex((k) => l.includes(k));
    return i < 0 ? list.length : i;
  }

  // items: [{id, analysis:{score,hash,doc,scene}, ai?:{label,quality,include}}]
  function pickPhotos(items, segment, max) {
    const lim = max || (C.upload && C.upload.maxPhotos) || 6;
    const q = (it) => (it.ai && Number.isFinite(it.ai.quality) ? (it.analysis.score * 0.5 + it.ai.quality * 5) : it.analysis.score);
    // 1) uygunsuzlar (belge/ekran görüntüsü, AI "kullanma") ayrılır
    items.forEach((it) => {
      it.reason = "";
      if (it.analysis.doc && !(it.ai && it.ai.include)) it.reason = "Belge/ekran görüntüsü — ilan fotoğrafına uygun değil";
      else if (it.ai && it.ai.include === false) it.reason = "AI: ilana uygun değil";
    });
    // 2) kopyalar: aynı sahnenin art arda çekilmiş kareleri — iyi olan kalır
    const sorted = items.filter((it) => !it.reason).sort((a, b) => q(b) - q(a));
    const kept = [];
    sorted.forEach((it) => {
      const dup = kept.find((k) => hamming(k.analysis.hash, it.analysis.hash) <= (SC.dupDistance || 6));
      if (dup) it.reason = "Benzer kare — daha iyisi seçildi";
      else kept.push(it);
    });
    // 3) en iyi N, sonra sahne sırasına göre; kapak = en yüksek kaliteli dış/salon karesi
    const chosen = kept.slice(0, lim);
    kept.slice(lim).forEach((it) => { it.reason = `Fotoğraf sınırı (${lim}) — daha düşük puanlı`; });
    const label = (it) => (it.ai && it.ai.label) || it.analysis.scene;
    let cover = chosen[0];
    const prefer = chosen.filter((it) => orderRank(label(it), segment) <= 3 && q(it) >= q(chosen[0]) - 15);
    if (prefer.length) cover = prefer.sort((a, b) => q(b) - q(a))[0];
    const rest = chosen.filter((it) => it !== cover)
      .sort((a, b) => orderRank(label(a), segment) - orderRank(label(b), segment) || q(b) - q(a));
    items.forEach((it) => { it.selected = false; it.cover = false; });
    const out = cover ? [cover].concat(rest) : [];
    out.forEach((it, i) => { it.selected = true; it.cover = i === 0; });
    return out;
  }

  // ── 5) PROFESYONEL BAŞLIK + AÇIKLAMA ────────────────────────────────────
  const HIGHLIGHT = [
    ["Deniz Manzarası", "Deniz Manzaralı"], ["Havuz", "Havuzlu"], ["Site İçi", "Site İçinde"],
    ["Eşyalı", "Eşyalı"], ["Akıllı Ev", "Akıllı Ev"],
  ];
  function title(l) {
    const cat = l.category === "kiralik" ? "Kiralık" : "Satılık";
    if (l.segment === "vasita") {
      const parts = [l.year, l.brand, l.model, l.km ? fmt(l.km) + " km" : "", (l.details || {}).hasarKaydi === "Yok" ? "Hasar Kayıtsız" : "", cat];
      return parts.filter(Boolean).join(" ").slice(0, 90);
    }
    if (l.segment === "diger") return [l.district, l.kindLabel, cat].filter(Boolean).join(" ").slice(0, 90);
    const hl = HIGHLIGHT.filter(([f]) => (l.features || []).indexOf(f) >= 0).map((x) => x[1]).slice(0, 2);
    if (l.age === 0) hl.unshift("Sıfır");
    const parts = [
      l.district + (l.locality ? " " + l.locality.replace(/\s+Mahallesi$/, "") : ""),
      hl.join(" "),
      l.rooms, l.m2 ? fmt(l.m2) + " m²" : "",
      cat, l.kindLabel,
    ];
    return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").slice(0, 90);
  }

  function description(l, notes) {
    const cat = l.category === "kiralik" ? "kiralık" : "satılık";
    const kl = lower(l.kindLabel || "ilan");
    const det = l.details || {};
    const out = [];
    const loc = [l.locality, l.district, l.city].filter(Boolean).join(", ");
    if (l.segment === "vasita") {
      out.push(`${loc} konumunda ${cat} ${[l.year, l.brand, l.model].filter(Boolean).join(" ")}.`);
    } else if (l.segment === "diger") {
      out.push(`${loc} konumunda ${cat} ${kl} ilanı.`);
    } else {
      const lead = [l.rooms, l.m2 ? `${fmt(l.m2)} m²${l.m2Net ? ` (net ${fmt(l.m2Net)} m²)` : ""}` : ""].filter(Boolean).join(", ");
      out.push(`${loc} konumunda${lead ? ` ${lead}` : ""} ${cat} ${kl}.`);
    }
    const hl = [];
    if (l.segment === "vasita") {
      if (l.km) hl.push(`${fmt(l.km)} km`);
      if (l.fuel) hl.push(`Yakıt: ${l.fuel}`);
      if (l.gear) hl.push(`Vites: ${l.gear}`);
    } else if (l.segment === "emlak") {
      if (det.katNo) hl.push(`Bulunduğu kat: ${det.katNo}${det.binaKat ? ` (${det.binaKat} katlı bina)` : ""}`);
      else if (det.binaKat) hl.push(`${det.binaKat} katlı bina`);
      if (l.age === 0) hl.push("Sıfır bina");
      else if (l.age != null) hl.push(`Bina yaşı: ${l.age}`);
      if (det.banyoSayisi) hl.push(`${det.banyoSayisi} banyo`);
      if (det.isitma) hl.push(`Isıtma: ${det.isitma}`);
      if (det.siteAdi) hl.push(det.siteAdi);
      if (det.aidat === 0) hl.push("Aidat yok");
      else if (det.aidat) hl.push(`Aidat: ${fmt(det.aidat)} ₺/ay`);
      if (det.imarDurumu) hl.push(`İmar: ${det.imarDurumu}`);
      if (det.adaNo || det.parselNo) hl.push(`Ada ${det.adaNo || "—"} / Parsel ${det.parselNo || "—"}`);
      if (det.kaks) hl.push(`KAKS (emsal): ${det.kaks}`);
      if (det.gabari) hl.push(`Gabari: ${det.gabari}`);
    }
    // Isıtma satırı zaten "Kombi (Doğalgaz)" diyorsa özellik listesinde tekrar etme
    const feats = (l.features || []).filter((f) => !(f === "Doğalgaz" && /doğalgaz/i.test(det.isitma || "")));
    if (feats.length) hl.push(feats.join(" · "));
    const legal = [det.tapuDurumu, det.krediyeUygun === "Evet" ? "Krediye uygun" : "",
      det.takas === "Evet" ? "Takas değerlendirilir" : "", det.kullanimDurumu ? `Durumu: ${det.kullanimDurumu}` : "",
      det.hasarKaydi ? `Ağır hasar kaydı: ${det.hasarKaydi}` : "", det.renk ? `Renk: ${det.renk}` : ""].filter(Boolean);
    if (legal.length) hl.push(legal.join(" · "));
    if (hl.length) out.push("", "ÖNE ÇIKANLAR", ...hl.map((x) => "• " + x));
    if (notes && notes.length) out.push("", "SATICININ NOTLARI", ...notes.map((x) => "• " + x));
    const est = l.segment !== "diger" && l.price ? AI.estimate(l) : null;
    if (est) {
      const b = AI.priceBadge(l);
      if (b && b.key === "firsat") out.push("", `Fiyat, bölge verilerine göre piyasa ortalamasının yaklaşık %${b.pct} altındadır.`);
      else if (b && b.key === "uygun") out.push("", "Fiyat, bölge piyasa verileriyle uyumludur.");
    }
    out.push("", l.segment === "vasita"
      ? "Ekspertiz ve yerinde görme randevusu için iletişime geçebilirsiniz."
      : "Ayrıntılı bilgi ve yerinde görme randevusu için iletişime geçebilirsiniz.");
    return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  // ── 6) YAYINA HAZIRLIK PUANI ────────────────────────────────────────────
  function readiness(l, photos) {
    const items = [];
    const add = (ok, weight, text, fix) => items.push({ ok: !!ok, weight, text, fix });
    const land = LAND.indexOf(l.kind) >= 0;
    add(l.kind && l.category, 15, "Kategori ve ilan türü belirlendi", "Formda kategori seçin.");
    add(l.city && l.district, 15, "Konum (il / ilçe)", "Metinde ilçe adı geçmiyor; formda seçin.");
    add(l.price > 0, 15, "Fiyat", "Fiyat girin ya da AI fiyat önerisini kullanın.");
    if (l.segment === "emlak") {
      add(l.m2 >= 10, 10, land ? "Yüz ölçümü (m²)" : "Alan (m²)", "m² bilgisini ekleyin.");
      if (!land) add(l.rooms, 5, "Oda sayısı", "Oda sayısını seçin.");
    } else if (l.segment === "vasita") {
      add(l.year && l.km != null, 10, "Model yılı ve kilometre", "Yıl ve km girin.");
      add(l.brand && l.model, 5, "Marka / model", "Marka ve modeli seçin.");
    } else add(true, 15, "Sade ilan formu", "");
    const good = photos.filter((p) => p.analysis.score >= 60).length;
    const minP = SC.minPhotos || 4;
    add(photos.length >= minP, 15, `En az ${minP} fotoğraf (${photos.length} seçildi)`, "Farklı odalardan daha fazla fotoğraf ekleyin.");
    add(photos[0] && photos[0].analysis.score >= 70, 10, "Kapak fotoğrafı net ve aydınlık", "Gün ışığında, yatay çekilmiş bir kapak fotoğrafı ekleyin.");
    add(good >= Math.min(3, photos.length || 3), 5, "Fotoğrafların çoğu kaliteli", "Bulanık/karanlık kareleri yeniden çekin.");
    add((l.desc || "").length >= 250, 5, "Açıklama yeterince ayrıntılı", "Metne birkaç ayrıntı daha ekleyin (manzara, ulaşım, yapılan tadilat…).");
    add(l.phone, 5, "İletişim telefonu", "Telefon boşsa hesabınızdaki numara kullanılır.");
    const est = l.segment !== "diger" && l.price ? AI.estimate(l) : null;
    if (est) {
      const b = AI.priceBadge(l);
      add(!(b && b.key === "ustu"), 0, b && b.key === "ustu" ? `Fiyat piyasanın %${b.pct} üstünde` : "Fiyat piyasa bandında",
        `AI bandı: ${fmt(est.low)} – ${fmt(est.high)} ₺`);
    }
    const total = items.reduce((t, x) => t + x.weight, 0) || 1;
    const got = items.reduce((t, x) => t + (x.ok ? x.weight : 0), 0);
    return { score: Math.round((got / total) * 100), items };
  }

  // ── 7) AI (Claude) SONUCUNU DOĞRULAYARAK BİRLEŞTİR ──────────────────────
  // Sunucu zaten doğrular; istemci yine de yalnız tanımlı değerleri alır.
  function mergeAi(base, ai) {
    if (!ai || typeof ai !== "object") return base;
    const r = Object.assign({}, base, { details: Object.assign({}, base.details), features: (base.features || []).slice() });
    const kinds = kindsOf();
    if (ai.kind && kinds.some((k) => k.kind === ai.kind)) {
      r.kind = ai.kind; r.segment = kinds.find((k) => k.kind === ai.kind).segment;
    }
    if (ai.category === "satilik" || ai.category === "kiralik") r.category = ai.category;
    const cities = C.market.cities;
    if (ai.city && cities[ai.city]) {
      r.city = ai.city;
      if (ai.district && cities[ai.city].districts[ai.district] != null) r.district = ai.district;
    }
    if (ai.locality) r.locality = String(ai.locality).slice(0, 120);
    ["price", "m2", "m2Net", "year", "km"].forEach((k) => { if (Number(ai[k]) > 0) r[k] = Math.round(Number(ai[k])); });
    if (Number.isFinite(ai.age) && ai.age >= 0) r.age = ai.age;
    if (/^\d\+\d$/.test(ai.rooms || "")) r.rooms = ai.rooms;
    if (ai.brand && C.vehicles.brands[ai.brand]) {
      r.brand = ai.brand;
      if (ai.model && C.vehicles.brands[ai.brand][ai.model] != null) r.model = ai.model;
    }
    if (ai.fuel && C.vehicles.fuels.indexOf(ai.fuel) >= 0) r.fuel = ai.fuel;
    if (ai.gear && C.vehicles.gears.indexOf(ai.gear) >= 0) r.gear = ai.gear;
    Object.keys(ai.details || {}).forEach((k) => { if (C.fieldDefs[k]) r.details[k] = ai.details[k]; });
    (ai.features || []).forEach((f) => { if (C.valuation.features[f] != null && r.features.indexOf(f) < 0) r.features.push(f); });
    if (ai.title) r.aiTitle = String(ai.title).slice(0, 120);
    if (ai.description) r.aiDescription = String(ai.description).slice(0, 4000);
    return r;
  }

  EMLAK.studio = {
    analyzeText, analyzePhoto, enhancePhoto, thumbForAi, preview, pickPhotos,
    title, description, readiness, mergeAi, kindLabel, fieldsOfKind, normPhone,
  };
})();
