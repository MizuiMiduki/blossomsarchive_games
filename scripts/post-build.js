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

// Dynamically extract all game IDs from src/games/registry.ts
const registryContent = fs.readFileSync(path.resolve('src/games/registry.ts'), 'utf8');
const idMatches = [...registryContent.matchAll(/id:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
const gameIds = [...new Set(idMatches)];

for (const id of gameIds) {
  const gameDir = path.join(distDir, 'game', id);
  fs.mkdirSync(gameDir, { recursive: true });
  fs.writeFileSync(path.join(gameDir, 'index.html'), indexHtml);
}

console.log(`Generated static routes for ${gameIds.length} games in dist/game/<id>/index.html`);
