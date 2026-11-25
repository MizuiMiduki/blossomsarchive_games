import { TestContext } from '../test-utils.ts';
import { AppData } from '../../src/utils/storage.ts';
import {
  serializeForSync,
  deserializeFromSync,
  mergeIncomingData,
} from '../../src/utils/sync.ts';

export async function runDataSyncIntegrationTests(): Promise<TestContext> {
  const ctx = new TestContext('Integration - Cross-Device Sync Protocol & Conflict Resolution');

  // 端末 A (スマホ) のセーブデータ
  const deviceAData: AppData = {
    stats: {
      'blossom-life': { highScore: 450, playCount: 8, clearCount: 3, lastPlayedAt: 1000 },
      'floris-2048': { highScore: 8192, playCount: 20, clearCount: 5, lastPlayedAt: 1500 },
    },
    favorites: ['floris-2048'],
    settings: { soundMuted: false, darkMode: true },
  };

  // 端末 B (PC) のセーブデータ
  const deviceBData: AppData = {
    stats: {
      'blossom-life': { highScore: 900, playCount: 15, clearCount: 8, lastPlayedAt: 2000 }, // PCの方がハイスコア
      'gomoku-garden': { highScore: 300, playCount: 2, clearCount: 1, lastPlayedAt: 1200 },
    },
    favorites: ['blossom-life'],
    settings: { soundMuted: true, darkMode: false },
  };

  // 1. 端末 A から同期用シリアライズコード生成（QR / URL クエリ）
  // global localStorage に端末 A のデータをセット
  const mockStore: Record<string, string> = {
    blossomsarchive_games_data_v1: JSON.stringify(deviceAData),
  };
  (globalThis as any).localStorage = {
    getItem: (k: string) => mockStore[k] ?? null,
    setItem: (k: string, v: string) => {
      mockStore[k] = String(v);
    },
  };

  const syncPayload = serializeForSync(deviceAData);
  ctx.assert(typeof syncPayload === 'string' && syncPayload.length > 0, 'Device A: Generated sync payload');

  // URL に乗る形式か検証 (URL safe な Base64)
  const urlSafe = encodeURIComponent(syncPayload);
  ctx.assertEqual(urlSafe, syncPayload, 'Sync payload is URI-safe and suitable for QR and URLs');

  // 2. 端末 B でデシリアライズ
  const incoming = deserializeFromSync(syncPayload);
  ctx.assert(Boolean(incoming), 'Device B: Successfully decoded sync payload');

  // 3. 端末 B の既存データとマージ
  mockStore.blossomsarchive_games_data_v1 = JSON.stringify(deviceBData);
  const { merged } = mergeIncomingData(incoming!);

  // 検証:
  // - blossom-life は端末 B (900) が端末 A (450) より高いので 900 が保持される
  ctx.assertEqual(merged.stats['blossom-life'].highScore, 900, 'Conflict resolution: Higher score 900 retained for blossom-life');
  // - floris-2048 は端末 A から引き継がれる
  ctx.assertEqual(merged.stats['floris-2048'].highScore, 8192, 'Missing game floris-2048 imported to Device B');
  // - gomoku-garden は端末 B のものが保持される
  ctx.assertEqual(merged.stats['gomoku-garden'].highScore, 300, 'Existing Device B game gomoku-garden retained');
  // - お気に入りは重複なしで union マージされる
  ctx.assert(merged.favorites.includes('blossom-life') && merged.favorites.includes('floris-2048'), 'Favorites merged additively without duplicates');

  return ctx;
}
