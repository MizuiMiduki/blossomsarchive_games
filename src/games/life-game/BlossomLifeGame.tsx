import { Component, createSignal, createEffect, onSettled, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import { PlayIcon, PauseIcon } from '../../components/Icons.tsx';
import {
  LIFE_GRID_W,
  LIFE_GRID_H,
  LifeGrid,
  createEmptyLifeGrid,
  stepLifeGrid,
  countLiveCells,
} from './logic.ts';

export const BlossomLifeGame: Component = () => {
  const [grid, setGrid] = createSignal<LifeGrid>(createEmptyLifeGrid());
  const [isRunning, setIsRunning] = createSignal(false);
  const [generation, setGeneration] = createSignal(0);
  const [livingCount, setLivingCount] = createSignal(0);
  const [speedMs, setSpeedMs] = createSignal(100); // 速度 (ms)
  const [brushMode, setBrushMode] = createSignal<'draw' | 'erase'>('draw');
  const [hoverCell, setHoverCell] = createSignal<{ r: number; c: number } | null>(null);

  let canvasRef: HTMLCanvasElement | undefined;
  let isPointerDown = false;
  let lastSoundTime = 0;

  // 1ステップ進行
  const advanceStep = () => {
    const current = grid();
    const { nextGrid, births, livingCount: count } = stepLifeGrid(current);
    setGrid(nextGrid);
    setGeneration((g) => g + 1);
    setLivingCount(count);

    if (births > 0 && Math.random() < 0.25) {
      const notes = [523.25, 587.33, 659.25, 783.99, 880.0]; // C D E G A
      const note = notes[Math.floor(Math.random() * notes.length)];
      sound.playPop(note);
    }
  };

  // 再生 / 一時停止切り替え
  const togglePlay = () => {
    sound.playPop(500);
    setIsRunning((prev) => !prev);
  };

  // 再生タイマー管理 (Solid.js 2.0 リアクティブエフェクト)
  createEffect(
    () => ({ running: isRunning(), interval: speedMs() }),
    ({ running, interval }) => {
      if (!running) return;
      const timer = window.setInterval(() => {
        advanceStep();
      }, interval);

      return () => {
        window.clearInterval(timer);
      };
    }
  );

  // Canvas描画
  const renderCanvas = () => {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;

    const w = canvasRef.width;
    const h = canvasRef.height;
    const cellW = w / LIFE_GRID_W;
    const cellH = h / LIFE_GRID_H;

    // 背景 (ダークスレート)
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, w, h);

    // 1. 各マスの境界線（通常グリッド線）
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.45)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= LIFE_GRID_W; c++) {
      ctx.beginPath();
      ctx.moveTo(c * cellW, 0);
      ctx.lineTo(c * cellW, h);
      ctx.stroke();
    }
    for (let r = 0; r <= LIFE_GRID_H; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * cellH);
      ctx.lineTo(w, r * cellH);
      ctx.stroke();
    }

    // 2. 5マスごとの主要グリッド線（方眼紙のように位置を把握しやすくする太線）
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
    ctx.lineWidth = 1.5;
    for (let c = 0; c <= LIFE_GRID_W; c += 5) {
      ctx.beginPath();
      ctx.moveTo(c * cellW, 0);
      ctx.lineTo(c * cellW, h);
      ctx.stroke();
    }
    for (let r = 0; r <= LIFE_GRID_H; r += 5) {
      ctx.beginPath();
      ctx.moveTo(0, r * cellH);
      ctx.lineTo(w, r * cellH);
      ctx.stroke();
    }

    const currentGrid = grid();

    // 3. 生存セルの描画 (マス目にフィットする丸角四角形)
    for (let r = 0; r < LIFE_GRID_H; r++) {
      for (let c = 0; c < LIFE_GRID_W; c++) {
        const cell = currentGrid[r][c];
        if (!cell.alive) continue;

        const x = c * cellW + 1;
        const y = r * cellH + 1;
        const sizeW = cellW - 2;
        const sizeH = cellH - 2;

        // 世代に応じたセル色
        let color = '#38bdf8'; // 誕生直後: スカイブルー
        if (cell.age >= 6) {
          color = '#818cf8'; // 成熟: インディゴ
        } else if (cell.age >= 3) {
          color = '#34d399'; // 安定生存: エメラルド
        }

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x, y, sizeW, sizeH, 1.5);
        ctx.fill();
      }
    }

    // 4. 入力・ホバー位置のマス強調枠
    const hover = hoverCell();
    if (hover && hover.r >= 0 && hover.r < LIFE_GRID_H && hover.c >= 0 && hover.c < LIFE_GRID_W) {
      const hx = hover.c * cellW;
      const hy = hover.r * cellH;

      ctx.fillStyle = brushMode() === 'draw' ? 'rgba(56, 189, 248, 0.35)' : 'rgba(239, 68, 68, 0.35)';
      ctx.fillRect(hx, hy, cellW, cellH);

      ctx.strokeStyle = brushMode() === 'draw' ? '#38bdf8' : '#ef4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(hx + 0.5, hy + 0.5, cellW - 1, cellH - 1);
    }
  };

  // gridまたはhoverCellまたはbrushModeが変化したときにCanvasを再描画
  createEffect(
    () => ({ g: grid(), h: hoverCell(), b: brushMode() }),
    () => {
      renderCanvas();
    }
  );

  onSettled(() => {
    renderCanvas();
  });

  // マウス/タッチ座標からセルを更新
  const getGridCoord = (clientX: number, clientY: number) => {
    if (!canvasRef) return null;
    const rect = canvasRef.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * LIFE_GRID_W;
    const y = ((clientY - rect.top) / rect.height) * LIFE_GRID_H;
    const r = Math.floor(y);
    const c = Math.floor(x);

    if (r >= 0 && r < LIFE_GRID_H && c >= 0 && c < LIFE_GRID_W) {
      return { r, c };
    }
    return null;
  };

  const updateCellAt = (r: number, c: number) => {
    const currentGrid = grid();
    const isAlive = brushMode() === 'draw';
    if (currentGrid[r][c].alive !== isAlive) {
      const next = currentGrid.map((row) => [...row]);
      next[r][c] = { alive: isAlive, age: isAlive ? 1 : 0 };
      setGrid(next);
      setLivingCount(countLiveCells(next));

      const now = Date.now();
      if (now - lastSoundTime > 60) {
        lastSoundTime = now;
        sound.playPop(isAlive ? 600 : 380);
      }
    }
  };

  // 初期化・全消去 (0から再スタート)
  const handleClear = () => {
    sound.playPop(350);
    setIsRunning(false);
    setGrid(createEmptyLifeGrid());
    setGeneration(0);
    setLivingCount(0);
  };

  const instructions = [
    '画面をタップまたはドラッグして、セルを自由に描いて配置できます。',
    '「再生」を押すとシミュレーションが始まります。「一時停止」でいつでも止めて編集可能です。',
    '【ルール】誕生・生存・過密・過疎の単純な規則から、複雑な生命シミュレーションが生まれます。',
    '「1ステップ」で1世代ずつ進めることもできます。',
  ];

  return (
    <GameShell
      id="blossom-life"
      title="Conway's Life Game"
      score={livingCount()}
      isGameOver={false}
      onRestart={handleClear}
      instructions={instructions}
      extraControls={
        <div class="flex flex-col gap-2 w-full max-w-md">
          {/* コントロールバー */}
          <div class="flex items-center justify-between gap-2 p-2 bg-white/90 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs shadow-2xs flex-wrap">
            {/* 再生 / 停止 / ステップ */}
            <div class="flex items-center gap-1.5">
              <button
                onClick={togglePlay}
                class={`px-3.5 py-1.5 rounded-xl font-semibold transition-all shadow-2xs flex items-center gap-1.5 ${
                  isRunning()
                    ? 'bg-amber-600 text-white hover:bg-amber-700'
                    : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white'
                }`}
              >
                <Show when={isRunning()} fallback={<PlayIcon size={14} />}>
                  <PauseIcon size={14} />
                </Show>
                <span>{isRunning() ? '一時停止' : '再生'}</span>
              </button>

              <button
                onClick={() => {
                  sound.playPop(420);
                  setIsRunning(false);
                  advanceStep();
                }}
                class="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300 transition-colors"
              >
                1ステップ
              </button>
            </div>

            {/* ブラシ切替 */}
            <div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl">
              <button
                onClick={() => {
                  sound.playPop(450);
                  setBrushMode('draw');
                }}
                class={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  brushMode() === 'draw'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                配置
              </button>
              <button
                onClick={() => {
                  sound.playPop(450);
                  setBrushMode('erase');
                }}
                class={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  brushMode() === 'erase'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                消去
              </button>
            </div>

            {/* クリア */}
            <div class="flex items-center gap-1">
              <button
                onClick={handleClear}
                class="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition-colors"
              >
                クリア
              </button>
            </div>
          </div>
        </div>
      }
    >
      {/* 世代 & 生存数インフォバー */}
      <div class="w-full max-w-[540px] flex items-center justify-between text-xs px-3 py-1.5 bg-slate-900/90 text-white rounded-2xl mb-1.5 shadow-xs border border-slate-800">
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1.5">
            <span class="text-slate-400">世代:</span>
            <span class="font-mono font-bold text-sky-400 text-sm">{generation()}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="text-slate-400">生存セル:</span>
            <span class="font-mono font-bold text-emerald-400 text-sm">{livingCount()}</span>
          </div>
        </div>

        <div class="flex items-center gap-2 text-[11px]">
          <Show when={hoverCell()}>
            <span class="text-sky-300 font-mono text-[10px] sm:text-xs bg-slate-800/90 px-1.5 py-0.5 rounded border border-slate-700">
              マス: [{hoverCell()!.c + 1}, {hoverCell()!.r + 1}]
            </span>
          </Show>
          <div class="flex items-center gap-1 text-slate-400">
            <span>速度:</span>
            <select
              value={speedMs()}
              onChange={(e) => {
                setSpeedMs(Number(e.currentTarget.value));
              }}
              class="bg-slate-800 text-white text-[11px] rounded-lg px-1.5 py-0.5 border border-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="200">0.5x</option>
              <option value="100">1.0x</option>
              <option value="50">2.0x</option>
              <option value="20">5.0x</option>
            </select>
          </div>
        </div>
      </div>

      {/* ライフゲーム Canvas */}
      <div
        class="w-full max-w-[540px] max-h-[calc(100dvh-130px)] aspect-square rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800 relative cursor-crosshair select-none touch-none bg-slate-950"
        onPointerDown={(e) => {
          isPointerDown = true;
          try {
            (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          } catch {}
          const coord = getGridCoord(e.clientX, e.clientY);
          setHoverCell(coord);
          if (coord) {
            updateCellAt(coord.r, coord.c);
          }
        }}
        onPointerMove={(e) => {
          const coord = getGridCoord(e.clientX, e.clientY);
          setHoverCell(coord);
          if (isPointerDown && coord) {
            updateCellAt(coord.r, coord.c);
          }
        }}
        onPointerUp={(e) => {
          isPointerDown = false;
          try {
            (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
          } catch {}
        }}
        onPointerLeave={() => {
          if (!isPointerDown) {
            setHoverCell(null);
          }
        }}
        onPointerCancel={() => {
          isPointerDown = false;
          setHoverCell(null);
        }}
      >
        <canvas
          ref={canvasRef}
          width={450}
          height={450}
          class="w-full h-full block"
        />

        {/* ガイダンスメッセージ */}
        <Show when={!isRunning() && livingCount() === 0}>
          <div class="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none bg-slate-900/85 backdrop-blur-md px-3.5 py-1.5 rounded-full text-white/90 text-[11px] font-semibold border border-white/10 shadow-lg whitespace-nowrap animate-pulse">
            タップ・ドラッグでセルを描いてください
          </div>
        </Show>
        <Show when={!isRunning() && livingCount() > 0 && generation() === 0}>
          <div class="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none bg-slate-900/85 backdrop-blur-md px-3.5 py-1.5 rounded-full text-white/90 text-[11px] font-semibold border border-white/10 shadow-lg whitespace-nowrap">
            「再生」を押すとシミュレーションを開始します
          </div>
        </Show>
      </div>
    </GameShell>
  );
};
