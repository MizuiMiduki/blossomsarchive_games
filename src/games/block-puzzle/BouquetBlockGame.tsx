import { Component, createSignal, onSettled, For } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import {
  GRID_SIZE,
  Shape,
  getRandomShapes,
  canPlaceShape,
  hasAnyValidMove,
  checkAndClearLines,
} from './logic.ts';

export const BouquetBlockGame: Component = () => {
  const [grid, setGrid] = createSignal<(string | null)[][]>(
    Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null))
  );
  const [availableShapes, setAvailableShapes] = createSignal<Shape[]>([]);
  const [selectedShape, setSelectedShape] = createSignal<Shape | null>(null);
  const [score, setScore] = createSignal(0);
  const [isGameOver, setIsGameOver] = createSignal(false);

  const restart = () => {
    setGrid(Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null)));
    const shapes = getRandomShapes(3);
    setAvailableShapes(shapes);
    setSelectedShape(null);
    setScore(0);
    setIsGameOver(false);
  };

  const handleCellClick = (startR: number, startC: number) => {
    const shape = selectedShape();
    if (!shape || isGameOver()) return;

    const currentGrid = grid();
    if (!canPlaceShape(currentGrid, shape, startR, startC)) {
      sound.playPop(300);
      return;
    }

    // ブロック配置
    const nextGrid = currentGrid.map((row) => [...row]);
    let blockCount = 0;
    for (let r = 0; r < shape.matrix.length; r++) {
      for (let c = 0; c < shape.matrix[r].length; c++) {
        if (shape.matrix[r][c] === 1) {
          nextGrid[startR + r][startC + c] = shape.color;
          blockCount++;
        }
      }
    }

    // ライン消去判定
    const { grid: clearedGrid, linesCleared } = checkAndClearLines(nextGrid);
    setGrid(clearedGrid);

    // スコア加算
    const points = blockCount * 10 + linesCleared * 100 * linesCleared;
    setScore((s) => s + points);

    if (linesCleared > 0) {
      sound.playMatch(linesCleared * 2);
    } else {
      sound.playPop(520);
    }

    // 使ったピースを除外
    const nextShapes = availableShapes().filter((s) => s.id !== shape.id);
    setSelectedShape(null);

    // 3つ使い切ったら新しい3つを補充
    if (nextShapes.length === 0) {
      const refreshed = getRandomShapes(3);
      setAvailableShapes(refreshed);
      if (!hasAnyValidMove(clearedGrid, refreshed)) {
        setIsGameOver(true);
      }
    } else {
      setAvailableShapes(nextShapes);
      if (!hasAnyValidMove(clearedGrid, nextShapes)) {
        setIsGameOver(true);
      }
    }
  };

  onSettled(() => {
    restart();
  });

  const instructions = [
    '下のピースを選んで盤面に配置し、縦または横の10マスを揃えて消去しましょう。',
    '複数ラインを同時に消すと高得点ボーナス！',
    'ブロックを配置できるマスがなくなるとゲームオーバーです。',
  ];

  return (
    <GameShell
      id="bouquet-block"
      title="Bouquet Block 10x10"
      score={score()}
      isGameOver={isGameOver()}
      onRestart={restart}
      instructions={instructions}
    >
      {/* 盤面 (10x10) */}
      <div class="w-full max-w-[340px] aspect-square p-2 bg-slate-800 dark:bg-slate-900 rounded-3xl shadow-xl border-4 border-slate-700 select-none mb-3">
        <div class="grid grid-cols-10 grid-rows-10 gap-1 w-full h-full bg-slate-900/60 p-1 rounded-2xl">
          <For each={grid()}>
            {(row, rIdx) => (
              <For each={row}>
                {(cell, cIdx) => (
                  <button
                    onClick={() => handleCellClick(rIdx(), cIdx())}
                    class={`w-full h-full rounded-md transition-all ${
                      cell ? `${cell} shadow-xs` : 'bg-slate-800/80 hover:bg-slate-700/80'
                    }`}
                  />
                )}
              </For>
            )}
          </For>
        </div>
      </div>

      {/* 選択可能なピース (3スロット) */}
      <div class="w-full max-w-[340px] flex items-center justify-around gap-2 p-2 bg-white/70 dark:bg-slate-900/70 rounded-2xl border border-rose-100 dark:border-slate-800 min-h-[90px]">
        <For each={availableShapes()}>
          {(shape) => {
            const isSel = () => selectedShape()?.id === shape.id;
            return (
              <button
                onClick={() => {
                  sound.playPop(440);
                  setSelectedShape((prev) => (prev?.id === shape.id ? null : shape));
                }}
                class={`p-2 rounded-xl flex flex-col gap-1 items-center justify-center transition-all ${
                  isSel()
                    ? 'ring-2 ring-rose-500 bg-rose-50 dark:bg-slate-800 scale-105 shadow-md'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <For each={shape.matrix}>
                  {(row) => (
                    <div class="flex gap-1">
                      <For each={row}>
                        {(cell) => (
                          <div
                            class={`w-4 h-4 rounded-xs ${
                              cell === 1 ? shape.color : 'opacity-0'
                            }`}
                          />
                        )}
                      </For>
                    </div>
                  )}
                </For>
              </button>
            );
          }}
        </For>
      </div>
    </GameShell>
  );
};
