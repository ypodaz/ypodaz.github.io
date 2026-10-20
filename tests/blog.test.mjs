import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadPosts, isPublished, renderBody, BLOG_LANGS } from '../scripts/render-blog.mjs';
import { sitemapXml } from '../scripts/seo-files.mjs';
import { HOURLY, ONSITE_HOURLY, EDIT, REELS, TIERS, fullPrice, corpOld, corpPerHour, fmt } from '../src/js/pricing.js';

const langs = BLOG_LANGS.map(l => l.code).filter(c => loadPosts(c).length);

test('bloq yazıları: format, unikal slug, SEO uzunluqları', () => {
  for (const lang of langs) {
    const posts = loadPosts(lang);
    assert.equal(new Set(posts.map(p => p.slug)).size, posts.length, `${lang}: təkrarlanan slug`);
    for (const p of posts) {
      assert.ok(p.seo_title.length <= 60, `${lang}/${p.slug}: seo_title ${p.seo_title.length} > 60`);
      assert.ok(p.description.length >= 110 && p.description.length <= 160, `${lang}/${p.slug}: description ${p.description.length}`);
      assert.ok(!/^# /m.test(p.body), `${lang}/${p.slug}: mətndə H1 olmamalıdır`);
    }
  }
});

test('bloq daxili linkləri mövcud yazılara və bölmələrə aparır', () => {
  for (const lang of langs) {
    const slugs = new Set(loadPosts(lang).map(p => p.slug));
    for (const p of loadPosts(lang)) {
      for (const [, href] of p.body.matchAll(/\]\((\/[^)]*)\)/g)) {
        const m = href.match(/^\/blog\/([a-z0-9-]+)\/$/);
        if (m) assert.ok(slugs.has(m[1]), `${lang}/${p.slug}: link yoxdur ${href}`);
        else assert.ok(['/#qiymetler', '/#elaqe'].includes(href), `${lang}/${p.slug}: gözlənilməz link ${href}`);
      }
    }
  }
});

test('bloqdakı AZN rəqəmləri pricing.js ilə üst-üstə düşür', () => {
  const allowed = new Set([
    ...HOURLY, ...ONSITE_HOURLY, EDIT, REELS.studio, REELS.onsite,
    ...[0, 1, 2].flatMap(c => [fullPrice(c), fullPrice(c, 'onsite')]),
    ...TIERS.flatMap(t => [0, 1, 2].flatMap(c => [t.p[c], corpOld(t, c), corpPerHour(t, c)])),
  ].map(n => fmt(n).replace(/\s/g, ' ')));
  for (const lang of langs) {
    for (const p of loadPosts(lang)) {
      for (const [, n] of p.body.matchAll(/(\d[\d  ]*\d|\d)\s?AZN/g)) {
        const v = n.replace(/\s/g, ' ').trim();
        assert.ok(allowed.has(v), `${lang}/${p.slug}: təsdiqlənməmiş qiymət ${v} AZN`);
      }
    }
  }
});

test('yayım cədvəli: tarixi gəlməyən yazı açılmır, hamısı 2 ayda açılır', () => {
  const az = loadPosts('az');
  const first = az.map(p => p.date).sort()[0];
  const last = az.map(p => p.date).sort().at(-1);
  assert.ok(az.filter(p => isPublished(p, first)).length >= 1);
  assert.ok(az.filter(p => isPublished(p, first)).length < az.length, 'hamısı bir gündə açılmamalıdır');
  assert.equal(az.filter(p => isPublished(p, last)).length, az.length);
  const days = (Date.parse(last) - Date.parse(first)) / 864e5;
  assert.ok(days <= 62, `cədvəl ${days} gündür`);
});

test('açılmamış yazıya link mətnə çevrilir', () => {
  const html = renderBody('Bax: [açıq](/blog/a/) və [bağlı](/blog/b/), [qiymətlər](/#qiymetler).', new Set(['a']));
  assert.ok(html.includes('<a href="/blog/a/">açıq</a>'));
  assert.ok(!html.includes('/blog/b/') && html.includes('bağlı'));
  assert.ok(html.includes('href="/#qiymetler"'));
});

test('sitemap bloq URL-lərini lastmod ilə əlavə edir', () => {
  const xml = sitemapXml('https://example.com', [
    { loc: 'https://example.com/blog/a/', lastmod: '2026-10-19', alternates: [] },
    { loc: 'https://example.com/blog/b/', lastmod: '2026-10-20', alternates: [
      { code: 'az', url: 'https://example.com/blog/b/' }, { code: 'ru', url: 'https://example.com/ru/blog/b/' }] },
  ]);
  assert.ok(xml.includes('<loc>https://example.com/blog/a/</loc>\n    <lastmod>2026-10-19</lastmod>'));
  assert.ok(xml.includes('hreflang="ru" href="https://example.com/ru/blog/b/"'));
  assert.equal(xml.split('<url>').length - 1, 5);
});

test('RU tərcümələri: AZ ilə eyni slug, tarix və kateqoriya; AZ hərfi və qadağan ifadə yoxdur', () => {
  const az = new Map(loadPosts('az').map(p => [p.slug, p]));
  for (const p of loadPosts('ru')) {
    const a = az.get(p.slug);
    assert.ok(a, `ru/${p.slug}: AZ versiyası yoxdur`);
    assert.equal(p.date, a.date, `ru/${p.slug}: tarix AZ ilə eyni olmalıdır`);
    assert.equal(p.category, a.category, `ru/${p.slug}: kateqoriya AZ ilə eyni olmalıdır`);
    const text = `${p.title} ${p.seo_title} ${p.description} ${p.body}`;
    assert.ok(!/[əğı]/i.test(text), `ru/${p.slug}: tərcümə olunmamış Azərbaycan mətni`);
    for (const bad of [/аренд/i, /под ключ/i, /(^|[^А-Яа-яЁё])ИИ([^А-Яа-яЁё]|$)/, /искусственн\S* интеллект/i, /нейросет/i, /\bAI\b/]) {
      assert.ok(!bad.test(text), `ru/${p.slug}: qadağan ifadə ${bad}`);
    }
  }
});

test('RU yazılarında linklər /ru/ prefiksi alır', () => {
  const html = renderBody('[a](/blog/a/) [b](/blog/b/) [c](/#qiymetler)', new Set(['a']), 'ru/');
  assert.ok(html.includes('href="/ru/blog/a/"'));
  assert.ok(html.includes('href="/ru/#qiymetler"'));
  assert.ok(!html.includes('/blog/b/'));
  assert.ok(renderBody('[a](/blog/a/)', new Set(['a'])).includes('href="/blog/a/"'));
});
