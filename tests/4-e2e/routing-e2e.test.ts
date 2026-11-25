import { TestContext } from '../test-utils.ts';
import fs from 'fs';
import path from 'path';
import { GAMES } from '../../src/games/registry.ts';
import { LANG_OPTIONS } from '../../src/utils/i18n.ts';

export async function runRoutingE2eTests(): Promise<TestContext> {
  const ctx = new TestContext('E2E - Production Routing, Multilingual Static Entrypoints & Canonical Link Integrity');

  const distDir = path.resolve('dist');
  if (!fs.existsSync(distDir)) {
    console.log('    ℹ️ dist/ not built yet. Skipping E2E static file tests until build is completed.');
    return ctx;
  }

  // 1. トップページ & SPA フォールバック (404.html)
  const indexHtml = path.join(distDir, 'index.html');
  const fallback404 = path.join(distDir, '404.html');
  ctx.assert(fs.existsSync(indexHtml), 'dist/index.html exists and is accessible');
  ctx.assert(fs.existsSync(fallback404), 'dist/404.html exists for SPA client-side fallback');

  // 2. 全40ゲームの静的ルート
  let missingGameRoutes: string[] = [];
  for (const game of GAMES) {
    const p = path.join(distDir, 'game', game.id, 'index.html');
    if (!fs.existsSync(p)) missingGameRoutes.push(game.id);
  }
  ctx.assertEqual(missingGameRoutes.length, 0, `All 40 games have dedicated static entrypoints in dist/game/<id>/index.html`);

  // 3. 多言語静的ルートの網羅性 (6言語 x 40ゲーム + 6ホーム = 246ファイル)
  let totalLocalizedPages = 0;
  for (const opt of LANG_OPTIONS) {
    const lang = opt.code;
    const isDefault = lang === 'ja';
    const homeHtml = isDefault ? path.join(distDir, 'index.html') : path.join(distDir, lang, 'index.html');
    ctx.assert(fs.existsSync(homeHtml), `Home page exists for language ${lang}`);
    if (fs.existsSync(homeHtml)) totalLocalizedPages++;

    for (const game of GAMES) {
      const gameHtml = isDefault
        ? path.join(distDir, 'game', game.id, 'index.html')
        : path.join(distDir, lang, 'game', game.id, 'index.html');
      if (fs.existsSync(gameHtml)) totalLocalizedPages++;
    }
  }
  ctx.assertEqual(totalLocalizedPages, 246, 'All 246 multilingual static route pages exist in production build');

  // 4. HTML メタデータの E2E 整合性検証
  const sampleEnGameHtml = fs.readFileSync(path.join(distDir, 'en', 'game', 'blossom-life', 'index.html'), 'utf8');
  ctx.assert(sampleEnGameHtml.includes('lang="en"'), 'English static page contains lang="en" attribute');
  ctx.assert(sampleEnGameHtml.includes('href="https://games.blossomsarchive.com/en/game/blossom-life"'), 'English static page has correct canonical URL');
  ctx.assert(sampleEnGameHtml.includes('hreflang="ja"'), 'English static page has alternate hreflang links');
  ctx.assert(sampleEnGameHtml.includes('hreflang="x-default"'), 'English static page includes x-default fallback');

  return ctx;
}
