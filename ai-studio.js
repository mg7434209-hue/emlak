/**
 * EmlakAI — AI İlan Stüdyosu, sunucu tarafı (Claude görsel + metin analizi)
 *
 * İstemci (assets/studio.js) her şeyi tarayıcıda da yapabilir; bu modül
 * YALNIZCA `ANTHROPIC_API_KEY` ortam değişkeni tanımlıysa devreye girer ve
 * fotoğrafları "gerçekten görerek" analiz eder: oda/sahne etiketi, kalite,
 * ilana uygunluk, kapak önerisi; serbest metinden alanlar; profesyonel
 * başlık + açıklama.
 *
 * GÜVEN SINIRI: modelin döndürdüğü HER değer config'e göre doğrulanır
 * (tür, il/ilçe, özellik adları, fieldDefs seçenekleri, sayı aralıkları).
 * Tanımsız değer ATILIR — modelin uydurduğu bir alan ilana giremez.
 * Fotoğraflar diske YAZILMAZ; yalnız bu istekte modele gider.
 */
"use strict";

const MODEL = process.env.STUDIO_MODEL || "claude-opus-5-5";
const KEY = process.env.ANTHROPIC_API_KEY || "";

let client = null;
function getClient() {
  if (!KEY) return null;
  if (client) return client;
  try {
    const Anthropic = require("@anthropic-ai/sdk");
    const Ctor = Anthropic.default || Anthropic;
    client = new Ctor({ apiKey: KEY, timeout: 120 * 1000, maxRetries: 1 });
  } catch (e) {
    console.error("AI stüdyo: @anthropic-ai/sdk yüklenemedi —", e.message);
    client = null;
  }
  return client;
}
const available = () => !!getClient();

function conf() { return global.EMLAK.config; }
function kinds() { return (global.EMLAK.data && global.EMLAK.data.kinds) || []; }
function fieldsOfKind(kind) {
  for (const sg of conf().segments || []) for (const g of sg.groups || []) {
    if ((g.kinds || []).some((k) => k.kind === kind)) return g.fields || [];
  }
  return [];
}

// ── Yapılandırılmış çıktı şeması: bilinmeyen alan "" / 0 / -1 döner ───────
const S = { type: "string" };
const N = { type: "number" };
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "category", "city", "district", "locality", "price", "m2", "m2Net", "rooms", "age",
    "brand", "model", "year", "km", "fuel", "gear", "details", "features", "title", "description",
    "photos", "coverIndex", "warnings"],
  properties: {
    kind: S, category: S, city: S, district: S, locality: S,
    price: N, m2: N, m2Net: N, rooms: S, age: N,
    brand: S, model: S, year: N, km: N, fuel: S, gear: S,
    details: {
      type: "array",
      items: { type: "object", additionalProperties: false, required: ["key", "value"],
        properties: { key: S, value: S } },
    },
    features: { type: "array", items: S },
    title: S,
    description: S,
    photos: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        required: ["index", "label", "caption", "quality", "include", "issues"],
        properties: {
          index: { type: "integer" }, label: S, caption: S,
          quality: { type: "integer" }, include: { type: "boolean" },
          issues: { type: "array", items: S },
        },
      },
    },
    coverIndex: { type: "integer" },
    warnings: { type: "array", items: S },
  },
};

function systemPrompt() {
  const C = conf();
  const kindList = kinds().map((k) => `${k.kind} (${k.label}, ${k.segment})`).join(", ");
  const fd = C.fieldDefs || {};
  const fieldList = Object.keys(fd).map((k) => {
    const d = fd[k];
    return `${k}: ${d.label}` + (d.type === "select" ? ` [${d.options.join(" | ")}]` : d.type === "bool" ? " [true]" : ` (${d.type})`);
  }).join("\n");
  return `Sen Türkiye'de çalışan deneyimli bir emlak ve vasıta ilan editörüsün. Satıcı sana karışık, düzensiz bilgi (WhatsApp mesajı, not, eski ilan metni) ve sıralanmamış fotoğraflar verir. Görevin bunları yayına hazır, profesyonel bir ilana dönüştürmek.

KESİN KURALLAR
- Yalnızca metinde YAZAN ya da fotoğrafta AÇIKÇA GÖRÜNEN bilgiyi kullan. Tahmin, abartı, uydurma yok. Emin olmadığın alanı boş bırak ("" / 0 / -1).
- Fotoğrafta görünen ama metinde olmayan bir özelliği (ör. havuz, deniz manzarası) features'a ancak fotoğrafta tartışmasız görünüyorsa ekle ve warnings'e "fotoğraftan çıkarıldı: X — doğrulayın" yaz.
- Telefon numarası, e-posta, bağlantı ve fiyat pazarlığı dışı reklam cümlelerini açıklamaya yazma; "ACİL", "kaçırmayın", ünlem yağmuru, büyük harf kullanma.
- Açıklama Türkçe, sade, güven veren ve kurumsal bir dille yazılır. Biçim: 1-2 cümlelik giriş paragrafı, ardından boş satır, "ÖNE ÇIKANLAR" başlığı ve "• " ile başlayan maddeler, gerekirse "KONUM VE ÇEVRE" başlığı altında metinde geçen yakınlık bilgileri, sonda tek cümlelik iletişim çağrısı. 120-260 sözcük. Yatırım vaadi ya da piyasa iddiası yazma.
- Başlık en fazla 70 karakter: konum + oda/m² (ya da yıl marka model) + ayırt edici özellik + Satılık/Kiralık + tür. Büyük harf ve emoji kullanma.

ALAN DEĞERLERİ
- kind şu kimliklerden biri olmalı: ${kindList}
- category: "satilik" ya da "kiralik".
- city / district: Türkçe resmî adlarıyla (ör. "Antalya", "Manavgat"). locality: mahalle/semt ("Sarılar Mahallesi").
- price: TL tutarı (aylık kira ya da satış bedeli). m2: brüt alan; m2Net: net alan. Arsada dönüm × 1000 = m².
- rooms: "3+1" biçiminde. age: bina yaşı (sıfır bina = 0, bilinmiyorsa -1).
- Araçta brand/model/year/km/fuel (${C.vehicles.fuels.join(", ")}) / gear (${C.vehicles.gears.join(", ")}).
- features yalnızca şu adlardan: ${Object.keys(C.valuation.features).join(", ")}.
- details: {key, value} çiftleri; key ve seçenekler YALNIZCA şu tanımlardan (seçenekli alanda değeri listedeki yazımla AYNEN ver; bool alanda "true"):
${fieldList}

FOTOĞRAFLAR (index 0'dan başlar, sana verilen sırayla)
- label: kısa sahne adı — emlakta "Dış cephe", "Manzara", "Salon", "Mutfak", "Yatak odası", "Banyo", "Balkon / teras", "Bahçe", "Havuz", "Koridor / giriş", "Arsa", "Kat planı", "Belge"; araçta "Ön görünüm", "Yan görünüm", "Arka görünüm", "İç mekân", "Gösterge", "Motor", "Bagaj".
- caption: tek cümlelik, olgusal alt yazı (ör. "Geniş ve aydınlık salon, balkon çıkışlı").
- quality: 0-10 (ışık, netlik, kadraj, dağınıklık).
- include: belge, ekran görüntüsü, kimlik/tapu fotoğrafı, alakasız ya da çok kötü kare ise false. Tapu/kimlik görürsen warnings'e "kişisel veri içeren belge yayına alınmadı" yaz.
- issues: kısa Türkçe sorunlar ("karanlık", "eğik", "dağınık oda", "parmak gölgesi").
- coverIndex: kapak için en iyi kare (emlakta genelde dış cephe/manzara ya da en etkileyici salon).
- warnings: satıcının düzeltmesi gereken çelişki ya da eksikler (ör. "metinde 3+1, fotoğraflarda 2 yatak odası görünüyor").`;
}

// ── Modelin çıktısını config'e göre doğrula ───────────────────────────────
function validate(o, nPhotos) {
  const C = conf();
  const out = { details: {}, features: [], photos: [], warnings: [] };
  const K = kinds().find((k) => k.kind === o.kind);
  if (K) { out.kind = K.kind; out.segment = K.segment; }
  if (o.category === "satilik" || o.category === "kiralik") out.category = o.category;
  const city = C.market.cities[o.city];
  if (city) {
    out.city = o.city;
    if (o.district && city.districts[o.district] != null) out.district = o.district;
  }
  const s = (v, n) => (typeof v === "string" ? v.trim().slice(0, n) : "");
  if (s(o.locality, 120)) out.locality = s(o.locality, 120);
  const num = (v, max) => (Number.isFinite(v) && v > 0 && v <= max ? Math.round(v) : 0);
  if (num(o.price, 5e9)) out.price = num(o.price, 5e9);
  if (num(o.m2, 1e7)) out.m2 = num(o.m2, 1e7);
  if (num(o.m2Net, 1e7)) out.m2Net = num(o.m2Net, 1e7);
  if (Number.isFinite(o.age) && o.age >= 0 && o.age <= 150) out.age = Math.round(o.age);
  if (/^\d{1,2}\+\d$/.test(o.rooms || "")) out.rooms = o.rooms;
  if (o.brand && C.vehicles.brands[o.brand]) {
    out.brand = o.brand;
    if (o.model && C.vehicles.brands[o.brand][o.model] != null) out.model = o.model;
  }
  const yr = num(o.year, new Date().getFullYear() + 1);
  if (yr >= 1950) out.year = yr;
  if (Number.isFinite(o.km) && o.km >= 0 && o.km < 5e6) out.km = Math.round(o.km);
  if (C.vehicles.fuels.indexOf(o.fuel) >= 0) out.fuel = o.fuel;
  if (C.vehicles.gears.indexOf(o.gear) >= 0) out.gear = o.gear;
  const allowed = out.kind ? fieldsOfKind(out.kind) : Object.keys(C.fieldDefs);
  (Array.isArray(o.details) ? o.details : []).forEach((d) => {
    const key = d && d.key, val = s(d && d.value, 80);
    const def = C.fieldDefs[key];
    if (!def || allowed.indexOf(key) < 0 || !val) return;
    if (def.type === "bool") { if (val === "true") out.details[key] = true; return; }
    if (def.type === "number") { const n = Number(val.replace(",", ".")); if (Number.isFinite(n) && n >= 0 && n <= (def.max || 1e9)) out.details[key] = n; return; }
    if (def.type === "select") { if (def.options.indexOf(val) >= 0) out.details[key] = val; return; }
    out.details[key] = val.slice(0, def.max || 60);
  });
  (Array.isArray(o.features) ? o.features : []).forEach((f) => {
    if (C.valuation.features[f] != null && out.features.indexOf(f) < 0) out.features.push(f);
  });
  out.title = s(o.title, 120).replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").trim();
  out.description = s(o.description, 4000)
    .replace(/(?:\+?90[\s.-]*)?\(?0?\s*5\d{2}\)?[\s.-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/g, "")  // telefon sızmasın
    .replace(/\bhttps?:\/\/\S+/g, "");
  const seen = new Set();
  (Array.isArray(o.photos) ? o.photos : []).forEach((p) => {
    if (!p || !Number.isInteger(p.index) || p.index < 0 || p.index >= nPhotos || seen.has(p.index)) return;
    seen.add(p.index);
    out.photos.push({
      index: p.index, label: s(p.label, 40), caption: s(p.caption, 160),
      quality: Math.max(0, Math.min(10, Number.isInteger(p.quality) ? p.quality : 5)),
      include: p.include !== false,
      issues: (Array.isArray(p.issues) ? p.issues : []).map((x) => s(x, 60)).filter(Boolean).slice(0, 4),
    });
  });
  if (Number.isInteger(o.coverIndex) && o.coverIndex >= 0 && o.coverIndex < nPhotos) out.coverIndex = o.coverIndex;
  out.warnings = (Array.isArray(o.warnings) ? o.warnings : []).map((x) => s(x, 200)).filter(Boolean).slice(0, 8);
  return out;
}

const IMG_RE = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/;

// body: {text, images:[dataURL], hints:{segment,kind,...}}
async function analyze(body) {
  const c = getClient();
  if (!c) return { error: "AI görsel analizi bu sunucuda kapalı.", code: 501 };
  const C = conf();
  const SC = C.studio || {};
  const text = typeof body.text === "string" ? body.text.slice(0, SC.maxTextChars || 6000) : "";
  const imgs = (Array.isArray(body.images) ? body.images : []).slice(0, SC.aiMaxImages || 12)
    .map((u) => (typeof u === "string" ? u.match(IMG_RE) : null)).filter(Boolean);
  if (!text.trim() && !imgs.length) return { error: "Analiz için metin ya da fotoğraf gönderin.", code: 400 };
  const hints = body.hints && typeof body.hints === "object" ? body.hints : {};

  const content = [];
  imgs.forEach((m, i) => {
    content.push({ type: "text", text: `Fotoğraf index ${i}:` });
    content.push({ type: "image", source: { type: "base64", media_type: "image/" + m[1], data: m[2] } });
  });
  content.push({
    type: "text",
    text: `SATICININ METNİ:\n"""\n${text || "(metin verilmedi)"}\n"""\n\n` +
      `Tarayıcıdaki kural tabanlı ön analiz (yanlış olabilir, metne ve fotoğraflara göre düzelt):\n${JSON.stringify(hints).slice(0, 2000)}\n\n` +
      `${imgs.length} fotoğraf var. İlanı şemaya göre hazırla.`,
  });

  let resp;
  try {
    resp = await c.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: systemPrompt(),
      output_config: { effort: SC.aiEffort || "medium", format: { type: "json_schema", schema: SCHEMA } },
      messages: [{ role: "user", content }],
    });
  } catch (e) {
    const status = e && e.status;
    console.error("AI stüdyo hatası:", status || "", e && e.message);
    if (status === 429) return { error: "AI servisi şu an yoğun; birazdan tekrar deneyin.", code: 503 };
    return { error: "AI analizi şu an yapılamadı; tarayıcı analizi kullanıldı.", code: 502 };
  }
  if (resp.stop_reason === "refusal") return { error: "AI bu içeriği analiz etmedi.", code: 422 };
  const tb = (resp.content || []).find((b) => b.type === "text");
  let parsed;
  try { parsed = JSON.parse(tb ? tb.text : ""); }
  catch (e) { return { error: "AI yanıtı okunamadı.", code: 502 }; }
  return { ok: true, model: resp.model, result: validate(parsed, imgs.length) };
}

module.exports = { available, analyze, validate };
