import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
const indexHtmlPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexHtmlPath)) {
  console.error('dist/index.html not found! Run vite build first.');
  process.exit(1);
}

const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

// Copy to 404.html
fs.writeFileSync(path.join(distDir, '404.html'), indexHtml);

// All game IDs from src/games/registry.ts
const gameIds = [
  'blossom-life',
  'petal-reversi',
  'mini-shogi',
  'standard-shogi',
  'blossom-chess',
  'gomoku-garden',
  'blossom-drop',
  'floris-2048',
  'memory-garden',
  'petal-solitaire',
  'bouquet-block',
  'petal-dash',
  'ito-toshi',
  'wire-maze',
  'lights-out',
  'sky-catapult',
  'room-escape',
  'ai-jailbreak',
  'ai-detective',
  'word-alchemy',
  'ai-courtroom',
  'semantic-word',
  'ar-slicer',
  'ar-hunter',
  'ar-catcher',
  'ar-bubble',
];

for (const id of gameIds) {
  const gameDir = path.join(distDir, 'game', id);
  fs.mkdirSync(gameDir, { recursive: true });
  fs.writeFileSync(path.join(gameDir, 'index.html'), indexHtml);
}

console.log(`Generated static routes for ${gameIds.length} games in dist/game/<id>/index.html`);
