import { Component, createSignal, For, onSettled, onCleanup, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import confetti from 'canvas-confetti';

// 記号: #=壁, .=床, @=プレイヤー, $=箱, *=ゴール上の箱, +=ゴール上のプレイヤー, O=ゴール地点
const LEVELS: string[][] = [
  // Level 1: チュートリアル
  [
    '######',
    '#@ $O#',
    '######',
  ],
  // Level 2: 2つの箱
  [
    '#######',
    '#O $  #',
    '#  $ O#',
    '# @   #',
    '#######',
  ],
  // Level 3: 回り込み
  [
    '  #### ',
    '###  # ',
    '# $  # ',
    '#@$ O# ',
    '#  O## ',
    '#####  ',
  ],
  // Level 4: 3連箱
  [
    '#######',
    '#     #',
    '# O$O #',
    '# $@$ #',
    '# O$O #',
    '#     #',
    '#######',
  ],
  // Level 5: 狭い通路
  [
    '#######',
    '#@  # #',
    '# $$  #',
    '# # $ #',
    '# OO O#',
    '#######',
  ],
  // Level 6: 倉庫番クラシック
  [
    '  ##### ',
    '###   # ',
    '# $ # ##',
    '# #  O #',
    '# @ $O #',
    '########',
  ],
  // Level 7: 4つの灯籠
  [
    '########',
    '#   O  #',
    '# $$#$$#',
    '# O @ O#',
    '#   O  #',
    '########',
  ],
  // Level 8: 迷路型
  [
    '#########',
    '#  #    #',
    '# $  $# #',
    '#@#$  O #',
    '#  # O O#',
    '#########',
  ],
];

interface BoardState {
  grid: string[][];
  playerPos: [number, number];
  moves: number;
  pushes: number;
}

export const SokobanGame: Component = () => {
  const [currentLevel, setCurrentLevel] = createSignal(0);
  const [grid, setGrid] = createSignal<string[][]>([]);
  const [moves, setMoves] = createSignal(0);
  const [pushes, setPushes] = createSignal(0);
  const [history, setHistory] = createSignal<BoardState[]>([]);
  const [isVictory, setIsVictory] = createSignal(false);

  let playerPos: [number, number] = [0, 0];

  const instructions = [
    '【桜の庭園 倉庫番】すべての「灯籠（木箱）」を、桜の花が咲く「台座（ゴール）」まで押し運ぶ名作パズルです。',
    'PCは「矢印キー」または「WASD」、スマホは画面下の「十字キー」でキャラクターを動かせます。',
    '灯籠は「押す」ことしかできず、「引く」ことはできません。壁の隅に追い詰めないよう慎重に進めましょう。',
    '行き詰まったら「↩ 一手戻す」で何手でも巻き戻せます。全8ステージのクリアを目指しましょう！',
  ];

  const loadLevel = (lvlIdx: number) => {
    const raw = LEVELS[lvlIdx % LEVELS.length];
    const newGrid = raw.map((line) => line.split(''));

    for (let r = 0; r < newGrid.length; r++) {
      for (let c = 0; c < newGrid[r].length; c++) {
        if (newGrid[r][c] === '@' || newGrid[r][c] === '+') {
          playerPos = [r, c];
        }
      }
    }

    setGrid(newGrid);
    setMoves(0);
    setPushes(0);
    setHistory([]);
    setIsVictory(false);
  };

  const movePlayer = (dr: number, dc: number) => {
    if (isVictory()) return;
    const [r, c] = playerPos;
    const nr = r + dr;
    const nc = c + dc;
    const current = grid().map((row) => [...row]);

    if (nr < 0 || nr >= current.length || nc < 0 || nc >= current[0].length) return;
    const nextTile = current[nr][nc];

    if (nextTile === '#') return; // 壁

    // 箱を押す場合
    if (nextTile === '$' || nextTile === '*') {
      const boxNr = nr + dr;
      const boxNc = nc + dc;
      if (boxNr < 0 || boxNr >= current.length || boxNc < 0 || boxNc >= current[0].length) return;
      const boxNextTile = current[boxNr][boxNc];

      // 箱の先が壁または別の箱なら押せない
      if (boxNextTile === '#' || boxNextTile === '$' || boxNextTile === '*') return;

      // 履歴保存
      setHistory((h) => [...h, { grid: grid().map((r) => [...r]), playerPos: [...playerPos], moves: moves(), pushes: pushes() }]);

      // 箱を移動
      current[boxNr][boxNc] = boxNextTile === 'O' ? '*' : '$';
      current[nr][nc] = nextTile === '*' ? '+' : '@';
      current[r][c] = current[r][c] === '+' ? 'O' : ' ';

      playerPos = [nr, nc];
      sound.playPop(340);
      setPushes((p) => p + 1);
      setMoves((m) => m + 1);
      setGrid(current);

      checkWin(current);
      return;
    }

    // 通常移動（空きマスまたはゴールマス）
    if (nextTile === ' ' || nextTile === 'O') {
      // 履歴保存
      setHistory((h) => [...h, { grid: grid().map((r) => [...r]), playerPos: [...playerPos], moves: moves(), pushes: pushes() }]);

      current[nr][nc] = nextTile === 'O' ? '+' : '@';
      current[r][c] = current[r][c] === '+' ? 'O' : ' ';

      playerPos = [nr, nc];
      sound.playPop(480);
      setMoves((m) => m + 1);
      setGrid(current);
    }
  };

  const undo = () => {
    const h = history();
    if (h.length === 0) return;
    const prev = h[h.length - 1];
    setHistory(h.slice(0, -1));
    setGrid(prev.grid);
    playerPos = [...prev.playerPos];
    setMoves(prev.moves);
    setPushes(prev.pushes);
    sound.playPop(400);
  };

  const checkWin = (g: string[][]) => {
    let unplaced = 0;
    for (let r = 0; r < g.length; r++) {
      for (let c = 0; c < g[r].length; c++) {
        if (g[r][c] === '$') unplaced++;
      }
    }

    if (unplaced === 0) {
      sound.playVictory();
      setIsVictory(true);
      confetti({ particleCount: 45, spread: 75 });
    }
  };

  const nextLevel = () => {
    const next = (currentLevel() + 1) % LEVELS.length;
    setCurrentLevel(next);
    loadLevel(next);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (['ArrowUp', 'w', 'W'].includes(e.key)) {
      e.preventDefault();
      movePlayer(-1, 0);
    } else if (['ArrowDown', 's', 'S'].includes(e.key)) {
      e.preventDefault();
      movePlayer(1, 0);
    } else if (['ArrowLeft', 'a', 'A'].includes(e.key)) {
      e.preventDefault();
      movePlayer(0, -1);
    } else if (['ArrowRight', 'd', 'D'].includes(e.key)) {
      e.preventDefault();
      movePlayer(0, 1);
    } else if (['z', 'Z'].includes(e.key) && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      undo();
    }
  };

  onSettled(() => {
    loadLevel(currentLevel());
    window.addEventListener('keydown', handleKeyDown);
    onCleanup(() => window.removeEventListener('keydown', handleKeyDown));
  });

  return (
    <GameShell
      id="sokoban"
      title="Sokoban Garden"
      score={moves()}
      isVictory={isVictory()}
      onRestart={() => loadLevel(currentLevel())}
      onNextStage={nextLevel}
      nextStageLabel={currentLevel() < LEVELS.length - 1 ? `ステージ ${currentLevel() + 2} へ進む →` : '最初からもう一度遊ぶ'}
      instructions={instructions}
      extraControls={
        <div class="flex items-center justify-between gap-3 w-full max-w-4xl px-2 text-xs">
          <div class="flex items-center gap-1.5">
            <span class="text-slate-500 font-bold">ステージ:</span>
            <For each={LEVELS}>
              {(_, idx) => (
                <button
                  onClick={() => {
                    sound.playPop(520);
                    setCurrentLevel(idx());
                    loadLevel(idx());
                  }}
                  class={`w-6 h-6 rounded-lg text-xs font-bold transition-all ${
                    currentLevel() === idx()
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {idx() + 1}
                </button>
              )}
            </For>
          </div>

          <div class="flex items-center gap-3 font-mono text-xs">
            <span>歩数: <strong>{moves()}</strong></span>
            <span>押し: <strong>{pushes()}</strong></span>
          </div>
        </div>
      }
    >
      <div class="w-full max-w-lg h-full flex flex-col items-center justify-center relative min-h-0 select-none p-2 gap-3">
        {/* ステージクリア通知 */}
        <Show when={isVictory()}>
          <div class="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-5 py-2 rounded-2xl bg-amber-500 text-slate-950 font-black text-sm shadow-xl animate-bounce">
            <span>🌸 STAGE CLEAR!</span>
            <button
              onClick={nextLevel}
              class="px-3 py-1 rounded-xl bg-slate-950 text-white text-xs font-bold hover:bg-slate-800 active:scale-95 transition-all"
            >
              次へ進む →
            </button>
          </div>
        </Show>

        {/* 庭園グリッドマップ */}
        <div class="p-4 bg-amber-50/70 dark:bg-slate-900/90 rounded-3xl border-3 border-amber-200 dark:border-slate-700 shadow-xl overflow-hidden flex flex-col items-center justify-center">
          <div class="flex flex-col gap-1">
            <For each={grid()}>
              {(row) => (
                <div class="flex gap-1">
                  <For each={row}>
                    {(cell) => {
                      const isWall = cell === '#';
                      const isBox = cell === '$';
                      const isTargetBox = cell === '*';
                      const isTarget = cell === 'O' || cell === '+';
                      const isPlayer = cell === '@' || cell === '+';

                      return (
                        <div
                          class={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-lg sm:text-xl font-bold select-none transition-transform duration-100 ${
                            isWall
                              ? 'bg-slate-700 dark:bg-slate-800 shadow-inner border border-slate-600'
                              : isTargetBox
                              ? 'bg-rose-200 dark:bg-rose-950/80 border-2 border-rose-500 text-rose-600'
                              : isTarget
                              ? 'bg-pink-100 dark:bg-pink-950/40 border border-dashed border-pink-400'
                              : 'bg-white/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60'
                          }`}
                        >
                          <Show when={isPlayer}>
                            <span class="animate-pulse">🧙</span>
                          </Show>
                          <Show when={isBox && !isPlayer}>
                            <span class="scale-110 drop-shadow-md">📦</span>
                          </Show>
                          <Show when={isTargetBox && !isPlayer}>
                            <span class="scale-110 drop-shadow-md">🏮</span>
                          </Show>
                          <Show when={isTarget && !isBox && !isTargetBox && !isPlayer}>
                            <span class="text-xs text-rose-400">🌸</span>
                          </Show>
                        </div>
                      );
                    }}
                  </For>
                </div>
              )}
            </For>
          </div>
        </div>

        {/* 十字キー操作（スマホ・タッチ対応） */}
        <div class="flex flex-col items-center gap-1.5 mt-1">
          <button
            onClick={() => movePlayer(-1, 0)}
            class="w-12 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-center text-base font-bold active:scale-95 active:bg-slate-100"
          >
            ▲
          </button>
          <div class="flex items-center gap-2">
            <button
              onClick={() => movePlayer(0, -1)}
              class="w-12 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-center text-base font-bold active:scale-95 active:bg-slate-100"
            >
              ◀
            </button>
            <button
              onClick={undo}
              title="一手戻す"
              class="w-12 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-xs flex items-center justify-center active:scale-95"
            >
              ↩
            </button>
            <button
              onClick={() => movePlayer(0, 1)}
              class="w-12 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-center text-base font-bold active:scale-95 active:bg-slate-100"
            >
              ▶
            </button>
          </div>
          <button
            onClick={() => movePlayer(1, 0)}
            class="w-12 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-center text-base font-bold active:scale-95 active:bg-slate-100"
          >
            ▼
          </button>
        </div>
      </div>
    </GameShell>
  );
};
