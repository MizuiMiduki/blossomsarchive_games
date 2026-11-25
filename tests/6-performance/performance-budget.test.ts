import { TestContext } from '../test-utils.ts';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

export async function runPerformanceBudgetTests(): Promise<TestContext> {
  const ctx = new TestContext('Performance - Bundle Size Budgets, Code Splitting & Chunk Thresholds');

  const distAssets = path.resolve('dist/assets');
  if (!fs.existsSync(distAssets)) {
    console.log('    ℹ️ dist/assets not built yet. Run build first to test asset budgets.');
    return ctx;
  }

  const files = fs.readdirSync(distAssets);

  // 1. メイン JS チャンクのサイズ制限 (<= 200 KB, gzip <= 65 KB)
  const mainJsFile = files.find((f) => f.startsWith('index-') && f.endsWith('.js'));
  ctx.assert(Boolean(mainJsFile), 'Main JS bundle exists in dist/assets');
  if (mainJsFile) {
    const rawBytes = fs.readFileSync(path.join(distAssets, mainJsFile));
    const gzipBytes = zlib.gzipSync(rawBytes).length;
    const rawKb = rawBytes.length / 1024;
    const gzipKb = gzipBytes / 1024;

    console.log(`    ℹ️ Main JS chunk: ${rawKb.toFixed(1)} kB (gzip: ${gzipKb.toFixed(1)} kB)`);
    ctx.assert(rawKb <= 200, `Main JS chunk is under 200 kB (actual: ${rawKb.toFixed(1)} kB)`);
    ctx.assert(gzipKb <= 65, `Main JS chunk gzip is under 65 kB (actual: ${gzipKb.toFixed(1)} kB)`);
  }

  // 2. CSS バンドルのサイズ制限 (<= 150 KB, gzip <= 25 KB)
  const cssFile = files.find((f) => f.startsWith('index-') && f.endsWith('.css'));
  ctx.assert(Boolean(cssFile), 'CSS bundle exists in dist/assets');
  if (cssFile) {
    const rawBytes = fs.readFileSync(path.join(distAssets, cssFile));
    const gzipBytes = zlib.gzipSync(rawBytes).length;
    const rawKb = rawBytes.length / 1024;
    const gzipKb = gzipBytes / 1024;

    console.log(`    ℹ️ CSS bundle: ${rawKb.toFixed(1)} kB (gzip: ${gzipKb.toFixed(1)} kB)`);
    ctx.assert(rawKb <= 150, `CSS bundle is under 150 kB (actual: ${rawKb.toFixed(1)} kB)`);
    ctx.assert(gzipKb <= 25, `CSS bundle gzip is under 25 kB (actual: ${gzipKb.toFixed(1)} kB)`);
  }

  // 3. サードパーティライブラリの manualChunks 分割検証
  const hasVendorQrcode = files.some((f) => f.includes('vendor-qrcode'));
  const hasVendorConfetti = files.some((f) => f.includes('vendor-confetti'));
  ctx.assert(hasVendorQrcode, 'Heavy dependency "qrcode" is isolated into a separate vendor chunk');
  ctx.assert(hasVendorConfetti, 'Heavy dependency "canvas-confetti" is isolated into a separate vendor chunk');

  // 4. 全40ゲームの lazy コード分割検証 (registry.ts)
  const registrySrc = fs.readFileSync(path.resolve('src/games/registry.ts'), 'utf8');
  ctx.assert(registrySrc.includes('lazy('), 'registry.ts uses Solid.js lazy() for all game components');
  const lazyMatches = [...registrySrc.matchAll(/lazy\(\(\)\s*=>\s*import\(/g)];
  ctx.assertEqual(lazyMatches.length, 40, 'All 40 games are dynamically loaded via lazy imports');

  // 5. 各ゲームチャンクのサイズ検証 (各 <= 60 KB)
  const gameChunks = files.filter((f) => f.endsWith('.js') && f.includes('Game-'));
  ctx.assert(gameChunks.length >= 25, `Game chunks are individually generated (found: ${gameChunks.length})`);
  let oversizedChunks: string[] = [];
  for (const chunk of gameChunks) {
    const sizeKb = fs.statSync(path.join(distAssets, chunk)).size / 1024;
    if (sizeKb > 60) oversizedChunks.push(`${chunk} (${sizeKb.toFixed(1)} kB)`);
  }
  ctx.assertEqual(oversizedChunks.length, 0, 'No individual game chunk exceeds 60 kB budget');

  return ctx;
}
