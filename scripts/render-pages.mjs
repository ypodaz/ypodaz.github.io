// src/template.html + src/i18n/{az,en,ru}.json → src/index.html, src/en/index.html, src/ru/index.html
// Yaradılan səhifələri əl ilə redaktə etmə: template-i və ya JSON-u dəyiş.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../src/js/config.js';
import { studioPrice, reelsPrice, EDIT } from '../src/js/pricing.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(ROOT, 'src');

// Domen hələ seçilməyib. Təyin olunanda hreflang və canonical avtomatik əlavə olunur.
// Nümunə: SITE_URL=https://ypod.az npm run build
const SITE_URL = (process.env.SITE_URL || '').replace(/\/$/, '');

export const LANGS = [
  { code: 'az', dir: '', root: './' },
  { code: 'en', dir: 'en/', root: '../' },
  { code: 'ru', dir: 'ru/', root: '../' },
];

// JS-in işləmə vaxtında lazım olan açarlar (WhatsApp mətnləri, kamera adları)
// Struktur məlumatı (JSON-LD). Qiymətlər pricing.js-dən gəlir, saytdakı rəqəmlərlə ayrılmasın.
// Offer adları mövcud i18n mətnlərindən qurulur, yeni mətn yoxdur.
function buildJsonLd(t, { pageUrl, ogImage }) {
  const offer = (name, price) => ({ '@type': 'Offer', priceCurrency: 'AZN', price: String(price), itemOffered: { '@type': 'Service', name } });
  const cams = [0, 1, 2];
  const offers = [
    ...cams.map(c => offer(`${t.prices.studio_title} · ${t.cams['c' + c]}`, studioPrice(c))),
    offer(t.prices.edit_title, EDIT),
    offer(t.prices.reels_title, reelsPrice('studio')),
    ...cams.map(c => offer(`${t.prices.onsite_title} · ${t.cams['c' + c]}`, studioPrice(c, 'onsite'))),
    offer(`${t.prices.reels_title} · ${t.prices.onsite_title}`, reelsPrice('onsite')),
  ];
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Y Pod',
    ...(pageUrl && { url: pageUrl, image: ogImage }),
    description: t.meta.description,
    telephone: '+994555303532',
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '08:00',
      closes: '22:00',
    },
    address: { '@type': 'PostalAddress', streetAddress: 'Zaur Nudirəliyev küçəsi, 34A', addressLocality: 'Bakı', addressCountry: 'AZ' },
    geo: { '@type': 'GeoCoordinates', latitude: CONFIG.coords.lat, longitude: CONFIG.coords.lng },
    areaServed: { '@type': 'City', name: 'Bakı' },
    // mapsUrl (Google Business profili) yaradılandan sonra: hasMap və sameAs-a əlavə olunur
    ...(CONFIG.mapsUrl && { hasMap: CONFIG.mapsUrl }),
    sameAs: ['https://www.instagram.com/ypod.az/', ...(CONFIG.mapsUrl ? [CONFIG.mapsUrl] : [])],
    hasOfferCatalog: { '@type': 'OfferCatalog', name: 'Y Pod', itemListElement: offers },
  };
}

const RUNTIME_KEYS = ['lang', 'cams', 'wa', 'wa_place', 'ig'];

const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
const escAttr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export function renderPages() {
  const template = readFileSync(resolve(SRC, 'template.html'), 'utf8');
  const dicts = Object.fromEntries(LANGS.map(l => [l.code, JSON.parse(readFileSync(resolve(SRC, 'i18n', `${l.code}.json`), 'utf8'))]));

  for (const l of LANGS) {
    const t = dicts[l.code];
    const runtime = Object.fromEntries(RUNTIME_KEYS.map(k => [k, t[k]]));
    const alternates = SITE_URL
      ? [
          ...LANGS.map(o => `<link rel="alternate" hreflang="${o.code}" href="${SITE_URL}/${o.dir}">`),
          `<link rel="alternate" hreflang="x-default" href="${SITE_URL}/">`,
          `<link rel="canonical" href="${SITE_URL}/${l.dir}">`,
        ].join('\n  ')
      : '<!-- TODO: SITE_URL təyin olunanda burada hreflang və canonical olacaq -->';

    // Paylaşım kartı: hər dilin öz şəkli (public/og/, scripts/og-render.mjs). og:image mütləq URL olmalıdır,
    // SITE_URL olmayanda (lokal) nisbi yol yazılır ki, şəkil yenə yoxlana bilsin.
    const pageUrl = SITE_URL ? `${SITE_URL}/${l.dir}` : '';
    const ogImage = SITE_URL ? `${SITE_URL}/og/og-${l.code}.jpg` : `${l.root}og/og-${l.code}.jpg`;
    const social = [
      pageUrl && `<meta property="og:url" content="${pageUrl}">`,
      '<meta property="og:site_name" content="Y Pod">',
      `<meta property="og:image" content="${ogImage}">`,
      '<meta property="og:image:width" content="1200">',
      '<meta property="og:image:height" content="630">',
      `<meta property="og:image:alt" content="${escAttr(t.meta.title)}">`,
      ...LANGS.filter(o => o.code !== l.code).map(o => `<meta property="og:locale:alternate" content="${dicts[o.code].locale}">`),
      '<meta name="twitter:card" content="summary_large_image">',
    ].filter(Boolean).join('\n  ');
    const ldJson = JSON.stringify(buildJsonLd(t, { pageUrl, ogImage }), null, 2).replace(/</g, '\\u003c');

    const vars = {
      ROOT: l.root,
      LANG_AZ: l.root,
      LANG_EN: l.root + 'en/',
      LANG_RU: l.root + 'ru/',
      ALTERNATES: alternates,
      SOCIAL: social,
      LD_JSON: ldJson,
      RUNTIME_JSON: JSON.stringify(runtime).replace(/</g, '\\u003c'),
      AZ_CURRENT: l.code === 'az' ? 'aria-current="true"' : '',
      EN_CURRENT: l.code === 'en' ? 'aria-current="true"' : '',
      RU_CURRENT: l.code === 'ru' ? 'aria-current="true"' : '',
    };

    const html = template
      // {{=key}} — atributlar üçün (escape olunur)
      .replace(/\{\{=([\w.]+)\}\}/g, (_, k) => {
        const v = get(t, k);
        if (v === undefined) throw new Error(`[${l.code}] tərcümə açarı yoxdur: ${k}`);
        return escAttr(v);
      })
      // {{key}} — mətn (JSON-dakı <br> kimi sadə HTML-ə icazə var)
      .replace(/\{\{([\w.]+)\}\}/g, (_, k) => {
        if (k in vars) return vars[k];
        const v = get(t, k);
        if (v === undefined) throw new Error(`[${l.code}] tərcümə açarı yoxdur: ${k}`);
        return v;
      });

    const out = resolve(SRC, l.dir, 'index.html');
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, html);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  renderPages();
  console.log('Səhifələr yaradıldı: src/index.html, src/en/index.html, src/ru/index.html');
}
