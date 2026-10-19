import { defineConfig } from 'vite';
import { resolve, relative } from 'node:path';
import { renderPages } from './scripts/render-pages.mjs';
import { sitemapXml, robotsTxt } from './scripts/seo-files.mjs';

// Template və tərcümələr dəyişəndə 3 dil səhifəsini yenidən yaradır
function i18nPages() {
  return {
    name: 'ypod-i18n-pages',
    config() { renderPages(); },
    configureServer(server) {
      const watched = [resolve('src/template.html'), resolve('src/i18n')];
      server.watcher.add(watched);
      server.watcher.on('change', file => {
        if (file.endsWith('template.html') || file.includes('/i18n/')) {
          try { renderPages(); } catch (e) { console.error(e.message); }
          server.ws.send({ type: 'full-reload' });
        }
      });
    },
  };
}

// Animasiya chunk-larının yollarını HTML-ə yazır (<meta name="ypod-lazy">): main.js onları boş vaxtda əvvəlcədən endirir.
// "3d:" ilə başlayanlar yalnız 3D-li cihazda lazımdır. Yollar səhifəyə nisbidir (en/, ru/ → ../assets/...).
function lazyChunks() {
  const groups = [
    ['3d', ['/src/js/hero3d.js']],
    ['', ['/src/js/services.js', '/gsap/index.js', '/gsap/ScrollTrigger.js', '/gsap/ScrollToPlugin.js']],
  ];
  return {
    name: 'ypod-lazy-chunks',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, { bundle, filename }) {
        if (!bundle) return html;
        const chunks = Object.values(bundle).filter(c => c.type === 'chunk');
        const seen = new Set();
        const out = [];
        const add = (prefix, c) => {
          if (!c || c.isEntry || seen.has(c.fileName)) return;
          seen.add(c.fileName);
          c.imports.forEach(f => add(prefix, bundle[f]));
          out.push(prefix + c.fileName);
        };
        // Ümumi chunk-lar əvvəl: 3D-nin asılılıqları (gsap) "3d:" kimi işarələnməsin
        for (const [tag, ids] of [...groups].reverse()) {
          for (const id of ids) add(tag ? tag + ':' : '', chunks.find(c => c.facadeModuleId?.endsWith(id)));
        }
        const up = '../'.repeat(relative(resolve('src'), filename).split('/').length - 1);
        const content = out.map(f => f.replace(/^(3d:)?/, `$1${up}`)).join(' ');
        return [{ tag: 'meta', attrs: { name: 'ypod-lazy', content }, injectTo: 'head' }];
      },
    },
  };
}

// sitemap.xml + robots.txt: yalnız SITE_URL təyin olunanda (CI). Lokal build-də sitemap yoxdur, robots.txt-də Sitemap sətri yoxdur.
function seoFiles() {
  const siteUrl = (process.env.SITE_URL || '').replace(/\/$/, '');
  return {
    name: 'ypod-seo-files',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robotsTxt(siteUrl) });
      if (siteUrl) this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemapXml(siteUrl) });
    },
  };
}

export default defineConfig({
  root: 'src',
  publicDir: resolve('public'),
  // Nisbi yollar: sayt həm github.io/<repo>/ altında, həm də öz domenində işləsin
  base: './',
  plugins: [i18nPages(), lazyChunks(), seoFiles()],
  build: {
    outDir: resolve('dist'),
    emptyOutDir: true,
    target: 'es2020',
    rollupOptions: {
      input: {
        az: resolve('src/index.html'),
        en: resolve('src/en/index.html'),
        ru: resolve('src/ru/index.html'),
      },
    },
  },
  server: { port: 5181 },
});
