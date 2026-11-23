import { Component, createSignal, onSettled, For } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { UndoIcon } from '../../components/Icons.tsx';
import { sound } from '../../utils/sound.ts';
import {
  Tile,
  createEmptyGrid,
  spawnRandomTile,
  moveGrid,
  isGameOverCheck,
  has2048,
  TILE_CONFIG,
  Direction,
} from './logic.ts';

interface ReactiveTile {
  id: number;
  row: () => number;
  setRow: (r: number) => void;
  col: () => number;
  setCol: (c: number) => void;
  value: () => number;
  setValue: (v: number) => void;
  isMerged: () => boolean;
  setIsMerged: (m: boolean) => void;
  isNew: () => boolean;
  setIsNew: (n: boolean) => void;
}

function createReactiveTile(t: Tile): ReactiveTile {
  const [row, setRow] = createSignal(t.row);
  const [col, setCol] = createSignal(t.col);
  const [value, setValue] = createSignal(t.value);
  const [isMerged, setIsMerged] = createSignal(Boolean(t.merged));
  const [isNew, setIsNew] = createSignal(Boolean(t.isNew));
  return { id: t.id, row, setRow, col, setCol, value, setValue, isMerged, setIsMerged, isNew, setIsNew };
}

export const Floris2048Game: Component = () => {
  const [grid, setGrid] = createSignal<(Tile | null)[][]>(createEmptyGrid());
  const [activeTiles, setActiveTiles] = createSignal<ReactiveTile[]>([]);
  const [score, setScore] = createSignal(0);
  const [history, setHistory] = createSignal<{ grid: (Tile | null)[][]; score: number }[]>([]);
  const [isGameOver, setIsGameOver] = createSignal(false);
  const [isVictory, setIsVictory] = createSignal(false);
  const [hasWon, setHasWon] = createSignal(false);

  const tileMap = new Map<number, ReactiveTile>();

  const syncGridToReactiveTiles = (currentGrid: (Tile | null)[][]) => {
    const flatList: Tile[] = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const t = currentGrid[r][c];
        if (t) flatList.push(t);
      }
    }

    const currentIds = new Set(flatList.map((t) => t.id));

    // 削除されたタイルを破棄
    for (const [id] of tileMap) {
      if (!currentIds.has(id)) {
        tileMap.delete(id);
      }
    }

    // 移動 / 更新 / 新規追加
    for (const t of flatList) {
      if (tileMap.has(t.id)) {
        const rt = tileMap.get(t.id)!;
        rt.setRow(t.row);
        rt.setCol(t.col);
        rt.setValue(t.value);
        rt.setIsMerged(Boolean(t.merged));
        rt.setIsNew(false);
      } else {
        const rt = createReactiveTile(t);
        tileMap.set(t.id, rt);
      }
    }

    setActiveTiles(Array.from(tileMap.values()));
  };

  // ゲームリセット
  const restart = () => {
    tileMap.clear();
    let newGrid = createEmptyGrid();
    newGrid = spawnRandomTile(newGrid).grid;
    newGrid = spawnRandomTile(newGrid).grid;
    setGrid(newGrid);
    syncGridToReactiveTiles(newGrid);
    setScore(0);
    setHistory([]);
    setIsGameOver(false);
    setIsVictory(false);
    setHasWon(false);
  };

  // 1手戻す (Undo)
  const handleUndo = () => {
    const hist = history();
    if (hist.length === 0) return;
    const last = hist[hist.length - 1];
    setGrid(last.grid);
    syncGridToReactiveTiles(last.grid);
    setScore(last.score);
    setHistory(hist.slice(0, -1));
    setIsGameOver(false);
    sound.playPop(380);
  };

  // 移動処理
  const handleMove = (direction: Direction) => {
    if (isGameOver()) return;

    const currentGrid = grid();
    const currentScore = score();

    const { grid: nextGrid, scoreGained, moved, mergedLevels } = moveGrid(currentGrid, direction);

    if (!moved) return;

    // 履歴保存 (最大10手)
    setHistory((prev) => [...prev.slice(-9), { grid: currentGrid, score: currentScore }]);

    // 新タイル出現
    const { grid: finalGrid } = spawnRandomTile(nextGrid);
    setGrid(finalGrid);
    syncGridToReactiveTiles(finalGrid);
    setScore((s) => s + scoreGained);

    // サウンド再生
    if (mergedLevels.length > 0) {
      sound.playMatch(Math.max(...mergedLevels));
    } else {
      sound.playPop(420);
    }

    // 勝利判定 (初回2048到達時のみ)
    if (!hasWon() && has2048(finalGrid)) {
      setHasWon(true);
      setIsVictory(true);
    }

    // ゲームオーバー判定
    if (isGameOverCheck(finalGrid)) {
      setIsGameOver(true);
    }
  };

  // キーボード操作
  const onKeyDown = (e: KeyboardEvent) => {
    if (['ArrowUp', 'KeyW'].includes(e.code)) {
      e.preventDefault();
      handleMove('up');
    } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
      e.preventDefault();
      handleMove('down');
    } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
      e.preventDefault();
      handleMove('left');
    } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
      e.preventDefault();
      handleMove('right');
    }
  };

  // スワイプ / ドラッグ操作 (タッチ & マウス両対応)
  let pointerStartX = 0;
  let pointerStartY = 0;
  let isPointerDown = false;

  const onPointerDown = (e: PointerEvent) => {
    pointerStartX = e.clientX;
    pointerStartY = e.clientY;
    isPointerDown = true;
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!isPointerDown) return;
    isPointerDown = false;
    const deltaX = e.clientX - pointerStartX;
    const deltaY = e.clientY - pointerStartY;
    const minSwipe = 28;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > minSwipe) {
        if (deltaX > 0) handleMove('right');
        else handleMove('left');
      }
    } else {
      if (Math.abs(deltaY) > minSwipe) {
        if (deltaY > 0) handleMove('down');
        else handleMove('up');
      }
    }
  };

  onSettled(() => {
    restart();
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  });

  const instructions = [
    '矢印キー、WASD、またはスワイプで花パネルをスライドさせます。',
    '同じ花同士がぶつかると合体し、次の段階の花へと進化します。',
    'つぼみ🌱から育てて、大輪の桜や奇跡の花束💐 (2048) を目指しましょう！',
  ];

  return (
    <GameShell
      id="floris-2048"
      title="Floris 2048"
      score={score()}
      isGameOver={isGameOver()}
      isVictory={isVictory()}
      onRestart={restart}
      instructions={instructions}
      extraControls={
        <div class="flex items-center gap-3">
          <button
            onClick={handleUndo}
            disabled={history().length === 0}
            class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-rose-300 dark:hover:border-rose-600 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-xs active:scale-95"
          >
            <UndoIcon size={16} />
            <span>1手戻す</span>
          </button>
        </div>
      }
    >
      <style>{`
        @keyframes tile-spawn {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes tile-pop {
          0% { transform: scale(0.92); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        .animate-tile-spawn {
          animation: tile-spawn 200ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .animate-tile-pop {
          animation: tile-pop 220ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>

      <div
        class="w-full max-w-[360px] aspect-square bg-rose-200/50 dark:bg-slate-800/80 p-3 rounded-3xl shadow-inner border-2 border-rose-200 dark:border-slate-700 select-none touch-none relative"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        {/* 背景の空スロット (4x4) */}
        <div class="grid grid-cols-4 grid-rows-4 w-full h-full">
          <For each={Array(16).fill(0)}>
            {() => (
              <div class="p-1 sm:p-1.5 w-full h-full">
                <div class="w-full h-full rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-rose-100/30 dark:border-slate-800/50 shadow-2xs" />
              </div>
            )}
          </For>
        </div>

        {/* タイル描画レイヤー (物理スライド & ポップアニメーション) */}
        <div class="absolute inset-3 pointer-events-none">
          <For each={activeTiles()}>
            {(tile) => {
              const conf = () =>
                TILE_CONFIG[tile.value()] || {
                  emoji: '🌸',
                  name: String(tile.value()),
                  bg: 'bg-rose-400 text-white font-bold',
                  text: 'text-xs',
                };

              return (
                <div
                  style={{
                    position: 'absolute',
                    top: `${tile.row() * 25}%`,
                    left: `${tile.col() * 25}%`,
                    width: '25%',
                    height: '25%',
                    'transition-property': 'top, left',
                    'transition-duration': '130ms',
                    'transition-timing-function': 'cubic-bezier(0.25, 1, 0.5, 1)',
                  }}
                  class="p-1 sm:p-1.5"
                >
                  <div
                    class={`w-full h-full rounded-2xl flex flex-col items-center justify-center p-1 border shadow-xs select-none transition-transform ${
                      conf().bg
                    } ${tile.isNew() ? 'animate-tile-spawn' : tile.isMerged() ? 'animate-tile-pop' : ''}`}
                  >
                    <span class="text-2xl sm:text-3xl filter drop-shadow-xs leading-none">
                      {conf().emoji}
                    </span>
                    <span class={`mt-0.5 tracking-tight font-bold ${conf().text}`}>
                      {tile.value()}
                    </span>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </div>

      {/* 植物の成長ガイド */}
      <div class="w-full max-w-[360px] mt-4 px-2">
        <div class="text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">開花チャート:</div>
        <div class="flex items-center justify-between text-base bg-white/60 dark:bg-slate-900/60 p-2 rounded-xl border border-rose-100/60 dark:border-slate-800 shadow-2xs">
          <span>🌱</span>
          <span class="text-slate-300 text-xs">→</span>
          <span>🌿</span>
          <span class="text-slate-300 text-xs">→</span>
          <span>🌷</span>
          <span class="text-slate-300 text-xs">→</span>
          <span>🌻</span>
          <span class="text-slate-300 text-xs">→</span>
          <span>🌹</span>
          <span class="text-slate-300 text-xs">→</span>
          <span>🌸</span>
          <span class="text-slate-300 text-xs">→</span>
          <span>💐</span>
        </div>
      </div>
    </GameShell>
  );
};
