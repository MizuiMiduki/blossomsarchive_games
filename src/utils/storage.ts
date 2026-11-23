// 完全クライアント完結のセーブデータ管理 (LocalStorage)

export interface GameStats {
  highScore: number;
  playCount: number;
  clearCount: number;
  bestTime?: number; // 秒数
  lastPlayedAt: number;
}

export interface UserSettings {
  darkMode: boolean;
  soundMuted: boolean;
  volume: number;
}

export interface AppData {
  version: number;
  settings: UserSettings;
  favorites: string[];
  stats: Record<string, GameStats>;
}

const STORAGE_KEY = 'blossomsarchive_games_data_v1';

const defaultData: AppData = {
  version: 1,
  settings: {
    darkMode: false,
    soundMuted: false,
    volume: 0.5,
  },
  favorites: [],
  stats: {},
};

export function loadAppData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultData };
    const parsed = JSON.parse(raw);
    return {
      ...defaultData,
      ...parsed,
      settings: { ...defaultData.settings, ...(parsed.settings || {}) },
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      stats: parsed.stats || {},
    };
  } catch {
    return { ...defaultData };
  }
}

export function saveAppData(data: AppData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

export function getGameStats(gameId: string): GameStats {
  const data = loadAppData();
  return (
    data.stats[gameId] || {
      highScore: 0,
      playCount: 0,
      clearCount: 0,
      lastPlayedAt: 0,
    }
  );
}

export function recordGamePlay(
  gameId: string,
  score: number,
  isClear: boolean = false,
  timeTaken?: number
): { isNewHighScore: boolean; isNewBestTime: boolean } {
  const data = loadAppData();
  const current = data.stats[gameId] || {
    highScore: 0,
    playCount: 0,
    clearCount: 0,
    lastPlayedAt: 0,
  };

  const isNewHighScore = score > current.highScore;
  const isNewBestTime = timeTaken !== undefined && (!current.bestTime || timeTaken < current.bestTime);

  const updated: GameStats = {
    ...current,
    highScore: Math.max(current.highScore, score),
    playCount: current.playCount + 1,
    clearCount: isClear ? current.clearCount + 1 : current.clearCount,
    bestTime: isNewBestTime ? timeTaken : current.bestTime,
    lastPlayedAt: Date.now(),
  };

  data.stats[gameId] = updated;
  saveAppData(data);

  return { isNewHighScore, isNewBestTime };
}

export function toggleFavorite(gameId: string): boolean {
  const data = loadAppData();
  const index = data.favorites.indexOf(gameId);
  let isFav = false;
  if (index >= 0) {
    data.favorites.splice(index, 1);
    isFav = false;
  } else {
    data.favorites.push(gameId);
    isFav = true;
  }
  saveAppData(data);
  return isFav;
}

export function isFavorite(gameId: string): boolean {
  const data = loadAppData();
  return data.favorites.includes(gameId);
}

// バックアップ JSON エクスポート
export function exportBackupJson(): string {
  const data = loadAppData();
  return JSON.stringify(data, null, 2);
}

// バックアップ JSON インポート
export function importBackupJson(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (typeof parsed !== 'object' || parsed === null) return false;
    saveAppData({
      ...defaultData,
      ...parsed,
      settings: { ...defaultData.settings, ...(parsed.settings || {}) },
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      stats: parsed.stats || {},
    });
    return true;
  } catch {
    return false;
  }
}
