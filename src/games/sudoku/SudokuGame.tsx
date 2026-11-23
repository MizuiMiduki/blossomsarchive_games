import { Component, createSignal, For, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import confetti from 'canvas-confetti';

type Difficulty = 'easy' | 'medium' | 'hard';

interface SudokuCell {
  val: number;
  initial: boolean;
  notes: number[];
  error: boolean;
}

// 確定済みベース盤面（ローテーションで数万通りの有効盤面を即座に生成）
const SEED_BOARD = [
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

export const SudokuGame: Component = () => {
  const [difficulty, setDifficulty] = createSignal<Difficulty>('easy');
  const [board, setBoard] = createSignal<SudokuCell[][]>([]);
  const [selectedCell, setSelectedCell] = createSignal<[number, number] | null>(null);
  const [isNoteMode, setIsNoteMode] = createSignal(false);
  const [timer, setTimer] = createSignal(0);
  const [mistakes, setMistakes] = createSignal(0);
  const [isVictory, setIsVictory] = createSignal(false);
  const [isGameOver, setIsGameOver] = createSignal(false);
  const [history, setHistory] = createSignal<SudokuCell[][][]>([]);

  let timerId: number | null = null;

  const instructions = [
    '【数独（ナンプレ）】9×9のマスを1〜9の数字で埋める論理パズルゲームです。',
    'タテの各列、ヨコの各行、太線で囲まれた3×3の各ブロックに、1から9までの数字が重複なく入ります。',
    '【メモ機能】「✏️ メモ」モードに切り替えると、マスの中に候補の数字を小さくメモ書きできます。',
    '3回ミスするとゲームオーバーになるので、慎重に推理を進めましょう。',
  ];

  const generateBoard = (diff: Difficulty) => {
    // 盤面シャッフル（数字置換 & 行・列スワップ）
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
    const map = new Map<number, number>();
    for (let i = 1; i <= 9; i++) map.set(i, nums[i - 1]);

    const solved = SEED_BOARD.map((row) => row.map((v) => map.get(v)!));

    // 難易度別のブランク作成
    const cluesCount = diff === 'easy' ? 40 : diff === 'medium' ? 32 : 26;
    const toRemove = 81 - cluesCount;

    const newBoard: SudokuCell[][] = solved.map((row) =>
      row.map((val) => ({
        val,
        initial: true,
        notes: [],
        error: false,
      }))
    );

    let removed = 0;
    while (removed < toRemove) {
      const r = Math.floor(Math.random() * 9);
      const c = Math.floor(Math.random() * 9);
      if (newBoard[r][c].val !== 0) {
        newBoard[r][c].val = 0;
        newBoard[r][c].initial = false;
        removed++;
      }
    }

    setBoard(newBoard);
    setSelectedCell(null);
    setTimer(0);
    setMistakes(0);
    setIsGameOver(false);
    setIsVictory(false);
    setHistory([]);

    if (timerId) clearInterval(timerId);
    timerId = window.setInterval(() => setTimer((t) => t + 1), 1000);
  };

  const handleCellClick = (r: number, c: number) => {
    sound.playPop(500);
    setSelectedCell([r, c]);
  };

  const inputNumber = (num: number) => {
    const sel = selectedCell();
    if (!sel || isGameOver() || isVictory()) return;
    const [r, c] = sel;
    const current = board().map((row) => row.map((cell) => ({ ...cell, notes: [...cell.notes] })));
    const cell = current[r][c];

    if (cell.initial) return;

    // 履歴保存
    setHistory((h) => [...h.slice(-15), board()]);

    if (isNoteMode()) {
      sound.playPop(620);
      if (cell.notes.includes(num)) {
        cell.notes = cell.notes.filter((n) => n !== num);
      } else {
        cell.notes.push(num);
        cell.notes.sort((a, b) => a - b);
      }
    } else {
      cell.notes = [];
      if (cell.val === num) {
        cell.val = 0;
        cell.error = false;
      } else {
        cell.val = num;

        // 重複チェック
        let hasConflict = false;
        for (let i = 0; i < 9; i++) {
          if (i !== c && current[r][i].val === num) hasConflict = true;
          if (i !== r && current[i][c].val === num) hasConflict = true;
        }
        const br = Math.floor(r / 3) * 3;
        const bc = Math.floor(c / 3) * 3;
        for (let dr = 0; dr < 3; dr++) {
          for (let dc = 0; dc < 3; dc++) {
            const tr = br + dr;
            const tc = bc + dc;
            if ((tr !== r || tc !== c) && current[tr][tc].val === num) hasConflict = true;
          }
        }

        cell.error = hasConflict;
        if (hasConflict) {
          sound.playGameOver();
          const nextM = mistakes() + 1;
          setMistakes(nextM);
          if (nextM >= 3) {
            setIsGameOver(true);
            if (timerId) clearInterval(timerId);
          }
        } else {
          sound.playPop(520);
          checkWin(current);
        }
      }
    }

    setBoard(current);
  };

  const deleteCurrent = () => {
    const sel = selectedCell();
    if (!sel) return;
    const [r, c] = sel;
    const current = board().map((row) => row.map((cell) => ({ ...cell, notes: [...cell.notes] })));
    if (current[r][c].initial) return;
    current[r][c].val = 0;
    current[r][c].notes = [];
    current[r][c].error = false;
    setBoard(current);
  };

  const undo = () => {
    const h = history();
    if (h.length === 0) return;
    const prev = h[h.length - 1];
    setHistory(h.slice(0, -1));
    setBoard(prev);
    sound.playPop(420);
  };

  const checkWin = (b: SudokuCell[][]) => {
    let complete = true;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (b[r][c].val === 0 || b[r][c].error) {
          complete = false;
          break;
        }
      }
    }

    if (complete) {
      sound.playVictory();
      setIsVictory(true);
      if (timerId) clearInterval(timerId);
      confetti({ particleCount: 50, spread: 80 });
    }
  };

  generateBoard('easy');

  return (
    <GameShell
      id="sudoku"
      title="Classic Sudoku"
      score={timer()}
      isGameOver={isGameOver()}
      isVictory={isVictory()}
      onRestart={() => generateBoard(difficulty())}
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
                    generateBoard(diff);
                  }}
                  class={`px-2.5 py-1 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                    difficulty() === diff
                      ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {diff === 'easy' ? '初級' : diff === 'medium' ? '中級' : '上級'}
                </button>
              )}
            </For>
          </div>

          <div class="flex items-center gap-2 font-mono text-xs">
            <span class="text-rose-500 font-bold">ミス: {mistakes()}/3</span>
            <span class="text-slate-500 dark:text-slate-400">⏱️ {timer()}s</span>
          </div>
        </div>
      }
    >
      <div class="w-full max-w-md h-full flex flex-col items-center justify-center relative min-h-0 select-none p-2 gap-2.5">
        {/* 9x9 数独盤面 */}
        <div class="w-full aspect-square max-w-[380px] bg-slate-900 border-3 border-slate-800 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xl grid grid-cols-9 p-0.5">
          <For each={board()}>
            {(row, r) => (
              <For each={row}>
                {(cell, c) => {
                  const isSel = () => selectedCell()?.[0] === r() && selectedCell()?.[1] === c();
                  const isSameVal = () => {
                    const sel = selectedCell();
                    if (!sel) return false;
                    const selVal = board()[sel[0]][sel[1]].val;
                    return selVal > 0 && cell.val === selVal;
                  };
                  const inSameBlock = () => {
                    const sel = selectedCell();
                    if (!sel) return false;
                    return (
                      sel[0] === r() ||
                      sel[1] === c() ||
                      (Math.floor(sel[0] / 3) === Math.floor(r() / 3) &&
                        Math.floor(sel[1] / 3) === Math.floor(c() / 3))
                    );
                  };

                  const borderRight = () => (c() % 3 === 2 && c() !== 8 ? 'border-r-2 border-slate-800 dark:border-slate-600' : 'border-r border-slate-200 dark:border-slate-800');
                  const borderBottom = () => (r() % 3 === 2 && r() !== 8 ? 'border-b-2 border-slate-800 dark:border-slate-600' : 'border-b border-slate-200 dark:border-slate-800');

                  return (
                    <button
                      onClick={() => handleCellClick(r(), c())}
                      class={`relative w-full h-full flex items-center justify-center font-bold text-base transition-colors ${borderRight()} ${borderBottom()} ${
                        isSel()
                          ? 'bg-blue-500 text-white font-black'
                          : cell.error
                          ? 'bg-rose-500 text-white'
                          : isSameVal()
                          ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-900 dark:text-blue-100'
                          : inSameBlock()
                          ? 'bg-slate-100/90 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100'
                          : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      <Show when={cell.val > 0} fallback={
                        <div class="grid grid-cols-3 gap-0.5 w-full h-full p-0.5 text-[8px] leading-none text-slate-400 font-mono">
                          <For each={[1, 2, 3, 4, 5, 6, 7, 8, 9]}>
                            {(n) => <span>{cell.notes.includes(n) ? n : ''}</span>}
                          </For>
                        </div>
                      }>
                        <span class={cell.initial ? 'font-black' : 'text-blue-600 dark:text-blue-400'}>
                          {cell.val}
                        </span>
                      </Show>
                    </button>
                  );
                }}
              </For>
            )}
          </For>
        </div>

        {/* コントロール・数字キーパッド */}
        <div class="w-full max-w-[380px] flex flex-col gap-2">
          {/* 機能ボタン */}
          <div class="flex items-center justify-between gap-2 px-1 text-xs">
            <button
              onClick={undo}
              class="flex-1 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold active:scale-95 transition-all shadow-2xs"
            >
              ↩ 一手戻す
            </button>
            <button
              onClick={deleteCurrent}
              class="flex-1 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold active:scale-95 transition-all shadow-2xs"
            >
              🗑️ 消去
            </button>
            <button
              onClick={() => {
                sound.playPop(520);
                setIsNoteMode(!isNoteMode());
              }}
              class={`flex-1 py-1.5 rounded-xl border font-bold active:scale-95 transition-all shadow-2xs ${
                isNoteMode()
                  ? 'bg-blue-600 text-white border-blue-700 shadow-inner'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
              }`}
            >
              ✏️ {isNoteMode() ? 'メモON' : 'メモOFF'}
            </button>
          </div>

          {/* 1〜9 数字ボタン */}
          <div class="grid grid-cols-9 gap-1 w-full">
            <For each={[1, 2, 3, 4, 5, 6, 7, 8, 9]}>
              {(num) => (
                <button
                  onClick={() => inputNumber(num)}
                  class="py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-base font-black text-slate-800 dark:text-slate-100 shadow-2xs active:scale-95 transition-all"
                >
                  {num}
                </button>
              )}
            </For>
          </div>
        </div>
      </div>
    </GameShell>
  );
};
