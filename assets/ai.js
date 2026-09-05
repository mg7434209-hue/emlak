/**
 * EmlakAI — yapay zekâ motoru (tamamı istemci tarafı, çevrimdışı çalışır)
 *  - parseQuery : doğal dil arama → yapılandırılmış filtre
 *  - estimate   : piyasa verisi + katsayılarla değerleme (₺ bandı)
 *  - priceBadge : ilan fiyatını piyasayla kıyaslayan AI etiketi
 *  - describe   : ilan özelliklerinden Türkçe açıklama üretimi (NLG)
 *  - similar    : özellik vektörü benzerliğiyle ilan önerisi
 *  - chat       : niyet tabanlı asistan (arama, değerleme, kredi, SSS)
 *  - mortgage   : kredi taksit hesabı
 *  - trend      : ilçe bazlı 12 aylık fiyat eğilimi serisi
 */
(function () {
  "use strict";
  const C = EMLAK.config;

  const TR_LOWER = (s) => (s || "").toLocaleLowerCase("tr-TR");
  const strip = (s) => TR_LOWER(s).normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c");

  // Türkçe binlik ayıracını temizle: "1.500.000" → "1500000" ("2.5" korunur)
  const deThousand = (s) => String(s).replace(/\.(?=\d{3}(?:\D|$))/g, "");

  // ── Sayı ayrıştırma: "3 milyon", "750 bin", "2.5m", "1.500.000" ────────
  function parseAmount(text) {
    const m = deThousand(strip(text)).match(/(\d+(?:[.,]\d+)?)\s*(milyon|myn|m\b|bin|k\b)?/);
    if (!m) return null;
    let v = parseFloat(m[1].replace(",", "."));
    const unit = m[2] || "";
    if (/^mil|^myn|^m$/.test(unit)) v *= 1e6;
    else if (/^bin|^k$/.test(unit)) v *= 1e3;
    return Math.round(v);
  }

  // ── Doğal dil arama ─────────────────────────────────────────────────────
  // ör: "antalya manavgat'ta deniz manzaralı 3+1 satılık daire 5 milyon altı"
  // ör: "2020 üstü dizel otomatik toyota corolla 100 bin km altı"
  function parseQuery(text) {
    const q = deThousand(strip(text));
    const f = { text };

    if (/kiralik|kiraya|kira\b/.test(q)) f.category = "kiralik";
    if (/satilik|satin|almak/.test(q)) f.category = "satilik";

    const kinds = { daire: "daire", rezidans: "residence", residence: "residence", villa: "villa", mustakil: "mustakil", dukkan: "dukkan", "is yeri": "dukkan", isyeri: "dukkan", ofis: "ofis", arsa: "arsa", tarla: "arsa" };
    for (const k in kinds) if (q.includes(k)) { f.kind = kinds[k]; f.segment = "emlak"; break; }

    // Araç segmenti: genel kelimeler + marka/model adları
    if (/\barac\b|araba|otomobil|vasita|oto\b|rent a car/.test(q)) f.segment = "vasita";
    for (const brand of Object.keys(C.vehicles.brands)) {
      if (q.includes(strip(brand))) { f.segment = "vasita"; f.brand = brand; }
      for (const model of Object.keys(C.vehicles.brands[brand])) {
        if (q.includes(strip(model))) { f.segment = "vasita"; f.brand = brand; f.model = model; }
      }
    }
    if (f.segment === "vasita") {
      const ym = q.match(/(20\d\d)\s*(?:ustu|uzeri|sonrasi|ve ustu|model ustu)/);
      if (ym) f.minYear = parseInt(ym[1], 10);
      const ym2 = q.match(/(20\d\d)\s*model/);
      if (!f.minYear && ym2) f.minYear = parseInt(ym2[1], 10);
      const kmM = q.match(/(\d+(?:[.,]\d+)?)\s*(bin)?\s*km\s*(?:alti|altinda|asagi|kadar)/);
      if (kmM) f.maxKm = Math.round(parseFloat(kmM[1].replace(",", ".")) * (kmM[2] ? 1000 : 1));
      if (/dizel/.test(q)) f.fuel = "Dizel";
      else if (/hibrit/.test(q)) f.fuel = "Hibrit";
      else if (/elektrik/.test(q)) f.fuel = "Elektrik";
      else if (/lpg/.test(q)) f.fuel = "LPG & Benzin";
      else if (/benzin/.test(q)) f.fuel = "Benzin";
      if (/otomatik/.test(q)) f.gear = "Otomatik";
      else if (/manuel|duz vites/.test(q)) f.gear = "Manuel";
    }

    const rm = q.match(/(\d)\s*\+\s*(\d)/);
    if (rm && f.segment !== "vasita") { f.rooms = rm[1] + "+" + rm[2]; f.segment = "emlak"; }

    // Şehir / ilçe eşleşmesi (config'teki gerçek adlardan)
    for (const city of Object.keys(C.market.cities)) {
      if (q.includes(strip(city))) f.city = city;
      for (const d of Object.keys(C.market.cities[city].districts)) {
        if (q.includes(strip(d))) { f.city = city; f.district = d; }
      }
    }

    // Fiyat: "5 milyon altı/altında", "20 bin üzeri", "3-5 milyon arası"
    // ÖNEMLİ: m² ve km ifadeleri fiyat sanılmasın diye önce sorgudan çıkarılır
    // ("120 m2 üzeri" → fiyat değil alan; "100 bin km altı" → fiyat değil km).
    const qp = q.replace(/\d+(?:[.,]\d+)?\s*(?:m2|metrekare|m²)/g, " ")
                .replace(/\d+(?:[.,]\d+)?\s*(?:bin\s*)?km/g, " ")
                .replace(/\d+\s*\+\s*\d+/g, " ")
                .replace(/(?:19|20)\d\d\s*model/g, " ");
    const between = qp.match(/(\d+(?:[.,]\d+)?)\s*(?:ile|-|–)\s*(\d+(?:[.,]\d+)?)\s*(milyon|bin)?\s*(?:arasi|arasinda)/);
    if (between) {
      const mult = between[3] === "milyon" ? 1e6 : between[3] === "bin" ? 1e3 : 1;
      f.minPrice = parseFloat(between[1].replace(",", ".")) * mult;
      f.maxPrice = parseFloat(between[2].replace(",", ".")) * mult;
    } else {
      const under = qp.match(/((?:\d+(?:[.,]\d+)?)\s*(?:milyon|bin)?)\s*(?:tl?\s*)?(?:alti|altinda|asagi|kadar|max|en fazla)/);
      const over = qp.match(/((?:\d+(?:[.,]\d+)?)\s*(?:milyon|bin)?)\s*(?:tl?\s*)?(?:uzeri|ustunde|yukari|en az|min)/);
      if (under) f.maxPrice = parseAmount(under[1]);
      if (over) f.minPrice = parseAmount(over[1]);
    }

    // m²: "100 m2 üzeri", "150 metrekare"
    const m2m = q.match(/(\d+)\s*(?:m2|metrekare|m²)/);
    if (m2m) f.minM2 = parseInt(m2m[1], 10);

    // m² aralığı: "100-150 m2" / "en fazla 120 m2"
    const m2range = q.match(/(\d+)\s*(?:ile|-|–)\s*(\d+)\s*(?:m2|metrekare|m²)/);
    if (m2range) { f.minM2 = +m2range[1]; f.maxM2 = +m2range[2]; }
    const m2max = q.match(/(?:en fazla|max|maksimum)\s*(\d+)\s*(?:m2|metrekare|m²)/);
    if (m2max) { f.maxM2 = +m2max[1]; delete f.minM2; }
    const m2min = q.match(/(\d+)\s*(?:m2|metrekare|m²)\s*(?:uzeri|ustu|ve uzeri|en az|uzerinde)/);
    if (m2min) f.minM2 = +m2min[1];

    // Bina yaşı: "10 yaşından yeni", "5 yaş altı", "sıfır bina"
    const ageM = q.match(/(\d+)\s*(?:yas|yasin|yasinda)\w*\s*(?:alti|altinda|yeni|kucuk|az)/);
    if (ageM) f.maxAge = +ageM[1];
    if (!ageM && f.segment !== "vasita") {
      if (/\b(sifir bina|sifir daire|yeni bina|yeni daire)\b/.test(q)) f.maxAge = 2;
      else if (/\b(yeni|sifir)\b/.test(q)) f.maxAge = 5;
    }

    // Oda alt sınırı: "3+1 ve üstü", "en az 3+1"
    if (f.rooms && /(ve ustu|ve uzeri|uzeri|en az|ustu)/.test(q)) { f.minRooms = f.rooms; delete f.rooms; }

    // Özellikler: config'teki TÜM özellik adları + yaygın halk ifadeleri
    const SYN = {
      "Deniz Manzarası": /deniz manzara|denize sifir|deniz gor/,
      "Havuz": /havuz/,
      "Otopark": /otopark|garaj|arac park/,
      "Asansör": /asansor/,
      "Güvenlik": /guvenlik|24 saat guvenlik|kameral/,
      "Balkon": /balkon|teras/,
      "Eşyalı": /esyali|mobilyali/,
      "Akıllı Ev": /akilli ev|smart home/,
      "Isı Yalıtımı": /isi yalitim|mantolama/,
      "Site İçi": /site ici|site icinde|siteli/,
      "Doğalgaz": /dogalgaz|dogal gaz|kombi/,
      "Jeneratör": /jenerator/,
    };
    const feats = [];
    for (const name in SYN) if (SYN[name].test(q)) feats.push(name);
    if (feats.length) { f.features = feats; f.feature = feats[0]; } // feature: geriye dönük uyum

    // Tapu / kredi / takas nitelikleri
    if (/krediye uygun|kredili|banka kredisi/.test(q)) f.creditOk = true;
    if (/takasl|takas/.test(q)) f.swap = true;

    // Sıralama niyeti: "en ucuz", "en yeni", "fırsat", "en büyük"
    if (/en ucuz|ucuzdan/.test(q)) f.sort = "price-asc";
    else if (/en pahali|pahalidan|luks/.test(q)) f.sort = "price-desc";
    else if (/en yeni|yeni ilan|son eklenen/.test(q)) f.sort = "new";
    else if (/firsat|kelepir|ucuza|piyasa alti/.test(q)) f.sort = "ai";
    else if (/en buyuk|genis|ferah/.test(q)) f.sort = "m2";

    return f;
  }

  // "3+1" ≥ "2+1" karşılaştırması (oda + salon toplamı üzerinden)
  function roomsSum(r) {
    const m = String(r || "").match(/(\d+)\s*\+\s*(\d+)/);
    return m ? +m[1] + +m[2] : 0;
  }
  const roomsAtLeast = (have, want) => roomsSum(have) >= roomsSum(want);

  function applyFilters(listings, f) {
    return listings.filter((l) => {
      const seg = l.segment || "emlak";
      if (f.segment && seg !== f.segment) return false;
      if (f.category && l.category !== f.category) return false;
      if (f.kind && l.kind !== f.kind) return false;
      if (f.city && l.city !== f.city) return false;
      if (f.district && l.district !== f.district) return false;
      if (f.rooms && l.rooms !== f.rooms) return false;
      if (f.minPrice && l.price < f.minPrice) return false;
      if (f.maxPrice && l.price > f.maxPrice) return false;
      if (f.minM2 && !(l.m2 >= f.minM2)) return false;
      if (f.maxM2 && !(l.m2 <= f.maxM2)) return false;
      if (f.maxAge != null && (l.age == null || l.age > f.maxAge)) return false;
      if (f.minRooms && !roomsAtLeast(l.rooms, f.minRooms)) return false;
      if (f.creditOk === true && l.creditOk !== true) return false;
      if (f.swap === true && l.swap !== true) return false;
      // Tek özellik (geri uyum) ya da çoklu özellik listesi — hepsi bulunmalı
      if (f.features && f.features.length) {
        const have = l.features || [];
        if (!f.features.every((x) => have.includes(x))) return false;
      } else if (f.feature && !(l.features || []).includes(f.feature)) return false;
      // Araç filtreleri
      if (f.brand && l.brand !== f.brand) return false;
      if (f.model && l.model !== f.model) return false;
      if (f.minYear && !(l.year >= f.minYear)) return false;
      if (f.maxKm != null && !(l.km <= f.maxKm)) return false;
      if (f.fuel && l.fuel !== f.fuel) return false;
      if (f.gear && l.gear !== f.gear) return false;
      return true;
    });
  }

  // ── Değerleme ───────────────────────────────────────────────────────────
  function ageFactor(age) {
    for (const [max, f] of C.valuation.age) if (age <= max) return f;
    return C.valuation.age[C.valuation.age.length - 1][1];
  }

  /** Araç değerleme — p: {brand, model, year, km, fuel, gear, category} */
  function estimateVehicle(p) {
    const VC = C.vehicles;
    const base = VC.brands[p.brand] && VC.brands[p.brand][p.model];
    if (!base) return null;
    const nowYear = new Date().getFullYear();
    const age = Math.max(0, nowYear - (p.year || nowYear));
    const factors = [];
    let value = base;
    factors.push({ label: `${p.brand} ${p.model} sıfır km liste fiyatı`, effect: base, unit: "₺" });

    let af = VC.ageCurve[VC.ageCurve.length - 1][1];
    for (const [max, f] of VC.ageCurve) if (age <= max) { af = f; break; }
    value *= af;
    factors.push({ label: `Model yılı (${p.year} — ${age} yaş)`, effect: pct(af) });

    const km = p.km || 0;
    const kmDelta = (km - age * VC.kmNormPerYear) / 10000;
    const kmPct = Math.max(-VC.kmEffectCapPct, Math.min(VC.kmEffectCapPct, -kmDelta * VC.kmEffectPer10k));
    if (Math.round(kmPct)) {
      value *= 1 + kmPct / 100;
      factors.push({ label: `Kilometre (${fmtNum(km)} km)`, effect: (kmPct >= 0 ? "+" : "") + Math.round(kmPct) + "%" });
    }
    if (p.fuel && VC.fuelFactor[p.fuel]) {
      value *= VC.fuelFactor[p.fuel];
      factors.push({ label: `Yakıt (${p.fuel})`, effect: pct(VC.fuelFactor[p.fuel]) });
    }
    if (p.gear && VC.gearFactor[p.gear]) {
      value *= VC.gearFactor[p.gear];
      factors.push({ label: `Vites (${p.gear})`, effect: pct(VC.gearFactor[p.gear]) });
    }
    let mid = value;
    if (p.category === "kiralik") mid *= VC.rentDailyFactor;
    const band = C.valuation.confidence;
    return {
      mid: Math.round(mid),
      low: Math.round(mid * (1 - band)),
      high: Math.round(mid * (1 + band)),
      perM2: null,
      factors,
      confidence: Math.round((1 - band) * 100),
    };
  }

  /** p: {city, district, kind, m2, rooms, age, floorPos, features[], category} — emlak
   *  ya da {segment:"vasita", brand, model, year, km, fuel, gear, category} — araç */
  function estimate(p) {
    if (p.segment === "vasita") return estimateVehicle(p);
    const V = C.valuation;
    const cityData = C.market.cities[p.city];
    if (!cityData) return null;
    const baseM2 = cityData.districts[p.district];
    if (!baseM2) return null;

    const factors = [];
    let perM2 = baseM2;
    factors.push({ label: `${p.district} ortalama m² fiyatı`, effect: baseM2, unit: "₺/m²" });

    const kf = V.kind[p.kind] || 1;
    perM2 *= kf;
    factors.push({ label: "Gayrimenkul türü etkisi", effect: pct(kf) });

    if (p.age != null && p.kind !== "arsa") {
      const af = ageFactor(p.age);
      perM2 *= af;
      factors.push({ label: `Bina yaşı (${p.age} yıl)`, effect: pct(af) });
    }
    if (p.rooms && V.roomFactor[p.rooms]) {
      perM2 *= V.roomFactor[p.rooms];
      factors.push({ label: `Oda düzeni (${p.rooms})`, effect: pct(V.roomFactor[p.rooms]) });
    }
    if (p.floorPos && V.floorBonus[p.floorPos]) {
      perM2 *= V.floorBonus[p.floorPos];
      factors.push({ label: "Kat konumu", effect: pct(V.floorBonus[p.floorPos]) });
    }
    let featPct = 0;
    (p.features || []).forEach((f) => { if (V.features[f]) featPct += V.features[f]; });
    if (featPct) {
      perM2 *= 1 + featPct / 100;
      factors.push({ label: "Özellik katkısı (" + (p.features || []).length + " özellik)", effect: "+" + featPct + "%" });
    }

    let mid = perM2 * p.m2;
    if (p.category === "kiralik") mid *= C.market.rentYieldMonthly;
    const band = V.confidence;
    // Yatırım göstergeleri: satış değeri üzerinden aylık kira, brüt getiri ve
    // kendini amorti etme süresi (kiralık ilanda satış değeri geri hesaplanır).
    const saleValue = p.category === "kiralik" ? mid / C.market.rentYieldMonthly : mid;
    const rentMonthly = Math.round(saleValue * C.market.rentYieldMonthly);
    return {
      mid: Math.round(mid),
      low: Math.round(mid * (1 - band)),
      high: Math.round(mid * (1 + band)),
      perM2: Math.round(perM2),
      factors,
      confidence: Math.round((1 - band) * 100),
      rentMonthly,
      yieldPct: +(C.market.rentYieldMonthly * 12 * 100).toFixed(1),
      paybackYears: rentMonthly ? Math.round(saleValue / (rentMonthly * 12)) : null,
    };
  }
  function pct(f) { const v = Math.round((f - 1) * 100); return (v >= 0 ? "+" : "") + v + "%"; }

  // ── AI fiyat etiketi ────────────────────────────────────────────────────
  function priceBadge(l) {
    if (!l.price) return null; // fiyatsız kayda etiket üretme ("%100 fırsat" hatası)
    const est = estimate(l);
    if (!est || !est.mid) return null;
    const ratio = l.price / est.mid;
    const band = C.valuation.fairBand;
    if (ratio <= 1 - band) return { key: "firsat", label: "AI: Fırsat Fiyatı", pct: Math.round((1 - ratio) * 100), cls: "badge-deal" };
    if (ratio >= 1 + band) return { key: "ustu", label: "AI: Piyasa Üstü", pct: Math.round((ratio - 1) * 100), cls: "badge-over" };
    return { key: "uygun", label: "AI: Piyasa Uygunu", pct: 0, cls: "badge-fair" };
  }

  // ── Açıklama üretimi (şablonlu NLG) ─────────────────────────────────────
  // ── AI Analizi: ilanı veriyle karşılaştırıp artı/eksi ve yatırım özeti üretir
  // Detay sayfasındaki "AI Analizi" kutusu bunu kullanır.
  function analyze(l) {
    if (!l || !l.price) return null;
    const est = estimate(l);
    if (!est) return null;
    const pros = [], cons = [], notes = [];
    const b = priceBadge(l);

    // Fiyat konumu
    if (b && b.key === "firsat") pros.push(`Fiyat, AI tahmininin %${b.pct} altında — pazarlık gücü yüksek`);
    else if (b && b.key === "ustu") cons.push(`Fiyat, AI tahmininin %${b.pct} üzerinde — pazarlık payı sorulmalı`);
    else pros.push("Fiyat, bölge piyasasıyla uyumlu");

    if (l.segment !== "vasita") {
      // ₺/m² karşılaştırması (ilçe ortalaması)
      const city = C.market.cities[l.city];
      const base = city && city.districts[l.district];
      const own = l.m2 ? Math.round((l.category === "kiralik" ? l.price / C.market.rentYieldMonthly : l.price) / l.m2) : null;
      if (base && own) {
        const diff = Math.round((own / base - 1) * 100);
        notes.push(`Birim fiyat ${fmtNum(own)} ₺/m² · ${l.district} ortalaması ${fmtNum(base)} ₺/m² (${diff >= 0 ? "+" : ""}${diff}%)`);
        if (diff <= -10) pros.push(`m² birim fiyatı ilçe ortalamasının %${Math.abs(diff)} altında`);
        if (diff >= 15) cons.push(`m² birim fiyatı ilçe ortalamasının %${diff} üzerinde`);
      }
      if (l.age != null) {
        if (l.age <= 5) pros.push(l.age === 0 ? "Sıfır bina" : `Yeni sayılır (${l.age} yaşında)`);
        else if (l.age >= 25) cons.push(`Bina ${l.age} yaşında — bakım/yenileme maliyeti öngörün`);
      }
      if (l.creditOk) pros.push("Krediye uygun");
      if (l.deed && /kat mulkiyet/i.test(l.deed)) pros.push("Kat mülkiyetli tapu");
      if (l.dues) notes.push(`Aidat ${fmtNum(l.dues)} ₺/ay`);
      if (l.swap) notes.push("Takas değerlendirilebilir");
      const valuable = (l.features || []).filter((f) => (C.valuation.features[f] || 0) >= 5);
      if (valuable.length) pros.push("Değer artırıcı özellikler: " + valuable.join(", "));
      if (city) notes.push(`${l.city} genelinde yıllık reel değer eğilimi ≈ %${city.yieldTrend}`);
      // Yatırım göstergeleri (yalnız satılık konutta anlamlı)
      if (l.category === "satilik" && l.kind !== "arsa" && est.rentMonthly) {
        notes.push(`Tahmini kira ${fmtNum(est.rentMonthly)} ₺/ay · brüt getiri %${est.yieldPct}` +
          (est.paybackYears ? ` · ${est.paybackYears} yılda amortisman` : ""));
      }
    } else {
      const norm = C.vehicles.kmNormPerYear * Math.max(1, new Date().getFullYear() - (l.year || new Date().getFullYear()));
      if (l.km != null && l.km < norm * 0.75) pros.push("Yaşına göre düşük kilometre");
      if (l.km != null && l.km > norm * 1.3) cons.push("Yaşına göre yüksek kilometre");
      if (/otomatik/i.test(l.gear || "")) pros.push("Otomatik vites");
      if (/hibrit|elektrik/i.test(l.fuel || "")) pros.push("Düşük yakıt gideri (" + l.fuel + ")");
    }

    if (!cons.length) cons.push("Belirgin bir olumsuzluk saptanmadı — yerinde görme yine de şart");
    const summary = `${l.city} ${l.district} bölgesindeki bu ${l.category === "satilik" ? "satılık" : "kiralık"} ` +
      `${(l.kindLabel || "ilan").toLocaleLowerCase("tr-TR")} için AI tahmini ${fmtNum(est.low)} – ${fmtNum(est.high)} ₺ bandında; ` +
      `ilan fiyatı ${fmtNum(l.price)} ₺${l.category === "kiralik" ? (l.segment === "vasita" ? "/gün" : "/ay") : ""}.`;
    return { summary, pros, cons, notes, est, badge: b };
  }

  function describe(l) {
    const s = [];
    const catLabel = l.category === "satilik" ? "satılık" : "kiralık";
    if (l.segment === "vasita") {
      s.push(`${l.year} model ${l.brand} ${l.model}, ${l.city} / ${l.district} konumunda ${catLabel}.`);
      s.push(`${fmtNum(l.km)} km'de, ${(l.fuel || "").toLocaleLowerCase("tr-TR")} yakıtlı ve ${(l.gear || "").toLocaleLowerCase("tr-TR")} vitestir.`);
      const est = estimate(l);
      if (est && l.price > 0) {
        const b = priceBadge(l);
        if (b && b.key === "firsat") s.push(`Yapay zekâ analizine göre fiyat, piyasa değerinin yaklaşık %${b.pct} altındadır.`);
        else if (b && b.key === "uygun") s.push("Yapay zekâ analizine göre fiyat, piyasa değeriyle uyumludur.");
      }
      s.push(l.category === "kiralik"
        ? "Günlük kiralama koşulları ve müsaitlik için iletişime geçin."
        : "Ekspertiz ve yerinde görme randevusu için iletişime geçin.");
      return s.join(" ");
    }
    const openers = [
      `${l.city} ${l.district} bölgesinde, konum avantajıyla öne çıkan ${catLabel} ${l.kindLabel.toLocaleLowerCase("tr-TR")}.`,
      `${l.district}'${suffix(l.district)} merkezi konumda, yatırım değeri yüksek ${catLabel} ${l.kindLabel.toLocaleLowerCase("tr-TR")}.`,
      `Ulaşım, okul ve alışveriş olanaklarına yakın konumdaki bu ${catLabel} ${l.kindLabel.toLocaleLowerCase("tr-TR")} ${l.district}'${suffix(l.district)} yer alıyor.`,
    ];
    s.push(openers[hash(l.id) % openers.length]);

    if (l.kind === "arsa") {
      s.push(`${fmtNum(l.m2)} m² yüz ölçümüne sahip parsel; projelendirmeye ve yatırıma uygundur.`);
    } else {
      const parts = [`${fmtNum(l.m2)} m² kullanım alanı`];
      if (l.rooms) parts.push(`${l.rooms} oda düzeni`);
      if (l.bath) parts.push(`${l.bath} banyo`);
      if (l.floorLabel) parts.push(l.floorLabel.toLocaleLowerCase("tr-TR") + " konumu");
      s.push(parts.join(", ") + " ile konforlu bir yaşam sunar.");
      if (l.age != null) s.push(l.age <= 2 ? "Bina sıfır/yeni yapıdır." : `Bina ${l.age} yaşındadır ve bakımlıdır.`);
      if (l.heating) s.push(`Isıtma: ${l.heating}.`);
    }
    if ((l.features || []).length) {
      s.push("Öne çıkan özellikler: " + l.features.join(", ") + ".");
    }
    if (l.deed) s.push(`Tapu durumu: ${l.deed}.`);
    if (l.creditOk) s.push("Konut kredisi kullanımına uygundur.");
    if (l.dues) s.push(`Aylık aidat ${fmtNum(l.dues)} ₺'dir.`);
    if (l.swap) s.push("Uygun tekliflerde takas değerlendirilebilir.");
    const est = estimate(l);
    if (est && l.price > 0) {
      const b = priceBadge(l);
      if (b && b.key === "firsat") s.push(`Yapay zekâ analizine göre fiyat, bölge ortalamasının yaklaşık %${b.pct} altındadır — değerlendirilmesi gereken bir fırsattır.`);
      else if (b && b.key === "uygun") s.push("Yapay zekâ analizine göre fiyat, bölge piyasasıyla uyumludur.");
      // Yatırım cümlesi: kira getirisi ve amortisman (yalnız satılık konut)
      if (l.category === "satilik" && l.kind !== "arsa" && est.rentMonthly) {
        s.push(`Yatırım açısından: bölge verilerine göre tahmini kira ${fmtNum(est.rentMonthly)} ₺/ay, ` +
          `brüt kira getirisi yaklaşık %${est.yieldPct}` +
          (est.paybackYears ? `, kendini amorti etme süresi yaklaşık ${est.paybackYears} yıldır.` : "."));
      }
    }
    const city = C.market.cities[l.city];
    if (city && l.segment !== "vasita") {
      s.push(`${l.city} genelinde konut değerlerinde yıllık yaklaşık %${city.yieldTrend} reel artış eğilimi gözlenmektedir.`);
    }
    s.push("Detaylı bilgi ve yerinde görme randevusu için hemen iletişime geçin.");
    return s.join(" ");
  }
  // Türkçe bulunma eki: ünlü uyumu + ünsüz sertleşmesi (fıstıkçı şahap)
  function suffix(name) {
    const s = TR_LOWER(name).replace(/[^a-zçğıöşü]/g, "");
    const cons = "pçtkfhsş".includes(s.slice(-1)) ? "t" : "d";
    const vowels = s.match(/[aeıioöuü]/g) || ["a"];
    const back = "aıou".includes(vowels[vowels.length - 1]);
    return cons + (back ? "a" : "e");
  }
  function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  function fmtNum(n) { return new Intl.NumberFormat("tr-TR").format(n); }

  // ── Benzer ilan önerisi (özellik vektörü benzerliği) ────────────────────
  function similar(l, all, n) {
    n = n || 4;
    const seg = l.segment || "emlak";
    return all
      .filter((x) => x.id !== l.id && x.category === l.category && (x.segment || "emlak") === seg)
      .map((x) => {
        let score = 0;
        score += 2 * (1 - Math.min(1, Math.abs(x.price - l.price) / Math.max(l.price, 1)));
        if (seg === "vasita") {
          if (x.brand === l.brand) score += 3;
          if (x.model === l.model) score += 3;
          score += 2 * (1 - Math.min(1, Math.abs((x.year || 0) - (l.year || 0)) / 10));
          if (x.city === l.city) score += 1;
        } else {
          if (x.city === l.city) score += 3;
          if (x.district === l.district) score += 3;
          if (x.kind === l.kind) score += 3;
          if (x.rooms && x.rooms === l.rooms) score += 2;
          score += 1 * (1 - Math.min(1, Math.abs(x.m2 - l.m2) / Math.max(l.m2, 1)));
          const common = (x.features || []).filter((f) => (l.features || []).includes(f)).length;
          score += common * 0.5;
        }
        return { x, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, n)
      .map((r) => r.x);
  }

  // ── Öne çıkan öncelikli sıralama ────────────────────────────────────────
  // Öne çıkarılmış ilanlar, mevcut sıra korunarak listenin başına alınır.
  function rank(list) {
    const feat = list.filter((l) => l.featured);
    return feat.concat(list.filter((l) => !l.featured));
  }

  // ── Kredi hesabı (anüite) ───────────────────────────────────────────────
  function mortgage(principal, monthlyRatePct, months) {
    const r = monthlyRatePct / 100;
    if (r === 0) return { monthly: principal / months, total: principal, interest: 0 };
    const monthly = (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
    return { monthly, total: monthly * months, interest: monthly * months - principal };
  }

  // ── İlçe fiyat eğilimi (12 ay, deterministik seri) ──────────────────────
  function trend(city, district) {
    const cityData = C.market.cities[city];
    if (!cityData) return null;
    const base = cityData.districts[district];
    if (!base) return null;
    const monthly = Math.pow(1 + cityData.yieldTrend / 100, 1 / 12);
    const pts = [];
    let v = base / Math.pow(monthly, 11);
    const h = hash(city + district);
    for (let i = 0; i < 12; i++) {
      const noise = 1 + (((h * (i + 3)) % 100) - 50) / 2500; // ±%2 dalgalanma
      pts.push(Math.round(v * noise));
      v *= monthly;
    }
    return pts;
  }

  // ── Asistan (niyet tabanlı sohbet) ──────────────────────────────────────
  function chat(text, ctx) {
    ctx = ctx || {};
    const q = strip(text);
    const name = C.assistant.name;

    if (/^(merhaba|selam|gunaydin|iyi (gunler|aksamlar)|hey|hi)\b/.test(q)) {
      return { reply: `Merhaba! Ben ${name}, ${C.brand.name}'nin yapay zekâ asistanıyım. Size nasıl yardımcı olabilirim? Örneğin: "Antalya'da 3 milyon altı satılık 2+1 daire" ya da "2021 üstü otomatik Corolla" yazabilir, "değerleme" veya "kredi hesabı" isteyebilirsiniz.` };
    }
    if (/tesekkur|sagol|eyvallah/.test(q)) {
      return { reply: "Rica ederim! Başka bir konuda yardımcı olmamı isterseniz buradayım. 😊" };
    }
    if (/degerleme|deger bic|kac eder|fiyat tahmin/.test(q)) {
      return { reply: "Değerleme için AI Değerleme sayfamızı kullanabilirsiniz — konum ve özellikleri girince saniyeler içinde tahmini değer bandı sunar.", action: { label: "AI Değerleme'ye Git", href: "degerleme.html" } };
    }
    if (/kredi|taksit|faiz|mortgage/.test(q)) {
      const amount = parseAmount(q);
      if (amount && amount > 100000) {
        const r = C.credit.defaultRate;
        const rows = C.credit.terms.map((t) => {
          const m = mortgage(amount, r, t);
          return `${t / 12} yıl: aylık ≈ ${fmtNum(Math.round(m.monthly))} ₺`;
        });
        return { reply: `${fmtNum(amount)} ₺ konut kredisi için aylık %${r} faizle tahmini taksitler:\n• ${rows.join("\n• ")}\n(Bilgi amaçlıdır; banka teklifleri farklılık gösterebilir.)` };
      }
      return { reply: "Kredi hesabı için tutarı da yazın; örneğin: \"3 milyon kredi taksiti\". Değerleme sayfasındaki kredi aracını da kullanabilirsiniz.", action: { label: "Kredi Hesaplayıcı", href: "degerleme.html#kredi" } };
    }
    if (/ilan ver|ilan nasil|satmak istiyorum|kiraya vermek/.test(q)) {
      return { reply: "İlan vermek çok kolay: İlan Ver sayfasında bilgileri girin; yapay zekâ ilan başlığınızı ve açıklamanızı sizin için otomatik yazsın, fiyat önerisi de alın.", action: { label: "Ücretsiz İlan Ver", href: "ilan-ver.html" } };
    }
    // ── Site kullanımıyla ilgili sorular (SSS bilgisi asistanda da olsun)
    if (/uyelik|uye ol|kayit ol|hesap ac|sifre|giris yap/.test(q)) {
      return { reply: "İlan vermek için ücretsiz bir üyelik gerekir: e-posta, telefon ve şifreyle 30 saniyede açılır. Hesabınızla ilanlarınızı düzenleyebilir, size gelen mesajları görebilirsiniz.", action: { label: "Ücretsiz Üye Ol", href: "giris.html?kayit=1" } };
    }
    if (/onay|ne zaman yayin|yayinlan|kac saat|bekleme/.test(q)) {
      return { reply: "Gönderdiğiniz ilan önce yönetici onayına düşer; onaylandığı anda herkese açık yayına girer. Durumu Hesabım › İlanlarım bölümünden izleyebilir, onay beklerken ilanınızı önizleyebilirsiniz.", action: { label: "Hesabım", href: "hesap.html" } };
    }
    if (/fotograf|resim|gorsel|foto ekle/.test(q)) {
      const u = C.upload || {};
      return { reply: `İlan başına en fazla ${u.maxPhotos || 6} fotoğraf ekleyebilirsiniz; kabul edilen biçimler ${u.acceptLabel || "JPG · PNG · WEBP"} ve dosya başına ${u.maxFileMB || 15} MB sınırı vardır. iPhone HEIC fotoğrafları tarayıcılar açamaz — telefonunuzda "En Uyumlu" biçimi seçmeniz yeterli.` };
    }
    if (/guvenli|dolandiric|kapora|dikkat etmeli|sahte ilan/.test(q)) {
      return { reply: "Güvenlik için: taşınmazı mutlaka yerinde görün, tapu kaydını ve iskân durumunu kontrol edin, görmeden kapora/kaparo göndermeyin, ödemeleri banka kanalıyla yapın ve satıcı kimliğini doğrulayın. Şüpheli bir ilan görürseniz bize bildirin.", action: { label: "Rehberi Oku", href: "rehber.html" } };
    }
    if (/favori|kaydet|karsilastir/.test(q)) {
      return { reply: "Beğendiğiniz ilanlardaki 🤍 simgesine dokunarak favorilerinize ekleyebilir, Favoriler sayfasında hepsini m² fiyatı ve AI etiketiyle yan yana karşılaştırabilirsiniz.", action: { label: "Favorilerim", href: "favoriler.html" } };
    }
    if (/bolge fiyat|m2 fiyat|metrekare fiyat|hangi ilce|ilce fiyat/.test(q)) {
      return { reply: "İl ve ilçe bazlı güncel ortalama m² fiyatlarını, kira tahminlerini ve yıllık değer artış eğilimini Bölge Fiyatları sayfasında tablo hâlinde bulabilirsiniz.", action: { label: "Bölge Fiyatları", href: "bolge-fiyatlari.html" } };
    }
    if (/kira getiri|getiri|amortisman|yatirim|kaç yilda/.test(q)) {
      const y = +(C.market.rentYieldMonthly * 12 * 100).toFixed(1);
      return { reply: `Bölge verilerimize göre konutta brüt kira getirisi yıllık yaklaşık %${y}; bu da kabaca ${Math.round(100 / y)} yılda amortisman demektir. İlan detaylarındaki "AI Analizi" kutusunda her ilan için tahmini kira, getiri ve amortisman süresini görebilirsiniz.` };
    }
    if (/iletisim|telefon|ulasabilir|whatsapp/.test(q)) {
      const co = C.company;
      return { reply: `Bize ${co.phone.display} numarasından ya da WhatsApp üzerinden ulaşabilirsiniz. E-posta: ${co.email}` };
    }

    // Varsayılan niyet: ilan arama
    const f = parseQuery(text);
    const hasCriteria = ["category", "kind", "city", "district", "rooms", "minPrice", "maxPrice", "minM2", "maxAge", "feature", "segment", "brand", "model", "minYear", "maxKm", "fuel", "gear"]
      .some((k) => f[k] != null);
    if (!hasCriteria) {
      return { reply: `Sizi tam anlayamadım. 🤔 Şunları deneyebilirsiniz:\n• "İzmir'de kiralık 1+1 daire"\n• "2020 üstü dizel Toyota Corolla"\n• "değerleme" veya "kredi hesabı"` };
    }
    const critParts = [];
    if (f.city) critParts.push(f.city + (f.district ? " / " + f.district : ""));
    if (f.brand) critParts.push(f.brand + (f.model ? " " + f.model : ""));
    if (f.rooms) critParts.push(f.rooms);
    if (f.kind) critParts.push(f.kind);
    if (f.maxPrice) critParts.push(fmtNum(f.maxPrice) + " ₺ altı");

    // Birebir eşleşme yoksa kriterleri sırayla esnet (oda → fiyat → tür → ilçe)
    const g = Object.assign({}, f);
    let results = applyFilters(EMLAK.data.all(), g);
    const relaxed = [];
    const relaxOrder = [["rooms", "oda sayısı"], ["maxAge", "bina yaşı"], ["maxPrice", "fiyat üst sınırı"], ["minPrice", "fiyat alt sınırı"], ["model", "model"], ["maxKm", "km sınırı"], ["minYear", "model yılı"], ["kind", "gayrimenkul türü"], ["district", "ilçe"]];
    for (const [k, label] of relaxOrder) {
      if (results.length) break;
      if (g[k] != null) { delete g[k]; relaxed.push(label); results = applyFilters(EMLAK.data.all(), g); }
    }
    results = rank(results).slice(0, C.assistant.maxResults);
    if (results.length && !relaxed.length) {
      return {
        reply: `Aramanızı analiz ettim${critParts.length ? " (" + critParts.join(", ") + ")" : ""} ve ${results.length} uygun ilan buldum:`,
        listings: results,
        action: { label: "Tüm sonuçları gör", href: "ilanlar.html?" + filtersToQS(f) },
      };
    }
    if (results.length) {
      return {
        reply: `"${critParts.join(", ")}" kriterlerine birebir uyan ilan yok; ${relaxed.join(" ve ")} kriterini esneterek en yakın sonuçları buldum:`,
        listings: results,
        action: { label: "Benzer sonuçları gör", href: "ilanlar.html?" + filtersToQS(g) },
      };
    }
    return { reply: `"${critParts.join(", ")}" kriterlerine uyan ilan bulamadım. Fiyat aralığını genişletmeyi ya da farklı bir ilçe denemeyi önerebilirim. Tüm ilanlara da göz atabilirsiniz.`, action: { label: "Tüm İlanlar", href: "ilanlar.html" } };
  }

  function filtersToQS(f) {
    const p = new URLSearchParams();
    ["segment", "category", "kind", "city", "district", "rooms", "brand", "model", "fuel", "gear"].forEach((k) => { if (f[k]) p.set(k, f[k]); });
    if (f.minPrice) p.set("min", f.minPrice);
    if (f.maxPrice) p.set("max", f.maxPrice);
    if (f.minYear) p.set("minYear", f.minYear);
    if (f.maxKm != null) p.set("maxKm", f.maxKm);
    if (f.features && f.features.length) p.set("features", f.features.join("|"));
    else if (f.feature) p.set("feature", f.feature);
    if (f.minM2) p.set("minM2", f.minM2);
    if (f.maxM2) p.set("maxM2", f.maxM2);
    if (f.maxAge != null) p.set("maxAge", f.maxAge);
    if (f.minRooms) p.set("minRooms", f.minRooms);
    if (f.creditOk) p.set("creditOk", "1");
    if (f.swap) p.set("swap", "1");
    if (f.sort) p.set("sort", f.sort);
    return p.toString();
  }

  EMLAK.ai = { parseQuery, applyFilters, estimate, priceBadge, analyze, describe, similar, mortgage, trend, chat, filtersToQS, fmtNum, rank };
})();
