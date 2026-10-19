// sitemap.xml və robots.txt. Domen SITE_URL-dan gəlir (render-pages.mjs ilə eyni), ona görə domen dəyişəndə özü yenilənir.
import { LANGS } from './render-pages.mjs';

export function sitemapXml(siteUrl) {
  const loc = l => `${siteUrl}/${l.dir}`;
  const alts = [
    ...LANGS.map(l => `    <xhtml:link rel="alternate" hreflang="${l.code}" href="${loc(l)}"/>`),
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${siteUrl}/"/>`,
  ].join('\n');
  const urls = LANGS.map(l => `  <url>\n    <loc>${loc(l)}</loc>\n${alts}\n  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
}

export function robotsTxt(siteUrl) {
  return `User-agent: *\nAllow: /\n${siteUrl ? `\nSitemap: ${siteUrl}/sitemap.xml\n` : ''}`;
}
