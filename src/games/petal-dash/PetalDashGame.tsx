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
  let y = 180;
  let vy = 0;
  const gravity = 0.35;
  const lift = -6.5;
  let pipes: { x: number; top: number; bottom: number; passed: boolean }[] = [];
  let frame = 0;

  // 待機状態 (初見殺し防止: 入力があるまで浮遊待機)
  const resetToReady = () => {
    if (animationId) cancelAnimationFrame(animationId);
    y = 180;
    vy = 0;
    pipes = [];
    frame = 0;
    setScore(0);
    setIsGameOver(false);
    setIsPlaying(false);
    renderIdle();
  };

  // 待機中のふわふわ浮遊アニメーション
  const renderIdle = () => {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;

    frame++;
    ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);

    // 背景グラデーション (空)
    const grad = ctx.createLinearGradient(0, 0, 0, canvasRef.height);
    grad.addColorStop(0, '#f0f9ff');
    grad.addColorStop(1, '#e0f2fe');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasRef.width, canvasRef.height);

    // そよ風に揺れる鳥 🐦
    const hoverY = 180 + Math.sin(frame * 0.06) * 8;
    ctx.font = '28px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐦', 60, hoverY);

    if (!isPlaying() && !isGameOver()) {
      animationId = requestAnimationFrame(renderIdle);
    }
  };

  // ゲーム本編開始
  const startGame = () => {
    if (animationId) cancelAnimationFrame(animationId);
    pipes = [];
    frame = 0;
    y = 180;
    vy = lift;
    setScore(0);
    setIsGameOver(false);
    setIsPlaying(true);
    sound.playPop(520);
    loop();
  };

  const jump = () => {
    if (isGameOver()) {
      resetToReady();
      return;
    }
    if (!isPlaying()) {
      startGame();
      return;
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

    // 背景グラデーション (空)
    const grad = ctx.createLinearGradient(0, 0, 0, canvasRef.height);
    grad.addColorStop(0, '#f0f9ff');
    grad.addColorStop(1, '#e0f2fe');
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

    // プレイヤー描画 (鳥 🐦)
    ctx.font = '24px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐦', playerX, y);

    animationId = requestAnimationFrame(loop);
  };

  const handleGameOver = () => {
    if (animationId) cancelAnimationFrame(animationId);
    setIsGameOver(true);
    setIsPlaying(false);
  };

  onSettled(() => {
    resetToReady();
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
    '画面タップまたはスペースキーを押すとゲームがスタートします。',
    'タップするたびに鳥🐦がふわりと羽ばたき、放っておくと重力で降下します。',
    '上下の障害物を避けて隙間をくぐり続け、ハイスコアを目指しましょう！',
  ];

  return (
    <GameShell
      id="petal-dash"
      title="Tap Dash"
      score={score()}
      isGameOver={isGameOver()}
      onRestart={resetToReady}
      instructions={instructions}
    >
      <div
        class="w-full max-w-[340px] aspect-[3/4] bg-sky-50 dark:bg-slate-900 rounded-3xl overflow-hidden shadow-xl border-4 border-slate-300 dark:border-slate-700 relative cursor-pointer select-none"
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
          <div class="absolute inset-0 flex flex-col items-center justify-center bg-black/20 backdrop-blur-2xs p-4 pointer-events-none">
            <div class="flex flex-col items-center gap-1.5 px-6 py-4 rounded-3xl bg-white/95 dark:bg-slate-900/95 text-center shadow-xl border border-slate-200 dark:border-slate-800 animate-pulse">
              <span class="text-3xl">🐦</span>
              <span class="text-slate-900 dark:text-white font-bold text-sm">
                タップ または スペースキーで<br />スタート！
              </span>
              <span class="text-[11px] text-slate-500 dark:text-slate-400">
                障害物を避けて飛び続けよう
              </span>
            </div>
          </div>
        </Show>
      </div>
    </GameShell>
  );
};
