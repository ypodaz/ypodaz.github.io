# Y Pod saytı

Bir səhifəlik statik sayt: Vite, vanilla JS, Three.js (3D mikrofon) və GSAP (scroll animasiyası). Dillər: AZ (`/`), EN (`/en/`), RU (`/ru/`).

Dizayn mənbəyi (`design-handoff/`), biznes brifi (`CLAUDE.md`) və köhnə prototip (`arxiv/`) yalnız lokal kompüterdədir, repoya daxil deyil.

## Əmrlər

```bash
npm install        # bir dəfə
npm run dev        # http://localhost:5181, dəyişikliklər dərhal görünür
npm test           # qiymət məntiqi (studiya və "Sizin məkanda") + Xidmətlər zaman şkalası
npm run build      # dist/ qovluğuna hazır sayt
npm run preview    # dist/-i lokal göstərir
```

## Hər şey haradadır

| Nə | Harada |
|---|---|
| Səhifənin quruluşu (bir şablon, 3 dil) | `src/template.html` |
| Mətnlər | `src/i18n/az.json`, `en.json`, `ru.json` |
| Telefon, koordinat, Instagram endpoint, GLB yolu | `src/js/config.js` |
| Qiymətlər | `src/js/pricing.js` (+ `tests/pricing.test.mjs`) |
| Rənglər, ölçülər | `src/styles/tokens.css` |
| Şriftlər (saytın özündə) | `src/styles/fonts.css`, `src/assets/fonts/` |
| 3D mikrofon modeli | `src/js/mic-model.js` |
| Scroll animasiyası (hero) | `src/js/hero3d.js` |
| Xidmətlər filmi: açar kadrlar | `src/js/services-stage.js` (dizayn prototipinin birə-bir köçürməsi) |
| Xidmətlər filmi: DOM, ScrollTrigger, statik versiya | `src/js/services.js` |
| Xidmətlər səhnəsinin SVG-si | `src/assets/services-stage.svg` (`data-t-*` atributları runtime şablonudur) |

`src/index.html`, `src/en/`, `src/ru/` avtomatik yaradılır (`scripts/render-pages.mjs`). Onları əl ilə dəyişmə, `template.html`-i və ya JSON-u dəyiş.

Qiymət dəyişəndə üç yer yenilənir: `src/js/pricing.js`, testdəki gözlənilən rəqəmlər və şablondakı ilkin rəqəmlər (JS işləməyəndə görünənlər).

## SEO faylları

- `sitemap.xml` və `robots.txt` build zamanı yaranır (`vite.config.js` → `seoFiles`, `scripts/seo-files.mjs`). Domen `SITE_URL`-dan gəlir (CI-da `vars.SITE_URL`); lokal build-də sitemap yoxdur. `public/robots.txt` yoxdur, əl ilə yaratma.
- JSON-LD (`LocalBusiness`: iş saatları, areaServed, qiymətlər) `scripts/render-pages.mjs` → `buildJsonLd`-dədir. Qiymətlər `pricing.js`-dən, adlar i18n-dən gəlir. Google Business linki `config.js` → `mapsUrl`-a yazılanda `hasMap` və `sameAs` özü əlavə olunur.
- `public/llms.txt` əl ilə yazılır (qiymət yoxdur, saytın qiymət bölməsinə istinad edir).

## 3D hero necə işləyir

- İlk ekranda statik mikrofon şəkli (`src/assets/mic-hero.webp`) görünür. Bu şəkil 3D-nin ilk kadrından çəkilib, ona görə 3D gələndə keçid görünmür. Three.js və GSAP ilk toxunuş və ya scroll-da işə düşür. Fayllarını isə səhifə yüklənib sakitləşəndə əvvəlcədən endirir (`modulepreload`, işə salmır): siyahını build `<meta name="ypod-lazy">`-ə yazır (`vite.config.js` → `lazyChunks`), `main.js` → `preloadLazy` oxuyur. 3D faylı yalnız 3D-li cihazda, `saveData`-da heç nə endirilmir.
- Hero mətni və düymələri yalnız `opacity` ilə gizlənir (`visibility` yox): klaviatura və ekran oxuyucu onları görür. Görünməyən düymələr basılmır (`pointer-events`), Tab ilə fokus gələndə səhifə mətnin göründüyü yerə sürüşür. Parıltı (`.hero-glow`) mikrofonun ardınca `transform` ilə gedir (`left/top` hər kadrda layout yaradırdı).
- Mikrofonun modeli və ya işığı dəyişəndə şəkli yenidən çək: `scripts/capture-mic.mjs` (istifadə qaydası faylın başındadır).
- 3D bu hallarda söndürülür və statik hero qalır: `prefers-reduced-motion`, WebGL olmaması, zəif telefon (`hardwareConcurrency ≤ 4`, toxunma ekranı). iPhone/iPad istisnadır: Safari orada nüvə sayını gizlədib 2–4 qaytarır.
- Hazır GLB modeli gələndə onu `public/models/mic.glb`-yə qoy və `config.js`-də `micModelUrl: 'models/mic.glb'` yaz. Model Draco ilə sıxılmalı və ≤ 1.5 MB olmalıdır.

## Şriftlər

Unbounded (yalnız 900) və Manrope (400–800, variable) Google Fonts-dan deyil, saytın özündən gəlir: iki əlavə server bağlantısı yoxdur, fayllar kiçikdir (AZ/EN səhifəsi ~54 KB, RU ~78 KB; əvvəl ~204 KB). Hər şrift latın (+AZ hərfləri, ₼, oxlar) və kiril hissəsinə bölünüb, brauzer `unicode-range`-ə görə yalnız lazım olanı endirir. Latın hissələri `template.html`-də `preload` olunur.

Fayllar Google Fonts reposundakı variable TTF-lərdən kəsilib (`pip install fonttools brotli`):

```bash
fonttools varLib.instancer 'Unbounded[wght].ttf' wght=900 -o U900.ttf
fonttools varLib.instancer 'Manrope[wght].ttf' wght=400:800 -o M.ttf
LAT="U+0020-007E,U+00A0-00FF,U+0100-017F,U+018F,U+0259,U+2010-2027,U+2030-203A,U+20AC,U+20BC,U+2122,U+2190-2199,U+2212,U+2248,U+2260,U+2264-2265,U+2713"
pyftsubset U900.ttf --unicodes="$LAT" --flavor=woff2 --no-hinting --output-file=unbounded-900-lat.woff2
pyftsubset U900.ttf --unicodes="U+0400-045F,U+2116" --flavor=woff2 --no-hinting --output-file=unbounded-900-cyr.woff2
# Manrope üçün eyni iki əmr (M.ttf → manrope-lat / manrope-cyr)
```

Başlıqda Unbounded-in başqa qalınlığı lazım olsa, faylı yenidən kəs (indiki faylda yalnız 900 var). Manrope-da böyük `Ə` yoxdur (Google versiyasında da yox idi), ehtiyat şriftlə çəkilir.

## Xidmətlər filmi necə işləyir

- Hero-dan sonra bölmə ekrana bərkidilir: aktiv olanda `position: fixed` (`is-active`), sonra bölmənin dibində (`is-past`). Sticky iOS/Safari-də scroll zamanı əsirdi. 6 səhnə: 1 kamera → 2 kamera → 3 kamera → Reels → Səyyar studiya → Montaj, sonda "Montaj gecikmir".
- Scroll uzunluğu = dizayndakı 700vh (mobil 600vh) + hər səhnənin sonunda "dayanma" (`HOLDS`, `STRETCH` — `services-stage.js`). Dayanmanı dəyişəndə `sections.css`-dəki bölmə hündürlüyünü də yenilə; `npm test` uyğunsuzluğu tutur.
- Chip (qiymət) öz səhnəsinin mətni ilə birlikdə gəlir və gedir. Addım düymələri səhnənin bitdiyi ana (dayanmanın başına) aparır.
- **Hazırda əl ilə sürüşdürmədir** (`config.js` → `stepScroll: false`, 2026-10-13): film scroll-a bağlıdır, dayanmalar qalır, addım düymələri səhnəyə özü aparır. Aşağıdakı addım-addım rejimi `stepScroll: true` ilə qayıdır (`services.js` → `initStepScroll`).
- Addım-addım scroll: zonada təkər, toxunma və klaviatura səhifəni birbaşa sürüşdürmür, hər jest növbəti dayanacağa aparır (`services.js` → `stopsY`, `step`). Dayanacaqlar: səhifənin başı → hero mətni (3D hero) → film (`buildScale().stops`). 3D-siz filmin başı S0 kadrıdır ("Siz danışın" bölmə girəndən görünür), ilk dayanacaq başdan S0-ın sonuna qədərdir. Final kadrından sonra (Brendlər, Qiymətlər) və zonadan kənarda adi scroll-dur, kənardan ətalətlə girən scroll dayanacaqda kəsilir. Animasiya vaxtı başlanan yeni jest yadda qalır. Addım müddəti `duration()`-dadır: film 1.2–2.4 s, S0 → S1 3 s, Səyyar 5 s, həkim → montaj 3.5 s (`SLOW`), hero 1.8 s.
- S5b-də həkim qolunu qaldırır (scroll-a bağlı) və dayanmada əl edir (zamana bağlı, GSAP). Qol SVG-yə çevirmə skriptində əlavə olunur (`arxiv/dc-stage-to-svg.mjs`).
- Bütün dəyərlər scroll faizindən (`p`) `computeStage()`-də hesablanır. Mətnlər HTML-dədir (`template.html` + i18n `services.*`), SVG-də mətn yoxdur.
- 3D hero olanda bölmə hero-nun son ekranının üstündən başlayır: hero pin-i `--hero-tail` qədər yerində qalır, mətn çıxır, halqa söner (`setRingIntensity`), ekran qaralır. Tam qaralandan sonra 3D çəkilmir (`setCovered`): Safari-də S0–S1 titrəməsi bundan idi. Kameraların və mətn keçidlərinin blur filtri götürülüb (Safari-də filtr ağırdır): mətnlər yalnız opacity + hərəkətlə gəlir.
- Safari hər SVG dəyişikliyində bütün səhnəni yenidən çəkir. Ona görə canlı detallar (SMIL: toz, nəbz, REC) film hərəkətdə olanda dayanır və kadr sakitləşəndən 0.3 s sonra davam edir. Vinyet SVG-də deyil, ayrıca CSS qatındadır (`.svc-vig`).
- Səhnə dizayn v3-dəndir (S5b: pəncərədən həkim kabinetinə, əsas kadr 80%). SVG-ni yeniləmək: `node arxiv/dc-stage-to-svg.mjs <ServicesStage.dc.html> src/assets/services-stage.svg`. Sonra `renderVals()`-dakı dəyişiklikləri `computeStage()`-ə köçür. Statik kartlarda hər SVG surətinin id-ləri unikal olur (`uniqueIds`): `#intClip` hər kartda fərqlidir.
- `prefers-reduced-motion`, zəif telefon (≤4 nüvə, ≤4 GB, toxunma ekranı) və ya `saveData` olanda film yoxdur: 6 kart alt-alta, şəkillər eyni səhnənin statik kadrlarıdır. JS işləməsə də kartlar görünür.
- Claude Design kadrlarını (`.dc.html`) PNG-yə çevirmək: `node scripts/dc-render.mjs <design-qovluğu> <çıxış>` (`--sweep d|m` ilə 0–100%). Google Chrome lazımdır.

## Instagram bölməsini qoşmaq

Hazırda bölmə gizlidir (`config.js`-də `instagram.demo: false`, `endpoint: null`). Aşağıdakı addımlarla worker qoşulub `endpoint` yazılanda bölmə özü görünəcək.

1. Instagram hesabı **Professional** (Business və ya Creator) olmalıdır.
2. [developers.facebook.com](https://developers.facebook.com)-da app yarat → "Instagram API with Instagram Login" əlavə et → @ypod.az-ı qoş → uzunmüddətli access token al.
3. Cloudflare-də pulsuz hesab aç, sonra `worker/` qovluğunda:
   ```bash
   npx wrangler login
   npx wrangler kv namespace create IG_KV     # çıxan id-ni wrangler.toml-a yaz
   npx wrangler secret put IG_TOKEN           # tokeni yapışdır
   npx wrangler deploy
   ```
4. `wrangler.toml`-da `ALLOW_ORIGIN`-ə saytın ünvanını yaz.
5. `src/js/config.js`-də `instagram.endpoint` = `https://ypod-instagram.<hesab>.workers.dev/api/instagram`.

Token həftədə bir dəfə avtomatik yenilənir. Worker cavabı 1 saat keşdə saxlayır.

## GitHub Pages-ə çıxarmaq

`.github/workflows/deploy.yml` `main` branch-ə hər push-da testləri işlədir, saytı build edir və Pages-ə yükləyir. Bir dəfəlik: repo → Settings → Pages → Source: **GitHub Actions**.

Domen (`ypod.az`) bağlananda: Settings → Variables → `SITE_URL=https://ypod.az` (hreflang və canonical üçün) və `public/CNAME` faylına `ypod.az` yaz.

## Doldurulmalı yerlər

| Yer | İndi |
|---|---|
| Google Maps profili | koordinatla axtarış linki (`config.js` → `mapsUrl`) |
| Studiya setup-ları (Xidmətlər filmi) | real foto yoxdur, stilizə edilmiş SVG |
| Y POD loqosu (kamera, furqon) | Unbounded mətni, rəsmi SVG gələndə əvəz et |
| Brend loqoları | 11 brend hələlik mətnlə (`template.html` → BRENDLƏR; sayı dəyişəndə zolağın müddəti də dəyişir) (zolaq siçanla və barmaqla sağa-sola sürüşdürülür, `main.js` → `marquee`) |
| Instagram | bölmə gizlidir, worker qoşulmayıb |
| EN / RU | qaralama tərcümə, dil bilən biri yoxlamalıdır |
| OG şəkli | `public/og/og-{az,en,ru}.jpg` (1200×630) + `public/apple-touch-icon.png`: mikrofon şəkli və i18n mətnindən (`hero.pill`, `hero.sub`) çəkilir. Mətn dəyişəndə: `node scripts/og-render.mjs`. `og:url`, JSON-LD `url`/`image` yalnız `SITE_URL` olanda yazılır |
