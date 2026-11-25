import { TestContext } from '../test-utils.ts';
import {
  loadAppData,
  saveAppData,
  recordGameStart,
  recordGamePlay,
  getGameStats,
} from '../../src/utils/storage.ts';

export async function runGameLifecycleIntegrationTests(): Promise<TestContext> {
  const ctx = new TestContext('Integration - Game Lifecycle & Save Persistence Pipeline');

  // モックストレージ
  const mockStore: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => mockStore[k] ?? null,
    setItem: (k: string, v: string) => {
      mockStore[k] = String(v);
    },
    clear: () => {
      for (const k in mockStore) delete mockStore[k];
    },
  };

  const testGameId = 'petal-reversi';

  // 1. セッション開始
  recordGameStart(testGameId);
  let stats = getGameStats(testGameId);
  ctx.assertEqual(stats.playCount, 1, 'Step 1: Session started, play count registered');
  ctx.assertEqual(stats.highScore, 0, 'Step 1: High score initialized to 0');

  // 2. ステージクリア（勝利）
  recordGamePlay(testGameId, 320, true);
  stats = getGameStats(testGameId);
  ctx.assertEqual(stats.highScore, 320, 'Step 2: Victory achieved, score 320 saved');
  ctx.assertEqual(stats.clearCount, 1, 'Step 2: Clear count updated to 1');

  // 3. ストレージ生データの整合性確認
  const rawSaved = mockStore['blossomsarchive_games_data_v1'];
  ctx.assert(Boolean(rawSaved), 'Step 3: Data persisted to raw localStorage key');
  const parsed = JSON.parse(rawSaved);
  ctx.assertEqual(parsed.stats[testGameId].highScore, 320, 'Step 3: Stored JSON matches in-memory stats');

  // 4. 次回起動時の復元テスト
  const reloaded = loadAppData();
  ctx.assertEqual(reloaded.stats[testGameId].highScore, 320, 'Step 4: Reloaded app data maintains high score');
  ctx.assertEqual(reloaded.stats[testGameId].clearCount, 1, 'Step 4: Reloaded app data maintains clear count');

  // 5. 敗北時（ゲームオーバー）のスコア・クリア回数処理
  recordGamePlay(testGameId, 150, false);
  stats = getGameStats(testGameId);
  ctx.assertEqual(stats.highScore, 320, 'Step 5: Defeat with lower score does not overwrite high score');
  ctx.assertEqual(stats.clearCount, 1, 'Step 5: Defeat does not increment clear count');

  return ctx;
}
