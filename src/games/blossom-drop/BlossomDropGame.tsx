import { Component, createSignal, onSettled, onCleanup, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';

export interface SweetsType {
  level: number;
  name: string;
  emoji: string;
  radius: number;
  score: number;
  color: string;
  gradientStart: string;
  gradientEnd: string;
}

export const SWEETS_TIERS: SweetsType[] = [
  { level: 0, name: 'キャンディ', emoji: '🍬', radius: 15, score: 2, color: '#f472b6', gradientStart: '#fce7f3', gradientEnd: '#ec4899' },
  { level: 1, name: 'カップケーキ', emoji: '🧁', radius: 20, score: 4, color: '#34d399', gradientStart: '#d1fae5', gradientEnd: '#10b981' },
  { level: 2, name: 'クッキー', emoji: '🍪', radius: 26, score: 8, color: '#fbbf24', gradientStart: '#fef3c7', gradientEnd: '#d97706' },
  { level: 3, name: 'プリン', emoji: '🍮', radius: 33, score: 16, color: '#facc15', gradientStart: '#fef9c3', gradientEnd: '#ca8a04' },
  { level: 4, name: 'パンケーキ', emoji: '🥞', radius: 41, score: 32, color: '#fb923c', gradientStart: '#ffedd5', gradientEnd: '#ea580c' },
  { level: 5, name: 'ドーナツ', emoji: '🍩', radius: 49, score: 64, color: '#f43f5e', gradientStart: '#ffe4e6', gradientEnd: '#e11d48' },
  { level: 6, name: 'タルトパイ', emoji: '🥧', radius: 58, score: 128, color: '#818cf8', gradientStart: '#e0e7ff', gradientEnd: '#4f46e5' },
  { level: 7, name: 'ショートケーキ', emoji: '🍰', radius: 68, score: 256, color: '#fda4af', gradientStart: '#ffffff', gradientEnd: '#f43f5e' },
  { level: 8, name: 'パフェアイス', emoji: '🍨', radius: 78, score: 512, color: '#c084fc', gradientStart: '#f3e8ff', gradientEnd: '#7e22ce' },
  { level: 9, name: 'ホールケーキ', emoji: '🎂', radius: 89, score: 1024, color: '#e11d48', gradientStart: '#ffe4e6', gradientEnd: '#be123c' },
  { level: 10, name: 'ロイヤルクラウン', emoji: '👑', radius: 100, score: 2048, color: '#f59e0b', gradientStart: '#fef08a', gradientEnd: '#b45309' },
];

export const PLANET_TIERS = SWEETS_TIERS;

interface Circle {
  id: number;
  level: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  spawnTime: number;
  scaleAnim: number; // 合体時のポップアニメーション用スケール (1.0 -> 1.25 -> 1.0)
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
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
  let particles: Particle[] = [];
  let dropX = 160;
  let canDrop = true;
  let isPointerDown = false;
  const gravity = 0.42;
  const friction = 0.965; // 空気抵抗・速度減衰
  const bounce = 0.16; // 反発係数（ぽすっと落ち着く）
  const deadLineY = 70;

  const rollInitialTier = () => Math.floor(Math.random() * 3); // 0~2 (キャンディ, カップケーキ, クッキー)
  const rollNextTier = () => Math.floor(Math.random() * 4); // 0~3 (プリンまで)

  const spawnMergeParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.5;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.8,
        color: Math.random() < 0.6 ? color : '#fef08a',
        size: 3 + Math.random() * 3.5,
        life: 1.0,
        maxLife: 18 + Math.random() * 12,
      });
    }
  };

  const restart = () => {
    circles = [];
    particles = [];
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
    const cur = SWEETS_TIERS[currentLevel()];
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

    const tier = SWEETS_TIERS[currentLevel()];
    circles.push({
      id: circleIdCounter++,
      level: currentLevel(),
      x: dropX,
      y: 40,
      vx: (Math.random() - 0.5) * 0.4,
      vy: 1.5,
      radius: tier.radius,
      spawnTime: Date.now(),
      scaleAnim: 1.0,
    });

    sound.playPop(380);

    // 次のスイーツを手元へ移動
    setCurrentLevel(nextLevel());
    setNextLevel(rollNextTier());

    setTimeout(() => {
      canDrop = true;
      setCanHold(true);
    }, 450);
  };

  // シンプルで可愛いスイーツ絵文字レンダラー（丸い背景なし・絵文字単体）
  const renderSweets = (
    ctx: CanvasRenderingContext2D,
    c: { x: number; y: number; radius: number; level: number; scaleAnim?: number }
  ) => {
    const s = SWEETS_TIERS[c.level];
    const scale = c.scaleAnim || 1.0;
    const r = c.radius * scale;

    ctx.save();
    ctx.translate(c.x, c.y);

    // 足元の自然でソフトな温かいドロップシャドウ（トレイや床面への接地感を表現）
    ctx.fillStyle = 'rgba(180, 83, 9, 0.14)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.88, r * 0.76, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // 絵文字そのものをフルカラー・高彩度で鮮明に描画
    const emojiSize = Math.round(r * 1.92);
    ctx.font = `${emojiSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.emoji, 0, r * 0.05);

    ctx.restore();
  };

  const loop = () => {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;

    // 1. 物理演算
    const floorY = canvasRef.height - 10; // 下部の木目トレイの上面
    for (let i = 0; i < circles.length; i++) {
      const c = circles[i];
      c.vy += gravity;
      c.vx *= friction;
      c.vy *= friction;
      c.x += c.vx;
      c.y += c.vy;

      // ポップアニメーションの減衰
      if (c.scaleAnim > 1.0) {
        c.scaleAnim = Math.max(1.0, c.scaleAnim - 0.04);
      }

      // 壁・底との衝突 (床面のグリップ摩擦でツルツル滑りを解消)
      if (c.x - c.radius < 0) {
        c.x = c.radius;
        c.vx = -c.vx * bounce;
        c.vy *= 0.92;
      } else if (c.x + c.radius > canvasRef.width) {
        c.x = canvasRef.width - c.radius;
        c.vx = -c.vx * bounce;
        c.vy *= 0.92;
      }

      if (c.y + c.radius > floorY) {
        c.y = floorY - c.radius;
        c.vy = -c.vy * bounce;
        // 床面での強い転がり摩擦（ツルツル横滑りを防止）
        c.vx *= 0.82;
        if (Math.abs(c.vy) < 0.15) c.vy = 0;
      }

      // 微小速度の静止スリープ
      if (Math.abs(c.vx) < 0.06) c.vx = 0;
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
          if (c1.level === c2.level && c1.level < SWEETS_TIERS.length - 1) {
            toRemove.add(c1.id);
            toRemove.add(c2.id);

            const newLevel = c1.level + 1;
            const newTier = SWEETS_TIERS[newLevel];
            const mx = (c1.x + c2.x) / 2;
            const my = (c1.y + c2.y) / 2;

            toAdd.push({
              id: circleIdCounter++,
              level: newLevel,
              x: mx,
              y: my,
              vx: (c1.vx + c2.vx) * 0.4,
              vy: -2.0,
              radius: newTier.radius,
              spawnTime: Date.now(),
              scaleAnim: 1.25, // ポップアニメーション
            });

            // マージパーティクルとサウンド
            spawnMergeParticles(mx, my, newTier.color);
            setScore((s) => s + newTier.score);
            sound.playMatch(newLevel + 1);

            if (navigator.vibrate) {
              try {
                navigator.vibrate(newLevel >= 6 ? [40, 30, 60] : 35);
              } catch (_) {}
            }
          } else {
            // 通常の衝突判定（質量比 ＆ 表面摩擦の適用でツルツル滑り落ちを防止）
            const overlap = minDist - dist;
            const nx = dx / (dist || 1);
            const ny = dy / (dist || 1);

            // 質量比（半径の2乗比）
            const m1 = c1.radius * c1.radius;
            const m2 = c2.radius * c2.radius;
            const totalM = m1 + m2;
            const r1 = m2 / totalM;
            const r2 = m1 / totalM;

            // 位置補正
            c1.x -= nx * overlap * r1;
            c1.y -= ny * overlap * r1;
            c2.x += nx * overlap * r2;
            c2.y += ny * overlap * r2;

            // 法線方向の反発
            const kx = c1.vx - c2.vx;
            const ky = c1.vy - c2.vy;
            const vn = nx * kx + ny * ky;

            if (vn < 0) {
              const impulse = (-(1 + bounce) * vn) / (1 / m1 + 1 / m2);
              c1.vx -= (impulse / m1) * nx;
              c1.vy -= (impulse / m1) * ny;
              c2.vx += (impulse / m2) * nx;
              c2.vy += (impulse / m2) * ny;

              // 接線方向（すれ違い方向）の接触摩擦
              const tx = -ny;
              const ty = nx;
              const vt = kx * tx + ky * ty;
              const frictionImpulse = vt * 0.42;

              c1.vx -= tx * frictionImpulse * r1;
              c1.vy -= ty * frictionImpulse * r1;
              c2.vx += tx * frictionImpulse * r2;
              c2.vy += ty * frictionImpulse * r2;
            }
          }
        }
      }
    }

    if (toRemove.size > 0) {
      circles = circles.filter((c) => !toRemove.has(c.id));
      circles.push(...toAdd);
    }

    // 3. パーティクル更新
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      p.life -= 1 / p.maxLife;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    // 4. ゲームオーバー判定 (静止状態でデッドラインを超過)
    for (const c of circles) {
      if (Date.now() - c.spawnTime > 1500 && c.y - c.radius < deadLineY && Math.abs(c.vy) < 0.3) {
        sound.playGameOver();
        setIsGameOver(true);
        if (animationId) cancelAnimationFrame(animationId);
        return;
      }
    }

    // --- 5. 描画 ---
    // 明るく温かみのあるパティスリーカフェ風のグラデーション背景
    // （暗い背景から脱却し、絵文字本来の鮮やかな色彩を最大限引き出す）
    const bgGrad = ctx.createLinearGradient(0, 0, 0, canvasRef.height);
    bgGrad.addColorStop(0, '#fffbf5'); // ほんのり温かいアイボリー
    bgGrad.addColorStop(0.65, '#fef3e2'); // 優しいカスタードクリーム
    bgGrad.addColorStop(1, '#fdebd0'); // 落ち着いたペールアプリコット
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvasRef.width, canvasRef.height);

    // 下部の木目調ウッドトレイ（スイーツが載るステージ）
    const trayGrad = ctx.createLinearGradient(0, floorY, 0, canvasRef.height);
    trayGrad.addColorStop(0, '#d97706'); // 温かいキャラメルウッド
    trayGrad.addColorStop(1, '#92400e');
    ctx.fillStyle = trayGrad;
    ctx.fillRect(0, floorY, canvasRef.width, canvasRef.height - floorY);

    // トレイのハイライトライン
    ctx.fillStyle = 'rgba(254, 243, 199, 0.4)';
    ctx.fillRect(0, floorY, canvasRef.width, 2);

    // デッドライン点線（目立ちすぎず、でも警告としてわかりやすいローズレッド）
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.75)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(8, deadLineY);
    ctx.lineTo(canvasRef.width - 8, deadLineY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 落下予定ガイド線 & 手元のスイーツプレビュー
    if (canDrop) {
      const cur = SWEETS_TIERS[currentLevel()];
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(dropX, 42);
      ctx.lineTo(dropX, floorY);
      ctx.stroke();
      ctx.setLineDash([]);

      renderSweets(ctx, {
        x: dropX,
        y: 36,
        radius: cur.radius,
        level: currentLevel(),
      });
    }

    // 落下済みスイーツの描画
    for (const c of circles) {
      renderSweets(ctx, c);
    }

    // パーティクルの描画
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    animationId = requestAnimationFrame(loop);
  };

  onSettled(() => {
    restart();

    // キーボード操作対応
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGameOver()) return;
      if (e.code === 'KeyC' || e.key === 'Shift') {
        e.preventDefault();
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

    onCleanup(() => {
      if (animationId) cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', handleKeyDown);
    });
  });

  const instructions = [
    '画面をドラッグ（またはマウス移動）して落とす位置を調整し、指を離すとスイーツが落下します。',
    '同じ種類のスイーツがぶつかるとマージし、より大きくて豪華なスイーツへと進化します。',
    '【HOLD機能】「HOLD」ボタンまたは Shift / C キーで現在狙っているスイーツを一時キープ可能（1手につき1回）。',
    '進化順: 🍬キャンディ → 🧁カップケーキ → 🍪クッキー → 🍮プリン → 🥞パンケーキ → 🍩ドーナツ → 🥧タルト → 🍰ケーキ → 🍨パフェ → 🎂ホールケーキ → 👑ロイヤルクラウン',
  ];

  return (
    <GameShell
      id="blossom-drop"
      title="Sweets Drop"
      score={score()}
      isGameOver={isGameOver()}
      onRestart={restart}
      instructions={instructions}
      extraControls={
        /* 進化ツリー順一覧プレビュー */
        <div class="flex items-center justify-center gap-1 sm:gap-1.5 overflow-x-auto py-1 px-2 max-w-full text-xs select-none text-slate-500">
          <span class="font-bold text-[10px] text-slate-400 shrink-0">進化順:</span>
          {SWEETS_TIERS.map((t, idx) => (
            <div class="flex items-center gap-0.5 shrink-0">
              <span class="text-xs" title={`${idx + 1}. ${t.name}`}>
                {t.emoji}
              </span>
              {idx < SWEETS_TIERS.length - 1 && <span class="text-[8px] text-slate-400">→</span>}
            </div>
          ))}
        </div>
      }
    >
      <div class="w-full max-w-[420px] max-h-full flex flex-col items-center justify-center min-h-0 flex-1">
        {/* 上部ステータスバー: HOLD & NEXT */}
        <div class="flex items-center justify-between gap-2 w-full mb-1.5 shrink-0 px-1">
          {/* HOLDボタン */}
          <button
            onClick={handleHold}
            disabled={!canHold() || isGameOver()}
            class={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-xs transition-all shadow-xs select-none ${
              canHold() && !isGameOver()
                ? 'bg-white/95 dark:bg-slate-900/95 border-pink-200 dark:border-pink-900/60 hover:border-pink-400 active:scale-95 cursor-pointer text-pink-700 dark:text-pink-300'
                : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60 cursor-not-allowed text-slate-400'
            }`}
            title="ホールド (Shiftキー / Cキー / クリック)"
          >
            <span class="font-extrabold text-[11px] bg-pink-100 dark:bg-pink-950/80 px-1.5 py-0.5 rounded-md text-pink-600 dark:text-pink-400">HOLD</span>
            <Show
              when={heldLevel() !== null}
              fallback={<span class="text-slate-400 dark:text-slate-500 italic text-[11px]">(空)</span>}
            >
              <div class="flex items-center gap-1.5">
                <span class="text-base">
                  {SWEETS_TIERS[heldLevel()!].emoji}
                </span>
                <span class="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  {SWEETS_TIERS[heldLevel()!].name}
                </span>
              </div>
            </Show>
          </button>

          {/* NEXT表示 */}
          <div class="flex items-center gap-2 px-3 py-1.5 bg-white/90 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs shadow-xs">
            <span class="text-slate-400 font-bold text-[11px]">NEXT:</span>
            <span class="text-base">
              {SWEETS_TIERS[nextLevel()].emoji}
            </span>
            <span class="font-bold text-slate-800 dark:text-slate-200 text-xs">
              {SWEETS_TIERS[nextLevel()].name}
            </span>
          </div>
        </div>

        {/* 落下ボックス (Canvas) */}
        <div
          class="w-full aspect-[3/4] max-h-[calc(100dvh-130px)] bg-[#fffbf5] rounded-3xl overflow-hidden shadow-xl border-4 border-amber-200 dark:border-amber-800/60 relative cursor-crosshair select-none touch-none"
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