// 5x5 ミニ将棋 コアロジック & 3段階難易度NPC AI

export type ShogiSide = 'player' | 'ai'; // playerは下から上へ前進
export type PieceType = 'K' | 'R' | 'B' | 'G' | 'S' | 'P'; // 玉, 飛, 角, 金, 銀, 歩

export interface Piece {
  id: number;
  type: PieceType;
  promoted: boolean;
  side: ShogiSide;
}

export type ShogiBoard = (Piece | null)[][]; // 5x5

let pieceIdCounter = 1;

export function createInitialShogiBoard(): ShogiBoard {
  const b: ShogiBoard = Array.from({ length: 5 }, () => Array(5).fill(null));

  // AI側 (上段 r=0, 1)
  b[0][0] = { id: pieceIdCounter++, type: 'R', promoted: false, side: 'ai' };
  b[0][1] = { id: pieceIdCounter++, type: 'B', promoted: false, side: 'ai' };
  b[0][2] = { id: pieceIdCounter++, type: 'S', promoted: false, side: 'ai' };
  b[0][3] = { id: pieceIdCounter++, type: 'G', promoted: false, side: 'ai' };
  b[0][4] = { id: pieceIdCounter++, type: 'K', promoted: false, side: 'ai' };
  b[1][0] = { id: pieceIdCounter++, type: 'P', promoted: false, side: 'ai' };

  // Player側 (下段 r=4, 3)
  b[4][0] = { id: pieceIdCounter++, type: 'K', promoted: false, side: 'player' };
  b[4][1] = { id: pieceIdCounter++, type: 'G', promoted: false, side: 'player' };
  b[4][2] = { id: pieceIdCounter++, type: 'S', promoted: false, side: 'player' };
  b[4][3] = { id: pieceIdCounter++, type: 'B', promoted: false, side: 'player' };
  b[4][4] = { id: pieceIdCounter++, type: 'R', promoted: false, side: 'player' };
  b[3][4] = { id: pieceIdCounter++, type: 'P', promoted: false, side: 'player' };

  return b;
}

export const PIECE_LABELS: Record<PieceType, { normal: string; promoted: string }> = {
  K: { normal: '玉', promoted: '玉' },
  R: { normal: '飛', promoted: '竜' },
  B: { normal: '角', promoted: '馬' },
  G: { normal: '金', promoted: '金' },
  S: { normal: '銀', promoted: '全' },
  P: { normal: '歩', promoted: 'と' },
};

// 移動可能マスの計算
export function getValidShogiMoves(
  board: ShogiBoard,
  r: number,
  c: number
): [number, number][] {
  const p = board[r][c];
  if (!p) return [];

  const moves: [number, number][] = [];
  const forward = p.side === 'player' ? -1 : 1;

  const tryAdd = (nr: number, nc: number) => {
    if (nr < 0 || nr >= 5 || nc < 0 || nc >= 5) return false;
    const dest = board[nr][nc];
    if (!dest) {
      moves.push([nr, nc]);
      return true;
    }
    if (dest.side !== p.side) {
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

  if (p.promoted) {
    if (p.type === 'R') {
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => trySlide(dr, dc));
      [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([dr, dc]) => tryAdd(r + dr, c + dc));
      return moves;
    }
    if (p.type === 'B') {
      [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([dr, dc]) => trySlide(dr, dc));
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => tryAdd(r + dr, c + dc));
      return moves;
    }
    [
      [forward, 0], [forward, -1], [forward, 1],
      [0, -1], [0, 1],
      [-forward, 0],
    ].forEach(([dr, dc]) => tryAdd(r + dr, c + dc));
    return moves;
  }

  switch (p.type) {
    case 'K':
      [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1],
      ].forEach(([dr, dc]) => tryAdd(r + dr, c + dc));
      break;
    case 'R':
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => trySlide(dr, dc));
      break;
    case 'B':
      [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([dr, dc]) => trySlide(dr, dc));
      break;
    case 'G':
      [
        [forward, 0], [forward, -1], [forward, 1],
        [0, -1], [0, 1],
        [-forward, 0],
      ].forEach(([dr, dc]) => tryAdd(r + dr, c + dc));
      break;
    case 'S':
      [
        [forward, 0], [forward, -1], [forward, 1],
        [-forward, -1], [-forward, 1],
      ].forEach(([dr, dc]) => tryAdd(r + dr, c + dc));
      break;
    case 'P':
      tryAdd(r + forward, c);
      break;
  }

  return moves;
}

export function getDropMoves(board: ShogiBoard, pieceType: PieceType, side: ShogiSide): [number, number][] {
  const drops: [number, number][] = [];
  const bannedRow = side === 'player' ? 0 : 4;

  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (board[r][c] === null) {
        if (pieceType === 'P' && r === bannedRow) continue;
        drops.push([r, c]);
      }
    }
  }
  return drops;
}

const PIECE_VALUES: Record<PieceType, number> = {
  K: 10000,
  R: 900,
  B: 800,
  G: 500,
  S: 400,
  P: 100,
};

export interface ShogiAction {
  isDrop: boolean;
  from?: [number, number];
  dropType?: PieceType;
  to: [number, number];
  promote?: boolean;
}

export function chooseShogiMove(
  board: ShogiBoard,
  aiHand: PieceType[],
  _playerHand: PieceType[],
  difficulty: 'easy' | 'normal' | 'hard' = 'normal'
): ShogiAction | null {
  const allActions: ShogiAction[] = [];

  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const p = board[r][c];
      if (p && p.side === 'ai') {
        const moves = getValidShogiMoves(board, r, c);
        for (const [nr, nc] of moves) {
          const canPromote = !p.promoted && p.type !== 'K' && p.type !== 'G' && (nr === 4 || r === 4);
          allActions.push({ isDrop: false, from: [r, c], to: [nr, nc], promote: canPromote });
        }
      }
    }
  }

  const uniqueAiHand = Array.from(new Set(aiHand));
  for (const pType of uniqueAiHand) {
    const drops = getDropMoves(board, pType, 'ai');
    for (const [nr, nc] of drops) {
      allActions.push({ isDrop: true, dropType: pType, to: [nr, nc] });
    }
  }

  if (allActions.length === 0) return null;

  // 初級: 40%ランダム、隙だらけ
  if (difficulty === 'easy') {
    // 相手玉が取れるなら取る
    for (const act of allActions) {
      if (!act.isDrop && act.from) {
        const target = board[act.to[0]][act.to[1]];
        if (target?.type === 'K') return act;
      }
    }
    if (Math.random() < 0.45) {
      return allActions[Math.floor(Math.random() * allActions.length)];
    }
  }

  // 評価関数
  let bestScore = -Infinity;
  let bestAction = allActions[0];

  for (const act of allActions) {
    let score = Math.random() * (difficulty === 'hard' ? 5 : 20);

    if (!act.isDrop && act.from) {
      const target = board[act.to[0]][act.to[1]];
      if (target) {
        score += PIECE_VALUES[target.type] * (difficulty === 'hard' ? 2.0 : 1.4);
        if (target.type === 'K') score += 100000;
      }
      if (act.promote) {
        score += difficulty === 'hard' ? 450 : 250;
      }
      score += act.to[0] * (difficulty === 'hard' ? 25 : 10);
    } else if (act.isDrop && act.dropType) {
      score += 40;
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (board[r][c]?.type === 'K' && board[r][c]?.side === 'player') {
            const dist = Math.abs(r - act.to[0]) + Math.abs(c - act.to[1]);
            score += (10 - dist) * (difficulty === 'hard' ? 30 : 15);
          }
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestAction = act;
    }
  }

  return bestAction;
}
