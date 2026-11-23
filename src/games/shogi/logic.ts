// 5x5 ミニ将棋 コアロジック & NPC AI

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
      return true; // 走り駒が継続可能
    }
    if (dest.side !== p.side) {
      moves.push([nr, nc]); // 敵の駒を取る
    }
    return false; // 自駒または敵駒に衝突したら終了
  };

  const trySlide = (dr: number, dc: number) => {
    let step = 1;
    while (tryAdd(r + dr * step, c + dc * step)) {
      step++;
    }
  };

  if (p.promoted) {
    if (p.type === 'R') {
      // 竜 (飛車 + 斜め1マス)
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => trySlide(dr, dc));
      [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([dr, dc]) => tryAdd(r + dr, c + dc));
      return moves;
    }
    if (p.type === 'B') {
      // 馬 (角 + 上下左右1マス)
      [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([dr, dc]) => trySlide(dr, dc));
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => tryAdd(r + dr, c + dc));
      return moves;
    }
    // 金と同じ動き (成銀、と金)
    [
      [forward, 0], [forward, -1], [forward, 1],
      [0, -1], [0, 1],
      [-forward, 0],
    ].forEach(([dr, dc]) => tryAdd(r + dr, c + dc));
    return moves;
  }

  switch (p.type) {
    case 'K': // 玉
      [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1],
      ].forEach(([dr, dc]) => tryAdd(r + dr, c + dc));
      break;
    case 'R': // 飛車
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => trySlide(dr, dc));
      break;
    case 'B': // 角
      [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([dr, dc]) => trySlide(dr, dc));
      break;
    case 'G': // 金
      [
        [forward, 0], [forward, -1], [forward, 1],
        [0, -1], [0, 1],
        [-forward, 0],
      ].forEach(([dr, dc]) => tryAdd(r + dr, c + dc));
      break;
    case 'S': // 銀
      [
        [forward, 0], [forward, -1], [forward, 1],
        [-forward, -1], [-forward, 1],
      ].forEach(([dr, dc]) => tryAdd(r + dr, c + dc));
      break;
    case 'P': // 歩
      tryAdd(r + forward, c);
      break;
  }

  return moves;
}

// 持ち駒を打てるマスを取得
export function getDropMoves(board: ShogiBoard, pieceType: PieceType, side: ShogiSide): [number, number][] {
  const drops: [number, number][] = [];
  const bannedRow = side === 'player' ? 0 : 4; // 歩は最奥段に打てない

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

// 駒の価値
const PIECE_VALUES: Record<PieceType, number> = {
  K: 10000,
  R: 900,
  B: 800,
  G: 500,
  S: 400,
  P: 100,
};

// AI思考ルーチン
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
  playerHand: PieceType[]
): ShogiAction | null {
  const allActions: ShogiAction[] = [];

  // 1. 盤面の駒を動かす手
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

  // 2. 持ち駒を打つ手
  const uniqueAiHand = Array.from(new Set(aiHand));
  for (const pType of uniqueAiHand) {
    const drops = getDropMoves(board, pType, 'ai');
    for (const [nr, nc] of drops) {
      allActions.push({ isDrop: true, dropType: pType, to: [nr, nc] });
    }
  }

  if (allActions.length === 0) return null;

  // 各手を評価
  let bestScore = -Infinity;
  let bestAction = allActions[0];

  for (const act of allActions) {
    let score = Math.random() * 20; // 若干のランダム性

    if (!act.isDrop && act.from) {
      const target = board[act.to[0]][act.to[1]];
      if (target) {
        score += PIECE_VALUES[target.type] * 1.5; // 相手の駒を取る手を高く評価
        if (target.type === 'K') score += 50000; // 王を取れるなら最優先
      }
      if (act.promote) {
        score += 300; // 成りを優先
      }
      // 前進ボーナス
      score += act.to[0] * 10;
    } else if (act.isDrop && act.dropType) {
      score += 50;
      // 敵玉の近くに打つボーナス
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (board[r][c]?.type === 'K' && board[r][c]?.side === 'player') {
            const dist = Math.abs(r - act.to[0]) + Math.abs(c - act.to[1]);
            score += (10 - dist) * 15;
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
