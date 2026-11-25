import fs from 'fs';
import path from 'path';
import { GAME_TRANSLATIONS } from '../src/utils/gameTranslations.ts';
import { LANG_OPTIONS, SupportedLang } from '../src/utils/i18n.ts';
import { INDEXNOW_KEY, SITE_URL } from './indexnow-config.ts';

const distDir = path.resolve('dist');
const indexHtmlPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexHtmlPath)) {
  console.error('dist/index.html not found! Run vite build first.');
  process.exit(1);
}

const templateHtml = fs.readFileSync(indexHtmlPath, 'utf8');

// Copy to 404.html (SPA Fallback)
fs.writeFileSync(path.join(distDir, '404.html'), templateHtml);

const TODAY = new Date().toISOString().split('T')[0];

const HOME_METAS: Record<SupportedLang, { title: string; description: string }> = {
  ja: {
    title: 'BlossomsArchive Games - ミニゲームコレクション',
    description: 'ブラウザですぐ遊べる、軽量で美しいミニゲームポータル。登録不要・完全無料。',
  },
  en: {
    title: 'BlossomsArchive Games - Instant Web Mini-Game Collection',
    description: 'Play instant lightweight web mini-games in your browser. No installation or registration needed. 100% free.',
  },
  ru: {
    title: 'BlossomsArchive Games - Коллекция веб-мини-игр',
    description: 'Мгновенные мини-игры прямо в браузере. Без установки и регистрации. 100% бесплатно.',
  },
  ko: {
    title: 'BlossomsArchive Games - 무료 웹 미니게임 컬렉션',
    description: '브라우저에서 바로 즐기는 가볍고 세련된 웹 미니게임 포털. 설치 및 가입 불필요, 100% 무료.',
  },
  'zh-CN': {
    title: 'BlossomsArchive Games - 在线网页小游戏合集',
    description: '随时随地在浏览器中畅玩轻量网页小游戏。无需安装，无需注册，完全免费。',
  },
  'zh-TW': {
    title: 'BlossomsArchive Games - 線上網頁小遊戲合集',
    description: '隨時隨地在瀏覽器中暢玩輕量網頁小遊戲。無需安裝，無需註冊，完全免費。',
  },
};

// 全ゲームIDの抽出
const registryContent = fs.readFileSync(path.resolve('src/games/registry.ts'), 'utf8');
const idMatches = [...registryContent.matchAll(/id:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
const gameIds = [...new Set(idMatches)];

interface PageMetaOptions {
  lang: SupportedLang;
  title: string;
  description: string;
  canonicalPath: string; // e.g. '/', '/en', '/game/blossom-life', '/en/game/blossom-life'
  baseRoute: string;     // e.g. '/', '/game/blossom-life' (言語プレフィックスなし)
}

function buildLocalizedHtml(rawHtml: string, options: PageMetaOptions): string {
  const htmlLang =
    options.lang === 'zh-CN' ? 'zh-Hans' : options.lang === 'zh-TW' ? 'zh-Hant' : options.lang;

  const hreflangLinks = LANG_OPTIONS.map((opt) => {
    const prefix = opt.code === 'ja' ? '' : `/${opt.code}`;
    const targetUrl = `${SITE_URL}${prefix}${options.baseRoute === '/' ? '' : options.baseRoute}` || `${SITE_URL}/`;
    return `    <link rel="alternate" hreflang="${opt.code}" href="${targetUrl}" />`;
  }).join('\n');

  const xDefaultUrl = `${SITE_URL}${options.baseRoute === '/' ? '/' : options.baseRoute}`;
  const canonicalUrl = `${SITE_URL}${options.canonicalPath === '/' ? '/' : options.canonicalPath}`;

  const headInjections = `
    <link rel="canonical" href="${canonicalUrl}" />
${hreflangLinks}
    <link rel="alternate" hreflang="x-default" href="${xDefaultUrl}" />
  </head>`;

  let html = rawHtml;

  // 1. html lang
  html = html.replace(/<html(\s+[^>]*?)?lang="[^"]*"/i, `<html$1lang="${htmlLang}"`);

  // 2. title
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${options.title}</title>`);

  // 3. meta description
  if (html.includes('<meta name="description"')) {
    html = html.replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${options.description}" />`
    );
  }

  // 4. og:title
  if (html.includes('<meta property="og:title"')) {
    html = html.replace(
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:title" content="${options.title}" />`
    );
  }

  // 5. og:description
  if (html.includes('<meta property="og:description"')) {
    html = html.replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:description" content="${options.description}" />`
    );
  }

  // 6. canonical & alternate hreflangs
  html = html.replace('</head>', headInjections);

  return html;
}

// サイトマップ用エントリ
interface SitemapUrlEntry {
  loc: string;
  baseRoute: string;
  changefreq: 'daily' | 'weekly';
  priority: string;
}

const sitemapEntries: SitemapUrlEntry[] = [];

// ==========================================
// 1. ホーム画面の言語別静的HTML生成
// ==========================================
for (const opt of LANG_OPTIONS) {
  const lang = opt.code;
  const meta = HOME_METAS[lang];
  const isDefault = lang === 'ja';
  const canonicalPath = isDefault ? '/' : `/${lang}`;
  const outDir = isDefault ? distDir : path.join(distDir, lang);

  fs.mkdirSync(outDir, { recursive: true });
  const html = buildLocalizedHtml(templateHtml, {
    lang,
    title: meta.title,
    description: meta.description,
    canonicalPath,
    baseRoute: '/',
  });

  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');

  sitemapEntries.push({
    loc: `${SITE_URL}${canonicalPath === '/' ? '/' : canonicalPath}`,
    baseRoute: '/',
    changefreq: 'daily',
    priority: isDefault ? '1.0' : '0.9',
  });
}

// ==========================================
// 2. 全40ゲームの言語別静的HTML生成
// ==========================================
for (const id of gameIds) {
  const transMap = GAME_TRANSLATIONS[id];

  for (const opt of LANG_OPTIONS) {
    const lang = opt.code;
    const isDefault = lang === 'ja';
    const localized = transMap?.[lang] || transMap?.ja;

    const gameTitle = localized?.title || id;
    const gameSub = localized?.titleSub ? ` - ${localized.titleSub}` : '';
    const pageTitle = `${gameTitle}${gameSub} | BlossomsArchive Games`;
    const pageDesc = localized?.description || HOME_METAS[lang].description;

    const baseRoute = `/game/${id}`;
    const canonicalPath = isDefault ? baseRoute : `/${lang}${baseRoute}`;
    const outDir = isDefault ? path.join(distDir, 'game', id) : path.join(distDir, lang, 'game', id);

    fs.mkdirSync(outDir, { recursive: true });
    const html = buildLocalizedHtml(templateHtml, {
      lang,
      title: pageTitle,
      description: pageDesc,
      canonicalPath,
      baseRoute,
    });

    fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');

    sitemapEntries.push({
      loc: `${SITE_URL}${canonicalPath}`,
      baseRoute,
      changefreq: 'weekly',
      priority: isDefault ? '0.8' : '0.7',
    });
  }
}

// ==========================================
// 3. sitemap.xml の生成 (Google hreflang 準拠)
// ==========================================
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${sitemapEntries
  .map((entry) => {
    const xDefaultUrl = `${SITE_URL}${entry.baseRoute === '/' ? '/' : entry.baseRoute}`;
    const alternates = LANG_OPTIONS.map((opt) => {
      const prefix = opt.code === 'ja' ? '' : `/${opt.code}`;
      const url = `${SITE_URL}${prefix}${entry.baseRoute === '/' ? '' : entry.baseRoute}` || `${SITE_URL}/`;
      return `    <xhtml:link rel="alternate" hreflang="${opt.code}" href="${url}" />`;
    }).join('\n');

    return `  <url>
    <loc>${entry.loc}</loc>
${alternates}
    <xhtml:link rel="alternate" hreflang="x-default" href="${xDefaultUrl}" />
    <lastmod>${TODAY}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`;
  })
  .join('\n')}
</urlset>
`;

fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapXml.trim() + '\n', 'utf8');

// ==========================================
// 4. robots.txt の生成
// ==========================================
const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;

fs.writeFileSync(path.join(distDir, 'robots.txt'), robotsTxt, 'utf8');

// ==========================================
// 5. IndexNow キーファイルの生成 (<key>.txt)
// ==========================================
fs.writeFileSync(path.join(distDir, `${INDEXNOW_KEY}.txt`), INDEXNOW_KEY, 'utf8');

console.log(`✅ Generated multilingual static routes:`);
console.log(`   - Home pages: ${LANG_OPTIONS.length} languages`);
console.log(`   - Game pages: ${gameIds.length} games x ${LANG_OPTIONS.length} languages = ${gameIds.length * LANG_OPTIONS.length} static routes`);
console.log(`   - Total generated HTMLs: ${LANG_OPTIONS.length * (gameIds.length + 1)} pages`);
console.log(`   - sitemap.xml generated with ${sitemapEntries.length} localized URLs`);
console.log(`   - robots.txt generated with Sitemap declaration`);
console.log(`   - IndexNow key verification file: ${INDEXNOW_KEY}.txt`);
