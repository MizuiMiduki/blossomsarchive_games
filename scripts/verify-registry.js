import fs from 'fs';
import path from 'path';

// src/games/registry.ts のすべてのゲームコンポーネントインポートと構文を検証
const registryPath = path.resolve('src/games/registry.ts');
const registryCode = fs.readFileSync(registryPath, 'utf8');

// インポートパスを抽出
const importMatches = [...registryCode.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);

console.log(`Checking ${importMatches.length} imports in registry.ts...`);
let hasError = false;

for (const imp of importMatches) {
  if (imp.startsWith('.')) {
    const fullPath = path.resolve('src/games', imp);
    if (!fs.existsSync(fullPath)) {
      console.error(`ERROR: Import target not found: ${fullPath}`);
      hasError = true;
    }
  }
}

// すべてのゲーム定義の必須プロパティチェック
const idMatches = [...registryCode.matchAll(/id:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
console.log(`Total registered games: ${idMatches.length}`);

// 重複チェック
const duplicateIds = idMatches.filter((item, index) => idMatches.indexOf(item) !== index);
if (duplicateIds.length > 0) {
  console.error(`ERROR: Duplicate game IDs found:`, duplicateIds);
  hasError = true;
} else {
  console.log(`✓ No duplicate game IDs.`);
}

if (!hasError) {
  console.log('✓ All registry imports and IDs verified successfully!');
} else {
  process.exit(1);
}
