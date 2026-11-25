import { TestContext } from '../test-utils.ts';
import fs from 'fs';
import path from 'path';

export async function runUiComponentTests(): Promise<TestContext> {
  const ctx = new TestContext('UI Components - Props, Markup & Accessibility Contracts');

  // 1. GameShell コンポーネントのソースコード静的・構造的契約検証
  const shellSrc = fs.readFileSync(path.resolve('src/components/GameShell.tsx'), 'utf8');

  ctx.assert(shellSrc.includes('aria-label={t(\'howToPlay\')}'), 'GameShell: Help button has aria-label');
  ctx.assert(shellSrc.includes('aria-label={isMuted() ? t(\'soundUnmute\') : t(\'soundMute\')}'), 'GameShell: Sound toggle button has dynamic aria-label');
  ctx.assert(shellSrc.includes('aria-label={t(\'shareResult\')}'), 'GameShell: Share button has aria-label');
  ctx.assert(shellSrc.includes('aria-label={t(\'retryStage\')}'), 'GameShell: Retry button has aria-label');
  ctx.assert(shellSrc.includes('aria-label="Fullscreen"'), 'GameShell: Fullscreen button has aria-label');
  ctx.assert(shellSrc.includes('{localizedMeta().title}'), 'GameShell: Header displays localized game title');
  ctx.assert(shellSrc.includes('extraControls'), 'GameShell: Supports extraControls for in-game widgets');
  ctx.assert(shellSrc.includes('visualViewport'), 'GameShell: Handles mobile visualViewport resizing');

  // 2. LanguageSelector コンポーネントの契約検証
  const langSelectorSrc = fs.readFileSync(path.resolve('src/components/LanguageSelector.tsx'), 'utf8');
  ctx.assert(langSelectorSrc.includes('aria-label={t(\'selectLang\')}'), 'LanguageSelector: Toggle button has accessible aria-label');
  ctx.assert(langSelectorSrc.includes('LANG_OPTIONS'), 'LanguageSelector: Iterates over all supported language options');
  ctx.assert(langSelectorSrc.includes('setLang(code)'), 'LanguageSelector: Binds language switch handler');

  // 3. Home ゲームカード & 検索コンポーネントの契約検証
  const homeSrc = fs.readFileSync(path.resolve('src/pages/Home.tsx'), 'utf8');
  ctx.assert(homeSrc.includes('aria-label={t(\'searchPlaceholder\')}'), 'Home: Search input has accessible aria-label');
  ctx.assert(homeSrc.includes('aria-label={t(\'addToFav\')}'), 'Home: Favorite button has accessible aria-label');
  ctx.assert(homeSrc.includes('getLocalizedGame(game.id, game).title'), 'Home: Game card displays localized titles');
  ctx.assert(homeSrc.includes('getLocalizedGame(game.id, game).description'), 'Home: Game card displays localized descriptions');
  ctx.assert(homeSrc.includes('aria-label={t(\'dataSync\')}'), 'Home: Sync button has accessible aria-label');

  // 4. AdSense コンポーネントの安全契約検証
  const adSrc = fs.readFileSync(path.resolve('src/components/AdSense.tsx'), 'utf8');
  ctx.assert(adSrc.includes('adsbygoogle'), 'AdSense: Targets adsbygoogle initialization queue');
  ctx.assert(adSrc.includes('try') && adSrc.includes('catch'), 'AdSense: Wrapped in try-catch to prevent ad-blocker crashes');

  return ctx;
}
