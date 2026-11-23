import { Component, createSignal, onSettled, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';

interface NeedleObstacle {
  x: number;
  width: number;
  gapY: number; // 穴の中心Y座標
  gapHeight: number; // 穴の高さ
  passed: boolean;
}

export const ItoToshiGame: Component = () => {
  const [distance, setDistance] = createSignal(0);
  const [isGameOver, setIsGameOver] = createSignal(false);
  const [gameState, setGameState] = createSignal<'ready' | 'playing' | 'gameover'>('ready');

  let canvasRef: HTMLCanvasElement | undefined;
  let animId: number | null = null;
  let isHolding = false;

  // 物理定数
  const GRAVITY = 0.38;
  const THRUST = -0.52;
  const MAX_VELOCITY = 6.0;

  // ゲーム内ステート
  let needleY = 200;
  let velocityY = 0;
  let scrollSpeed = 3.2;
  let obstacles: NeedleObstacle[] = [];
  let trail: { x: number; y: number }[] = [];
  let distCounter = 0;
  let lastObstacleX = 400;

  const initGame = () => {
    needleY = 200;
    velocityY = 0;
    scrollSpeed = 3.2;
    distCounter = 0;
    lastObstacleX = 400;
    obstacles = [];
    trail = [];

    // 初期障害物の生成
    for (let i = 0; i < 3; i++) {
      spawnObstacle(500 + i * 260);
    }

    setDistance(0);
    setIsGameOver(false);
    setGameState('ready');
  };

  const spawnObstacle = (x: number) => {
    const minGap = 80;
    const maxGap = 120;
    const gapHeight = Math.max(minGap, maxGap - Math.floor(distCounter / 100)); // 距離に応じてやや狭くなる
    const gapY = 70 + Math.random() * (400 - 140);
    obstacles.push({
      x,
      width: 28,
      gapY,
      gapHeight,
      passed: false,
    });
    lastObstacleX = x;
  };

  const startGame = () => {
    if (gameState() === 'ready') {
      sound.playPop(520);
      setGameState('playing');
    }
  };

  const handlePointerDown = () => {
    isHolding = true;
    if (gameState() === 'ready') {
      startGame();
    } else if (gameState() === 'playing') {
      sound.playPop(480);
    }
  };

  const handlePointerUp = () => {
    isHolding = false;
  };

  // ゲームループ
  const loop = () => {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;

    const w = canvasRef.width;
    const h = canvasRef.height;

    // 画面クリア (ダークスレート・ネオンクラシック)
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    // グリッド背景
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    const gridOffset = (distCounter * 3) % 40;
    for (let x = -gridOffset; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    if (gameState() === 'playing') {
      // 物理演算
      velocityY += isHolding ? THRUST : GRAVITY;
      velocityY = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, velocityY));
      needleY += velocityY;

      // 距離加算
      distCounter += 1;
      setDistance(Math.floor(distCounter / 2));
      scrollSpeed = 3.2 + Math.min(distCounter / 400, 3.5);

      // 上下壁衝突判定
      if (needleY < 12 || needleY > h - 12) {
        gameOver();
      }

      // 障害物の移動 & 衝突判定
      const needleX = 90;
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x -= scrollSpeed;

        // 通過判定 & スコア音
        if (!obs.passed && obs.x + obs.width < needleX) {
          obs.passed = true;
          sound.playMatch(5);
        }

        // 針穴との衝突判定
        if (
          needleX + 10 > obs.x &&
          needleX - 10 < obs.x + obs.width
        ) {
          const topWallBottom = obs.gapY - obs.gapHeight / 2;
          const bottomWallTop = obs.gapY + obs.gapHeight / 2;
          if (needleY - 6 < topWallBottom || needleY + 6 > bottomWallTop) {
            gameOver();
          }
        }

        // 画面外削除
        if (obs.x + obs.width < -50) {
          obstacles.splice(i, 1);
        }
      }

      // 新規障害物生成
      if (lastObstacleX - scrollSpeed < w + 50) {
        spawnObstacle(lastObstacleX + 220 + Math.random() * 60);
      }

      // 軌跡 (糸の軌跡)
      trail.unshift({ x: needleX, y: needleY });
      if (trail.length > 50) trail.pop();
    }

    // 障害物の描画 (針の穴 / ゲート)
    for (const obs of obstacles) {
      const topWallBottom = obs.gapY - obs.gapHeight / 2;
      const bottomWallTop = obs.gapY + obs.gapHeight / 2;

      // 上の壁 (柱)
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.fillRect(obs.x, 0, obs.width, topWallBottom);
      ctx.strokeRect(obs.x, 0, obs.width, topWallBottom);

      // 下の壁 (柱)
      ctx.fillRect(obs.x, bottomWallTop, obs.width, h - bottomWallTop);
      ctx.strokeRect(obs.x, bottomWallTop, obs.width, h - bottomWallTop);

      // 針の穴のエッジハイライト (通過ゲート)
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(obs.x + obs.width / 2, topWallBottom, 4, 0, Math.PI * 2);
      ctx.arc(obs.x + obs.width / 2, bottomWallTop, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 糸の描画 (しなやかな曲線)
    if (trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(trail[0].x, trail[0].y);
      for (let i = 1; i < trail.length; i++) {
        const pt = trail[i];
        const screenX = pt.x - (i * (scrollSpeed * 0.9));
        ctx.lineTo(screenX, pt.y);
      }
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();

      // 内側の光彩
      ctx.strokeStyle = '#fecdd3';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 針の描画 (先頭オブジェクト)
    const needleX = 90;
    ctx.save();
    ctx.translate(needleX, needleY);
    ctx.rotate(Math.min(Math.PI / 4, Math.max(-Math.PI / 4, velocityY * 0.08)));

    // 針頭
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-12, -4);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-12, 4);
    ctx.closePath();
    ctx.fill();

    // 針の穴
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(-6, 0, 3, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    animId = requestAnimationFrame(loop);
  };

  const gameOver = () => {
    setGameState('gameover');
    setIsGameOver(true);
    sound.playGameOver();
  };

  const restart = () => {
    sound.playPop(500);
    initGame();
  };

  onSettled(() => {
    initGame();
    animId = requestAnimationFrame(loop);
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  });

  const instructions = [
    '【糸通し】Flashやガラケー時代に流行した、タイミングと集中力のフライトゲームです。',
    '画面を長押し（クリック中）すると針が【上昇】し、離すと重力で【下降】します。',
    '狭まる針穴の隙間をくぐり抜け、限界の距離（m）を目指しましょう！',
  ];

  return (
    <GameShell
      id="ito-toshi"
      title="Ito-toshi (糸通し)"
      score={distance()}
      isGameOver={isGameOver()}
      onRestart={restart}
      instructions={instructions}
      extraControls={
        <div class="flex items-center justify-between w-full max-w-md px-3 py-1 bg-white/90 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs shadow-2xs">
          <div class="flex items-center gap-2">
            <span class="text-slate-500 font-semibold">記録:</span>
            <span class="font-mono font-black text-rose-500 text-base">{distance()} m</span>
          </div>
          <div class="text-[11px] font-medium text-slate-500">
            操作: 画面を押して上昇 / 離して下降
          </div>
        </div>
      }
    >
      <div
        class="w-full max-w-2xl max-h-full aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800 relative select-none touch-none bg-slate-950 cursor-pointer"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <canvas
          ref={canvasRef}
          width={480}
          height={360}
          class="w-full h-full block"
        />

        {/* スタート待機オーバーレイ */}
        <Show when={gameState() === 'ready'}>
          <div class="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-2xs text-white p-4 text-center">
            <div class="w-12 h-12 rounded-2xl bg-rose-600/90 flex items-center justify-center mb-3 shadow-lg">
              <span class="text-xl font-black">糸</span>
            </div>
            <h3 class="text-xl font-black tracking-tight mb-1">糸通し</h3>
            <p class="text-xs text-slate-300 max-w-xs mb-4">
              長押しで上昇、離して下降。<br />針の穴をくぐり抜けて距離を伸ばそう！
            </p>
            <div class="px-5 py-2.5 rounded-xl bg-white text-slate-900 font-bold text-xs shadow-md animate-pulse">
              画面をタップしてスタート
            </div>
          </div>
        </Show>

        {/* 距離インジケータ */}
        <div class="absolute top-3 left-4 pointer-events-none text-white/90 font-mono text-xs font-bold drop-shadow-md">
          {distance()} <span class="text-[10px] text-rose-400 font-sans">m</span>
        </div>
      </div>
    </GameShell>
  );
};
