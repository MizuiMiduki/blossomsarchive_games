import { Component, createSignal, onSettled, For, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';

const GRID_SIZE = 5;

export const LightsOutGame: Component = () => {
  const [grid, setGrid] = createSignal<boolean[][]>(
    Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false))
  );
  const [moves, setMoves] = createSignal(0);
  const [level, setLevel] = createSignal(1);
  const [isVictory, setIsVictory] = createSignal(false);
  const [isGameOver, setIsGameOver] = createSignal(false);
  const [startTime, setStartTime] = createSignal(Date.now());
  const [elapsedSec, setElapsedSec] = createSignal(0);

  let timerId: number | null = null;

  // 必ず解ける盤面を生成 (全消灯状態からランダムにN回トグル)
  const generateSolvableBoard = (scrambleMoves: number) => {
    const next = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));

    // トグル適用ヘルパー
    const applyToggle = (r: number, c: number) => {
      const deltas = [
        [0, 0],
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ];
      for (const [dr, dc] of deltas) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
          next[nr][nc] = !next[nr][nc];
        }
      }
    };

    // ランダム手でスクランブル
    for (let i = 0; i < scrambleMoves; i++) {
      const r = Math.floor(Math.random() * GRID_SIZE);
      const c = Math.floor(Math.random() * GRID_SIZE);
      applyToggle(r, c);
    }

    // 全て消灯したままなら1マス押す
    const hasAnyOn = next.some((row) => row.some((val) => val));
    if (!hasAnyOn) {
      applyToggle(2, 2);
    }

    return next;
  };

  const startLevel = (lvl: number) => {
    const scrambleCount = Math.min(15, 4 + lvl * 2);
    const newBoard = generateSolvableBoard(scrambleCount);
    setGrid(newBoard);
    setMoves(0);
    setIsVictory(false);
    setIsGameOver(false);
    setStartTime(Date.now());
    setElapsedSec(0);
  };

  // セルクリック時
  const handleCellClick = (r: number, c: number) => {
    if (isVictory() || isGameOver()) return;

    sound.playPop(520);
    setMoves((m) => m + 1);

    const next = grid().map((row) => [...row]);
    const deltas = [
      [0, 0],
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];

    for (const [dr, dc] of deltas) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
        next[nr][nc] = !next[nr][nc];
      }
    }

    setGrid(next);

    // クリア判定 (すべてのマスがfalse)
    const isCleared = next.every((row) => row.every((val) => !val));
    if (isCleared) {
      setIsVictory(true);
      sound.playVictory();
    }
  };

  const score = () => {
    if (!isVictory()) return 0;
    return Math.max(100, level() * 1000 - moves() * 25 - elapsedSec() * 10);
  };

  const restart = () => {
    sound.playPop(450);
    startLevel(level());
  };

  const nextLevel = () => {
    sound.playMatch(5);
    setLevel((l) => l + 1);
    startLevel(level() + 1);
  };

  onSettled(() => {
    startLevel(1);

    timerId = window.setInterval(() => {
      if (!isVictory() && !isGameOver()) {
        setElapsedSec(Math.floor((Date.now() - startTime()) / 1000));
      }
    }, 1000);

    return () => {
      if (timerId) clearInterval(timerId);
    };
  });

  const instructions = [
    '【ライツアウト】Flash黎明期に大流行した古典的電脳パズルです。',
    'マスを押すと、そのマスと上下左右の明かりが【反転】します。',
    'すべての明かりを消灯（OFF）させることができればクリアです！',
  ];

  return (
    <GameShell
      id="lights-out"
      title="Lights Out (ライツアウト)"
      score={score()}
      isGameOver={isGameOver()}
      isVictory={isVictory()}
      onRestart={restart}
      instructions={instructions}
      extraControls={
        <div class="flex items-center justify-between w-full max-w-sm px-3 py-1 bg-white/90 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs shadow-2xs">
          <div class="flex items-center gap-3">
            <div>
              <span class="text-slate-400">レベル:</span>{' '}
              <span class="font-bold text-slate-800 dark:text-slate-100">{level()}</span>
            </div>
            <div>
              <span class="text-slate-400">手数:</span>{' '}
              <span class="font-bold text-slate-800 dark:text-slate-100">{moves()}</span>
            </div>
            <div>
              <span class="text-slate-400">時間:</span>{' '}
              <span class="font-mono font-bold text-slate-800 dark:text-slate-100">{elapsedSec()}s</span>
            </div>
          </div>
          <Show when={isVictory()}>
            <button
              onClick={nextLevel}
              class="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-all active:scale-95"
            >
              次レベルへ
            </button>
          </Show>
        </div>
      }
    >
      <div class="flex flex-col items-center gap-3 w-full max-w-sm select-none p-3">
        {/* 5x5 電脳ライト盤面 */}
        <div class="p-3 rounded-3xl bg-slate-900 border-4 border-slate-800 shadow-2xl">
          <div class="grid grid-cols-5 gap-2.5 sm:gap-3 bg-slate-950 p-2 rounded-2xl">
            <For each={grid()}>
              {(row, r) => (
                <For each={row}>
                  {(isOn, c) => (
                    <button
                      onClick={() => handleCellClick(r(), c())}
                      class={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl transition-all duration-150 flex items-center justify-center relative cursor-pointer active:scale-95 ${
                        isOn
                          ? 'bg-amber-400 border-2 border-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.8)]'
                          : 'bg-slate-800/90 border border-slate-700 hover:bg-slate-700/80 shadow-inner'
                      }`}
                    >
                      {/* 電球アイコン / コア */}
                      <div
                        class={`w-4 h-4 rounded-full transition-all ${
                          isOn ? 'bg-white shadow-[0_0_8px_#ffffff]' : 'bg-slate-900/60'
                        }`}
                      />
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
