// 2048ゲームロジック

export interface Tile {
  id: number;
  value: number;
  row: number;
  col: number;
  merged?: boolean;
}

export const TILE_CONFIG: Record<number, { emoji: string; name: string; bg: string; text: string }> = {
  2: { emoji: '🌱', name: 'つぼみ', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300', text: 'text-xs' },
  4: { emoji: '🌿', name: '若葉', bg: 'bg-green-100 text-green-800 dark:bg-green-950/80 dark:text-green-300', text: 'text-xs' },
  8: { emoji: '☘️', name: '三つ葉', bg: 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300', text: 'text-xs' },
  16: { emoji: '🌷', name: 'チューリップ', bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300', text: 'text-xs' },
  32: { emoji: '🌻', name: 'ひまわり', bg: 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300', text: 'text-xs' },
  64: { emoji: '🌹', name: 'バラ', bg: 'bg-red-200 text-red-900 dark:bg-red-950 dark:text-red-200', text: 'text-xs' },
  128: { emoji: '🌺', name: 'ハイビスカス', bg: 'bg-pink-200 text-pink-900 dark:bg-pink-950 dark:text-pink-200', text: 'text-xs' },
  256: { emoji: '🌸', name: '満開の桜', bg: 'bg-pink-300 text-pink-950 dark:bg-pink-900 dark:text-pink-100 font-bold', text: 'text-xs' },
  512: { emoji: '🌼', name: 'デイジー', bg: 'bg-yellow-300 text-yellow-950 dark:bg-yellow-800 dark:text-yellow-100 font-bold', text: 'text-xs' },
  1024: { emoji: '🪷', name: '蓮華', bg: 'bg-purple-300 text-purple-950 dark:bg-purple-900 dark:text-purple-100 font-bold shadow-md', text: 'text-[11px]' },
  2048: { emoji: '💐', name: '花束 (満開)', bg: 'bg-gradient-to-tr from-pink-400 via-rose-400 to-amber-300 text-white font-black shadow-lg shadow-rose-400/50', text: 'text-[10px]' },
};

let nextTileId = 1;

export function createEmptyGrid(): (Tile | null)[][] {
  return Array.from({ length: 4 }, () => Array(4).fill(null));
}

export function spawnRandomTile(grid: (Tile | null)[][]): { grid: (Tile | null)[][]; spawned: boolean } {
  const emptyCells: { r: number; c: number }[] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!grid[r][c]) emptyCells.push({ r, c });
    }
  }

  if (emptyCells.length === 0) return { grid, spawned: false };

  const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  const value = Math.random() < 0.9 ? 2 : 4;

  const newGrid = grid.map((row) => [...row]);
  newGrid[randomCell.r][randomCell.c] = {
    id: nextTileId++,
    value,
    row: randomCell.r,
    col: randomCell.c,
  };

  return { grid: newGrid, spawned: true };
}

export type Direction = 'up' | 'down' | 'left' | 'right';

export function moveGrid(
  grid: (Tile | null)[][],
  direction: Direction
): {
  grid: (Tile | null)[][];
  scoreGained: number;
  moved: boolean;
  mergedLevels: number[];
} {
  let moved = false;
  let scoreGained = 0;
  const mergedLevels: number[] = [];
  const newGrid: (Tile | null)[][] = createEmptyGrid();

  // 行または列のベクトル
  for (let i = 0; i < 4; i++) {
    const line: (Tile | null)[] = [];
    for (let j = 0; j < 4; j++) {
      if (direction === 'left') line.push(grid[i][j]);
      else if (direction === 'right') line.push(grid[i][3 - j]);
      else if (direction === 'up') line.push(grid[j][i]);
      else if (direction === 'down') line.push(grid[3 - j][i]);
    }

    // nullを除外
    const filtered = line.filter((t): t is Tile => t !== null);
    const mergedLine: (Tile | null)[] = [];

    for (let k = 0; k < filtered.length; k++) {
      if (k + 1 < filtered.length && filtered[k].value === filtered[k + 1].value) {
        const mergedVal = filtered[k].value * 2;
        scoreGained += mergedVal;
        mergedLevels.push(Math.log2(mergedVal));
        mergedLine.push({
          id: nextTileId++,
          value: mergedVal,
          row: 0,
          col: 0,
          merged: true,
        });
        k++; // スキップ
        moved = true;
      } else {
        mergedLine.push({ ...filtered[k], merged: false });
      }
    }

    // 4マスになるまで埋める
    while (mergedLine.length < 4) {
      mergedLine.push(null);
    }

    // 移動があったか確認
    for (let j = 0; j < 4; j++) {
      const orig =
        direction === 'left' ? grid[i][j] :
        direction === 'right' ? grid[i][3 - j] :
        direction === 'up' ? grid[j][i] :
        grid[3 - j][i];

      const current = mergedLine[j];
      if ((orig && !current) || (!orig && current) || (orig && current && orig.value !== current.value)) {
        moved = true;
      }

      // 座標の復元
      if (direction === 'left') {
        newGrid[i][j] = current ? { ...current, row: i, col: j } : null;
      } else if (direction === 'right') {
        newGrid[i][3 - j] = current ? { ...current, row: i, col: 3 - j } : null;
      } else if (direction === 'up') {
        newGrid[j][i] = current ? { ...current, row: j, col: i } : null;
      } else {
        newGrid[3 - j][i] = current ? { ...current, row: 3 - j, col: i } : null;
      }
    }
  }

  return { grid: newGrid, scoreGained, moved, mergedLevels };
}

export function isGameOverCheck(grid: (Tile | null)[][]): boolean {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!grid[r][c]) return false;
      // 右隣チェック
      if (c < 3 && grid[r][c]?.value === grid[r][c + 1]?.value) return false;
      // 下隣チェック
      if (r < 3 && grid[r][c]?.value === grid[r + 1][c]?.value) return false;
    }
  }
  return true;
}

export function has2048(grid: (Tile | null)[][]): boolean {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (grid[r][c]?.value === 2048) return true;
    }
  }
  return false;
}
