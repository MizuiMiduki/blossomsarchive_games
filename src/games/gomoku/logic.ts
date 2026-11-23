// 五目並べ ロジック & NPC AI

export type Stone = 'black' | 'white';
export const GOMOKU_SIZE = 13;

export function createEmptyGomokuBoard(): (Stone | null)[][] {
  return Array.from({ length: GOMOKU_SIZE }, () => Array(GOMOKU_SIZE).fill(null));
}

const DIRECTIONS: [number, number][] = [
  [1, 0],  // 縦
  [0, 1],  // 横
  [1, 1],  // 右下斜め
  [1, -1], // 左下斜め
];

export function checkWin(
  board: (Stone | null)[][],
  r: number,
  c: number,
  stone: Stone
): [number, number][] | null {
  for (const [dr, dc] of DIRECTIONS) {
    const line: [number, number][] = [[r, c]];

    // 正方向
    let step = 1;
    while (true) {
      const nr = r + dr * step;
      const nc = c + dc * step;
      if (nr >= 0 && nr < GOMOKU_SIZE && nc >= 0 && nc < GOMOKU_SIZE && board[nr][nc] === stone) {
        line.push([nr, nc]);
        step++;
      } else {
        break;
      }
    }

    // 逆方向
    step = 1;
    while (true) {
      const nr = r - dr * step;
      const nc = c - dc * step;
      if (nr >= 0 && nr < GOMOKU_SIZE && nc >= 0 && nc < GOMOKU_SIZE && board[nr][nc] === stone) {
        line.push([nr, nc]);
        step++;
      } else {
        break;
      }
    }

    if (line.length >= 5) {
      return line;
    }
  }

  return null;
}

// NPC AIの評価ロジック
export function chooseGomokuMove(
  board: (Stone | null)[][],
  aiStone: Stone,
  difficulty: 'easy' | 'normal' | 'hard'
): [number, number] | null {
  const opponent: Stone = aiStone === 'black' ? 'white' : 'black';
  const emptyCells: [number, number][] = [];

  for (let r = 0; r < GOMOKU_SIZE; r++) {
    for (let c = 0; c < GOMOKU_SIZE; c++) {
      if (!board[r][c]) {
        // 石の周囲2マス以内に石があるマスのみ候補とする（探索高速化）
        let hasNeighbor = false;
        for (let dr = -2; dr <= 2 && !hasNeighbor; dr++) {
          for (let dc = -2; dc <= 2 && !hasNeighbor; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < GOMOKU_SIZE && nc >= 0 && nc < GOMOKU_SIZE && board[nr][nc]) {
              hasNeighbor = true;
            }
          }
        }
        if (hasNeighbor || (r === Math.floor(GOMOKU_SIZE / 2) && c === Math.floor(GOMOKU_SIZE / 2))) {
          emptyCells.push([r, c]);
        }
      }
    }
  }

  if (emptyCells.length === 0) {
    return [Math.floor(GOMOKU_SIZE / 2), Math.floor(GOMOKU_SIZE / 2)];
  }

  // 初級
  if (difficulty === 'easy' && Math.random() < 0.4) {
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
  }

  // パターン評価
  let bestScore = -Infinity;
  let bestMove = emptyCells[0];

  const evaluatePosition = (r: number, c: number, stone: Stone): number => {
    let total = 0;
    for (const [dr, dc] of DIRECTIONS) {
      let count = 1;
      let blocked = 0;

      // 正方向
      let step = 1;
      while (true) {
        const nr = r + dr * step;
        const nc = c + dc * step;
        if (nr < 0 || nr >= GOMOKU_SIZE || nc < 0 || nc >= GOMOKU_SIZE) {
          blocked++;
          break;
        }
        if (board[nr][nc] === stone) count++;
        else if (board[nr][nc] === null) break;
        else {
          blocked++;
          break;
        }
        step++;
      }

      // 逆方向
      step = 1;
      while (true) {
        const nr = r - dr * step;
        const nc = c - dc * step;
        if (nr < 0 || nr >= GOMOKU_SIZE || nc < 0 || nc >= GOMOKU_SIZE) {
          blocked++;
          break;
        }
        if (board[nr][nc] === stone) count++;
        else if (board[nr][nc] === null) break;
        else {
          blocked++;
          break;
        }
        step++;
      }

      if (count >= 5) total += 100000;
      else if (count === 4 && blocked === 0) total += 10000;
      else if (count === 4 && blocked === 1) total += 2500;
      else if (count === 3 && blocked === 0) total += 2000;
      else if (count === 3 && blocked === 1) total += 500;
      else if (count === 2 && blocked === 0) total += 100;
    }
    return total;
  };

  for (const [r, c] of emptyCells) {
    const attack = evaluatePosition(r, c, aiStone);
    const defense = evaluatePosition(r, c, opponent);
    // 攻撃重視、相手の4連や5連は最優先で阻止
    let score = attack * 1.1 + defense + (Math.random() * 20);

    // 中央寄りボーナス
    const centerDist = Math.abs(r - GOMOKU_SIZE / 2) + Math.abs(c - GOMOKU_SIZE / 2);
    score -= centerDist * 2;

    if (score > bestScore) {
      bestScore = score;
      bestMove = [r, c];
    }
  }

  return bestMove;
}
