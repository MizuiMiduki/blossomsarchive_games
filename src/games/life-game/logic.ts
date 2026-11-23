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

// プリセットパターン
export interface PatternPreset {
  name: string;
  description: string;
  coords: [number, number][]; // 相対座標 [r, c]
}

export const PRESETS: PatternPreset[] = [
  {
    name: 'グライダー',
    description: '斜め方向へ移動し続けるライフゲームの代表的パターン',
    coords: [
      [0, 1],
      [1, 2],
      [2, 0], [2, 1], [2, 2],
    ],
  },
  {
    name: 'パルサー',
    description: '周期3で規則的に伸縮を繰り返す美しい振動子パターン',
    coords: [
      // 上半分
      [-6, -4], [-6, -3], [-6, -2], [-6, 2], [-6, 3], [-6, 4],
      [-4, -6], [-3, -6], [-2, -6], [-4, -1], [-3, -1], [-2, -1],
      [-4, 1], [-3, 1], [-2, 1], [-4, 6], [-3, 6], [-2, 6],
      [-1, -4], [-1, -3], [-1, -2], [-1, 2], [-1, 3], [-1, 4],
      // 下半分
      [1, -4], [1, -3], [1, -2], [1, 2], [1, 3], [1, 4],
      [4, -6], [3, -6], [2, -6], [4, -1], [3, -1], [2, -1],
      [4, 1], [3, 1], [2, 1], [4, 6], [3, 6], [2, 6],
      [6, -4], [6, -3], [6, -2], [6, 2], [6, 3], [6, 4],
    ],
  },
  {
    name: '銀河',
    description: '2つのアームが回転し続ける周期8の優雅なパターン',
    coords: [
      [-4, -4], [-4, -3], [-4, -2], [-4, -1], [-4, 0], [-4, 1],
      [-3, -4], [-3, -3], [-3, -2], [-3, -1], [-3, 0], [-3, 1],
      [-2, 3], [-2, 4], [-1, 3], [-1, 4], [0, 3], [0, 4], [1, 3], [1, 4],
      [3, -1], [3, 0], [3, 1], [3, 2], [3, 3], [3, 4],
      [4, -1], [4, 0], [4, 1], [4, 2], [4, 3], [4, 4],
      [-1, -4], [-1, -3], [0, -4], [0, -3], [1, -4], [1, -3], [2, -4], [2, -3],
    ],
  },
  {
    name: 'グライダー銃',
    description: '一定周期で次々とグライダーを撃ち出し続けるパターン',
    coords: [
      [4, 0], [4, 1], [5, 0], [5, 1],
      [2, 34], [2, 35], [3, 34], [3, 35],
      [4, 10], [5, 10], [6, 10], [3, 11], [7, 11], [2, 12], [8, 12], [2, 13], [8, 13],
      [5, 14], [3, 15], [7, 15], [4, 16], [5, 16], [6, 16], [5, 17],
      [2, 20], [3, 20], [4, 20], [2, 21], [3, 21], [4, 21], [1, 22], [5, 22],
      [0, 24], [1, 24], [5, 24], [6, 24],
    ],
  },
];
