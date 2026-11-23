import { Component, createSignal, onSettled, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';

export interface PlanetType {
  level: number;
  name: string;
  kanji: string;
  radius: number;
  score: number;
  color: string;
  gradientStart: string;
  gradientEnd: string;
  textColor: string;
}

export const PLANET_TIERS: PlanetType[] = [
  { level: 0, name: '隕石', kanji: '塵', radius: 14, score: 2, color: '#64748b', gradientStart: '#94a3b8', gradientEnd: '#334155', textColor: '#f8fafc' },
  { level: 1, name: '月', kanji: '月', radius: 18, score: 4, color: '#94a3b8', gradientStart: '#e2e8f0', gradientEnd: '#64748b', textColor: '#1e293b' },
  { level: 2, name: '水星', kanji: '水', radius: 24, score: 8, color: '#a8a29e', gradientStart: '#e7e5e4', gradientEnd: '#78716c', textColor: '#1c1917' },
  { level: 3, name: '火星', kanji: '火', radius: 30, score: 16, color: '#dc2626', gradientStart: '#f87171', gradientEnd: '#991b1b', textColor: '#ffffff' },
  { level: 4, name: '金星', kanji: '金', radius: 37, score: 32, color: '#d97706', gradientStart: '#fbbf24', gradientEnd: '#b45309', textColor: '#ffffff' },
  { level: 5, name: '地球', kanji: '地', radius: 45, score: 64, color: '#0284c7', gradientStart: '#38bdf8', gradientEnd: '#0369a1', textColor: '#ffffff' },
  { level: 6, name: '海王星', kanji: '海', radius: 54, score: 128, color: '#2563eb', gradientStart: '#60a5fa', gradientEnd: '#1e40af', textColor: '#ffffff' },
  { level: 7, name: '天王星', kanji: '天', radius: 63, score: 256, color: '#0891b2', gradientStart: '#22d3ee', gradientEnd: '#0e7490', textColor: '#ffffff' },
  { level: 8, name: '土星', kanji: '土', radius: 73, score: 512, color: '#ca8a04', gradientStart: '#fde047', gradientEnd: '#a16207', textColor: '#ffffff' },
  { level: 9, name: '木星', kanji: '木', radius: 83, score: 1024, color: '#c2410c', gradientStart: '#fb923c', gradientEnd: '#9a3412', textColor: '#ffffff' },
  { level: 10, name: '太陽', kanji: '日', radius: 94, score: 2048, color: '#ea580c', gradientStart: '#fef08a', gradientEnd: '#dc2626', textColor: '#ffffff' },
];

interface Circle {
  id: number;
  level: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

let circleIdCounter = 1;

export const BlossomDropGame: Component = () => {
  const [score, setScore] = createSignal(0);
  const [currentLevel, setCurrentLevel] = createSignal(0);
  const [nextLevel, setNextLevel] = createSignal(1);
  const [heldLevel, setHeldLevel] = createSignal<number | null>(null);
  const [canHold, setCanHold] = createSignal(true);
  const [isGameOver, setIsGameOver] = createSignal(false);

  let canvasRef: HTMLCanvasElement | undefined;
  let animationId: number | null = null;

  // 物理ワールド
  let circles: Circle[] = [];
  let dropX = 160;
  let canDrop = true;
  let isPointerDown = false;
  const gravity = 0.38;
  const friction = 0.985;
  const bounce = 0.28;
  const deadLineY = 70;

  const rollInitialTier = () => Math.floor(Math.random() * 3); // 0~2
  const rollNextTier = () => Math.floor(Math.random() * 4); // 0~3

  const restart = () => {
    circles = [];
    dropX = 160;
    canDrop = true;
    isPointerDown = false;
    setScore(0);
    setCurrentLevel(rollInitialTier());
    setNextLevel(rollNextTier());
    setHeldLevel(null);
    setCanHold(true);
    setIsGameOver(false);
    loop();
  };

  const handleHold = () => {
    if (!canHold() || isGameOver() || !canDrop) return;
    const cur = currentLevel();
    const held = heldLevel();

    if (held === null) {
      setHeldLevel(cur);
      setCurrentLevel(nextLevel());
      setNextLevel(rollNextTier());
    } else {
      setHeldLevel(cur);
      setCurrentLevel(held);
    }
    setCanHold(false);
    sound.playPop(620);
  };

  const handlePointerDown = (e: PointerEvent) => {
    if (isGameOver()) return;
    isPointerDown = true;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    handlePointerMove(e.clientX);
  };

  const handlePointerMove = (clientX: number) => {
    if (!canvasRef) return;
    const rect = canvasRef.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvasRef.width;
    const cur = PLANET_TIERS[currentLevel()];
    dropX = Math.max(cur.radius + 6, Math.min(canvasRef.width - cur.radius - 6, x));
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (!isPointerDown) return;
    isPointerDown = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    handlePointerMove(e.clientX);
    handleDrop();
  };

  const handlePointerCancel = (e: PointerEvent) => {
    if (!isPointerDown) return;
    isPointerDown = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleDrop = () => {
    if (!canDrop || isGameOver() || !canvasRef) return;
    canDrop = false;

    const tier = PLANET_TIERS[currentLevel()];
    circles.push({
      id: circleIdCounter++,
      level: currentLevel(),
      x: dropX,
      y: 40,
      vx: 0,
      vy: 2,
      radius: tier.radius,
    });

    sound.playPop(480);

    // 次の惑星を手元へ移動
    setCurrentLevel(nextLevel());
    setNextLevel(rollNextTier());

    setTimeout(() => {
      canDrop = true;
      setCanHold(true);
    }, 600);
  };

  // 惑星の描画ルーチン
  const renderPlanet = (
    ctx: CanvasRenderingContext2D,
    c: { x: number; y: number; radius: number; level: number }
  ) => {
    const p = PLANET_TIERS[c.level];
    ctx.save();

    // 太陽のコロナ発光
    if (c.level === 10) {
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 18;
    }

    // 土星の背面の輪
    if (c.level === 8) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.radius * 1.55, c.radius * 0.42, -0.22, Math.PI, 0);
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.45)';
      ctx.lineWidth = c.radius * 0.22;
      ctx.stroke();
      ctx.restore();
    }

    // 球体グラデーション
    const grad = ctx.createRadialGradient(
      c.x - c.radius * 0.35,
      c.y - c.radius * 0.35,
      c.radius * 0.1,
      c.x,
      c.y,
      c.radius
    );
    grad.addColorStop(0, p.gradientStart);
    grad.addColorStop(1, p.gradientEnd);

    ctx.beginPath();
    ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // 球面クリップ内部ディテール
    ctx.save();
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
    ctx.clip();

    if (c.level === 0 || c.level === 1 || c.level === 2) {
      // 隕石・月・水星のクレーター
      ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
      ctx.beginPath();
      ctx.arc(c.x - c.radius * 0.3, c.y - c.radius * 0.2, c.radius * 0.22, 0, Math.PI * 2);
      ctx.arc(c.x + c.radius * 0.35, c.y + c.radius * 0.3, c.radius * 0.26, 0, Math.PI * 2);
      ctx.arc(c.x - c.radius * 0.12, c.y + c.radius * 0.4, c.radius * 0.16, 0, Math.PI * 2);
      ctx.fill();
    } else if (c.level === 3) {
      // 火星の極冠
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.beginPath();
      ctx.arc(c.x, c.y - c.radius * 0.82, c.radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
    } else if (c.level === 5) {
      // 地球の大陸（緑）と雲（白）
      ctx.fillStyle = 'rgba(16, 185, 129, 0.75)';
      ctx.beginPath();
      ctx.ellipse(c.x - c.radius * 0.3, c.y + c.radius * 0.12, c.radius * 0.45, c.radius * 0.35, 0.3, 0, Math.PI * 2);
      ctx.ellipse(c.x + c.radius * 0.42, c.y - c.radius * 0.18, c.radius * 0.4, c.radius * 0.3, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.ellipse(c.x, c.y - c.radius * 0.3, c.radius * 0.6, c.radius * 0.14, 0.1, 0, Math.PI * 2);
      ctx.fill();
    } else if (c.level === 9) {
      // 木星の縞模様＆大赤斑
      ctx.fillStyle = 'rgba(154, 52, 18, 0.45)';
      ctx.fillRect(c.x - c.radius, c.y - c.radius * 0.4, c.radius * 2, c.radius * 0.22);
      ctx.fillRect(c.x - c.radius, c.y + c.radius * 0.12, c.radius * 2, c.radius * 0.26);
      ctx.fillStyle = 'rgba(185, 28, 28, 0.85)';
      ctx.beginPath();
      ctx.ellipse(c.x + c.radius * 0.4, c.y + c.radius * 0.22, c.radius * 0.28, c.radius * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (c.level === 10) {
      // 太陽のフレア
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(c.x - c.radius * 0.25, c.y - c.radius * 0.25, c.radius * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 土星の前面の輪
    if (c.level === 8) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.radius * 1.55, c.radius * 0.42, -0.22, 0, Math.PI);
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
      ctx.lineWidth = c.radius * 0.22;
      ctx.stroke();
      ctx.restore();
    }

    // 漢字テキスト
    ctx.font = `bold ${Math.max(11, Math.round(c.radius * 0.48))}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillText(p.kanji, c.x + 1, c.y + 1);
    ctx.fillStyle = p.textColor;
    ctx.fillText(p.kanji, c.x, c.y);

    ctx.restore();
  };

  const loop = () => {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;

    // 1. 物理演算
    for (let i = 0; i < circles.length; i++) {
      const c = circles[i];
      c.vy += gravity;
      c.vx *= friction;
      c.vy *= friction;
      c.x += c.vx;
      c.y += c.vy;

      // 壁・底との衝突
      if (c.x - c.radius < 0) {
        c.x = c.radius;
        c.vx = -c.vx * bounce;
      } else if (c.x + c.radius > canvasRef.width) {
        c.x = canvasRef.width - c.radius;
        c.vx = -c.vx * bounce;
      }
      if (c.y + c.radius > canvasRef.height) {
        c.y = canvasRef.height - c.radius;
        c.vy = -c.vy * bounce;
        c.vx *= 0.95; // 底面摩擦
      }
    }

    // 2. 円同士の衝突＆マージ判定
    const toRemove = new Set<number>();
    const toAdd: Circle[] = [];

    for (let i = 0; i < circles.length; i++) {
      for (let j = i + 1; j < circles.length; j++) {
        const c1 = circles[i];
        const c2 = circles[j];
        if (toRemove.has(c1.id) || toRemove.has(c2.id)) continue;

        const dx = c2.x - c1.x;
        const dy = c2.y - c1.y;
        const dist = Math.hypot(dx, dy);
        const minDist = c1.radius + c2.radius;

        if (dist < minDist) {
          // 同じ種類ならマージ！
          if (c1.level === c2.level && c1.level < PLANET_TIERS.length - 1) {
            toRemove.add(c1.id);
            toRemove.add(c2.id);

            const newLevel = c1.level + 1;
            const newTier = PLANET_TIERS[newLevel];
            const mx = (c1.x + c2.x) / 2;
            const my = (c1.y + c2.y) / 2;

            toAdd.push({
              id: circleIdCounter++,
              level: newLevel,
              x: mx,
              y: my,
              vx: (c1.vx + c2.vx) * 0.5,
              vy: -2,
              radius: newTier.radius,
            });

            setScore((s) => s + newTier.score);
            sound.playMatch(newLevel + 1);
            continue;
          }

          // 物理反発
          const overlap = minDist - dist;
          const nx = dx / (dist || 1);
          const ny = dy / (dist || 1);

          c1.x -= nx * overlap * 0.5;
          c1.y -= ny * overlap * 0.5;
          c2.x += nx * overlap * 0.5;
          c2.y += ny * overlap * 0.5;

          // 速度交換
          const kx = c1.vx - c2.vx;
          const ky = c1.vy - c2.vy;
          const p = 2 * (nx * kx + ny * ky) / 2;
          c1.vx -= p * nx * 0.6;
          c1.vy -= p * ny * 0.6;
          c2.vx += p * nx * 0.6;
          c2.vy += p * ny * 0.6;
        }
      }
    }

    if (toRemove.size > 0) {
      circles = circles.filter((c) => !toRemove.has(c.id));
      circles.push(...toAdd);
    }

    // 3. ゲームオーバー判定（静止していてデッドラインを超えているもの）
    for (const c of circles) {
      if (Math.abs(c.vy) < 0.2 && c.y - c.radius < deadLineY) {
        setIsGameOver(true);
        if (animationId) cancelAnimationFrame(animationId);
        return;
      }
    }

    // --- 4. 描画 ---
    ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);

    // デッドライン点線
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(0, deadLineY);
    ctx.lineTo(canvasRef.width, deadLineY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 落下予定ガイド線 & 現在の惑星プレビュー
    if (canDrop) {
      const cur = PLANET_TIERS[currentLevel()];
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(dropX, 40);
      ctx.lineTo(dropX, canvasRef.height);
      ctx.stroke();

      renderPlanet(ctx, {
        x: dropX,
        y: 35,
        radius: cur.radius,
        level: currentLevel(),
      });
    }

    // 盤面の惑星描画
    for (const c of circles) {
      renderPlanet(ctx, c);
    }

    animationId = requestAnimationFrame(loop);
  };

  onSettled(() => {
    restart();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyC' || e.code === 'KeyH' || e.shiftKey) {
        handleHold();
      } else if (e.code === 'Space' || e.code === 'ArrowDown') {
        e.preventDefault();
        handleDrop();
      } else if (e.code === 'ArrowLeft') {
        dropX = Math.max(20, dropX - 15);
      } else if (e.code === 'ArrowRight') {
        if (canvasRef) {
          dropX = Math.min(canvasRef.width - 20, dropX + 15);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', handleKeyDown);
    };
  });

  const instructions = [
    '画面をドラッグ（またはマウス移動）して落とす位置を調整し、指を離すと天体が落下します。',
    '同じ種類の天体がぶつかるとマージし、より巨大な天体へと進化します。',
    '【HOLD機能】「HOLD」ボタンまたは Shift / C キーで現在狙っている天体を一時キープ可能（1手につき1回）。ピンチの切り札に活用しましょう。',
    '進化順: 塵 → 月 → 水星 → 火星 → 金星 → 地球 → 海王星 → 天王星 → 土星 → 木星 → 太陽',
  ];

  return (
    <GameShell
      id="blossom-drop"
      title="Planet Drop"
      score={score()}
      isGameOver={isGameOver()}
      onRestart={restart}
      instructions={instructions}
    >
      <div class="w-full max-w-[420px] max-h-full flex flex-col items-center justify-center min-h-0 flex-1">
        {/* 上部ステータスバー: HOLD & NEXT */}
        <div class="flex items-center justify-between gap-2 w-full mb-1.5 shrink-0 px-1">
          {/* HOLDボタン */}
          <button
            onClick={handleHold}
            disabled={!canHold() || isGameOver()}
            class={`flex items-center gap-2 px-3 py-1 rounded-xl border text-xs transition-all shadow-2xs select-none ${
              canHold() && !isGameOver()
                ? 'bg-white/95 dark:bg-slate-900/95 border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-400 active:scale-95 cursor-pointer text-indigo-700 dark:text-indigo-300'
                : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60 cursor-not-allowed text-slate-400'
            }`}
            title="ホールド (Shiftキー / Cキー / クリック)"
          >
            <span class="font-bold">HOLD</span>
            <Show
              when={heldLevel() !== null}
              fallback={<span class="text-slate-400 dark:text-slate-500 italic text-[11px]">(空)</span>}
            >
              <div class="flex items-center gap-1.5">
                <span
                  class="w-3.5 h-3.5 rounded-full inline-block shadow-2xs border border-black/10 dark:border-white/20"
                  style={{ 'background-color': PLANET_TIERS[heldLevel()!].color }}
                />
                <span class="font-bold text-slate-800 dark:text-slate-200">
                  {PLANET_TIERS[heldLevel()!].name}
                </span>
              </div>
            </Show>
          </button>

          {/* NEXT表示 */}
          <div class="flex items-center gap-2 px-3 py-1 bg-white/90 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shadow-2xs">
            <span class="text-slate-500 font-medium">NEXT:</span>
            <span
              class="w-3.5 h-3.5 rounded-full inline-block shadow-2xs border border-black/10 dark:border-white/20"
              style={{ 'background-color': PLANET_TIERS[nextLevel()].color }}
            />
            <span class="font-bold text-slate-700 dark:text-slate-300">
              {PLANET_TIERS[nextLevel()].name}
            </span>
          </div>
        </div>

        {/* 落下ボックス (Canvas) */}
        <div
          class="w-full aspect-[3/4] max-h-[calc(100dvh-130px)] bg-slate-950 rounded-3xl overflow-hidden shadow-xl border-4 border-slate-700/60 dark:border-slate-800 relative cursor-crosshair select-none touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={(e) => handlePointerMove(e.clientX)}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          <canvas
            ref={canvasRef}
            width={320}
            height={430}
            class="w-full h-full block"
          />
        </div>
      </div>
    </GameShell>
  );
};
