/**
 * EmlakAI — TEK DOĞRU KAYNAK
 * Marka, iletişim, şehir/ilçe piyasa verileri ve yapay zekâ katsayıları
 * YALNIZCA burada tutulur. Sayfalara/JS'e elle gömülmez.
 */
window.EMLAK = window.EMLAK || {};
EMLAK.config = {
  brand: {
    name: "EmlakAI",
    tagline: "Yapay zekâ destekli taşınmaz ve araç ilan platformu",
    domain: "emlakai.example",
  },

  // ── Segmentler: taşınmaz (emlak) + araç (vasita) ────────────────────────
  segments: {
    emlak: { label: "Taşınmaz" },
    vasita: { label: "Araç" },
  },
  company: {
    title: "EmlakAI Teknoloji Ltd. Şti.",
    phone: { display: "0543 743 42 09", intl: "+905437434209", wa: "905437434209" },
    email: "gesmarketim@gmail.com",
    address: "Örnek Mah. 1551 Sok. No:10/1, Manavgat / Antalya",
  },

  // ── SEO / AEO — canonical, sitemap, JSON-LD ve llms.txt buradan üretilir ─
  // Özel alan adı alınınca yalnızca siteUrl'i güncelle ve `npm run build` çalıştır.
  seo: {
    siteUrl: "https://emlak-production.up.railway.app",
    ogImage: "/assets/img/og.png",
    locale: "tr_TR",
    sameAs: [],
    dataDate: "2026-07",
  },

  // ── İlan öne çıkarma ────────────────────────────────────────────────────
  featured: { label: "⭐ Öne Çıkan" },

  // ── Piyasa verisi: il → ilçe → ortalama satılık ₺/m² (konut) ─────────────
  // Kira ₺/m²/ay = satılık m² fiyatı × rentYieldMonthly
  // ── KATEGORİ AĞACI (TEK KAYNAK) ────────────────────────────────────────
  // Üç segment: emlak · vasita · diger. data.js KINDS'ı buradan üretir;
  // form, filtre, SEO slug'ı ve AI hep aynı listeyi görür.
  // `valuation:false` olan türde AI değerleme YAPILMAZ (piyasa verisi yok);
  // `fields` formda hangi alanların isteneceğini söyler.
  segments: [
    {
      segment: "emlak", label: "Emlak", short: "Taşınmaz", fields: "emlak",
      groups: [
        { label: "Konut", kinds: [
          { kind: "daire", label: "Daire" },
          { kind: "residence", label: "Rezidans" },
          { kind: "villa", label: "Villa" },
          { kind: "mustakil", label: "Müstakil Ev" },
          { kind: "yazlik", label: "Yazlık" },
        ] },
        { label: "İş Yeri", kinds: [
          { kind: "dukkan", label: "Dükkan" },
          { kind: "ofis", label: "Ofis" },
          { kind: "depo", label: "Depo & Antrepo" },
          { kind: "fabrika", label: "Fabrika & Atölye" },
        ] },
        { label: "Arsa & Arazi", kinds: [
          { kind: "arsa", label: "Arsa" },
          { kind: "tarla", label: "Tarla" },
          { kind: "bagbahce", label: "Bağ & Bahçe" },
        ] },
        { label: "Diğer Gayrimenkul", kinds: [
          { kind: "bina", label: "Komple Bina" },
          { kind: "devremulk", label: "Devre Mülk" },
          { kind: "turistik", label: "Turistik Tesis" },
        ] },
      ],
    },
    {
      segment: "vasita", label: "Vasıta", short: "Araç", fields: "vasita",
      groups: [
        { label: "Otomobil & Arazi", kinds: [
          { kind: "otomobil", label: "Otomobil" },
          { kind: "suv", label: "Arazi, SUV & Pickup" },
          { kind: "elektrikli", label: "Elektrikli Araç" },
          { kind: "klasik", label: "Klasik Araç" },
        ] },
        { label: "Motosiklet", kinds: [
          { kind: "motosiklet", label: "Motosiklet" },
          { kind: "atv", label: "ATV & UTV" },
        ] },
        { label: "Ticari Araçlar", kinds: [
          { kind: "minivan", label: "Minivan & Panelvan" },
          { kind: "ticari", label: "Ticari Araç" },
          { kind: "kamyon", label: "Kamyon & Kamyonet" },
          { kind: "otobus", label: "Otobüs & Midibüs" },
        ] },
        { label: "Diğer Araçlar", kinds: [
          { kind: "karavan", label: "Karavan" },
          { kind: "deniz", label: "Deniz Aracı" },
          { kind: "hasarli", label: "Hasarlı Araç" },
        ] },
      ],
    },
    {
      // Emlak ve vasıta dışındaki her şey: AI değerleme uygulanmaz, form
      // sade tutulur (başlık, açıklama, fiyat, konum, fotoğraf).
      segment: "diger", label: "Diğer", short: "Diğer", fields: "sade",
      groups: [
        { label: "Alışveriş", kinds: [
          { kind: "ikinciel", label: "İkinci El & Sıfır Alışveriş", valuation: false },
          { kind: "yedekparca", label: "Yedek Parça & Aksesuar", valuation: false },
          { kind: "antika", label: "Antika & Koleksiyon", valuation: false },
        ] },
        { label: "Hizmet & İş", kinds: [
          { kind: "hizmet", label: "Ustalar & Hizmetler", valuation: false },
          { kind: "ozelders", label: "Özel Ders", valuation: false },
          { kind: "isilani", label: "İş İlanı", valuation: false },
        ] },
        { label: "Sanayi & Tarım", kinds: [
          { kind: "ismakinesi", label: "İş Makineleri & Sanayi", valuation: false },
          { kind: "tarim", label: "Tarım & Hayvancılık Ekipmanı", valuation: false },
        ] },
        { label: "Hayvanlar", kinds: [
          { kind: "hayvan", label: "Hayvanlar Alemi", valuation: false },
        ] },
      ],
    },
  ],

  market: {
    rentYieldMonthly: 0.0042,
    // 81 İL · 474 ilçe · tahmini satılık konut ₺/m² (dönem: config.seo.dataDate).
    // Bölgesel piyasa ORTALAMASIDIR; kesin değer değildir. Güncelleme tek yerden:
    // burayı düzenle + `npm run build` (bolge-fiyatlari.html, llms dosyaları ve
    // değerleme motoru aynı kaynaktan beslenir).
    cities: {
      "Adana": {
        yieldTrend: 1.5,
        districts: {
          "Seyhan": 24000, "Çukurova": 36000, "Yüreğir": 18000,
          "Sarıçam": 22000, "Ceyhan": 15000, "Kozan": 13000,
        },
      },
      "Adıyaman": {
        yieldTrend: 1.2,
        districts: {
          "Merkez": 15000, "Kâhta": 11000, "Besni": 10000,
          "Gölbaşı": 11000,
        },
      },
      "Afyonkarahisar": {
        yieldTrend: 1.3,
        districts: {
          "Merkez": 17000, "Sandıklı": 11000, "Bolvadin": 10000,
          "Dinar": 10000, "Sinanpaşa": 9000,
        },
      },
      "Ağrı": {
        yieldTrend: 1.0,
        districts: {
          "Merkez": 11000, "Doğubayazıt": 10000, "Patnos": 9000,
          "Diyadin": 8000,
        },
      },
      "Aksaray": {
        yieldTrend: 1.2,
        districts: {
          "Merkez": 16000, "Ortaköy": 9000, "Eskil": 8500,
          "Gülağaç": 8000,
        },
      },
      "Amasya": {
        yieldTrend: 1.2,
        districts: {
          "Merkez": 17000, "Merzifon": 14000, "Suluova": 11000,
          "Taşova": 9000,
        },
      },
      "Ankara": {
        yieldTrend: 1.4,
        districts: {
          "Çankaya": 45000, "Keçiören": 26000, "Yenimahalle": 32000,
          "Etimesgut": 28000, "Mamak": 22000, "Gölbaşı": 30000,
          "Pursaklar": 22000, "Sincan": 21000, "Altındağ": 19000,
          "Polatlı": 16000, "Kahramankazan": 20000, "Beypazarı": 13000,
        },
      },
      "Antalya": {
        yieldTrend: 2.2,
        districts: {
          "Muratpaşa": 52000, "Konyaaltı": 68000, "Lara": 62000,
          "Manavgat": 40000, "Alanya": 47000, "Kepez": 30000,
          "Side": 55000, "Serik": 33000, "Kaş": 58000,
          "Kemer": 60000, "Belek": 52000, "Döşemealtı": 32000,
          "Gazipaşa": 28000, "Finike": 26000,
        },
      },
      "Ardahan": {
        yieldTrend: 1.0,
        districts: {
          "Merkez": 10000, "Göle": 8000, "Çıldır": 7500,
          "Posof": 7500,
        },
      },
      "Artvin": {
        yieldTrend: 1.3,
        districts: {
          "Merkez": 16000, "Hopa": 15000, "Arhavi": 16000,
          "Borçka": 12000, "Yusufeli": 11000,
        },
      },
      "Aydın": {
        yieldTrend: 1.8,
        districts: {
          "Efeler": 28000, "Kuşadası": 55000, "Didim": 42000,
          "Nazilli": 20000, "Söke": 24000, "Çine": 14000,
          "İncirliova": 17000,
        },
      },
      "Balıkesir": {
        yieldTrend: 1.7,
        districts: {
          "Altıeylül": 25000, "Karesi": 24000, "Edremit": 38000,
          "Ayvalık": 48000, "Burhaniye": 34000, "Bandırma": 28000,
          "Erdek": 40000, "Gönen": 18000,
        },
      },
      "Bartın": {
        yieldTrend: 1.3,
        districts: {
          "Merkez": 18000, "Amasra": 34000, "Ulus": 10000,
          "Kurucaşile": 13000,
        },
      },
      "Batman": {
        yieldTrend: 1.1,
        districts: {
          "Merkez": 15000, "Kozluk": 9000, "Sason": 8000,
          "Beşiri": 9000,
        },
      },
      "Bayburt": {
        yieldTrend: 1.0,
        districts: {
          "Merkez": 12000, "Demirözü": 8000, "Aydıntepe": 8000,
        },
      },
      "Bilecik": {
        yieldTrend: 1.2,
        districts: {
          "Merkez": 16000, "Bozüyük": 15000, "Söğüt": 11000,
          "Osmaneli": 13000,
        },
      },
      "Bingöl": {
        yieldTrend: 1.0,
        districts: {
          "Merkez": 12000, "Genç": 9000, "Solhan": 8500,
          "Karlıova": 8000,
        },
      },
      "Bitlis": {
        yieldTrend: 1.0,
        districts: {
          "Merkez": 11000, "Tatvan": 12000, "Ahlat": 10000,
          "Güroymak": 8500,
        },
      },
      "Bolu": {
        yieldTrend: 1.5,
        districts: {
          "Merkez": 24000, "Gerede": 14000, "Mudurnu": 15000,
          "Göynük": 13000, "Mengen": 11000,
        },
      },
      "Burdur": {
        yieldTrend: 1.2,
        districts: {
          "Merkez": 17000, "Bucak": 13000, "Gölhisar": 11000,
          "Yeşilova": 9000,
        },
      },
      "Bursa": {
        yieldTrend: 1.3,
        districts: {
          "Nilüfer": 38000, "Osmangazi": 28000, "Mudanya": 44000,
          "Yıldırım": 22000, "Gemlik": 26000, "İnegöl": 20000,
          "Gürsu": 24000, "Kestel": 23000, "Orhangazi": 19000,
          "İznik": 21000,
        },
      },
      "Çanakkale": {
        yieldTrend: 1.6,
        districts: {
          "Merkez": 32000, "Ayvacık": 30000, "Bozcaada": 75000,
          "Gökçeada": 45000, "Biga": 18000, "Çan": 15000,
          "Ezine": 17000,
        },
      },
      "Çankırı": {
        yieldTrend: 1.0,
        districts: {
          "Merkez": 13000, "Çerkeş": 8500, "Ilgaz": 10000,
          "Orta": 8000,
        },
      },
      "Çorum": {
        yieldTrend: 1.2,
        districts: {
          "Merkez": 17000, "Sungurlu": 11000, "Osmancık": 11000,
          "İskilip": 10000, "Alaca": 9000,
        },
      },
      "Denizli": {
        yieldTrend: 1.5,
        districts: {
          "Merkezefendi": 26000, "Pamukkale": 28000, "Çivril": 12000,
          "Acıpayam": 11000, "Tavas": 10000, "Sarayköy": 13000,
        },
      },
      "Diyarbakır": {
        yieldTrend: 1.2,
        districts: {
          "Kayapınar": 22000, "Bağlar": 14000, "Yenişehir": 20000,
          "Sur": 12000, "Ergani": 11000, "Bismil": 10000,
        },
      },
      "Düzce": {
        yieldTrend: 1.5,
        districts: {
          "Merkez": 24000, "Akçakoca": 30000, "Kaynaşlı": 16000,
          "Gölyaka": 17000,
        },
      },
      "Edirne": {
        yieldTrend: 1.3,
        districts: {
          "Merkez": 22000, "Keşan": 18000, "Uzunköprü": 14000,
          "İpsala": 11000, "Enez": 20000,
        },
      },
      "Elazığ": {
        yieldTrend: 1.2,
        districts: {
          "Merkez": 18000, "Kovancılar": 10000, "Karakoçan": 9000,
          "Palu": 8500,
        },
      },
      "Erzincan": {
        yieldTrend: 1.1,
        districts: {
          "Merkez": 16000, "Tercan": 9000, "Üzümlü": 11000,
          "Refahiye": 8500,
        },
      },
      "Erzurum": {
        yieldTrend: 1.2,
        districts: {
          "Yakutiye": 19000, "Palandöken": 22000, "Aziziye": 15000,
          "Horasan": 9000, "Oltu": 9500,
        },
      },
      "Eskişehir": {
        yieldTrend: 1.5,
        districts: {
          "Tepebaşı": 30000, "Odunpazarı": 28000, "Sivrihisar": 11000,
          "Çifteler": 10000, "Seyitgazi": 9000,
        },
      },
      "Gaziantep": {
        yieldTrend: 1.5,
        districts: {
          "Şahinbey": 24000, "Şehitkamil": 30000, "Oğuzeli": 14000,
          "Nizip": 13000, "İslahiye": 11000,
        },
      },
      "Giresun": {
        yieldTrend: 1.4,
        districts: {
          "Merkez": 22000, "Bulancak": 20000, "Espiye": 16000,
          "Tirebolu": 17000, "Görele": 16000,
        },
      },
      "Gümüşhane": {
        yieldTrend: 1.0,
        districts: {
          "Merkez": 13000, "Kelkit": 9000, "Şiran": 8500,
          "Torul": 10000,
        },
      },
      "Hakkâri": {
        yieldTrend: 1.0,
        districts: {
          "Merkez": 11000, "Yüksekova": 10000, "Şemdinli": 8000,
          "Çukurca": 7500,
        },
      },
      "Hatay": {
        yieldTrend: 1.4,
        districts: {
          "Antakya": 20000, "İskenderun": 26000, "Defne": 18000,
          "Dörtyol": 19000, "Samandağ": 18000, "Arsuz": 26000,
          "Kırıkhan": 14000,
        },
      },
      "Iğdır": {
        yieldTrend: 1.0,
        districts: {
          "Merkez": 11000, "Tuzluca": 8000, "Aralık": 8500,
          "Karakoyunlu": 8000,
        },
      },
      "Isparta": {
        yieldTrend: 1.3,
        districts: {
          "Merkez": 20000, "Eğirdir": 22000, "Yalvaç": 11000,
          "Şarkikaraağaç": 9500, "Gelendost": 9000,
        },
      },
      "İstanbul": {
        yieldTrend: 1.9,
        districts: {
          "Kadıköy": 95000, "Beşiktaş": 125000, "Üsküdar": 78000,
          "Maltepe": 56000, "Kartal": 48000, "Esenyurt": 27000,
          "Bakırköy": 98000, "Sarıyer": 110000, "Şişli": 88000,
          "Beyoğlu": 72000, "Ataşehir": 72000, "Pendik": 42000,
          "Tuzla": 40000, "Beylikdüzü": 38000, "Büyükçekmece": 42000,
          "Bahçelievler": 52000, "Bağcılar": 38000, "Küçükçekmece": 40000,
          "Zeytinburnu": 58000, "Fatih": 55000, "Eyüpsultan": 46000,
          "Sancaktepe": 34000, "Ümraniye": 52000, "Çekmeköy": 44000,
          "Beykoz": 65000, "Başakşehir": 45000, "Avcılar": 36000,
          "Sultanbeyli": 28000, "Esenler": 30000, "Gaziosmanpaşa": 32000,
          "Arnavutköy": 26000, "Silivri": 28000, "Şile": 38000,
          "Adalar": 90000,
        },
      },
      "İzmir": {
        yieldTrend: 1.7,
        districts: {
          "Karşıyaka": 52000, "Bornova": 42000, "Konak": 46000,
          "Çeşme": 95000, "Urla": 78000, "Buca": 33000,
          "Bayraklı": 40000, "Gaziemir": 42000, "Balçova": 48000,
          "Narlıdere": 50000, "Güzelbahçe": 58000, "Karabağlar": 32000,
          "Menemen": 26000, "Torbalı": 25000, "Seferihisar": 52000,
          "Foça": 56000, "Dikili": 38000, "Ödemiş": 16000,
          "Bergama": 16000,
        },
      },
      "Kahramanmaraş": {
        yieldTrend: 1.3,
        districts: {
          "Onikişubat": 20000, "Dulkadiroğlu": 16000, "Elbistan": 12000,
          "Afşin": 10000, "Pazarcık": 9000,
        },
      },
      "Karabük": {
        yieldTrend: 1.2,
        districts: {
          "Merkez": 17000, "Safranbolu": 24000, "Yenice": 10000,
          "Eskipazar": 9000,
        },
      },
      "Karaman": {
        yieldTrend: 1.2,
        districts: {
          "Merkez": 16000, "Ermenek": 9000, "Ayrancı": 8000,
          "Sarıveliler": 8000,
        },
      },
      "Kars": {
        yieldTrend: 1.0,
        districts: {
          "Merkez": 12000, "Sarıkamış": 13000, "Kağızman": 8500,
          "Selim": 8000,
        },
      },
      "Kastamonu": {
        yieldTrend: 1.2,
        districts: {
          "Merkez": 17000, "Tosya": 10000, "Taşköprü": 10000,
          "İnebolu": 16000, "Cide": 15000,
        },
      },
      "Kayseri": {
        yieldTrend: 1.4,
        districts: {
          "Melikgazi": 26000, "Kocasinan": 22000, "Talas": 28000,
          "İncesu": 14000, "Develi": 11000, "Hacılar": 16000,
        },
      },
      "Kırıkkale": {
        yieldTrend: 1.1,
        districts: {
          "Merkez": 15000, "Yahşihan": 12000, "Keskin": 9000,
          "Delice": 8000,
        },
      },
      "Kırklareli": {
        yieldTrend: 1.3,
        districts: {
          "Merkez": 19000, "Lüleburgaz": 18000, "Babaeski": 13000,
          "Vize": 13000, "Demirköy": 14000,
        },
      },
      "Kırşehir": {
        yieldTrend: 1.1,
        districts: {
          "Merkez": 15000, "Kaman": 10000, "Mucur": 9500,
          "Çiçekdağı": 8000,
        },
      },
      "Kilis": {
        yieldTrend: 1.1,
        districts: {
          "Merkez": 13000, "Musabeyli": 8000, "Elbeyli": 8000,
          "Polateli": 8000,
        },
      },
      "Kocaeli": {
        yieldTrend: 1.6,
        districts: {
          "İzmit": 32000, "Gebze": 34000, "Darıca": 33000,
          "Çayırova": 30000, "Körfez": 26000, "Gölcük": 28000,
          "Başiskele": 29000, "Kartepe": 27000, "Kandıra": 18000,
        },
      },
      "Konya": {
        yieldTrend: 1.4,
        districts: {
          "Selçuklu": 26000, "Meram": 22000, "Karatay": 20000,
          "Ereğli": 13000, "Akşehir": 12000, "Beyşehir": 13000,
          "Seydişehir": 11000,
        },
      },
      "Kütahya": {
        yieldTrend: 1.2,
        districts: {
          "Merkez": 17000, "Tavşanlı": 11000, "Simav": 11000,
          "Gediz": 9500, "Emet": 9000,
        },
      },
      "Malatya": {
        yieldTrend: 1.2,
        districts: {
          "Battalgazi": 16000, "Yeşilyurt": 21000, "Doğanşehir": 9000,
          "Akçadağ": 8500, "Darende": 9000,
        },
      },
      "Manisa": {
        yieldTrend: 1.4,
        districts: {
          "Yunusemre": 22000, "Şehzadeler": 20000, "Turgutlu": 18000,
          "Akhisar": 16000, "Salihli": 15000, "Alaşehir": 12000,
          "Soma": 11000,
        },
      },
      "Mardin": {
        yieldTrend: 1.2,
        districts: {
          "Artuklu": 18000, "Kızıltepe": 12000, "Midyat": 13000,
          "Nusaybin": 10000, "Derik": 9000,
        },
      },
      "Mersin": {
        yieldTrend: 1.7,
        districts: {
          "Yenişehir": 32000, "Mezitli": 34000, "Toroslar": 22000,
          "Akdeniz": 20000, "Erdemli": 26000, "Silifke": 22000,
          "Tarsus": 19000, "Anamur": 22000,
        },
      },
      "Muğla": {
        yieldTrend: 2.1,
        districts: {
          "Bodrum": 85000, "Marmaris": 62000, "Fethiye": 58000,
          "Menteşe": 36000, "Datça": 70000, "Milas": 30000,
          "Ortaca": 34000, "Dalaman": 32000, "Köyceğiz": 30000,
          "Seydikemer": 26000,
        },
      },
      "Muş": {
        yieldTrend: 1.0,
        districts: {
          "Merkez": 11000, "Bulanık": 8500, "Malazgirt": 8000,
          "Varto": 8000,
        },
      },
      "Nevşehir": {
        yieldTrend: 1.4,
        districts: {
          "Merkez": 18000, "Ürgüp": 30000, "Avanos": 24000,
          "Göreme": 38000, "Gülşehir": 11000,
        },
      },
      "Niğde": {
        yieldTrend: 1.1,
        districts: {
          "Merkez": 15000, "Bor": 10000, "Çamardı": 9000,
          "Ulukışla": 8000,
        },
      },
      "Ordu": {
        yieldTrend: 1.4,
        districts: {
          "Altınordu": 26000, "Ünye": 24000, "Fatsa": 22000,
          "Perşembe": 20000, "Gölköy": 11000,
        },
      },
      "Osmaniye": {
        yieldTrend: 1.2,
        districts: {
          "Merkez": 16000, "Kadirli": 11000, "Düziçi": 10000,
          "Bahçe": 9000,
        },
      },
      "Rize": {
        yieldTrend: 1.5,
        districts: {
          "Merkez": 28000, "Çayeli": 22000, "Ardeşen": 22000,
          "Pazar": 21000, "Fındıklı": 21000, "Çamlıhemşin": 24000,
        },
      },
      "Sakarya": {
        yieldTrend: 1.5,
        districts: {
          "Serdivan": 30000, "Adapazarı": 26000, "Erenler": 24000,
          "Sapanca": 40000, "Karasu": 28000, "Hendek": 20000,
          "Akyazı": 18000,
        },
      },
      "Samsun": {
        yieldTrend: 1.4,
        districts: {
          "Atakum": 32000, "İlkadım": 24000, "Canik": 20000,
          "Bafra": 15000, "Çarşamba": 15000, "Terme": 13000,
        },
      },
      "Siirt": {
        yieldTrend: 1.0,
        districts: {
          "Merkez": 12000, "Kurtalan": 9000, "Pervari": 8000,
          "Baykan": 8000,
        },
      },
      "Sinop": {
        yieldTrend: 1.3,
        districts: {
          "Merkez": 24000, "Gerze": 16000, "Ayancık": 13000,
          "Boyabat": 11000, "Türkeli": 13000,
        },
      },
      "Sivas": {
        yieldTrend: 1.1,
        districts: {
          "Merkez": 17000, "Şarkışla": 9000, "Suşehri": 9500,
          "Zara": 8500, "Gemerek": 8500,
        },
      },
      "Şanlıurfa": {
        yieldTrend: 1.2,
        districts: {
          "Haliliye": 20000, "Karaköprü": 22000, "Eyyübiye": 13000,
          "Siverek": 11000, "Viranşehir": 10000, "Birecik": 11000,
        },
      },
      "Şırnak": {
        yieldTrend: 1.0,
        districts: {
          "Merkez": 11000, "Cizre": 10000, "Silopi": 9500,
          "İdil": 8000,
        },
      },
      "Tekirdağ": {
        yieldTrend: 1.6,
        districts: {
          "Süleymanpaşa": 30000, "Çorlu": 26000, "Çerkezköy": 24000,
          "Kapaklı": 22000, "Marmaraereğlisi": 26000, "Malkara": 14000,
          "Şarköy": 30000,
        },
      },
      "Tokat": {
        yieldTrend: 1.1,
        districts: {
          "Merkez": 16000, "Turhal": 11000, "Erbaa": 12000,
          "Niksar": 11000, "Zile": 10000,
        },
      },
      "Trabzon": {
        yieldTrend: 1.6,
        districts: {
          "Ortahisar": 32000, "Yomra": 30000, "Akçaabat": 30000,
          "Araklı": 22000, "Of": 22000, "Vakfıkebir": 20000,
          "Sürmene": 21000,
        },
      },
      "Tunceli": {
        yieldTrend: 1.0,
        districts: {
          "Merkez": 13000, "Pertek": 9000, "Çemişgezek": 8500,
          "Ovacık": 8500,
        },
      },
      "Uşak": {
        yieldTrend: 1.2,
        districts: {
          "Merkez": 18000, "Banaz": 10000, "Eşme": 9000,
          "Sivaslı": 8500,
        },
      },
      "Van": {
        yieldTrend: 1.2,
        districts: {
          "İpekyolu": 16000, "Edremit": 20000, "Tuşba": 17000,
          "Erciş": 11000, "Gevaş": 11000,
        },
      },
      "Yalova": {
        yieldTrend: 1.8,
        districts: {
          "Merkez": 34000, "Çınarcık": 38000, "Termal": 36000,
          "Armutlu": 40000, "Çiftlikköy": 30000, "Altınova": 26000,
        },
      },
      "Yozgat": {
        yieldTrend: 1.0,
        districts: {
          "Merkez": 14000, "Sorgun": 11000, "Akdağmadeni": 9000,
          "Boğazlıyan": 9000,
        },
      },
      "Zonguldak": {
        yieldTrend: 1.2,
        districts: {
          "Merkez": 20000, "Ereğli": 22000, "Çaycuma": 14000,
          "Devrek": 13000, "Alaplı": 16000,
        },
      },
    }
  },

  // ── AI değerleme katsayıları ─────────────────────────────────────────────
  // Katsayılar özellikle ilanı "uçuk" biçimde yukarı taşımayacak şekilde
  // kontrollüdür. Model ilçe referansını temel alır; mülk tipi, yaş ve
  // özellikler yalnızca sınırlı düzeltme yapar.
  valuation: {
    // Tür çarpanları (emlak). Listede OLMAYAN tür için 1.0 kullanılır;
    // `config.segments` içinde valuation:false olan türlerde değerleme hiç
    // çalışmaz (ör. "Diğer" segmenti).
    kind: {
      daire: 1.0, residence: 1.08, villa: 1.05, mustakil: 1.08, yazlik: 1.06,
      dukkan: 1.12, ofis: 1.05, depo: 0.7, fabrika: 0.75,
      arsa: 0.45, tarla: 0.04, bagbahce: 0.09,
      bina: 0.95, devremulk: 0.6, turistik: 1.0,
    },
    age: [ // [maksYaş, çarpan]
      [0, 1.10], [5, 1.05], [10, 1.0], [20, 0.95], [30, 0.92], [999, 0.86],
    ],
    floorBonus: { zemin: 0.97, ara: 1.0, ust: 1.03, cati: 0.98, bahce: 1.02 },
    roomFactor: { "1+0": 1.04, "1+1": 1.02, "2+1": 1.0, "3+1": 0.99, "4+1": 0.98, "5+2": 0.97 },
    features: {
      "Deniz Manzarası": 8, "Havuz": 4, "Otopark": 2, "Asansör": 2,
      "Güvenlik": 2, "Balkon": 1, "Eşyalı": 3, "Akıllı Ev": 3,
      "Isı Yalıtımı": 2, "Site İçi": 3, "Doğalgaz": 1, "Jeneratör": 1,
    },
    // ARSA/ARAZİ ÖLÇEK ETKİSİ: birim fiyat parsel büyüdükçe düşer (5 dönüm
    // tarla, 500 m² arsanın 10 katı etmez). refArea üzerindeki alanlarda
    // çarpan = (refArea / alan) ^ decay, minFactor'da taban yapar.
    landSize: { refArea: 1000, decay: 0.35, minFactor: 0.25 },
    confidence: 0.12,
    fairBand: 0.07,
  },

  // ── Araç piyasa verisi & değerleme katsayıları ──────────────────────────
  vehicles: {
    brands: {
      "Renault":    { "Clio": 1150000, "Megane": 1750000, "Duster": 1950000 },
      "Fiat":       { "Egea": 1250000, "Egea Cross": 1550000 },
      "Toyota":     { "Corolla": 1950000, "C-HR": 2550000 },
      "Volkswagen": { "Polo": 1650000, "Passat": 3450000, "Tiguan": 3950000 },
      "Ford":       { "Focus": 1900000, "Puma": 2350000 },
      "Hyundai":    { "i20": 1400000, "Tucson": 3150000 },
      "Honda":     { "Civic": 2250000 },
      "Peugeot":    { "208": 1550000, "3008": 3250000 },
      "BMW":        { "3 Serisi": 4850000, "X3": 6500000 },
      "Mercedes":   { "C Serisi": 5250000, "E Serisi": 7300000 },
      "Tesla":      { "Model Y": 3250000 },
    },
    ageCurve: [ [0, 0.97], [1, 0.88], [3, 0.76], [5, 0.65], [8, 0.52], [12, 0.40], [99, 0.28] ],
    kmNormPerYear: 15000,
    kmEffectPer10k: 1.2,
    kmEffectCapPct: 18,
    fuelFactor: { "Benzin": 1, "Dizel": 1.03, "LPG & Benzin": 0.96, "Hibrit": 1.06, "Elektrik": 1.08 },
    gearFactor: { "Otomatik": 1.04, "Manuel": 1 },
    rentDailyFactor: 0.0011,
    fuels: ["Benzin", "Dizel", "LPG & Benzin", "Hibrit", "Elektrik"],
    gears: ["Otomatik", "Manuel"],
    minYear: 2008,
  },

  // ── Kredi hesaplayıcı varsayılanları ────────────────────────────────────
  credit: {
    defaultRate: 2.89, maxLtv: 0.8, terms: [60, 120, 180, 240],
    vehicle: { defaultRate: 3.15, maxLtv: 0.7, terms: [12, 24, 36, 48] },
  },

  // ── Yayın onayı (moderasyon) ────────────────────────────────────────────
  moderation: {
    seedStatus: "pending",
    adminAutoPublish: true,
  },

  // ── Fotoğraf yükleme kuralları (ilan-ver + yönetim düzenleyicisi) ───────
  // Fotoğraf yükleme + DEPOLAMA KOTASI (tek kaynak; app.js ve server.js okur).
  // Amaç: onlarca üye ilan verdiğinde disk kontrolden çıkmasın.
  //  1) İstemci fotoğrafı küçültür ve `targetKB` altına inene kadar kaliteyi
  //     düşürür (WebP destekleniyorsa çok daha küçük dosya çıkar).
  //  2) Sunucu tek fotoğraf (maxStoredKB), ilan, ÜYE ve SİTE toplamı için
  //     sert sınır uygular; sınır aşılırsa fotoğraf yazılmaz ve kullanıcıya
  //     nedeni söylenir.
  upload: {
    maxPhotos: 6,
    maxFileMB: 15,          // seçilebilecek ham dosya sınırı
    maxWidth: 1400,         // küçültme sonrası en fazla genişlik (px)
    quality: 0.82,          // başlangıç sıkıştırma kalitesi
    minQuality: 0.5,        // hedefe inmek için düşülebilecek en düşük kalite
    targetKB: 320,          // istemcinin hedeflediği fotoğraf başına boyut
    preferWebp: true,       // destekleniyorsa WebP (JPEG'e göre ~%40 küçük)
    maxStoredKB: 900,       // sunucunun kabul ettiği fotoğraf başına üst sınır
    accept: ["image/jpeg", "image/png", "image/webp"],
    acceptLabel: "JPG · PNG · WEBP",
    quota: {
      perListingMB: 5,      // tek ilanın tüm fotoğrafları
      perUserMB: 40,        // bir üyenin tüm ilanları toplamı
      totalGB: 2,           // sitenin tamamı (disk/Volume koruması)
      warnPct: 80,          // panelde uyarı eşiği (%)
    },
  },

  // ── AI asistan ayarları ─────────────────────────────────────────────────
  assistant: { name: "EVA", maxResults: 6 },

  // ── Yönetim paneli (admin.html) ─────────────────────────────────────────
  admin: { pass: "emlak2026" },
};
