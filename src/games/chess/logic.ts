// チェス コアロジック & 3段階難易度NPC AI

export type ChessColor = 'w' | 'b'; // w: player (白), b: ai (黒)
export type ChessPieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface ChessPiece {
  id: number;
  type: ChessPieceType;
  color: ChessColor;
}

export type ChessBoard = (ChessPiece | null)[][]; // 8x8

export const CHESS_SYMBOLS: Record<ChessColor, Record<ChessPieceType, string>> = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};

let chessId = 1;

export function createInitialChessBoard(): ChessBoard {
  const b: ChessBoard = Array.from({ length: 8 }, () => Array(8).fill(null));

  const backRow: ChessPieceType[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  for (let c = 0; c < 8; c++) {
    b[0][c] = { id: chessId++, type: backRow[c], color: 'b' };
    b[1][c] = { id: chessId++, type: 'p', color: 'b' };
  }

  for (let c = 0; c < 8; c++) {
    b[6][c] = { id: chessId++, type: 'p', color: 'w' };
    b[7][c] = { id: chessId++, type: backRow[c], color: 'w' };
  }

  return b;
}

export function getValidChessMoves(
  board: ChessBoard,
  r: number,
  c: number
): [number, number][] {
  const p = board[r][c];
  if (!p) return [];

  const moves: [number, number][] = [];
  const color = p.color;
  const oppColor: ChessColor = color === 'w' ? 'b' : 'w';

  const tryAdd = (nr: number, nc: number): boolean => {
    if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) return false;
    const dest = board[nr][nc];
    if (!dest) {
      moves.push([nr, nc]);
      return true;
    }
    if (dest.color === oppColor) {
      moves.push([nr, nc]);
    }
    return false;
  };

  const trySlide = (dr: number, dc: number) => {
    let step = 1;
    while (tryAdd(r + dr * step, c + dc * step)) {
      step++;
    }
  };

  if (p.type === 'p') {
    const dir = color === 'w' ? -1 : 1;
    if (r + dir >= 0 && r + dir < 8 && !board[r + dir][c]) {
      moves.push([r + dir, c]);
      const startRow = color === 'w' ? 6 : 1;
      if (r === startRow && !board[r + dir * 2][c]) {
        moves.push([r + dir * 2, c]);
      }
    }
    [-1, 1].forEach((dc) => {
      const nr = r + dir;
      const nc = c + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc]?.color === oppColor) {
        moves.push([nr, nc]);
      }
    });
  } else if (p.type === 'n') {
    [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2],  [1, 2],  [2, -1],  [2, 1],
    ].forEach(([dr, dc]) => tryAdd(r + dr, c + dc));
  } else if (p.type === 'b') {
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([dr, dc]) => trySlide(dr, dc));
  } else if (p.type === 'r') {
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => trySlide(dr, dc));
  } else if (p.type === 'q') {
    [
      [-1, -1], [-1, 1], [1, -1], [1, 1],
      [-1, 0],  [1, 0],  [0, -1], [0, 1],
    ].forEach(([dr, dc]) => trySlide(dr, dc));
  } else if (p.type === 'k') {
    [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1],
    ].forEach(([dr, dc]) => tryAdd(r + dr, c + dc));
  }

  return moves;
}

const CHESS_VALUES: Record<ChessPieceType, number> = {
  k: 10000,
  q: 900,
  r: 500,
  b: 330,
  n: 320,
  p: 100,
};

export function chooseChessMove(
  board: ChessBoard,
  aiColor: ChessColor = 'b',
  difficulty: 'easy' | 'normal' | 'hard' = 'normal'
): { from: [number, number]; to: [number, number] } | null {
  const allMoves: { from: [number, number]; to: [number, number]; score: number }[] = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === aiColor) {
        const moves = getValidChessMoves(board, r, c);
        for (const [nr, nc] of moves) {
          const target = board[nr][nc];
          let score = Math.random() * (difficulty === 'hard' ? 5 : 25);

          if (target) {
            score += CHESS_VALUES[target.type] * (difficulty === 'hard' ? 2.5 : 1.8) - CHESS_VALUES[p.type] * 0.1;
            if (target.type === 'k') score += 100000;
          }

          // 中央制御ボーナス
          const centerDist = Math.abs(nr - 3.5) + Math.abs(nc - 3.5);
          score += (7 - centerDist) * (difficulty === 'hard' ? 12 : 5);

          // ポーン昇格
          if (p.type === 'p' && (nr === 7 || nr === 0)) {
            score += 900;
          }

          allMoves.push({ from: [r, c], to: [nr, nc], score });
        }
      }
    }
  }

  if (allMoves.length === 0) return null;

  // 初級: 40%ランダム
  if (difficulty === 'easy') {
    // 相手キングを取れる手があれば最優先
    const kingKill = allMoves.find((m) => board[m.to[0]][m.to[1]]?.type === 'k');
    if (kingKill) return { from: kingKill.from, to: kingKill.to };

    if (Math.random() < 0.45) {
      const randMove = allMoves[Math.floor(Math.random() * allMoves.length)];
      return { from: randMove.from, to: randMove.to };
    }
  }

  allMoves.sort((a, b) => b.score - a.score);
  return { from: allMoves[0].from, to: allMoves[0].to };
}
