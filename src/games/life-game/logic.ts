// モダナイズド・ライフゲーム (Blossom Life) ロジック & プリセット

export const LIFE_GRID_W = 45;
export const LIFE_GRID_H = 45;

export interface Cell {
  alive: boolean;
  age: number; // 生存世代数 (0: 誕生, 高いほど大輪の花へ進化)
}

export type LifeGrid = Cell[][];

export function createEmptyLifeGrid(): LifeGrid {
  return Array.from({ length: LIFE_GRID_H }, () =>
    Array.from({ length: LIFE_GRID_W }, () => ({ alive: false, age: 0 }))
  );
}

export function createRandomLifeGrid(density: number = 0.2): LifeGrid {
  return Array.from({ length: LIFE_GRID_H }, () =>
    Array.from({ length: LIFE_GRID_W }, () => {
      const alive = Math.random() < density;
      return { alive, age: alive ? 1 : 0 };
    })
  );
}

// 世代進行 (コンウェイのライフゲーム標準ルール B3/S23)
export function stepLifeGrid(grid: LifeGrid): { nextGrid: LifeGrid; births: number; deaths: number; livingCount: number } {
  const nextGrid = createEmptyLifeGrid();
  let births = 0;
  let deaths = 0;
  let livingCount = 0;

  for (let r = 0; r < LIFE_GRID_H; r++) {
    for (let c = 0; c < LIFE_GRID_W; c++) {
      // 周囲8マスの生存セルをカウント (トーラス/ループ盤面)
      let neighbors = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = (r + dr + LIFE_GRID_H) % LIFE_GRID_H;
          const nc = (c + dc + LIFE_GRID_W) % LIFE_GRID_W;
          if (grid[nr][nc].alive) neighbors++;
        }
      }

      const current = grid[r][c];

      if (current.alive) {
        if (neighbors === 2 || neighbors === 3) {
          // 生存継続 (成熟・年齢増加)
          nextGrid[r][c] = { alive: true, age: Math.min(current.age + 1, 10) };
          livingCount++;
        } else {
          // 過密または過疎で死滅
          nextGrid[r][c] = { alive: false, age: 0 };
          deaths++;
        }
      } else {
        if (neighbors === 3) {
          // 誕生！
          nextGrid[r][c] = { alive: true, age: 1 };
          births++;
          livingCount++;
        }
      }
    }
  }

  return { nextGrid, births, deaths, livingCount };
}

export function countLiveCells(grid: LifeGrid): number {
  let count = 0;
  for (let r = 0; r < LIFE_GRID_H; r++) {
    for (let c = 0; c < LIFE_GRID_W; c++) {
      if (grid[r][c].alive) count++;
    }
  }
  return count;
}
