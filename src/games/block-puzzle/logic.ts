// 10x10 ブロックパズル ロジック

export const GRID_SIZE = 10;

export interface Shape {
  id: number;
  matrix: number[][]; // 1: ブロックあり, 0: なし
  color: string;
}

export const SHAPES_POOL: { matrix: number[][]; color: string }[] = [
  // 1x1
  { matrix: [[1]], color: 'bg-rose-400' },
  // 2x1, 1x2
  { matrix: [[1, 1]], color: 'bg-pink-400' },
  { matrix: [[1], [1]], color: 'bg-pink-400' },
  // 3x1, 1x3
  { matrix: [[1, 1, 1]], color: 'bg-amber-400' },
  { matrix: [[1], [1], [1]], color: 'bg-amber-400' },
  // 2x2
  { matrix: [[1, 1], [1, 1]], color: 'bg-emerald-400' },
  // 3x3
  { matrix: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], color: 'bg-purple-500' },
  // L字
  { matrix: [[1, 0], [1, 1]], color: 'bg-sky-400' },
  { matrix: [[0, 1], [1, 1]], color: 'bg-sky-400' },
  { matrix: [[1, 1], [1, 0]], color: 'bg-sky-400' },
  { matrix: [[1, 1], [0, 1]], color: 'bg-sky-400' },
  // T字
  { matrix: [[1, 1, 1], [0, 1, 0]], color: 'bg-indigo-400' },
];

let shapeId = 1;

export function getRandomShapes(count: number = 3): Shape[] {
  const shapes: Shape[] = [];
  for (let i = 0; i < count; i++) {
    const template = SHAPES_POOL[Math.floor(Math.random() * SHAPES_POOL.length)];
    shapes.push({ id: shapeId++, matrix: template.matrix, color: template.color });
  }
  return shapes;
}

export function canPlaceShape(
  grid: (string | null)[][],
  shape: Shape,
  startR: number,
  startC: number
): boolean {
  for (let r = 0; r < shape.matrix.length; r++) {
    for (let c = 0; c < shape.matrix[r].length; c++) {
      if (shape.matrix[r][c] === 1) {
        const gr = startR + r;
        const gc = startC + c;
        if (gr < 0 || gr >= GRID_SIZE || gc < 0 || gc >= GRID_SIZE) return false;
        if (grid[gr][gc] !== null) return false;
      }
    }
  }
  return true;
}

export function hasAnyValidMove(grid: (string | null)[][], shapes: Shape[]): boolean {
  for (const shape of shapes) {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (canPlaceShape(grid, shape, r, c)) {
          return true;
        }
      }
    }
  }
  return false;
}

export function checkAndClearLines(grid: (string | null)[][]): {
  grid: (string | null)[][];
  linesCleared: number;
} {
  const newGrid = grid.map((row) => [...row]);
  const rowsToClear: number[] = [];
  const colsToClear: number[] = [];

  // 横行チェック
  for (let r = 0; r < GRID_SIZE; r++) {
    if (newGrid[r].every((cell) => cell !== null)) {
      rowsToClear.push(r);
    }
  }

  // 縦列チェック
  for (let c = 0; c < GRID_SIZE; c++) {
    let full = true;
    for (let r = 0; r < GRID_SIZE; r++) {
      if (newGrid[r][c] === null) {
        full = false;
        break;
      }
    }
    if (full) colsToClear.push(c);
  }

  // 消去実行
  for (const r of rowsToClear) {
    for (let c = 0; c < GRID_SIZE; c++) {
      newGrid[r][c] = null;
    }
  }
  for (const c of colsToClear) {
    for (let r = 0; r < GRID_SIZE; r++) {
      newGrid[r][c] = null;
    }
  }

  return {
    grid: newGrid,
    linesCleared: rowsToClear.length + colsToClear.length,
  };
}
