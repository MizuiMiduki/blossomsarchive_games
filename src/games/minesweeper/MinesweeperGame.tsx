import { Component, createSignal, For, Show, onCleanup } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import confetti from 'canvas-confetti';

type CellState = {
  row: number;
  col: number;
  isMine: boolean;
  isOpen: boolean;
  isFlagged: boolean;
  neighborMines: number;
};

type Difficulty = 'easy' | 'medium' | 'hard';

const CONFIGS: Record<Difficulty, { rows: number; cols: number; mines: number; label: string }> = {
  easy: { rows: 9, cols: 9, mines: 10, label: '初級 (9×9)' },
  medium: { rows: 12, cols: 12, mines: 24, label: '中級 (12×12)' },
  hard: { rows: 16, cols: 12, mines: 42, label: '上級 (16×12)' },
};

export const MinesweeperGame: Component = () => {
  const [difficulty, setDifficulty] = createSignal<Difficulty>('easy');
  const [grid, setGrid] = createSignal<CellState[][]>([]);
  const [flagsLeft, setFlagsLeft] = createSignal(10);
  const [timer, setTimer] = createSignal(0);
  const [isGameOver, setIsGameOver] = createSignal(false);
  const [isVictory, setIsVictory] = createSignal(false);
  const [flagMode, setFlagMode] = createSignal(false); // スマホ用フラグモード切替
  const [firstClickDone, setFirstClickDone] = createSignal(false);

  let timerId: number | null = null;
  let longPressTimer: number | null = null;
  let isLongPressTriggered = false;

  const instructions = [
    '【花畑マインスイーパー】隠された「トゲの茨（地雷）」を避けて、すべての安全なマスを開いて花を満開にしましょう！',
    'マスを開けると、周囲8マスに潜む「茨の数」が数字で表示されます。数字を手がかりに安全な場所を推理しましょう。',
    '【フラグ機能】PCは右クリック、スマホは「長押し」または「🌸 マーク」モードで、怪しい場所に桜の旗（フラグ）を立てられます。',
    '【コード機能（Chording）】数字の周りに必要数のフラグを立てた後、その数字をタップすると周囲の安全なマスを一括で開けます。',
    '最初の1マスは必ず安全に開く設計なので、安心して直感でスタートできます。',
  ];

  const initBoard = (diff = difficulty()) => {
    const { rows, cols, mines } = CONFIGS[diff];
    const newGrid: CellState[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: CellState[] = [];
      for (let c = 0; c < cols; c++) {
        row.push({
          row: r,
          col: c,
          isMine: false,
          isOpen: false,
          isFlagged: false,
          neighborMines: 0,
        });
      }
      newGrid.push(row);
    }
    setGrid(newGrid);
    setFlagsLeft(mines);
    setTimer(0);
    setIsGameOver(false);
    setIsVictory(false);
    setFirstClickDone(false);

    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  };

  const generateMinedBoard = (excludeR: number, excludeC: number): CellState[][] => {
    const { rows, cols, mines } = CONFIGS[difficulty()];
    const current = grid().map((r) => r.map((c) => ({ ...c })));
    let placed = 0;

    while (placed < mines) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      if ((Math.abs(r - excludeR) <= 1 && Math.abs(c - excludeC) <= 1) || current[r][c].isMine) {
        continue;
      }
      current[r][c].isMine = true;
      placed++;
    }

    // 周囲の地雷数計算
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!current[r][c].isMine) {
          let count = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && current[nr][nc].isMine) {
                count++;
              }
            }
          }
          current[r][c].neighborMines = count;
        }
      }
    }
    return current;
  };

  const reveal = (row: number, col: number, current: CellState[][]) => {
    if (row < 0 || row >= current.length || col < 0 || col >= current[0].length) return;
    const target = current[row][col];
    if (target.isOpen || target.isFlagged || target.isMine) return;

    target.isOpen = true;
    if (target.neighborMines === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr !== 0 || dc !== 0) reveal(row + dr, col + dc, current);
        }
      }
    }
  };

  const chordCell = (r: number, c: number, current: CellState[][]) => {
    const cell = current[r][c];
    if (!cell.isOpen || cell.neighborMines === 0) return;

    const { rows, cols } = CONFIGS[difficulty()];
    let flagCount = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          if (current[nr][nc].isFlagged) flagCount++;
        }
      }
    }

    if (flagCount === cell.neighborMines) {
      let hitMine = false;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            const target = current[nr][nc];
            if (!target.isOpen && !target.isFlagged) {
              if (target.isMine) {
                target.isOpen = true;
                hitMine = true;
              } else {
                reveal(nr, nc, current);
              }
            }
          }
        }
      }

      if (hitMine) {
        sound.playGameOver();
        for (let row of current) {
          for (let it of row) {
            if (it.isMine) it.isOpen = true;
          }
        }
        setGrid(current);
        setIsGameOver(true);
        if (timerId) clearInterval(timerId);
        return;
      }

      sound.playPop(520);
      setGrid(current);
      checkWin(current);
    }
  };

  const openCell = (r: number, c: number) => {
    if (isGameOver() || isVictory()) return;

    let current: CellState[][];
    if (!firstClickDone()) {
      setFirstClickDone(true);
      current = generateMinedBoard(r, c);
      if (timerId) clearInterval(timerId);
      timerId = window.setInterval(() => setTimer((t) => t + 1), 1000);
    } else {
      current = grid().map((row) => row.map((cell) => ({ ...cell })));
    }

    const cell = current[r][c];

    // すでに開いているマスは Chording を実行
    if (cell.isOpen) {
      chordCell(r, c, current);
      return;
    }

    if (cell.isFlagged) return;

    if (cell.isMine) {
      sound.playGameOver();
      cell.isOpen = true;
      for (let row of current) {
        for (let it of row) {
          if (it.isMine) it.isOpen = true;
        }
      }
      setGrid(current);
      setIsGameOver(true);
      if (timerId) clearInterval(timerId);
      return;
    }

    sound.playPop(480);
    reveal(r, c, current);
    setGrid(current);
    checkWin(current);
  };

  const toggleFlag = (r: number, c: number, e?: MouseEvent) => {
    if (e) e.preventDefault();
    if (isGameOver() || isVictory()) return;

    const current = grid().map((row) => row.map((cell) => ({ ...cell })));
    const cell = current[r][c];
    if (cell.isOpen) return;

    sound.playPop(620);
    cell.isFlagged = !cell.isFlagged;
    setFlagsLeft((f) => f + (cell.isFlagged ? -1 : 1));
    setGrid(current);
  };

  const handlePointerDown = (r: number, c: number) => {
    if (isGameOver() || isVictory()) return;
    isLongPressTriggered = false;
    if (longPressTimer) clearTimeout(longPressTimer);

    longPressTimer = window.setTimeout(() => {
      isLongPressTriggered = true;
      toggleFlag(r, c);
      try {
        if ('vibrate' in navigator) navigator.vibrate(40);
      } catch (_) {}
    }, 450);
  };

  const handlePointerUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  };

  const handleCellClick = (r: number, c: number) => {
    if (isLongPressTriggered) {
      isLongPressTriggered = false;
      return;
    }
    if (flagMode()) {
      toggleFlag(r, c);
    } else {
      openCell(r, c);
    }
  };

  const checkWin = (board: CellState[][]) => {
    const { rows, cols, mines } = CONFIGS[difficulty()];
    let openCount = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c].isOpen && !board[r][c].isMine) openCount++;
      }
    }

    if (openCount === rows * cols - mines) {
      sound.playVictory();
      setIsVictory(true);
      if (timerId) clearInterval(timerId);
      confetti({ particleCount: 50, spread: 80 });

      // 未開の地雷にすべて花マーク（フラグ）を立てて残り茨を0にする
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (board[r][c].isMine) {
            board[r][c].isFlagged = true;
          }
        }
      }
      setFlagsLeft(0);
      setGrid(board);
    }
  };

  const NUMBER_COLORS = [
    '',
    'text-blue-500',
    'text-emerald-500',
    'text-rose-500',
    'text-indigo-600',
    'text-amber-600',
    'text-cyan-600',
    'text-purple-600',
    'text-slate-800 dark:text-slate-200',
  ];

  const nextStage = () => {
    const nextDiff: Difficulty = difficulty() === 'easy' ? 'medium' : difficulty() === 'medium' ? 'hard' : 'easy';
    setDifficulty(nextDiff);
    initBoard(nextDiff);
  };

  onCleanup(() => {
    if (timerId) clearInterval(timerId);
    if (longPressTimer) clearTimeout(longPressTimer);
  });

  initBoard();

  return (
    <GameShell
      id="minesweeper"
      title="Floral Minesweeper"
      score={timer()}
      isGameOver={isGameOver()}
      isVictory={isVictory()}
      onRestart={() => initBoard()}
      onNextStage={nextStage}
      nextStageLabel={difficulty() !== 'hard' ? `難易度を上げて挑戦 (${difficulty() === 'easy' ? '中級' : '上級'}) →` : '新しい盤面で遊ぶ'}
      instructions={instructions}
      extraControls={
        <div class="flex items-center justify-between gap-3 w-full max-w-4xl px-2 text-xs">
          <div class="flex items-center gap-1.5">
            <For each={(['easy', 'medium', 'hard'] as Difficulty[])}>
              {(diff) => (
                <button
                  onClick={() => {
                    sound.playPop(520);
                    setDifficulty(diff);
                    initBoard(diff);
                  }}
                  class={`px-2.5 py-1 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                    difficulty() === diff
                      ? 'bg-rose-500 text-white border-rose-600 shadow-2xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {diff === 'easy' ? '初級' : diff === 'medium' ? '中級' : '上級'}
                </button>
              )}
            </For>
          </div>

          <div class="flex items-center gap-2">
            <button
              onClick={() => {
                sound.playPop(500);
                setFlagMode(!flagMode());
              }}
              class={`px-3 py-1 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all active:scale-95 ${
                flagMode()
                  ? 'bg-rose-600 text-white border-rose-700 shadow-inner'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
              }`}
            >
              <span>🌸</span>
              <span>{flagMode() ? 'フラグ配置中' : '開くモード'}</span>
            </button>
          </div>
        </div>
      }
    >
      <div class="w-full max-w-2xl h-full flex flex-col items-center justify-center relative min-h-0 select-none p-2 gap-2">
        {/* ステータスバー */}
        <div class="flex items-center justify-between w-full max-w-md px-4 py-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs text-xs font-mono font-bold">
          <div class="flex items-center gap-1.5 text-rose-500">
            <span>🌸 残り茨:</span>
            <strong class="text-sm">{flagsLeft()}</strong>
          </div>
          <button
            onClick={() => initBoard()}
            class="text-xl hover:scale-110 active:scale-90 transition-transform"
            title="リセット"
          >
            {isVictory() ? '😎' : isGameOver() ? '💥' : '🌸'}
          </button>
          <div class="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span>⏱️ タイム:</span>
            <strong class="text-sm">{timer()}s</strong>
          </div>
        </div>

        {/* マインスイーパー盤面 */}
        <div
          onContextMenu={(e) => e.preventDefault()}
          class="p-2 sm:p-3 bg-slate-200 dark:bg-slate-800/80 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-inner overflow-auto max-h-[calc(100dvh-180px)] flex items-center justify-center touch-manipulation"
        >
          <div
            class="grid gap-1 sm:gap-1.5"
            style={{
              'grid-template-columns': `repeat(${CONFIGS[difficulty()].cols}, minmax(0, 1fr))`,
            }}
          >
            <For each={grid()}>
              {(row) => (
                <For each={row}>
                  {(cell) => (
                    <button
                      onPointerDown={() => handlePointerDown(cell.row, cell.col)}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      onPointerLeave={handlePointerUp}
                      onClick={() => handleCellClick(cell.row, cell.col)}
                      onContextMenu={(e) => toggleFlag(cell.row, cell.col, e)}
                      class={`rounded-lg font-black flex items-center justify-center transition-all select-none ${
                        difficulty() === 'easy'
                          ? 'w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm'
                          : difficulty() === 'medium'
                          ? 'w-6 h-6 sm:w-8 sm:h-8 text-[11px] sm:text-xs'
                          : 'w-5 h-5 sm:w-7 sm:h-7 text-[10px] sm:text-xs'
                      } ${
                        cell.isOpen
                          ? cell.isMine
                            ? 'bg-rose-600 text-white shadow-inner animate-pulse'
                            : cell.neighborMines > 0
                            ? 'bg-white/95 dark:bg-slate-900/95 shadow-2xs border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800'
                            : 'bg-white/80 dark:bg-slate-900/80 shadow-2xs border border-slate-100 dark:border-slate-800'
                          : 'bg-slate-300 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 shadow-xs border-b-2 border-slate-400 dark:border-slate-900 active:translate-y-0.5 cursor-pointer'
                      }`}
                    >
                      <Show when={cell.isOpen}>
                        {cell.isMine ? (
                          '🥀'
                        ) : cell.neighborMines > 0 ? (
                          <span class={NUMBER_COLORS[cell.neighborMines]}>
                            {cell.neighborMines}
                          </span>
                        ) : (
                          ''
                        )}
                      </Show>
                      <Show when={!cell.isOpen && cell.isFlagged}>
                        <span class="text-rose-500 animate-bounce">🌸</span>
                      </Show>
                    </button>
                  )}
                </For>
              )}
            </For>
          </div>
        </div>
      </div>
    </GameShell>
  );
};
