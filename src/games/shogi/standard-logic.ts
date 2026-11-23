// 本将棋 (9x9) コアロジック & 3段階難易度NPC AI

export type ShogiSide = 'player' | 'ai'; // playerは先手 (下から上へ前進)
export type StandardPieceType = 'K' | 'R' | 'B' | 'G' | 'S' | 'N' | 'L' | 'P';

export interface StandardPiece {
  id: number;
  type: StandardPieceType;
  promoted: boolean;
  side: ShogiSide;
}

export type StandardShogiBoard = (StandardPiece | null)[][]; // 9x9 [row][col]

let pieceIdCounter = 1000;

export function createInitialStandardShogiBoard(): StandardShogiBoard {
  const b: StandardShogiBoard = Array.from({ length: 9 }, () => Array(9).fill(null));

  // 後手 (AI側: r=0..2)
  // r=0: 香 桂 銀 金 王 金 銀 桂 香
  const row0Types: StandardPieceType[] = ['L', 'N', 'S', 'G', 'K', 'G', 'S', 'N', 'L'];
  row0Types.forEach((type, c) => {
    b[0][c] = { id: pieceIdCounter++, type, promoted: false, side: 'ai' };
  });

  // r=1: 2マス目に角(c=1), 8マス目に飛(c=7)
  b[1][1] = { id: pieceIdCounter++, type: 'B', promoted: false, side: 'ai' };
  b[1][7] = { id: pieceIdCounter++, type: 'R', promoted: false, side: 'ai' };

  // r=2: 歩 (9枚)
  for (let c = 0; c < 9; c++) {
    b[2][c] = { id: pieceIdCounter++, type: 'P', promoted: false, side: 'ai' };
  }

  // 先手 (Player側: r=6..8)
  // r=6: 歩 (9枚)
  for (let c = 0; c < 9; c++) {
    b[6][c] = { id: pieceIdCounter++, type: 'P', promoted: false, side: 'player' };
  }

  // r=7: 2マス目に飛(c=1), 8マス目に角(c=7)
  b[7][1] = { id: pieceIdCounter++, type: 'R', promoted: false, side: 'player' };
  b[7][7] = { id: pieceIdCounter++, type: 'B', promoted: false, side: 'player' };

  // r=8: 香 桂 銀 金 玉 金 銀 桂 香
  const row8Types: StandardPieceType[] = ['L', 'N', 'S', 'G', 'K', 'G', 'S', 'N', 'L'];
  row8Types.forEach((type, c) => {
    b[8][c] = { id: pieceIdCounter++, type, promoted: false, side: 'player' };
  });

  return b;
}

export const STANDARD_PIECE_LABELS: Record<StandardPieceType, { normal: string; promoted: string }> = {
  K: { normal: '玉', promoted: '玉' },
  R: { normal: '飛', promoted: '竜' },
  B: { normal: '角', promoted: '馬' },
  G: { normal: '金', promoted: '金' },
  S: { normal: '銀', promoted: '全' },
  N: { normal: '桂', promoted: '圭' },
  L: { normal: '香', promoted: '杏' },
  P: { normal: '歩', promoted: 'と' },
};

// 成り可能か判定
export function canPromote(
  piece: StandardPiece,
  fromRow: number,
  toRow: number
): boolean {
  if (piece.promoted || piece.type === 'K' || piece.type === 'G') return false;
  if (piece.side === 'player') {
    return fromRow <= 2 || toRow <= 2;
  } else {
    return fromRow >= 6 || toRow >= 6;
  }
}

// 強制成り判定 (これ以上前進できないマスへ到達)
export function mustPromote(
  pieceType: StandardPieceType,
  toRow: number,
  side: ShogiSide
): boolean {
  if (side === 'player') {
    if ((pieceType === 'P' || pieceType === 'L') && toRow === 0) return true;
    if (pieceType === 'N' && toRow <= 1) return true;
  } else {
    if ((pieceType === 'P' || pieceType === 'L') && toRow === 8) return true;
    if (pieceType === 'N' && toRow >= 7) return true;
  }
  return false;
}

// 駒の合法移動先
export function getValidStandardMoves(
  board: StandardShogiBoard,
  r: number,
  c: number
): [number, number][] {
  const p = board[r][c];
  if (!p) return [];

  const moves: [number, number][] = [];
  const forward = p.side === 'player' ? -1 : 1;

  const tryAdd = (nr: number, nc: number): boolean => {
    if (nr < 0 || nr >= 9 || nc < 0 || nc >= 9) return false;
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

  // 成駒の移動
  if (p.promoted) {
    if (p.type === 'R') {
      // 竜: 飛車 + 斜め1マス
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => trySlide(dr, dc));
      [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([dr, dc]) => tryAdd(r + dr, c + dc));
      return moves;
    }
    if (p.type === 'B') {
      // 馬: 角 + 十字1マス
      [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([dr, dc]) => trySlide(dr, dc));
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => tryAdd(r + dr, c + dc));
      return moves;
    }
    // 金将相当の動き (と金, 成銀, 成桂, 成香)
    [
      [forward, 0], [forward, -1], [forward, 1],
      [0, -1], [0, 1],
      [-forward, 0],
    ].forEach(([dr, dc]) => tryAdd(r + dr, c + dc));
    return moves;
  }

  // 通常駒の移動
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
    case 'N':
      // 桂馬のジャンプ
      tryAdd(r + forward * 2, c - 1);
      tryAdd(r + forward * 2, c + 1);
      break;
    case 'L':
      // 香車 (前方スライド)
      trySlide(forward, 0);
      break;
    case 'P':
      // 歩
      tryAdd(r + forward, c);
      break;
  }

  return moves;
}

// 持ち駒の打てるマスを取得 (二歩・行き所のない駒のチェック)
export function getStandardDropMoves(
  board: StandardShogiBoard,
  pieceType: StandardPieceType,
  side: ShogiSide
): [number, number][] {
  const drops: [number, number][] = [];

  // 二歩チェック用: すでに自陣の不成歩がある列
  const pawnColumns = new Set<number>();
  if (pieceType === 'P') {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const p = board[r][c];
        if (p && p.side === side && p.type === 'P' && !p.promoted) {
          pawnColumns.add(c);
        }
      }
    }
  }

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === null) {
        // 二歩の禁止
        if (pieceType === 'P' && pawnColumns.has(c)) continue;

        // 行き所のない駒の禁止
        if (side === 'player') {
          if ((pieceType === 'P' || pieceType === 'L') && r === 0) continue;
          if (pieceType === 'N' && r <= 1) continue;
        } else {
          if ((pieceType === 'P' || pieceType === 'L') && r === 8) continue;
          if (pieceType === 'N' && r >= 7) continue;
        }

        drops.push([r, c]);
      }
    }
  }

  return drops;
}

// 駒の評価値
export const STANDARD_PIECE_VALUES: Record<StandardPieceType, number> = {
  K: 50000,
  R: 1100,
  B: 950,
  G: 600,
  S: 520,
  N: 380,
  L: 340,
  P: 100,
};

export interface StandardShogiAction {
  isDrop: boolean;
  from?: [number, number];
  dropType?: StandardPieceType;
  to: [number, number];
  promote?: boolean;
}

// AIの手を決定
export function chooseStandardShogiMove(
  board: StandardShogiBoard,
  aiHand: StandardPieceType[],
  _playerHand: StandardPieceType[],
  difficulty: 'easy' | 'normal' | 'hard' = 'normal'
): StandardShogiAction | null {
  const allActions: StandardShogiAction[] = [];

  // 1. 盤上の駒の移動
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (p && p.side === 'ai') {
        const moves = getValidStandardMoves(board, r, c);
        for (const [nr, nc] of moves) {
          const promo = canPromote(p, r, nr);
          const forced = mustPromote(p.type, nr, 'ai');

          if (forced) {
            allActions.push({ isDrop: false, from: [r, c], to: [nr, nc], promote: true });
          } else if (promo) {
            allActions.push({ isDrop: false, from: [r, c], to: [nr, nc], promote: true });
            // 銀・桂などはあえて成らない手も候補に入れる
            if (p.type === 'S' || p.type === 'N') {
              allActions.push({ isDrop: false, from: [r, c], to: [nr, nc], promote: false });
            }
          } else {
            allActions.push({ isDrop: false, from: [r, c], to: [nr, nc], promote: false });
          }
        }
      }
    }
  }

  // 2. 持ち駒を打つ手
  const uniqueAiHand = Array.from(new Set(aiHand));
  for (const pType of uniqueAiHand) {
    const drops = getStandardDropMoves(board, pType, 'ai');
    for (const [nr, nc] of drops) {
      allActions.push({ isDrop: true, dropType: pType, to: [nr, nc] });
    }
  }

  if (allActions.length === 0) return null;

  // 玉を取れる手があれば最優先
  for (const act of allActions) {
    if (!act.isDrop && act.from) {
      const target = board[act.to[0]][act.to[1]];
      if (target?.type === 'K') return act;
    }
  }

  // 初級: 40%ランダム
  if (difficulty === 'easy' && Math.random() < 0.4) {
    return allActions[Math.floor(Math.random() * allActions.length)];
  }

  // 評価関数
  let bestScore = -Infinity;
  let bestAction = allActions[0];

  for (const act of allActions) {
    let score = Math.random() * (difficulty === 'hard' ? 10 : 35);

    if (!act.isDrop && act.from) {
      const moving = board[act.from[0]][act.from[1]];
      const target = board[act.to[0]][act.to[1]];

      if (target) {
        score += STANDARD_PIECE_VALUES[target.type] * (difficulty === 'hard' ? 2.5 : 1.6);
        // 低い駒で高い駒を取る手にボーナス
        if (moving && STANDARD_PIECE_VALUES[moving.type] < STANDARD_PIECE_VALUES[target.type]) {
          score += (STANDARD_PIECE_VALUES[target.type] - STANDARD_PIECE_VALUES[moving.type]) * 0.8;
        }
      }

      if (act.promote) {
        score += difficulty === 'hard' ? 400 : 250;
      }

      // 前進ボーナス
      score += act.to[0] * (difficulty === 'hard' ? 15 : 8);
      // 中央（4列目付近）制御ボーナス
      const centerDist = Math.abs(act.to[1] - 4);
      score += (4 - centerDist) * (difficulty === 'hard' ? 12 : 5);
    } else if (act.isDrop && act.dropType) {
      score += 30;
      // 敵玉に近づけるボーナス
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (board[r][c]?.type === 'K' && board[r][c]?.side === 'player') {
            const dist = Math.abs(r - act.to[0]) + Math.abs(c - act.to[1]);
            score += Math.max(0, 10 - dist) * (difficulty === 'hard' ? 25 : 12);
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
