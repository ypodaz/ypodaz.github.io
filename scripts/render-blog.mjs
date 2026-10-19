// content/blog/<dil>/*.md → src/[ru/]blog/index.html (siyahı) və src/[ru/]blog/<slug>/index.html (yazı).
// Yaradılan səhifələri əl ilə redaktə etmə: Markdown-u və ya bu skripti dəyiş.
//
// Yayım cədvəli: frontmatter-dəki `date` bu gündən (Bakı vaxtı) sonradırsa, yazı build-ə düşmür.
// GitHub Actions hər gün build edir (deploy.yml → schedule), ona görə yazılar öz günündə özü açılır.
// Hamısını lokal görmək üçün: BLOG_DRAFTS=1 npm run dev
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(ROOT, 'src');
const CONTENT = resolve(ROOT, 'content/blog');

// Bloqu olan dillər. RU tərcümələri content/blog/ru/-a düşəndə özü qoşulur (eyni slug = hreflang cütü).
export const BLOG_LANGS = [
  { code: 'az', dir: '', locale: 'az_AZ' },
  { code: 'ru', dir: 'ru/', locale: 'ru_RU' },
];

const REQUIRED = ['slug', 'title', 'seo_title', 'description', 'keyword', 'category', 'date'];

export const bakuToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Baku' }).format(new Date());

const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function parsePost(text, file = '') {
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`${file}: frontmatter yoxdur`);
  const meta = Object.fromEntries([...m[1].matchAll(/^(\w+):\s*(.*)$/gm)].map(([, k, v]) => [k, v.trim()]));
  for (const k of REQUIRED) if (!meta[k]) throw new Error(`${file}: "${k}" yoxdur`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date)) throw new Error(`${file}: date YYYY-MM-DD olmalıdır`);
  return { ...meta, body: m[2] };
}

export function loadPosts(lang) {
  const dir = resolve(CONTENT, lang);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const post = parsePost(readFileSync(resolve(dir, f), 'utf8'), `${lang}/${f}`);
      if (post.slug !== f.slice(0, -3)) throw new Error(`${lang}/${f}: slug fayl adı ilə eyni olmalıdır`);
      return post;
    })
    .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}

export const isPublished = (post, today, drafts = false) => drafts || post.date <= today;

// Hələ açılmamış yazıya link mətnə çevrilir (404 olmasın). Cədvəllər mobil üçün sürüşən qutuya salınır.
export function renderBody(md, publishedSlugs) {
  return marked.parse(md)
    .replace(/<a href="\/blog\/([a-z0-9-]+)\/">([\s\S]*?)<\/a>/g, (all, slug, text) => (publishedSlugs.has(slug) ? all : text))
    .replace(/<table>/g, '<div class="post-table"><table>')
    .replace(/<\/table>/g, '</table></div>');
}

const fmtDate = (iso, months) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${months[m - 1]} ${y}`;
};

function head({ lang, title, description, url, ogImage, root, alternates, jsonLd, type }) {
  const alt = alternates.length > 1
    ? [...alternates.map(a => `<link rel="alternate" hreflang="${a.code}" href="${a.url}">`),
       `<link rel="alternate" hreflang="x-default" href="${(alternates.find(a => a.code === 'az') || alternates[0]).url}">`].join('\n  ')
    : '';
  return `<!doctype html>
<html lang="${lang.code}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="theme-color" content="#0b0713">
  <meta name="color-scheme" content="dark">
  <link rel="icon" href="${root}favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="${root}apple-touch-icon.png">
  ${url ? `<link rel="canonical" href="${url}">` : ''}
  ${alt}
  <meta property="og:type" content="${type}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:locale" content="${lang.locale}">
  ${url ? `<meta property="og:url" content="${url}">` : ''}
  <meta property="og:site_name" content="Y Pod">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="preload" as="font" type="font/woff2" href="${root}assets/fonts/unbounded-900-lat.woff2" crossorigin>
  <link rel="preload" as="font" type="font/woff2" href="${root}assets/fonts/manrope-lat.woff2" crossorigin>
  <link rel="stylesheet" href="${root}styles/main.css">
  <link rel="stylesheet" href="${root}styles/blog.css">
  <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>
</head>`;
}

function shell({ t, blogHref, siteRoot, waHref, content }) {
  return `<body>
<header class="nav">
  <div class="wrap nav-in">
    <a class="logo" href="${siteRoot}" aria-label="${esc(t.nav.home_aria)}"><span class="logo-dot" aria-hidden="true"></span>Y POD</a>
    <div class="nav-end blog-nav-end">
      <a class="btn btn-s btn-sm" href="${siteRoot}#qiymetler">${t.nav.prices}</a>
      <a class="btn btn-p btn-sm" href="${waHref}" target="_blank" rel="noopener">${t.nav.book}</a>
    </div>
  </div>
</header>
<main class="blog">
${content}
</main>
<footer class="foot">
  <div class="wrap foot-in">
    <a class="logo logo-foot" href="${siteRoot}">Y POD</a>
    <span class="mut foot-copy">${t.footer.copy} <a class="foot-blog" href="${blogHref}">${t.blog.nav}</a></span>
  </div>
</footer>
</body>
</html>
`;
}

const card = (p, t, href) => `<li class="blog-card">
        <a href="${href}">
          <span class="eb">${esc(t.blog.cats[p.category] || p.category)}</span>
          <span class="hd blog-card-h">${esc(p.title)}</span>
          <span class="mut blog-card-d">${esc(p.description)}</span>
        </a>
      </li>`;

/**
 * Bloq səhifələrini yaradır. Qaytarır: Vite input-ları və sitemap üçün URL-lər.
 * @param {{siteUrl?: string, today?: string, drafts?: boolean}} opts
 */
export function renderBlog({ siteUrl = '', today = bakuToday(), drafts = false } = {}) {
  siteUrl = siteUrl.replace(/\/$/, '');
  const pages = [];
  const urls = [];
  const all = Object.fromEntries(BLOG_LANGS.map(l => [l.code, loadPosts(l.code).filter(p => isPublished(p, today, drafts))]));

  for (const lang of BLOG_LANGS) {
    const outDir = resolve(SRC, lang.dir, 'blog');
    rmSync(outDir, { recursive: true, force: true });
    const posts = all[lang.code];
    if (!posts.length) continue;

    const t = JSON.parse(readFileSync(resolve(SRC, 'i18n', `${lang.code}.json`), 'utf8'));
    if (!t.blog) throw new Error(`${lang.code}.json: "blog" bölməsi yoxdur`);
    const waHref = `https://wa.me/994555303532?text=${encodeURIComponent(t.wa.general)}`;
    const ogImage = siteUrl ? `${siteUrl}/og/og-${lang.code}.jpg` : `/og/og-${lang.code}.jpg`;
    const published = new Set(posts.map(p => p.slug));
    const listUrl = siteUrl ? `${siteUrl}/${lang.dir}blog/` : '';
    const homeUrl = siteUrl ? `${siteUrl}/${lang.dir}` : '';
    const org = { '@type': 'Organization', name: 'Y Pod', ...(siteUrl && { url: `${siteUrl}/` }) };
    // Eyni slug-un açılmış dil versiyaları (hreflang)
    const altsFor = slug => BLOG_LANGS
      .filter(l => all[l.code].some(p => p.slug === slug))
      .map(l => ({ code: l.code, url: siteUrl ? `${siteUrl}/${l.dir}blog/${slug}/` : '' }))
      .filter(a => a.url);

    for (const p of posts) {
      const root = '../'.repeat(2 + (lang.dir ? 1 : 0));
      const siteRoot = root + lang.dir;
      const url = siteUrl ? `${siteUrl}/${lang.dir}blog/${p.slug}/` : '';
      const related = posts.filter(o => o.slug !== p.slug && o.category === p.category).slice(0, 3);
      const fill = posts.filter(o => o.slug !== p.slug && o.category !== p.category).slice(0, 3 - related.length);
      const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'BlogPosting',
            headline: p.title,
            description: p.description,
            datePublished: p.date,
            dateModified: p.date,
            inLanguage: lang.code,
            author: org,
            publisher: org,
            image: ogImage,
            ...(url && { url, mainEntityOfPage: url }),
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: t.blog.home, ...(homeUrl && { item: homeUrl }) },
              { '@type': 'ListItem', position: 2, name: t.blog.nav, ...(listUrl && { item: listUrl }) },
              { '@type': 'ListItem', position: 3, name: p.title, ...(url && { item: url }) },
            ],
          },
        ],
      };
      const content = `<article class="wrap post">
    <nav class="crumbs" aria-label="${esc(t.blog.crumbs_aria)}"><a href="${siteRoot}">${t.blog.home}</a><span aria-hidden="true">/</span><a href="../">${t.blog.nav}</a></nav>
    <p class="eb">${esc(t.blog.cats[p.category] || p.category)}</p>
    <h1 class="hd post-h1">${esc(p.title)}</h1>
    <p class="mut post-meta"><time datetime="${p.date}">${fmtDate(p.date, t.blog.months)}</time></p>
    <div class="post-body">
${renderBody(p.body, published)}
    </div>
    <aside class="card post-cta">
      <h2 class="hd post-cta-h">${t.contact.title}</h2>
      <p class="mut">${t.contact.sub}</p>
      <div class="post-cta-btns">
        <a class="btn btn-p" href="${waHref}" target="_blank" rel="noopener">${t.contact.wa}</a>
        <a class="btn btn-s" href="${siteRoot}#qiymetler">${t.hero.prices}</a>
      </div>
    </aside>
    <section class="post-related" aria-labelledby="rel-h">
      <h2 class="hd post-related-h" id="rel-h">${t.blog.related}</h2>
      <ul class="blog-grid">
      ${[...related, ...fill].map(o => card(o, t, `../${o.slug}/`)).join('\n      ')}
      </ul>
      <a class="btn btn-s" href="../">${t.blog.all}</a>
    </section>
  </article>`;
      const html = head({ lang, title: p.seo_title, description: p.description, url, ogImage, root, alternates: altsFor(p.slug), jsonLd, type: 'article' })
        + '\n' + shell({ t, blogHref: '../', siteRoot, waHref, content });
      const file = resolve(outDir, p.slug, 'index.html');
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, html);
      pages.push({ name: `blog-${lang.code}-${p.slug}`, file });
      if (url) urls.push({ loc: url, lastmod: p.date, alternates: altsFor(p.slug) });
    }

    // Siyahı səhifəsi: ən yeni yazı yuxarıda
    const root = '../'.repeat(1 + (lang.dir ? 1 : 0));
    const siteRoot = root + lang.dir;
    const listJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: t.blog.list_title,
      description: t.blog.list_description,
      inLanguage: lang.code,
      publisher: org,
      ...(listUrl && { url: listUrl }),
    };
    const listContent = `<section class="wrap blog-list">
    <nav class="crumbs" aria-label="${esc(t.blog.crumbs_aria)}"><a href="${siteRoot}">${t.blog.home}</a></nav>
    <h1 class="hd post-h1">${t.blog.list_h1}</h1>
    <p class="mut blog-sub">${t.blog.list_sub}</p>
    <ul class="blog-grid">
      ${posts.map(p => card(p, t, `${p.slug}/`)).join('\n      ')}
    </ul>
  </section>`;
    const listFile = resolve(outDir, 'index.html');
    writeFileSync(listFile, head({ lang, title: t.blog.list_title, description: t.blog.list_description, url: listUrl, ogImage, root, alternates: [], jsonLd: listJsonLd, type: 'website' })
      + '\n' + shell({ t, blogHref: './', siteRoot, waHref, content: listContent }));
    pages.push({ name: `blog-${lang.code}`, file: listFile });
    if (listUrl) urls.push({ loc: listUrl, lastmod: posts[0].date, alternates: [] });
  }
  return { pages, urls };
}

// Əsas səhifənin footer-indəki "Bloq" linki üçün: bu dildə açılmış yazı varmı
export const hasPublishedBlog = (lang, { today = bakuToday(), drafts = false } = {}) =>
  loadPosts(lang).some(p => isPublished(p, today, drafts));

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = renderBlog({ siteUrl: process.env.SITE_URL, drafts: process.env.BLOG_DRAFTS === '1' });
  console.log(`Bloq: ${r.pages.length} səhifə yaradıldı`);
}
