// サーバーレス・DBレス 複数端末データ同期モジュール (QRコード & URLハッシュ)
import QRCode from 'qrcode';
import { AppData, loadAppData, saveAppData, GameStats } from './storage.ts';

// 圧縮用のコンパクトなDTO形式
interface CompactSyncData {
  v: number; // version
  f: string[]; // favorites
  s: Record<string, [number, number, number]>; // gameId -> [highScore, playCount, clearCount]
}

// データをBase64 URLセーフ文字列に圧縮
export function serializeForSync(data: AppData): string {
  const compact: CompactSyncData = {
    v: data.version,
    f: data.favorites,
    s: {},
  };

  for (const [gameId, stats] of Object.entries(data.stats)) {
    if (stats.highScore > 0 || stats.playCount > 0) {
      compact.s[gameId] = [stats.highScore, stats.playCount, stats.clearCount];
    }
  }

  const json = JSON.stringify(compact);
  // UTF-8対応のBase64エンコード
  const base64 = btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, p1) => {
    return String.fromCharCode(parseInt(p1, 16));
  }));
  return base64;
}

// Base64文字列からデータを復元
export function deserializeFromSync(encoded: string): Partial<AppData> | null {
  try {
    const json = decodeURIComponent(
      Array.prototype.map
        .call(atob(encoded), (c: string) => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    const compact: CompactSyncData = JSON.parse(json);
    if (!compact || typeof compact !== 'object') return null;

    const stats: Record<string, GameStats> = {};
    if (compact.s) {
      for (const [gameId, arr] of Object.entries(compact.s)) {
        stats[gameId] = {
          highScore: arr[0] || 0,
          playCount: arr[1] || 0,
          clearCount: arr[2] || 0,
          lastPlayedAt: Date.now(),
        };
      }
    }

    return {
      version: compact.v || 1,
      favorites: Array.isArray(compact.f) ? compact.f : [],
      stats,
    };
  } catch (e) {
    console.error('Failed to deserialize sync data:', e);
    return null;
  }
}

// 同期用URLを生成
export function createSyncUrl(data: AppData): string {
  const encoded = serializeForSync(data);
  const base = window.location.origin + window.location.pathname;
  return `${base}?sync=${encoded}`;
}

// QRコード画像を生成 (DataURL)
export async function createQrCodeDataUrl(url: string): Promise<string> {
  try {
    return await QRCode.toDataURL(url, {
      width: 256,
      margin: 2,
      color: {
        dark: '#0f172a', // スレートカラーのQRコード
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('QR code generation failed:', err);
    return '';
  }
}

// 既存データと外部データの「安全なマージ」
export function mergeIncomingData(incoming: Partial<AppData>): { merged: AppData; updatedScoresCount: number } {
  const current = loadAppData();
  let updatedScoresCount = 0;

  // 1. お気に入りのマージ (重複排除)
  const favSet = new Set([...current.favorites, ...(incoming.favorites || [])]);
  const newFavorites = Array.from(favSet);

  // 2. スコア・実績のマージ (高い方を優先)
  const mergedStats: Record<string, GameStats> = { ...current.stats };

  if (incoming.stats) {
    for (const [gameId, inc] of Object.entries(incoming.stats)) {
      const cur = mergedStats[gameId] || {
        highScore: 0,
        playCount: 0,
        clearCount: 0,
        lastPlayedAt: 0,
      };

      if (inc.highScore > cur.highScore) {
        updatedScoresCount++;
      }

      mergedStats[gameId] = {
        highScore: Math.max(cur.highScore, inc.highScore),
        playCount: cur.playCount + inc.playCount,
        clearCount: cur.clearCount + inc.clearCount,
        lastPlayedAt: Math.max(cur.lastPlayedAt, inc.lastPlayedAt || 0),
      };
    }
  }

  const merged: AppData = {
    ...current,
    favorites: newFavorites,
    stats: mergedStats,
  };

  saveAppData(merged);
  return { merged, updatedScoresCount };
}
