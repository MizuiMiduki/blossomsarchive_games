import { Component, createSignal, onSettled, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';

export const PetalDashGame: Component = () => {
  const [score, setScore] = createSignal(0);
  const [isGameOver, setIsGameOver] = createSignal(false);
  const [isPlaying, setIsPlaying] = createSignal(false);

  let canvasRef: HTMLCanvasElement | undefined;
  let animationId: number | null = null;

  // ゲーム状態
  let y = 150;
  let vy = 0;
  const gravity = 0.35;
  const lift = -6.5;
  let pipes: { x: number; top: number; bottom: number; passed: boolean }[] = [];
  let frame = 0;

  const restart = () => {
    y = 150;
    vy = 0;
    pipes = [];
    frame = 0;
    setScore(0);
    setIsGameOver(false);
    setIsPlaying(true);
    loop();
  };

  const jump = () => {
    if (isGameOver()) {
      restart();
      return;
    }
    if (!isPlaying()) {
      setIsPlaying(true);
    }
    vy = lift;
    sound.playPop(520);
  };

  const loop = () => {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;

    frame++;

    // 物理更新
    vy += gravity;
    y += vy;

    // 障害物生成 (120フレームごと)
    if (frame % 90 === 0) {
      const gap = 110;
      const topHeight = Math.floor(Math.random() * 120) + 40;
      pipes.push({
        x: canvasRef.width,
        top: topHeight,
        bottom: canvasRef.height - (topHeight + gap),
        passed: false,
      });
    }

    // 障害物移動 & 衝突判定
    const playerRadius = 12;
    const playerX = 60;

    // 地面・天井衝突
    if (y - playerRadius < 0 || y + playerRadius > canvasRef.height) {
      handleGameOver();
      return;
    }

    for (let i = pipes.length - 1; i >= 0; i--) {
      const p = pipes[i];
      p.x -= 2.5;

      // 通過判定
      if (!p.passed && p.x + 35 < playerX) {
        p.passed = true;
        setScore((s) => s + 10);
        sound.playMatch(3);
      }

      // 衝突判定
      if (playerX + playerRadius > p.x && playerX - playerRadius < p.x + 35) {
        if (y - playerRadius < p.top || y + playerRadius > canvasRef.height - p.bottom) {
          handleGameOver();
          return;
        }
      }

      // 画面外除外
      if (p.x < -40) {
        pipes.splice(i, 1);
      }
    }

    // --- 描画 ---
    ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);

    // 背景グラデーション (空と花びら)
    const grad = ctx.createLinearGradient(0, 0, 0, canvasRef.height);
    grad.addColorStop(0, '#fdf2f8');
    grad.addColorStop(1, '#fce7f3');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasRef.width, canvasRef.height);

    // 障害物描画 (柔らかな竹・枝)
    pipes.forEach((p) => {
      ctx.fillStyle = '#059669';
      // 上パイプ
      ctx.beginPath();
      ctx.roundRect(p.x, 0, 35, p.top, [0, 0, 8, 8]);
      ctx.fill();

      // 下パイプ
      ctx.beginPath();
      ctx.roundRect(p.x, canvasRef!.height - p.bottom, 35, p.bottom, [8, 8, 0, 0]);
      ctx.fill();
    });

    // プレイヤー描画 (花びら 🌸)
    ctx.font = '24px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🌸', playerX, y);

    animationId = requestAnimationFrame(loop);
  };

  const handleGameOver = () => {
    if (animationId) cancelAnimationFrame(animationId);
    setIsGameOver(true);
    setIsPlaying(false);
  };

  onSettled(() => {
    restart();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', handleKeyDown);
    };
  });

  const instructions = [
    'タップまたはスペースキーで花びらがふわりと上昇します。',
    '上下から伸びる障害物を避けて、どこまでも飛び続けましょう！',
    '隙間をくぐるごとにスコアが加算されます。',
  ];

  return (
    <GameShell
      id="petal-dash"
      title="Petal Dash"
      score={score()}
      isGameOver={isGameOver()}
      onRestart={restart}
      instructions={instructions}
    >
      <div
        class="w-full max-w-[340px] aspect-[3/4] bg-pink-50 dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border-4 border-rose-300 dark:border-slate-700 relative cursor-pointer select-none"
        onClick={jump}
        onTouchStart={(e) => {
          e.preventDefault();
          jump();
        }}
      >
        <canvas
          ref={canvasRef}
          width={320}
          height={420}
          class="w-full h-full block"
        />

        <Show when={!isPlaying() && !isGameOver()}>
          <div class="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-2xs">
            <div class="px-5 py-2.5 rounded-2xl bg-white/90 text-rose-600 font-bold text-sm shadow-lg animate-pulse">
              タップしてスタート！
            </div>
          </div>
        </Show>
      </div>
    </GameShell>
  );
};
