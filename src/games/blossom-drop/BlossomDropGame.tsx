import { Component, createSignal, onSettled, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';

interface FruitType {
  level: number;
  emoji: string;
  name: string;
  radius: number;
  score: number;
  color: string;
}

const FRUIT_TIERS: FruitType[] = [
  { level: 0, emoji: '🍒', name: 'サクランボ', radius: 14, score: 2, color: '#f43f5e' },
  { level: 1, emoji: '🍓', name: 'イチゴ', radius: 19, score: 4, color: '#ef4444' },
  { level: 2, emoji: '🍇', name: 'ブドウ', radius: 25, score: 8, color: '#a855f7' },
  { level: 3, emoji: '🍊', name: 'ミカン', radius: 31, score: 16, color: '#f97316' },
  { level: 4, emoji: '🍎', name: 'リンゴ', radius: 38, score: 32, color: '#dc2626' },
  { level: 5, emoji: '🍐', name: '洋梨', radius: 46, score: 64, color: '#84cc16' },
  { level: 6, emoji: '🍑', name: 'モモ', radius: 55, score: 128, color: '#fb7185' },
  { level: 7, emoji: '🍍', name: 'パイナップル', radius: 64, score: 256, color: '#eab308' },
  { level: 8, emoji: '🍈', name: 'メロン', radius: 74, score: 512, color: '#22c55e' },
  { level: 9, emoji: '🍉', name: 'スイカ', radius: 84, score: 1024, color: '#16a34a' },
  { level: 10, emoji: '🌸', name: '桜花繚乱', radius: 95, score: 2048, color: '#f472b6' },
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
  const [nextLevel, setNextLevel] = createSignal(0);
  const [isGameOver, setIsGameOver] = createSignal(false);

  let canvasRef: HTMLCanvasElement | undefined;
  let animationId: number | null = null;

  // 物理ワールド
  let circles: Circle[] = [];
  let dropX = 160;
  let canDrop = true;
  const gravity = 0.38;
  const friction = 0.985;
  const bounce = 0.3;
  const deadLineY = 70;

  const restart = () => {
    circles = [];
    dropX = 160;
    canDrop = true;
    setScore(0);
    setNextLevel(Math.floor(Math.random() * 3)); // 0~2
    setIsGameOver(false);
    loop();
  };

  const handlePointerMove = (clientX: number) => {
    if (!canvasRef) return;
    const rect = canvasRef.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvasRef.width;
    const currentFruit = FRUIT_TIERS[nextLevel()];
    dropX = Math.max(currentFruit.radius + 5, Math.min(canvasRef.width - currentFruit.radius - 5, x));
  };

  const handleDrop = () => {
    if (!canDrop || isGameOver() || !canvasRef) return;
    canDrop = false;

    const tier = FRUIT_TIERS[nextLevel()];
    circles.push({
      id: circleIdCounter++,
      level: nextLevel(),
      x: dropX,
      y: 40,
      vx: 0,
      vy: 2,
      radius: tier.radius,
    });

    sound.playPop(480);
    setNextLevel(Math.floor(Math.random() * 4)); // 次のフルーツ (0~3)

    setTimeout(() => {
      canDrop = true;
    }, 600);
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
          if (c1.level === c2.level && c1.level < FRUIT_TIERS.length - 1) {
            toRemove.add(c1.id);
            toRemove.add(c2.id);

            const newLevel = c1.level + 1;
            const newTier = FRUIT_TIERS[newLevel];
            const mx = (c1.x + c2.x) / 2;
            const my = (c1.y + c2.y) / 2;

            toAdd.push({
              id: circleIdCounter++,
              level: newLevel,
              x: mx,
              y: my,
              vx: (c1.vx + c2.vx) * 0.5,
              vy: -2, // マージ時の小ジャンプ
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

    // 落下予定ガイド線 & 次のフルーツプレビュー
    if (canDrop) {
      const cur = FRUIT_TIERS[nextLevel()];
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(dropX, 40);
      ctx.lineTo(dropX, canvasRef.height);
      ctx.stroke();

      ctx.font = `${cur.radius * 1.5}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cur.emoji, dropX, 35);
    }

    // 盤面のフルーツ描画
    for (const c of circles) {
      const tier = FRUIT_TIERS[c.level];

      // フルーツ背景円
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
      ctx.fillStyle = tier.color;
      ctx.shadowColor = 'rgba(0,0,0,0.1)';
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.shadowBlur = 0;

      // 絵文字
      ctx.font = `${c.radius * 1.25}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tier.emoji, c.x, c.y);
    }

    animationId = requestAnimationFrame(loop);
  };

  onSettled(() => {
    restart();
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  });

  const instructions = [
    '左右にスワイプ・カーソル移動して狙いを定め、タップで落とします。',
    '同じ種類の果物・花がぶつかるとマージして大きく成長します！',
    '上の赤い点線を超えて溢れ出さないように、大輪の桜花🌸を目指しましょう。',
  ];

  return (
    <GameShell
      id="blossom-drop"
      title="Blossom Drop"
      score={score()}
      isGameOver={isGameOver()}
      onRestart={restart}
      instructions={instructions}
    >
      <div class="w-full max-w-[340px] flex flex-col items-center">
        {/* 次のフルーツ表示 */}
        <div class="flex items-center gap-2 mb-2 px-3 py-1 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-rose-100 dark:border-slate-800 text-xs shadow-2xs">
          <span class="text-slate-500">NEXT:</span>
          <span class="text-xl leading-none">{FRUIT_TIERS[nextLevel()].emoji}</span>
          <span class="font-bold text-slate-700 dark:text-slate-300">{FRUIT_TIERS[nextLevel()].name}</span>
        </div>

        {/* 落下ボックス (Canvas) */}
        <div
          class="w-full aspect-[3/4] bg-gradient-to-b from-rose-50/60 to-pink-100/50 dark:from-slate-950 dark:to-slate-900 rounded-3xl overflow-hidden shadow-2xl border-4 border-rose-200 dark:border-slate-800 relative cursor-crosshair select-none touch-none"
          onPointerMove={(e) => handlePointerMove(e.clientX)}
          onPointerDown={() => handleDrop()}
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
