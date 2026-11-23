import { Component, createSignal, onSettled, Show } from 'solid-js';
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

  let canvasRef: HTMLCanvasElement | undefined;
  let timerId: number | null = null;
  let isPointerDown = false;
  let lastSoundTime = 0;

  // 1ステップ進行
  const advanceStep = () => {
    const current = grid();
    const { nextGrid, births, livingCount: count } = stepLifeGrid(current);
    setGrid(nextGrid);
    setGeneration((g) => g + 1);
    setLivingCount(count);

    if (count === 0 && isRunning()) {
      setIsRunning(false);
      if (timerId) window.clearTimeout(timerId);
      return;
    }

    if (births > 0 && Math.random() < 0.25) {
      const notes = [523.25, 587.33, 659.25, 783.99, 880.0]; // C D E G A
      const note = notes[Math.floor(Math.random() * notes.length)];
      sound.playPop(note);
    }
  };

  // 再生ループ
  const runLoop = () => {
    if (timerId) window.clearTimeout(timerId);
    if (!isRunning()) return;

    advanceStep();
    timerId = window.setTimeout(runLoop, speedMs());
  };

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

    // グリッド線
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
    ctx.lineWidth = 0.5;
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

    const currentGrid = grid();

    // セルの描画
    for (let r = 0; r < LIFE_GRID_H; r++) {
      for (let c = 0; c < LIFE_GRID_W; c++) {
        const cell = currentGrid[r][c];
        if (!cell.alive) continue;

        const x = c * cellW + cellW * 0.1;
        const y = r * cellH + cellH * 0.1;
        const size = cellW * 0.8;

        // 世代に応じたセル色
        let color = '#38bdf8'; // 誕生直後: スカイブルー
        if (cell.age >= 6) {
          color = '#818cf8'; // 成熟: インディゴ
        } else if (cell.age >= 3) {
          color = '#34d399'; // 安定生存: エメラルド
        }

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  // マウス/タッチ座標からセルを更新
  const updateCellFromPointer = (clientX: number, clientY: number) => {
    if (!canvasRef) return;
    const rect = canvasRef.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * LIFE_GRID_W;
    const y = ((clientY - rect.top) / rect.height) * LIFE_GRID_H;
    const r = Math.floor(y);
    const c = Math.floor(x);

    if (r >= 0 && r < LIFE_GRID_H && c >= 0 && c < LIFE_GRID_W) {
      const currentGrid = grid();
      const isAlive = brushMode() === 'draw';
      if (currentGrid[r][c].alive !== isAlive) {
        const next = currentGrid.map((row) => [...row]);
        next[r][c] = { alive: isAlive, age: isAlive ? 1 : 0 };
        setGrid(next);
        setLivingCount(countLiveCells(next));
        renderCanvas();

        const now = Date.now();
        if (now - lastSoundTime > 60) {
          lastSoundTime = now;
          sound.playPop(isAlive ? 600 : 380);
        }
      }
    }
  };

  // 初期化・全消去 (0から再スタート)
  const handleClear = () => {
    sound.playPop(350);
    setIsRunning(false);
    if (timerId) window.clearTimeout(timerId);
    setGrid(createEmptyLifeGrid());
    setGeneration(0);
    setLivingCount(0);
    renderCanvas();
  };

  onSettled(() => {
    renderCanvas();

    const renderLoop = () => {
      renderCanvas();
      requestAnimationFrame(renderLoop);
    };
    const animId = requestAnimationFrame(renderLoop);

    return () => {
      if (timerId) window.clearTimeout(timerId);
      cancelAnimationFrame(animId);
    };
  });

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
                onClick={() => {
                  sound.playPop(500);
                  const next = !isRunning();
                  setIsRunning(next);
                  if (next) runLoop();
                }}
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
      <div class="w-full max-w-[360px] flex items-center justify-between text-xs px-3 py-1.5 bg-slate-900/90 text-white rounded-2xl mb-2 shadow-xs border border-slate-800">
        <div class="flex items-center gap-2">
          <span>世代:</span>
          <span class="font-mono font-bold text-sky-400 text-sm">{generation()}</span>
        </div>
        <div class="flex items-center gap-2">
          <span>生存セル:</span>
          <span class="font-mono font-bold text-emerald-400 text-sm">{livingCount()}</span>
        </div>
        <div class="flex items-center gap-1 text-[11px] text-slate-400">
          <span>速度:</span>
          <select
            value={speedMs()}
            onChange={(e) => {
              setSpeedMs(Number(e.currentTarget.value));
              if (isRunning()) runLoop();
            }}
            class="bg-slate-800 text-white text-[11px] rounded-lg px-1.5 py-0.5 border border-slate-700 focus:outline-none"
          >
            <option value="200">0.5x</option>
            <option value="100">1.0x</option>
            <option value="50">2.0x</option>
            <option value="20">5.0x</option>
          </select>
        </div>
      </div>

      {/* ライフゲーム Canvas */}
      <div
        class="w-full max-w-[360px] aspect-square rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800 relative cursor-crosshair select-none touch-none bg-slate-950"
        onPointerDown={(e) => {
          isPointerDown = true;
          updateCellFromPointer(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (isPointerDown) {
            updateCellFromPointer(e.clientX, e.clientY);
          }
        }}
        onPointerUp={() => {
          isPointerDown = false;
        }}
        onPointerLeave={() => {
          isPointerDown = false;
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
