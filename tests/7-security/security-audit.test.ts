import { TestContext } from '../test-utils.ts';
import fs from 'fs';
import path from 'path';

export async function runSecurityAuditTests(): Promise<TestContext> {
  const ctx = new TestContext('Security - XSS Prevention, Input Sanitization & CWE-20 Defenses');

  // 1. ソースコード全体 (src/) の静的 XSS & 不安全コードスキャン
  const srcDir = path.resolve('src');
  const dangerousPatterns = [
    { pattern: /dangerouslySetInnerHTML/i, name: 'dangerouslySetInnerHTML' },
    { pattern: /\beval\s*\(/i, name: 'eval()' },
    { pattern: /new\s+Function\s*\(/i, name: 'new Function()' },
    { pattern: /\.innerHTML\s*=/i, name: 'innerHTML assignment' },
    { pattern: /\.outerHTML\s*=/i, name: 'outerHTML assignment' },
    { pattern: /javascript:\s*/i, name: 'javascript: URI protocol' },
  ];

  let violations: string[] = [];

  function scanDir(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        scanDir(full);
      } else if (ent.isFile() && (ent.name.endsWith('.ts') || ent.name.endsWith('.tsx'))) {
        const content = fs.readFileSync(full, 'utf8');
        for (const { pattern, name } of dangerousPatterns) {
          if (pattern.test(content)) {
            violations.push(`${path.relative(process.cwd(), full)} contains prohibited construct "${name}"`);
          }
        }
      }
    }
  }

  scanDir(srcDir);
  ctx.assertEqual(violations.length, 0, 'No unsafe XSS vectors (eval, innerHTML, dangerouslySetInnerHTML) found in src/');

  // 2. IndexNow / 外部通信スクリプトの URL ホストサニタイズ検証 (CWE-20 / CodeQL 対策)
  const notifyScript = fs.readFileSync(path.resolve('scripts/notify-indexnow.ts'), 'utf8');
  ctx.assert(
    notifyScript.includes('new URL('),
    'notify-indexnow.ts parses URLs with new URL() instead of substring matching'
  );
  ctx.assert(
    !notifyScript.includes('url.includes("api.indexnow.org")'),
    'notify-indexnow.ts does not perform vulnerable substring matching on target endpoint'
  );

  // 3. P2P & URL 同期入力のインジェクション耐性 (プロトタイプ汚染 & 不正JSON)
  const syncScript = fs.readFileSync(path.resolve('src/utils/storage.ts'), 'utf8');
  ctx.assert(syncScript.includes('try') && syncScript.includes('catch'), 'Data deserialization logic is protected with try-catch');

  // 4. package.json の依存関係ライセンス & 安全性
  const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
  ctx.assertEqual(pkg.private, true, 'package.json marked as private: true to prevent accidental publish');
  ctx.assert(Boolean(pkg.license), 'Project has an explicit Open Source License');

  return ctx;
}
