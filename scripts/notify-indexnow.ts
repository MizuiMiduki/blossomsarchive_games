import fs from 'fs';
import path from 'path';
import { INDEXNOW_KEY, SITE_URL, HOST } from './indexnow-config.ts';

// 送信先 IndexNow エンドポイント
const INDEXNOW_ENDPOINTS = [
  'https://api.indexnow.org/indexnow',
  'https://www.bing.com/indexnow',
];

interface IndexNowPayload {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

function extractUrlsFromSitemap(): string[] {
  const sitemapPath = path.resolve('dist/sitemap.xml');
  if (fs.existsSync(sitemapPath)) {
    const xml = fs.readFileSync(sitemapPath, 'utf8');
    const locMatches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
    if (locMatches.length > 0) {
      return [...new Set(locMatches)];
    }
  }

  // フォールバック: ルートURL
  return [`${SITE_URL}/`];
}

async function notifyEndpoint(endpoint: string, payload: IndexNowPayload): Promise<{ status: number; text: string }> {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': 'BlossomsArchiveGames-IndexNow/1.0',
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text().catch(() => '');
    return { status: res.status, text };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 0, text: msg };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');

  const customUrls = args
    .map((arg) => {
      try {
        const parsed = new URL(arg);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          return parsed.toString();
        }
      } catch {}
      return null;
    })
    .filter((u): u is string => u !== null);

  const targetUrls = customUrls.length > 0 ? customUrls : extractUrlsFromSitemap();

  const keyLocation = `${SITE_URL}/${INDEXNOW_KEY}.txt`;

  const payload: IndexNowPayload = {
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation,
    urlList: targetUrls,
  };

  console.log('====================================================');
  console.log('             INDEXNOW NOTIFICATION RUNNER           ');
  console.log('====================================================');
  console.log(`Host:         ${payload.host}`);
  console.log(`Key:          ${payload.key}`);
  console.log(`KeyLocation:  ${payload.keyLocation}`);
  console.log(`Total URLs:   ${payload.urlList.length}`);
  console.log('----------------------------------------------------');

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE (No HTTP request dispatched)');
    console.log(`Sample URLs (first 5):`);
    payload.urlList.slice(0, 5).forEach((u) => console.log(`  - ${u}`));
    console.log('====================================================');
    return;
  }

  let anySuccess = false;

  for (const endpoint of INDEXNOW_ENDPOINTS) {
    console.log(`🚀 Dispatching ping to: ${endpoint} ...`);
    const result = await notifyEndpoint(endpoint, payload);

    if (result.status === 200 || result.status === 202) {
      console.log(`  ✓ SUCCESS: Status ${result.status} (${result.status === 200 ? 'OK' : 'Accepted'})`);
      anySuccess = true;
    } else if (result.status === 0) {
      console.warn(`  ⚠️ NETWORK NOTICE: ${result.text} (Offline or Sandbox environment)`);
    } else {
      console.warn(`  ⚠️ RESPONSE: Status ${result.status} - ${result.text || 'No response body'}`);
    }
  }

  console.log('----------------------------------------------------');
  if (anySuccess) {
    console.log('🎉 IndexNow submission completed successfully!');
  } else {
    console.log('ℹ️ IndexNow submission skipped or queued.');
  }
  console.log('====================================================');
}

main().catch((e) => {
  console.error('IndexNow execution error:', e);
});
