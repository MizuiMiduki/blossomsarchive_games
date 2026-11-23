import { Component, createSignal, onSettled, For, Show, createMemo } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import {
  GRID_SIZE,
  Shape,
  getRandomShapes,
  canPlaceShape,
  canShapeBePlacedAnywhere,
  getLinesToClearPreview,
  hasAnyValidMove,
  checkAndClearLines,
} from './logic.ts';

export const BouquetBlockGame: Component = () => {
  const [grid, setGrid] = createSignal<(string | null)[][]>(
    Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null))
  );
  const [availableShapes, setAvailableShapes] = createSignal<Shape[]>([]);
  const [selectedShape, setSelectedShape] = createSignal<Shape | null>(null);
  const [hoverPos, setHoverPos] = createSignal<{ r: number; c: number } | null>(null);
  const [isDragging, setIsDragging] = createSignal(false);
  const [dragCoord, setDragCoord] = createSignal<{ x: number; y: number } | null>(null);
  const [score, setScore] = createSignal(0);
  const [comboText, setComboText] = createSignal<string | null>(null);
  const [isGameOver, setIsGameOver] = createSignal(false);

  let gridContainerRef: HTMLDivElement | undefined;
  let activePointerId: number | null = null;

  const restart = () => {
    setGrid(Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null)));
    const shapes = getRandomShapes(3);
    setAvailableShapes(shapes);
    setSelectedShape(null);
    setHoverPos(null);
    setIsDragging(false);
    setDragCoord(null);
    setScore(0);
    setComboText(null);
    setIsGameOver(false);
  };

  // ピースの配置を実行
  const placeShapeAt = (shape: Shape, startR: number, startC: number): boolean => {
    const currentGrid = grid();
    if (!canPlaceShape(currentGrid, shape, startR, startC)) {
      sound.playPop(300);
      if (navigator.vibrate) {
        try {
          navigator.vibrate(50);
        } catch (_) {}
      }
      return false;
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
      if (navigator.vibrate) {
        try {
          navigator.vibrate([40, 30, 80]);
        } catch (_) {}
      }
      const texts = ['', 'SINGLE!', 'DOUBLE!!', 'TRIPLE!!!', 'MEGA CLEAR!!!!'];
      setComboText(texts[Math.min(linesCleared, texts.length - 1)] || 'SUPER CLEAR!!');
      setTimeout(() => setComboText(null), 1200);
    } else {
      sound.playPop(540);
    }

    // 使用済みピースを除外
    const nextShapes = availableShapes().filter((s) => s.id !== shape.id);
    setSelectedShape(null);
    setHoverPos(null);

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

    return true;
  };

  // 盤面上のマウス/タッチ座標からセル (r, c) を逆算
  const getCellFromCoords = (clientX: number, clientY: number): { r: number; c: number } | null => {
    if (!gridContainerRef) return null;
    const rect = gridContainerRef.getBoundingClientRect();
    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      return null;
    }
    const cellW = rect.width / GRID_SIZE;
    const cellH = rect.height / GRID_SIZE;
    const c = Math.floor((clientX - rect.left) / cellW);
    const r = Math.floor((clientY - rect.top) / cellH);
    if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
      return { r, c };
    }
    return null;
  };

  // 盤面セルのクリック
  const handleCellClick = (r: number, c: number) => {
    const shape = selectedShape();
    if (!shape || isGameOver()) return;
    placeShapeAt(shape, r, c);
  };

  // ドラッグ操作（トレイのピースからドラッグ開始）
  const handleShapePointerDown = (shape: Shape, e: PointerEvent) => {
    if (isGameOver()) return;

    // どこにも置けないピースなら弾く
    if (!canShapeBePlacedAnywhere(grid(), shape)) {
      sound.playPop(260);
      return;
    }

    sound.playPop(480);
    setSelectedShape(shape);
    setIsDragging(true);
    activePointerId = e.pointerId;

    // スマホでは指の少し上(約50px上)にオフセットして指で隠れないようにする
    const isTouch = e.pointerType === 'touch';
    const offsetY = isTouch ? -54 : 0;
    setDragCoord({ x: e.clientX, y: e.clientY + offsetY });

    // 盤面セル判定
    const cell = getCellFromCoords(e.clientX, e.clientY + offsetY);
    setHoverPos(cell);

    const target = e.currentTarget as HTMLElement;
    if (target && target.setPointerCapture) {
      try {
        target.setPointerCapture(e.pointerId);
      } catch (_) {}
    }
  };

  const handleShapePointerMove = (e: PointerEvent) => {
    if (!isDragging() || activePointerId !== e.pointerId) return;

    const isTouch = e.pointerType === 'touch';
    const offsetY = isTouch ? -54 : 0;
    setDragCoord({ x: e.clientX, y: e.clientY + offsetY });

    const cell = getCellFromCoords(e.clientX, e.clientY + offsetY);
    setHoverPos(cell);
  };

  const handleShapePointerUp = (e: PointerEvent) => {
    if (!isDragging() || activePointerId !== e.pointerId) return;

    const shape = selectedShape();
    const cell = hoverPos();

    setIsDragging(false);
    setDragCoord(null);
    activePointerId = null;

    const target = e.currentTarget as HTMLElement;
    if (target && target.releasePointerCapture) {
      try {
        target.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }

    if (shape && cell) {
      const placed = placeShapeAt(shape, cell.r, cell.c);
      if (!placed) {
        // 配置できなかった場合は選択状態のままキープ
      }
    }
  };

  // 選択中ピースに対する現在のプレビュー情報
  const previewInfo = createMemo(() => {
    const shape = selectedShape();
    const hover = hoverPos();
    if (!shape || !hover) return null;

    const currentGrid = grid();
    const canPlace = canPlaceShape(currentGrid, shape, hover.r, hover.c);
    const linePreview = canPlace
      ? getLinesToClearPreview(currentGrid, shape, hover.r, hover.c)
      : { rows: [], cols: [] };

    // 占有されるセル一覧
    const cells: { r: number; c: number }[] = [];
    for (let r = 0; r < shape.matrix.length; r++) {
      for (let c = 0; c < shape.matrix[r].length; c++) {
        if (shape.matrix[r][c] === 1) {
          cells.push({ r: hover.r + r, c: hover.c + c });
        }
      }
    }

    return { canPlace, cells, linePreview };
  });

  // 選択中ピースを配置可能な有効な全基準マス一覧 (ガイド用)
  const validPlacementOrigins = createMemo(() => {
    const shape = selectedShape();
    if (!shape) return new Set<string>();

    const currentGrid = grid();
    const validSet = new Set<string>();
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (canPlaceShape(currentGrid, shape, r, c)) {
          validSet.add(`${r},${c}`);
        }
      }
    }
    return validSet;
  });

  onSettled(() => {
    restart();
  });

  const instructions = [
    '下のピースを選んで盤面に配置し、縦または横の10マスを揃えて消去しましょう。',
    '【快適操作】：ピースをタップして盤面をタップするか、そのままドラッグ＆ドロップでも配置できます！',
    'ピース選択中は【配置可能なマス】が光り、置いたときに消えるラインが黄金色に予告表示されます。',
    'ブロックを配置できるマスがなくなるとゲームオーバーです。',
  ];

  return (
    <GameShell
      id="bouquet-block"
      title="Block Puzzle 10×10"
      score={score()}
      isGameOver={isGameOver()}
      onRestart={restart}
      instructions={instructions}
      extraControls={
        <div class="flex items-center justify-between w-full max-w-md px-3 py-1.5 bg-white/90 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs shadow-2xs">
          <div class="flex items-center gap-2">
            <span class="text-slate-400 font-semibold">スコア:</span>
            <span class="font-bold text-rose-500 font-mono text-sm">{score()}</span>
          </div>
          <Show when={comboText()}>
            <span class="font-extrabold text-amber-500 text-xs animate-bounce">
              ✨ {comboText()}
            </span>
          </Show>
          <Show when={selectedShape()}>
            <button
              type="button"
              onClick={() => {
                setSelectedShape(null);
                setHoverPos(null);
              }}
              class="text-[11px] text-slate-400 hover:text-slate-200 bg-slate-800/80 px-2 py-0.5 rounded-lg active:scale-95"
            >
              ✕ 選択解除
            </button>
          </Show>
        </div>
      }
    >
      <div class="flex flex-col items-center gap-2.5 w-full max-w-md select-none touch-none">
        {/* 盤面 (10x10) */}
        <div
          ref={(el) => {
            gridContainerRef = el;
          }}
          class="w-full aspect-square p-2 bg-slate-800 dark:bg-slate-900 rounded-3xl shadow-2xl border-4 border-slate-700 relative overflow-hidden"
          onPointerLeave={() => {
            if (!isDragging()) setHoverPos(null);
          }}
        >
          <div class="grid grid-cols-10 grid-rows-10 gap-1 w-full h-full bg-slate-950/70 p-1.5 rounded-2xl">
            <For each={grid()}>
              {(row, rIdx) => (
                <For each={row}>
                  {(cell, cIdx) => {
                    const r = rIdx();
                    const c = cIdx();

                    // プレビュー判定
                    const preview = previewInfo();
                    const isPreviewCell = () =>
                      preview?.cells.some((p) => p.r === r && p.c === c) ?? false;
                    const isLineClearCell = () =>
                      preview?.linePreview.rows.includes(r) ||
                      preview?.linePreview.cols.includes(c) ||
                      false;

                    // 配置可能ガイド (選択中かつ配置可能な基準点)
                    const isValidOrigin = () =>
                      selectedShape() && validPlacementOrigins().has(`${r},${c}`);

                    return (
                      <button
                        type="button"
                        onClick={() => handleCellClick(r, c)}
                        onPointerEnter={() => {
                          if (selectedShape() && !isDragging()) {
                            setHoverPos({ r, c });
                          }
                        }}
                        class={`w-full h-full rounded-md transition-all relative flex items-center justify-center ${
                          cell
                            ? `${cell} shadow-xs border border-white/10`
                            : isPreviewCell()
                            ? preview?.canPlace
                              ? `${selectedShape()?.color || 'bg-sky-400'} opacity-85 shadow-[0_0_8px_rgba(56,189,248,0.6)] animate-pulse`
                              : 'bg-rose-500/40 border border-rose-500/80'
                            : isLineClearCell()
                            ? 'bg-amber-400/30 border border-amber-400/80 shadow-[0_0_6px_rgba(251,191,36,0.5)]'
                            : isValidOrigin()
                            ? 'bg-slate-800/90 hover:bg-slate-700 border border-sky-400/40'
                            : 'bg-slate-800/60 hover:bg-slate-700/60'
                        }`}
                      >
                        {/* 配置可能基準点のガイドドット */}
                        <Show when={!cell && isValidOrigin() && !isPreviewCell()}>
                          <div class="w-1.5 h-1.5 rounded-full bg-sky-400/60 shadow-[0_0_4px_rgba(56,189,248,0.8)]" />
                        </Show>

                        {/* ライン消去予告アイコン */}
                        <Show when={!cell && isLineClearCell() && !isPreviewCell()}>
                          <div class="w-2 h-2 rounded-xs bg-amber-400/80 animate-ping" />
                        </Show>
                      </button>
                    );
                  }}
                </For>
              )}
            </For>
          </div>
        </div>

        {/* 選択可能なピーストレイ (3スロット) */}
        <div class="w-full flex items-center justify-around gap-2 p-2.5 bg-white/95 dark:bg-slate-900/95 rounded-2xl border border-slate-200 dark:border-slate-800 min-h-[92px] shadow-sm">
          <For each={availableShapes()}>
            {(shape) => {
              const isSel = () => selectedShape()?.id === shape.id;
              const canPlaceSomewhere = () => canShapeBePlacedAnywhere(grid(), shape);

              return (
                <div
                  onPointerDown={(e) => handleShapePointerDown(shape, e)}
                  onPointerMove={handleShapePointerMove}
                  onPointerUp={handleShapePointerUp}
                  onPointerCancel={handleShapePointerUp}
                  onClick={() => {
                    if (isGameOver()) return;
                    if (!canPlaceSomewhere()) {
                      sound.playPop(260);
                      return;
                    }
                    sound.playPop(480);
                    setSelectedShape((prev) => (prev?.id === shape.id ? null : shape));
                    setHoverPos(null);
                  }}
                  class={`p-2.5 rounded-2xl flex flex-col items-center justify-center transition-all cursor-grab active:cursor-grabbing relative ${
                    !canPlaceSomewhere()
                      ? 'opacity-35 grayscale border border-dashed border-rose-500/40 bg-rose-950/10'
                      : isSel()
                      ? 'ring-2 ring-sky-400 dark:ring-sky-400 bg-sky-50 dark:bg-sky-950/50 scale-105 shadow-md border border-sky-400/50'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60'
                  }`}
                >
                  {/* 配置不可バッジ */}
                  <Show when={!canPlaceSomewhere()}>
                    <span class="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full shadow-xs">
                      置けません
                    </span>
                  </Show>

                  {/* 形状マトリクス */}
                  <div class="flex flex-col gap-1 items-center justify-center pointer-events-none">
                    <For each={shape.matrix}>
                      {(row) => (
                        <div class="flex gap-1">
                          <For each={row}>
                            {(cell) => (
                              <div
                                class={`w-4 h-4 rounded-xs transition-all ${
                                  cell === 1
                                    ? `${shape.color} shadow-xs`
                                    : 'opacity-0'
                                }`}
                              />
                            )}
                          </For>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              );
            }}
          </For>
        </div>

        {/* ドラッグ中の浮遊ピース（タッチ追従） */}
        <Show when={isDragging() && selectedShape() && dragCoord()}>
          <div
            class="fixed pointer-events-none z-50 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-1.5 p-2 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl scale-110"
            style={{
              left: `${dragCoord()!.x}px`,
              top: `${dragCoord()!.y}px`,
            }}
          >
            <For each={selectedShape()!.matrix}>
              {(row) => (
                <div class="flex gap-1.5">
                  <For each={row}>
                    {(cell) => (
                      <div
                        class={`w-6 h-6 rounded-md shadow-md ${
                          cell === 1 ? selectedShape()!.color : 'opacity-0'
                        }`}
                      />
                    )}
                  </For>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </GameShell>
  );
};