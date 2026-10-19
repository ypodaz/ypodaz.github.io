import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sitemapXml, robotsTxt } from '../scripts/seo-files.mjs';
import { LANGS } from '../scripts/render-pages.mjs';

const SITE = 'https://example.com';

test('sitemap: 3 dil, hər birində bütün hreflang-lar və x-default', () => {
  const xml = sitemapXml(SITE);
  const urls = xml.split('<url>').slice(1);
  assert.equal(urls.length, LANGS.length);
  for (const u of urls) {
    for (const l of LANGS) assert.ok(u.includes(`hreflang="${l.code}" href="${SITE}/${l.dir}"`), l.code);
    assert.ok(u.includes(`hreflang="x-default" href="${SITE}/"`));
  }
  assert.ok(xml.includes(`<loc>${SITE}/en/</loc>`) && xml.includes(`<loc>${SITE}/ru/</loc>`));
});

test('robots.txt: Sitemap sətri yalnız domen olanda', () => {
  assert.ok(robotsTxt(SITE).includes(`Sitemap: ${SITE}/sitemap.xml`));
  assert.ok(!robotsTxt('').includes('Sitemap'));
  assert.ok(robotsTxt('').includes('Allow: /'));
});

test('FAQ cavabındakı qiymətlər pricing.js ilə eynidir (3 dil)', async () => {
  const { readFileSync } = await import('node:fs');
  const { studioPrice, EDIT } = await import('../src/js/pricing.js');
  for (const l of ['az', 'en', 'ru']) {
    const a1 = JSON.parse(readFileSync(new URL(`../src/i18n/${l}.json`, import.meta.url), 'utf8')).faq.a1;
    for (const n of [0, 1, 2].map(c => studioPrice(c)).concat(EDIT, studioPrice(0, 'onsite'))) assert.ok(a1.includes(`${n} AZN`), `${l}: ${n}`);
  }
});
