import { TestContext } from '../test-utils.ts';

export async function runGameRulesUnitTests(): Promise<TestContext> {
  const ctx = new TestContext('Unit - Core Game Rules & Math Validation');

  // 1. リバーシ 初期盤面と合法手判定
  // 8x8 盤面 (0: 空, 1: 黒, 2: 白)
  const reversiBoard: number[][] = Array(8).fill(0).map(() => Array(8).fill(0));
  reversiBoard[3][3] = 2; // 白
  reversiBoard[3][4] = 1; // 黒
  reversiBoard[4][3] = 1; // 黒
  reversiBoard[4][4] = 2; // 白

  function isValidReversiMove(board: number[][], r: number, c: number, player: number): boolean {
    if (board[r][c] !== 0) return false;
    const opponent = player === 1 ? 2 : 1;
    const dirs = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1],
    ];

    for (const [dr, dc] of dirs) {
      let nr = r + dr;
      let nc = c + dc;
      let count = 0;
      while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === opponent) {
        nr += dr;
        nc += dc;
        count++;
      }
      if (count > 0 && nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === player) {
        return true;
      }
    }
    return false;
  }

  // 黒 (1) の合法手: (2, 3), (3, 2), (4, 5), (5, 4)
  ctx.assert(isValidReversiMove(reversiBoard, 2, 3, 1), 'Reversi: (2, 3) is a valid move for Black');
  ctx.assert(isValidReversiMove(reversiBoard, 3, 2, 1), 'Reversi: (3, 2) is a valid move for Black');
  ctx.assert(!isValidReversiMove(reversiBoard, 0, 0, 1), 'Reversi: (0, 0) is not a valid move for Black');
  ctx.assert(!isValidReversiMove(reversiBoard, 3, 3, 1), 'Reversi: Occupied square (3, 3) is invalid');

  // 2. 数独の盤面整合性チェック (行・列・3x3 ブロックの重複がないこと)
  const solvedSudoku = [
    [5, 3, 4, 6, 7, 8, 9, 1, 2],
    [6, 7, 2, 1, 9, 5, 3, 4, 8],
    [1, 9, 8, 3, 4, 2, 5, 6, 7],
    [8, 5, 9, 7, 6, 1, 4, 2, 3],
    [4, 2, 6, 8, 5, 3, 7, 9, 1],
    [7, 1, 3, 9, 2, 4, 8, 5, 6],
    [9, 6, 1, 5, 3, 7, 2, 8, 4],
    [2, 8, 7, 4, 1, 9, 6, 3, 5],
    [3, 4, 5, 2, 8, 6, 1, 7, 9],
  ];

  function isSudokuValid(board: number[][]): boolean {
    for (let i = 0; i < 9; i++) {
      const row = new Set<number>();
      const col = new Set<number>();
      for (let j = 0; j < 9; j++) {
        if (row.has(board[i][j]) || col.has(board[j][i])) return false;
        row.add(board[i][j]);
        col.add(board[j][i]);
      }
    }
    for (let br = 0; br < 9; br += 3) {
      for (let bc = 0; bc < 9; bc += 3) {
        const block = new Set<number>();
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            const val = board[br + r][bc + c];
            if (block.has(val)) return false;
            block.add(val);
          }
        }
      }
    }
    return true;
  }

  ctx.assert(isSudokuValid(solvedSudoku), 'Sudoku: Solved seed board passes all row/col/block validations');

  // 重複を含む不正な数独
  const brokenSudoku = JSON.parse(JSON.stringify(solvedSudoku));
  brokenSudoku[0][0] = 3; // 行内に 3 が重複
  ctx.assert(!isSudokuValid(brokenSudoku), 'Sudoku: Detected duplicate number in row');

  // 3. ライフゲームのセル遷移ルール
  // 誕生: 死セル + 周囲3個生 -> 生
  // 生存: 生セル + 周囲2〜3個生 -> 生
  // 死亡: 生セル + 周囲<2 or >3 -> 死
  function nextCellState(isAlive: boolean, neighbors: number): boolean {
    if (isAlive) {
      return neighbors === 2 || neighbors === 3;
    } else {
      return neighbors === 3;
    }
  }

  ctx.assert(nextCellState(false, 3) === true, 'Conway: Dead cell with 3 neighbors becomes alive');
  ctx.assert(nextCellState(false, 2) === false, 'Conway: Dead cell with 2 neighbors remains dead');
  ctx.assert(nextCellState(true, 2) === true, 'Conway: Live cell with 2 neighbors survives');
  ctx.assert(nextCellState(true, 3) === true, 'Conway: Live cell with 3 neighbors survives');
  ctx.assert(nextCellState(true, 1) === false, 'Conway: Live cell with 1 neighbor dies of underpopulation');
  ctx.assert(nextCellState(true, 4) === false, 'Conway: Live cell with 4 neighbors dies of overpopulation');

  return ctx;
}
