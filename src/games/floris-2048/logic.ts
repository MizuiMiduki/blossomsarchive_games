// 2048ゲームロジック

export interface Tile {
  id: number;
  value: number;
  row: number;
  col: number;
  merged?: boolean;
  isNew?: boolean;
}

export const TILE_CONFIG: Record<number, { name: string; bg: string; text: string }> = {
  2: { name: '2', bg: 'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-100 font-extrabold', text: 'text-2xl sm:text-3xl' },
  4: { name: '4', bg: 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100 font-extrabold', text: 'text-2xl sm:text-3xl' },
  8: { name: '8', bg: 'bg-orange-200 text-orange-950 dark:bg-orange-800 dark:text-orange-100 font-extrabold', text: 'text-2xl sm:text-3xl' },
  16: { name: '16', bg: 'bg-orange-400 text-white font-extrabold shadow-xs', text: 'text-2xl sm:text-3xl' },
  32: { name: '32', bg: 'bg-orange-500 text-white font-extrabold shadow-xs', text: 'text-2xl sm:text-3xl' },
  64: { name: '64', bg: 'bg-rose-500 text-white font-extrabold shadow-xs', text: 'text-2xl sm:text-3xl' },
  128: { name: '128', bg: 'bg-yellow-400 text-white font-black shadow-md', text: 'text-xl sm:text-2xl' },
  256: { name: '256', bg: 'bg-yellow-500 text-white font-black shadow-md', text: 'text-xl sm:text-2xl' },
  512: { name: '512', bg: 'bg-yellow-600 text-white font-black shadow-md', text: 'text-xl sm:text-2xl' },
  1024: { name: '1024', bg: 'bg-amber-500 text-white font-black shadow-lg shadow-amber-500/30 ring-2 ring-yellow-300', text: 'text-lg sm:text-xl' },
  2048: { name: '2048', bg: 'bg-gradient-to-tr from-yellow-400 via-amber-500 to-rose-500 text-white font-black shadow-xl shadow-yellow-500/50 ring-2 ring-yellow-200', text: 'text-lg sm:text-xl' },
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
    isNew: true,
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
