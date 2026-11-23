// オセロ（リバーシ）のコアロジック & AIエンジン (完全クライアント完結)

export type Player = 'black' | 'white'; // blackが先手
export type BoardState = (Player | null)[][];

export const BOARD_SIZE = 8;

// 8方向のベクトル
const DIRECTIONS: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

// 初期盤面の生成
export function createInitialBoard(): BoardState {
  const board: BoardState = Array.from({ length: BOARD_SIZE }, () =>
    Array(BOARD_SIZE).fill(null)
  );
  // 中央の4マス
  board[3][3] = 'white';
  board[3][4] = 'black';
  board[4][3] = 'black';
  board[4][4] = 'white';
  return board;
}

// 相手プレイヤーを取得
export function getOpponent(player: Player): Player {
  return player === 'black' ? 'white' : 'black';
}

// 座標が盤面内かチェック
function isValidCoord(r: number, c: number): boolean {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

// 特定のマスに置いたときにひっくり返せる石の座標リストを取得
export function getFlippableStones(
  board: BoardState,
  row: number,
  col: number,
  player: Player
): [number, number][] {
  if (board[row][col] !== null) return [];

  const opponent = getOpponent(player);
  const flippable: [number, number][] = [];

  for (const [dr, dc] of DIRECTIONS) {
    let r = row + dr;
    let c = col + dc;
    const path: [number, number][] = [];

    while (isValidCoord(r, c) && board[r][c] === opponent) {
      path.push([r, c]);
      r += dr;
      c += dc;
    }

    if (isValidCoord(r, c) && board[r][c] === player && path.length > 0) {
      flippable.push(...path);
    }
  }

  return flippable;
}

// 合法手（置けるマス）のリストを取得
export function getValidMoves(board: BoardState, player: Player): [number, number][] {
  const moves: [number, number][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (getFlippableStones(board, r, c, player).length > 0) {
        moves.push([r, c]);
      }
    }
  }
  return moves;
}

// 手を実行して新しい盤面を返す
export function applyMove(
  board: BoardState,
  row: number,
  col: number,
  player: Player
): { board: BoardState; flipped: [number, number][] } {
  const flipped = getFlippableStones(board, row, col, player);
  if (flipped.length === 0) return { board, flipped: [] };

  const newBoard = board.map((r) => [...r]);
  newBoard[row][col] = player;
  for (const [fr, fc] of flipped) {
    newBoard[fr][fc] = player;
  }

  return { board: newBoard, flipped };
}

// 石の数をカウント
export function countStones(board: BoardState): { black: number; white: number } {
  let black = 0;
  let white = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 'black') black++;
      else if (board[r][c] === 'white') white++;
    }
  }
  return { black, white };
}

// --- NPC AI の思考ロジック ---

// マスの重要度評価テーブル（角が高評価、X打ち・C打ちは低評価）
const POSITION_WEIGHTS: number[][] = [
  [ 120, -20,  20,   5,   5,  20, -20,  120],
  [-20,  -40,  -5,  -5,  -5,  -5, -40,  -20],
  [  20,  -5,  15,   3,   3,  15,  -5,   20],
  [   5,  -5,   3,   3,   3,   3,  -5,    5],
  [   5,  -5,   3,   3,   3,   3,  -5,    5],
  [  20,  -5,  15,   3,   3,  15,  -5,   20],
  [-20,  -40,  -5,  -5,  -5,  -5, -40,  -20],
  [ 120, -20,  20,   5,   5,  20, -20,  120],
];

// 盤面評価関数
function evaluateBoard(board: BoardState, aiPlayer: Player): number {
  const opponent = getOpponent(aiPlayer);
  let score = 0;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === aiPlayer) {
        score += POSITION_WEIGHTS[r][c];
      } else if (board[r][c] === opponent) {
        score -= POSITION_WEIGHTS[r][c];
      }
    }
  }

  // 着手可能手数の多さ（移動の自由度）も加味
  const aiMoves = getValidMoves(board, aiPlayer).length;
  const oppMoves = getValidMoves(board, opponent).length;
  score += (aiMoves - oppMoves) * 10;

  return score;
}

// Alpha-Beta 枝刈り探索
function minimax(
  board: BoardState,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiPlayer: Player
): number {
  const opponent = getOpponent(aiPlayer);
  const currentPlayer = isMaximizing ? aiPlayer : opponent;
  const moves = getValidMoves(board, currentPlayer);

  // 終局または深さ制限
  if (depth === 0 || (moves.length === 0 && getValidMoves(board, getOpponent(currentPlayer)).length === 0)) {
    return evaluateBoard(board, aiPlayer);
  }

  // パスの場合は相手の手番へ
  if (moves.length === 0) {
    return minimax(board, depth - 1, alpha, beta, !isMaximizing, aiPlayer);
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const [r, c] of moves) {
      const { board: nextBoard } = applyMove(board, r, c, aiPlayer);
      const evalScore = minimax(nextBoard, depth - 1, alpha, beta, false, aiPlayer);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break; // 枝刈り
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const [r, c] of moves) {
      const { board: nextBoard } = applyMove(board, r, c, opponent);
      const evalScore = minimax(nextBoard, depth - 1, alpha, beta, true, aiPlayer);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break; // 枝刈り
    }
    return minEval;
  }
}

// NPCが着手する手を選択する
export function chooseAIMove(
  board: BoardState,
  aiPlayer: Player,
  difficulty: 'easy' | 'normal' | 'hard'
): [number, number] | null {
  const moves = getValidMoves(board, aiPlayer);
  if (moves.length === 0) return null;

  // 初級 (Easy): ランダム 80%、ひっくり返し数重視 20%
  if (difficulty === 'easy') {
    if (Math.random() < 0.7) {
      return moves[Math.floor(Math.random() * moves.length)];
    }
    // 少しだけ良い手
    let bestMove = moves[0];
    let maxFlips = -1;
    for (const [r, c] of moves) {
      const flips = getFlippableStones(board, r, c, aiPlayer).length;
      if (flips > maxFlips) {
        maxFlips = flips;
        bestMove = [r, c];
      }
    }
    return bestMove;
  }

  // 中級 (Normal): 角を最優先 + ポジション評価テーブル
  if (difficulty === 'normal') {
    // 角が取れるなら絶対に取る
    const corners = moves.filter(([r, c]) => (r === 0 || r === 7) && (c === 0 || c === 7));
    if (corners.length > 0) {
      return corners[Math.floor(Math.random() * corners.length)];
    }

    let bestMove = moves[0];
    let bestVal = -Infinity;
    for (const [r, c] of moves) {
      const weight = POSITION_WEIGHTS[r][c];
      const flips = getFlippableStones(board, r, c, aiPlayer).length;
      const score = weight + flips * 2 + (Math.random() * 4 - 2); // 少しのランダム性
      if (score > bestVal) {
        bestVal = score;
        bestMove = [r, c];
      }
    }
    return bestMove;
  }

  // 上級 (Hard): 深さ4のAlpha-Beta探索
  let bestMove = moves[0];
  let maxScore = -Infinity;

  for (const [r, c] of moves) {
    const { board: nextBoard } = applyMove(board, r, c, aiPlayer);
    const score = minimax(nextBoard, 3, -Infinity, Infinity, false, aiPlayer);
    if (score > maxScore) {
      maxScore = score;
      bestMove = [r, c];
    }
  }

  return bestMove;
}
