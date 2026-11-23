import { Component, createSignal, onSettled, For } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import {
  LIFE_GRID_W,
  LIFE_GRID_H,
  LifeGrid,
  createEmptyLifeGrid,
  createRandomLifeGrid,
  stepLifeGrid,
  PRESETS,
  PatternPreset,
} from './logic.ts';

export const BlossomLifeGame: Component = () => {
  const [grid, setGrid] = createSignal<LifeGrid>(createRandomLifeGrid(0.18));
  const [isRunning, setIsRunning] = createSignal(true);
  const [generation, setGeneration] = createSignal(0);
  const [livingCount, setLivingCount] = createSignal(0);
  const [speedMs, setSpeedMs] = createSignal(100); // 速度 (ms)
  const [brushMode, setBrushMode] = createSignal<'draw' | 'erase'>('draw');

  let canvasRef: HTMLCanvasElement | undefined;
  let timerId: number | null = null;
  let isPointerDown = false;

  // 1ステップ進行
  const advanceStep = () => {
    const current = grid();
    const { nextGrid, births, livingCount: count } = stepLifeGrid(current);
    setGrid(nextGrid);
    setGeneration((g) => g + 1);
    setLivingCount(count);

    if (births > 0 && Math.random() < 0.3) {
      // 穏やかなアンビエント音
      const notes = [523.25, 587.33, 659.25, 783.99, 880.0]; // C D E G A ペンタトニック
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

    // 暗めの背景 (ボタニカル・ナイトガーデン)
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    // グリッド線
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
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

    // セルの描画 (生命の年齢に応じたグラデーション・グロー)
    for (let r = 0; r < LIFE_GRID_H; r++) {
      for (let c = 0; c < LIFE_GRID_W; c++) {
        const cell = currentGrid[r][c];
        if (!cell.alive) continue;

        const x = c * cellW + cellW * 0.1;
        const y = r * cellH + cellH * 0.1;
        const size = cellW * 0.8;

        // 年齢による開花カラー
        let color = '#4ade80'; // 芽生え: 若葉グリーン
        if (cell.age >= 8) {
          color = '#fbbf24'; // 長寿の神秘花: ゴールド
        } else if (cell.age >= 4) {
          color = '#f43f5e'; // 満開: クリムゾンローズ
        } else if (cell.age >= 2) {
          color = '#fb7185'; // 開花: 桜ピンク
        }

        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = cell.age > 3 ? 6 : 2;

        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
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
      const next = grid().map((row) => [...row]);
      const isAlive = brushMode() === 'draw';
      if (next[r][c].alive !== isAlive) {
        next[r][c] = { alive: isAlive, age: isAlive ? 1 : 0 };
        setGrid(next);
        renderCanvas();
      }
    }
  };

  // プリセット適用
  const applyPreset = (preset: PatternPreset) => {
    sound.playMatch(5);
    const next = createEmptyLifeGrid();
    const centerR = Math.floor(LIFE_GRID_H / 2);
    const centerC = Math.floor(LIFE_GRID_W / 2);

    for (const [dr, dc] of preset.coords) {
      const r = (centerR + dr + LIFE_GRID_H) % LIFE_GRID_H;
      const c = (centerC + dc + LIFE_GRID_W) % LIFE_GRID_W;
      next[r][c] = { alive: true, age: 3 };
    }

    setGrid(next);
    setGeneration(0);
    renderCanvas();
  };

  // ランダム花畑
  const handleRandomize = () => {
    sound.playPop(520);
    setGrid(createRandomLifeGrid(0.2));
    setGeneration(0);
    renderCanvas();
  };

  // 全クリア
  const handleClear = () => {
    sound.playPop(350);
    setGrid(createEmptyLifeGrid());
    setGeneration(0);
    setLivingCount(0);
    renderCanvas();
  };

  onSettled(() => {
    renderCanvas();
    runLoop();

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
    '画面をドラッグ・スワイプして花を種まき（配置）できます。',
    '【生命のルール】過密でも過疎でも枯れ、適度な隣人がいるマスに新しい花が咲きます。',
    '下のプリセット（グライダー、パルサー、銀河等）を押して、不思議な幾何学生命のダンスを鑑賞しましょう！',
  ];

  return (
    <GameShell
      id="blossom-life"
      title="Blossom Life (百花繚乱 ライフゲーム)"
      score={livingCount()}
      isGameOver={false}
      onRestart={handleRandomize}
      instructions={instructions}
      extraControls={
        <div class="flex flex-col gap-2 w-full max-w-md">
          {/* プリセット一覧 */}
          <div class="flex items-center justify-between gap-1.5 p-2 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-rose-100 dark:border-slate-800 overflow-x-auto text-xs shadow-2xs">
            <span class="text-[11px] font-bold text-slate-500 whitespace-nowrap pl-1">プリセット:</span>
            <For each={PRESETS}>
              {(preset) => (
                <button
                  onClick={() => applyPreset(preset)}
                  title={preset.description}
                  class="px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-slate-800 text-rose-600 dark:text-rose-300 font-bold hover:bg-rose-100 dark:hover:bg-slate-700 whitespace-nowrap transition-all shadow-2xs"
                >
                  {preset.emoji} {preset.name.split(' ')[0]}
                </button>
              )}
            </For>
          </div>

          {/* コントロールバー */}
          <div class="flex items-center justify-between gap-2 p-2 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-rose-100 dark:border-slate-800 text-xs shadow-2xs flex-wrap">
            {/* 再生 / 停止 / ステップ */}
            <div class="flex items-center gap-1.5">
              <button
                onClick={() => {
                  sound.playPop(500);
                  const next = !isRunning();
                  setIsRunning(next);
                  if (next) runLoop();
                }}
                class={`px-3 py-1.5 rounded-xl font-bold transition-all shadow-xs ${
                  isRunning()
                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {isRunning() ? '⏸ 一時停止' : '▶ 再生'}
              </button>

              <button
                onClick={() => {
                  sound.playPop(420);
                  setIsRunning(false);
                  advanceStep();
                }}
                class="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
              >
                ⏭ 1歩進む
              </button>
            </div>

            {/* ブラシ切替 */}
            <div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl">
              <button
                onClick={() => setBrushMode('draw')}
                class={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  brushMode() === 'draw'
                    ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-300 shadow-2xs'
                    : 'text-slate-500'
                }`}
              >
                🌱 植える
              </button>
              <button
                onClick={() => setBrushMode('erase')}
                class={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  brushMode() === 'erase'
                    ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-300 shadow-2xs'
                    : 'text-slate-500'
                }`}
              >
                🧹 消す
              </button>
            </div>

            {/* ランダム & クリア */}
            <div class="flex items-center gap-1">
              <button
                onClick={handleRandomize}
                class="px-2.5 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold hover:bg-rose-200"
              >
                🎲 ランダム
              </button>
              <button
                onClick={handleClear}
                class="px-2 py-1.5 rounded-xl text-slate-400 hover:text-rose-500"
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
          <span class="font-mono font-bold text-rose-400 text-sm">{generation()}</span>
        </div>
        <div class="flex items-center gap-2">
          <span>開花中:</span>
          <span class="font-mono font-bold text-emerald-400 text-sm">{livingCount()} 輪</span>
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
      </div>
    </GameShell>
  );
};
