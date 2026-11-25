import { TestContext } from '../test-utils.ts';
import {
  loadAppData,
  saveAppData,
  recordGameStart,
  recordGamePlay,
  updateHighScore,
  getGameStats,
  toggleFavorite,
  exportBackupJson,
  importBackupJson,
} from '../../src/utils/storage.ts';
import {
  serializeForSync,
  deserializeFromSync,
  mergeIncomingData,
} from '../../src/utils/sync.ts';

// モック localStorage
class MockStorage {
  private store: Record<string, string> = {};
  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }
  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }
  removeItem(key: string): void {
    delete this.store[key];
  }
  clear(): void {
    this.store = {};
  }
}

export async function runStorageUnitTests(): Promise<TestContext> {
  const ctx = new TestContext('Unit - Storage & Save Data Logic');

  // グローバル localStorage をセットアップ
  (globalThis as any).localStorage = new MockStorage();

  // 1. 初期ロード（空の状態）
  const initial = loadAppData();
  ctx.assert(Boolean(initial), 'loadAppData returns default object');
  ctx.assertEqual(initial.favorites.length, 0, 'Initial favorites array is empty');
  ctx.assert(typeof initial.stats === 'object', 'Initial stats is an object');

  // 2. お気に入りトグル
  toggleFavorite('blossom-life');
  let data = loadAppData();
  ctx.assert(data.favorites.includes('blossom-life'), 'Game added to favorites');
  toggleFavorite('blossom-life');
  data = loadAppData();
  ctx.assert(!data.favorites.includes('blossom-life'), 'Game removed from favorites on second toggle');

  // 3. ゲームプレイ回数記録
  recordGameStart('blossom-life');
  let stats = getGameStats('blossom-life');
  ctx.assertEqual(stats.playCount, 1, 'playCount incremented to 1 on game start');

  recordGamePlay('blossom-life', 500, true);
  stats = getGameStats('blossom-life');
  ctx.assertEqual(stats.highScore, 500, 'HighScore updated to 500 on win');
  ctx.assertEqual(stats.clearCount, 1, 'clearCount incremented to 1');

  // 低いスコアでは更新されないこと
  const updated = updateHighScore('blossom-life', 300);
  ctx.assert(!updated, 'updateHighScore returns false when new score is lower');
  stats = getGameStats('blossom-life');
  ctx.assertEqual(stats.highScore, 500, 'HighScore remains 500');

  // 高いスコアで更新されること
  const updatedHigher = updateHighScore('blossom-life', 800);
  ctx.assert(updatedHigher, 'updateHighScore returns true when new score is higher');
  stats = getGameStats('blossom-life');
  ctx.assertEqual(stats.highScore, 800, 'HighScore updated to 800');

  // 4. JSON エクスポート & インポート
  const exportedJson = exportBackupJson();
  ctx.assert(typeof exportedJson === 'string', 'exportBackupJson returns JSON string');
  ctx.assert(exportedJson.includes('"blossom-life"'), 'Exported JSON contains blossom-life data');

  // インポート（不正な JSON の耐性）
  const invalidImport = importBackupJson('corrupted {json');
  ctx.assert(!invalidImport, 'importBackupJson gracefully fails on invalid JSON string');

  // インポート（正常系）
  const validImport = importBackupJson(exportedJson);
  ctx.assert(validImport, 'importBackupJson succeeds on valid exported JSON');

  // 5. 同期シリアライズ & デシリアライズ
  const latestData = loadAppData();
  const syncCode = serializeForSync(latestData);
  ctx.assert(typeof syncCode === 'string' && syncCode.length > 0, 'serializeForSync returns string');
  const deserialized = deserializeFromSync(syncCode);
  ctx.assert(Boolean(deserialized), 'deserializeFromSync successfully parses sync string');
  ctx.assertEqual(deserialized?.stats?.['blossom-life']?.highScore, 800, 'Deserialized stats retain highScore');

  // 不正同期文字列
  const invalidSync = deserializeFromSync('invalid_sync_code!#$');
  ctx.assertEqual(invalidSync, null, 'deserializeFromSync returns null for invalid sync code');

  // マージ処理
  const incoming = {
    stats: {
      'petal-reversi': {
        highScore: 1200,
        playCount: 5,
        clearCount: 3,
        lastPlayedAt: Date.now(),
      },
      'blossom-life': {
        highScore: 600, // ローカルの 800 より低い
        playCount: 1,
        clearCount: 0,
        lastPlayedAt: Date.now(),
      },
    },
    favorites: ['petal-reversi'],
  };
  const { merged } = mergeIncomingData(incoming);
  ctx.assert(merged.favorites.includes('petal-reversi'), 'Merged favorites include incoming items');
  ctx.assertEqual(merged.stats['blossom-life'].highScore, 800, 'Higher local score retained during merge');
  ctx.assertEqual(merged.stats['petal-reversi'].highScore, 1200, 'New incoming game score adopted during merge');

  return ctx;
}
