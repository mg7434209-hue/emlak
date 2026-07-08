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

  // ── Sayı ayrıştırma: "3 milyon", "750 bin", "2.5m", "15000" ────────────
  function parseAmount(text) {
    const m = strip(text).match(/(\d+(?:[.,]\d+)?)\s*(milyon|myn|m\b|bin|k\b)?/);
    if (!m) return null;
    let v = parseFloat(m[1].replace(",", "."));
    const unit = m[2] || "";
    if (/^mil|^myn|^m$/.test(unit)) v *= 1e6;
    else if (/^bin|^k$/.test(unit)) v *= 1e3;
    return Math.round(v);
  }

  // ── Doğal dil arama ─────────────────────────────────────────────────────
  // ör: "antalya manavgat'ta deniz manzaralı 3+1 satılık daire 5 milyon altı"
  function parseQuery(text) {
    const q = strip(text);
    const f = { text };

    if (/kiralik|kiraya|kira\b/.test(q)) f.category = "kiralik";
    if (/satilik|satin|almak/.test(q)) f.category = "satilik";

    const kinds = { daire: "daire", rezidans: "residence", residence: "residence", villa: "villa", mustakil: "mustakil", dukkan: "dukkan", "is yeri": "dukkan", isyeri: "dukkan", ofis: "ofis", arsa: "arsa", tarla: "arsa" };
    for (const k in kinds) if (q.includes(k)) { f.kind = kinds[k]; break; }

    const rm = q.match(/(\d)\s*\+\s*(\d)/);
    if (rm) f.rooms = rm[1] + "+" + rm[2];

    // Şehir / ilçe eşleşmesi (config'teki gerçek adlardan)
    for (const city of Object.keys(C.market.cities)) {
      if (q.includes(strip(city))) f.city = city;
      for (const d of Object.keys(C.market.cities[city].districts)) {
        if (q.includes(strip(d))) { f.city = city; f.district = d; }
      }
    }

    // Fiyat: "5 milyon altı/altında", "20 bin üzeri", "3-5 milyon arası"
    const between = q.match(/(\d+(?:[.,]\d+)?)\s*(?:ile|-|–)\s*(\d+(?:[.,]\d+)?)\s*(milyon|bin)?\s*(?:arasi|arasinda)/);
    if (between) {
      const mult = between[3] === "milyon" ? 1e6 : between[3] === "bin" ? 1e3 : 1;
      f.minPrice = parseFloat(between[1].replace(",", ".")) * mult;
      f.maxPrice = parseFloat(between[2].replace(",", ".")) * mult;
    } else {
      const under = q.match(/((?:\d+(?:[.,]\d+)?)\s*(?:milyon|bin)?)\s*(?:tl?\s*)?(?:alti|altinda|asagi|kadar|max|en fazla)/);
      const over = q.match(/((?:\d+(?:[.,]\d+)?)\s*(?:milyon|bin)?)\s*(?:tl?\s*)?(?:uzeri|ustunde|yukari|en az|min)/);
      if (under) f.maxPrice = parseAmount(under[1]);
      if (over) f.minPrice = parseAmount(over[1]);
    }

    // m²: "100 m2 üzeri", "150 metrekare"
    const m2m = q.match(/(\d+)\s*(?:m2|metrekare|m²)/);
    if (m2m) f.minM2 = parseInt(m2m[1], 10);

    if (/deniz manzara/.test(q)) f.feature = "Deniz Manzarası";
    if (/havuz/.test(q)) f.feature = "Havuz";
    if (/esyali/.test(q)) f.feature = "Eşyalı";
    if (/site ici|site icinde/.test(q)) f.feature = "Site İçi";
    if (/yeni|sifir/.test(q)) f.maxAge = 5;

    return f;
  }

  function applyFilters(listings, f) {
    return listings.filter((l) => {
      if (f.category && l.category !== f.category) return false;
      if (f.kind && l.kind !== f.kind) return false;
      if (f.city && l.city !== f.city) return false;
      if (f.district && l.district !== f.district) return false;
      if (f.rooms && l.rooms !== f.rooms) return false;
      if (f.minPrice && l.price < f.minPrice) return false;
      if (f.maxPrice && l.price > f.maxPrice) return false;
      if (f.minM2 && l.m2 < f.minM2) return false;
      if (f.maxM2 && l.m2 > f.maxM2) return false;
      if (f.maxAge != null && (l.age == null || l.age > f.maxAge)) return false;
      if (f.feature && !(l.features || []).includes(f.feature)) return false;
      return true;
    });
  }

  // ── Değerleme ───────────────────────────────────────────────────────────
  function ageFactor(age) {
    for (const [max, f] of C.valuation.age) if (age <= max) return f;
    return C.valuation.age[C.valuation.age.length - 1][1];
  }

  /** p: {city, district, kind, m2, rooms, age, floorPos, features[], category} */
  function estimate(p) {
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
    return {
      mid: Math.round(mid),
      low: Math.round(mid * (1 - band)),
      high: Math.round(mid * (1 + band)),
      perM2: Math.round(perM2),
      factors,
      confidence: Math.round((1 - band) * 100),
    };
  }
  function pct(f) { const v = Math.round((f - 1) * 100); return (v >= 0 ? "+" : "") + v + "%"; }

  // ── AI fiyat etiketi ────────────────────────────────────────────────────
  function priceBadge(l) {
    const est = estimate(l);
    if (!est || !est.mid) return null;
    const ratio = l.price / est.mid;
    const band = C.valuation.fairBand;
    if (ratio <= 1 - band) return { key: "firsat", label: "AI: Fırsat Fiyatı", pct: Math.round((1 - ratio) * 100), cls: "badge-deal" };
    if (ratio >= 1 + band) return { key: "ustu", label: "AI: Piyasa Üstü", pct: Math.round((ratio - 1) * 100), cls: "badge-over" };
    return { key: "uygun", label: "AI: Piyasa Uygunu", pct: 0, cls: "badge-fair" };
  }

  // ── Açıklama üretimi (şablonlu NLG) ─────────────────────────────────────
  function describe(l) {
    const s = [];
    const catLabel = l.category === "satilik" ? "satılık" : "kiralık";
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
    const est = estimate(l);
    if (est) {
      const b = priceBadge(l);
      if (b && b.key === "firsat") s.push(`Yapay zekâ analizine göre fiyat, bölge ortalamasının yaklaşık %${b.pct} altındadır — değerlendirilmesi gereken bir fırsattır.`);
      else if (b && b.key === "uygun") s.push("Yapay zekâ analizine göre fiyat, bölge piyasasıyla uyumludur.");
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
    return all
      .filter((x) => x.id !== l.id && x.category === l.category)
      .map((x) => {
        let score = 0;
        if (x.city === l.city) score += 3;
        if (x.district === l.district) score += 3;
        if (x.kind === l.kind) score += 3;
        if (x.rooms && x.rooms === l.rooms) score += 2;
        score += 2 * (1 - Math.min(1, Math.abs(x.price - l.price) / Math.max(l.price, 1)));
        score += 1 * (1 - Math.min(1, Math.abs(x.m2 - l.m2) / Math.max(l.m2, 1)));
        const common = (x.features || []).filter((f) => (l.features || []).includes(f)).length;
        score += common * 0.5;
        return { x, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, n)
      .map((r) => r.x);
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
      return { reply: `Merhaba! Ben ${name}, EmlakAI'nin yapay zekâ asistanıyım. 🏡 Size nasıl yardımcı olabilirim? Örneğin: "Antalya'da 3 milyon altı satılık 2+1 daire" yazabilir, "değerleme" veya "kredi hesabı" isteyebilirsiniz.` };
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
    if (/iletisim|telefon|ulasabilir|whatsapp/.test(q)) {
      const co = C.company;
      return { reply: `Bize ${co.phone.display} numarasından ya da WhatsApp üzerinden ulaşabilirsiniz. E-posta: ${co.email}` };
    }

    // Varsayılan niyet: ilan arama
    const f = parseQuery(text);
    const hasCriteria = ["category", "kind", "city", "district", "rooms", "minPrice", "maxPrice", "minM2", "maxAge", "feature"]
      .some((k) => f[k] != null);
    if (!hasCriteria) {
      return { reply: `Sizi tam anlayamadım. 🤔 Şunları deneyebilirsiniz:\n• "İzmir'de kiralık 1+1 daire"\n• "Manavgat'ta 5 milyon altı villa"\n• "değerleme" veya "kredi hesabı"` };
    }
    const critParts = [];
    if (f.city) critParts.push(f.city + (f.district ? " / " + f.district : ""));
    if (f.rooms) critParts.push(f.rooms);
    if (f.kind) critParts.push(f.kind);
    if (f.maxPrice) critParts.push(fmtNum(f.maxPrice) + " ₺ altı");

    // Birebir eşleşme yoksa kriterleri sırayla esnet (oda → fiyat → tür → ilçe)
    const g = Object.assign({}, f);
    let results = applyFilters(EMLAK.data.all(), g);
    const relaxed = [];
    const relaxOrder = [["rooms", "oda sayısı"], ["maxPrice", "fiyat üst sınırı"], ["minPrice", "fiyat alt sınırı"], ["kind", "gayrimenkul türü"], ["district", "ilçe"]];
    for (const [k, label] of relaxOrder) {
      if (results.length) break;
      if (g[k] != null) { delete g[k]; relaxed.push(label); results = applyFilters(EMLAK.data.all(), g); }
    }
    results = results.slice(0, C.assistant.maxResults);
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
    ["category", "kind", "city", "district", "rooms"].forEach((k) => { if (f[k]) p.set(k, f[k]); });
    if (f.minPrice) p.set("min", f.minPrice);
    if (f.maxPrice) p.set("max", f.maxPrice);
    if (f.feature) p.set("feature", f.feature);
    return p.toString();
  }

  EMLAK.ai = { parseQuery, applyFilters, estimate, priceBadge, describe, similar, mortgage, trend, chat, filtersToQS, fmtNum };
})();
