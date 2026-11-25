import { TestContext } from '../test-utils.ts';
import fs from 'fs';
import path from 'path';

export async function runVisualRegressionTests(): Promise<TestContext> {
  const ctx = new TestContext('Visual Regression - Viewport Scalability, Contrast & Theme Rules');

  // 1. index.html の Viewport 設定（Lighthouse 監査でズーム制限がないことの検証）
  const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf8');
  ctx.assert(indexHtml.includes('<meta name="viewport"'), 'index.html contains meta viewport tag');
  ctx.assert(!indexHtml.includes('user-scalable=no'), 'Viewport does not disable user-scalable (Prevents a11y failure)');
  ctx.assert(!indexHtml.includes('maximum-scale=1.0'), 'Viewport does not restrict maximum-scale (Prevents a11y failure)');
  ctx.assert(indexHtml.includes('width=device-width'), 'Viewport sets width=device-width');

  // 2. テーマ切り替え定義の検証
  const cssPath = path.resolve('src/index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  ctx.assert(cssContent.includes('@import "tailwindcss";') || cssContent.includes('@theme'), 'Tailwind CSS is properly initialized');

  // 3. コントラスト比アンチパターンの静的検査
  // bg-slate-100 上で text-slate-400 / text-slate-500 はコントラスト比 < 4.5:1 になりやすい。
  // 今回の修正で text-slate-600 や dark:text-slate-400 に置き換わっているか検証する
  const lifeGameSrc = fs.readFileSync(path.resolve('src/games/life-game/BlossomLifeGame.tsx'), 'utf8');
  ctx.assert(
    !lifeGameSrc.includes('text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'),
    'BlossomLifeGame: Low-contrast text-slate-500 on light bg is replaced with text-slate-600'
  );

  // 4. GameShell のレスポンシブコンテナ定義
  const shellSrc = fs.readFileSync(path.resolve('src/components/GameShell.tsx'), 'utf8');
  ctx.assert(shellSrc.includes('fixed inset-0'), 'GameShell container pins to viewport');
  ctx.assert(shellSrc.includes('env(safe-area-inset-top)'), 'GameShell handles mobile notch/safe-area-inset-top');
  ctx.assert(shellSrc.includes('env(safe-area-inset-bottom)'), 'GameShell handles mobile home indicator/safe-area-inset-bottom');

  return ctx;
}
