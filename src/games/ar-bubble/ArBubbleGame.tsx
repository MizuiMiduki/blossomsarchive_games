import { Component, createSignal, onSettled, onCleanup, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import { drawVideoCover, setupCanvasAutoResize } from '../../utils/camera.ts';
import confetti from 'canvas-confetti';

interface BubbleItem {
  id: number;
  x: number;
  y: number;
  baseX: number;
  vy: number;
  radius: number;
  wobbleSpeed: number;
  wobblePhase: number;
  type: 'normal' | 'star' | 'blossom' | 'gold' | 'fever';
  color: string;
  points: number;
  isPopped: boolean;
  popProgress: number;
}

interface SplashDroplet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: string;
}

export const ArBubbleGame: Component = () => {
  const [score, setScore] = createSignal(0);
  const [timeLeft, setTimeLeft] = createSignal(60);
  const [isGameOver, setIsGameOver] = createSignal(false);
  const [cameraActive, setCameraActive] = createSignal(false);
  const [facingMode, setFacingMode] = createSignal<'environment' | 'user'>('environment');
  const [poppedTotal, setPoppedTotal] = createSignal(0);
  const [isFever, setIsFever] = createSignal(false);

  let videoRef: HTMLVideoElement | undefined;
  let canvasRef: HTMLCanvasElement | undefined;
  let diffCanvas: HTMLCanvasElement | undefined;
  let diffCtx: CanvasRenderingContext2D | null = null;
  let prevFrameData: Uint8ClampedArray | null = null;
  let animId: number | null = null;
  let timerId: number | null = null;
  let feverTimeoutId: number | null = null;
  let stream: MediaStream | null = null;

  let bubbles: BubbleItem[] = [];
  let droplets: SplashDroplet[] = [];
  let nextBubbleId = 1;
  let spawnCooldown = 0;

  const instructions = [
    '【部屋の中にシャボン玉が出現】カメラを起動すると、部屋の中にシャボン玉が浮かんできます。',
    'カメラの前で手を振って触れるか、画面を直接タップして割りましょう！',
    '【ボーナス】桜の花びら入りや、金色のスター入りシャボン玉は高得点！',
    '「フィーバー玉」を割ると、一定時間すべてのシャボン玉の得点が2倍になります。',
    '【プライバシー保護】カメラ映像は端末内のみで処理され、外部への送信・保存は一切行われません。',
  ];

  const BUBBLE_TYPES = [
    { type: 'normal' as const, color: '#38bdf8', points: 50, radius: 26 },
    { type: 'normal' as const, color: '#a855f7', points: 60, radius: 28 },
    { type: 'blossom' as const, color: '#f43f5e', points: 120, radius: 30 },
    { type: 'star' as const, color: '#eab308', points: 180, radius: 32 },
    { type: 'gold' as const, color: '#f59e0b', points: 250, radius: 36 },
    { type: 'fever' as const, color: '#ec4899', points: 400, radius: 40 },
  ];

  const startCamera = async () => {
    try {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode() }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      stream = media;
      if (videoRef) {
        videoRef.srcObject = media;
        await videoRef.play();
        setCameraActive(true);
      }
    } catch {
      setCameraActive(false);
    }
  };

  const toggleCameraFacing = async () => {
    const nextMode = facingMode() === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (cameraActive()) {
      await startCamera();
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    setCameraActive(false);
  };

  const restart = () => {
    bubbles = [];
    droplets = [];
    setScore(0);
    setTimeLeft(60);
    setPoppedTotal(0);
    setIsFever(false);
    setIsGameOver(false);

    if (timerId) clearInterval(timerId);
    timerId = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerId!);
          setIsGameOver(true);
          sound.playGameOver();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const spawnBubble = (width: number, height: number) => {
    const roll = Math.random();
    let def = BUBBLE_TYPES[0];
    if (roll < 0.08) def = BUBBLE_TYPES[5]; // fever
    else if (roll < 0.22) def = BUBBLE_TYPES[4]; // gold
    else if (roll < 0.42) def = BUBBLE_TYPES[3]; // star
    else if (roll < 0.65) def = BUBBLE_TYPES[2]; // blossom
    else if (roll < 0.85) def = BUBBLE_TYPES[1];

    const x = Math.random() * (width - 60) + 30;
    bubbles.push({
      id: nextBubbleId++,
      x,
      baseX: x,
      y: height + 30,
      vy: Math.random() * 1.5 + 1.8,
      radius: def.radius,
      wobbleSpeed: Math.random() * 0.05 + 0.03,
      wobblePhase: Math.random() * Math.PI * 2,
      type: def.type,
      color: def.color,
      points: def.points,
      isPopped: false,
      popProgress: 0,
    });
  };

  const popBubble = (b: BubbleItem) => {
    if (b.isPopped) return;
    b.isPopped = true;

    sound.playPop(b.type === 'fever' ? 880 : 520);
    const multiplier = isFever() ? 2 : 1;
    const gained = b.points * multiplier;
    setScore((s) => s + gained);
    setPoppedTotal((p) => p + 1);

    if (b.type === 'fever') {
      sound.playVictory();
      setIsFever(true);
      if (feverTimeoutId) clearTimeout(feverTimeoutId);
      feverTimeoutId = window.setTimeout(() => setIsFever(false), 8000);
      confetti({ particleCount: 35, spread: 70, origin: { x: b.x / (canvasRef?.width || 640), y: b.y / (canvasRef?.height || 480) } });
    }

    // 飛散水滴パーティクル
    for (let i = 0; i < 10; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = Math.random() * 4 + 1.5;
      droplets.push({
        x: b.x,
        y: b.y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        radius: Math.random() * 3 + 2,
        alpha: 0.9,
        color: b.color,
      });
    }
  };

  const loop = () => {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;
    const width = canvasRef.width;
    const height = canvasRef.height;

    ctx.clearRect(0, 0, width, height);

    // 1. カメラ映像
    if (cameraActive() && videoRef && videoRef.readyState >= 2) {
      drawVideoCover(ctx, videoRef, width, height, facingMode() === 'user');

      ctx.fillStyle = isFever() ? 'rgba(236, 72, 153, 0.15)' : 'rgba(15, 23, 42, 0.2)';
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.fillStyle = isFever() ? '#1a0b1e' : '#08111e';
      ctx.fillRect(0, 0, width, height);
    }

    // 2. モーション検知（手の動きでバブルを割る）
    if (cameraActive() && videoRef && videoRef.readyState >= 2) {
      if (!diffCanvas) {
        diffCanvas = document.createElement('canvas');
        diffCanvas.width = 100;
        diffCanvas.height = 75;
        diffCtx = diffCanvas.getContext('2d', { willReadFrequently: true });
      }

      if (diffCtx) {
        drawVideoCover(diffCtx, videoRef, diffCanvas.width, diffCanvas.height, facingMode() === 'user');

        const curFrame = diffCtx.getImageData(0, 0, diffCanvas.width, diffCanvas.height);
        const data = curFrame.data;

        if (prevFrameData) {
          const scaleX = width / diffCanvas.width;
          const scaleY = height / diffCanvas.height;
          const threshold = 38;

          for (let y = 0; y < diffCanvas.height; y += 4) {
            for (let x = 0; x < diffCanvas.width; x += 4) {
              const i = (y * diffCanvas.width + x) * 4;
              const diff =
                Math.abs(data[i] - prevFrameData[i]) +
                Math.abs(data[i + 1] - prevFrameData[i + 1]) +
                Math.abs(data[i + 2] - prevFrameData[i + 2]);

              if (diff > threshold * 3) {
                const mx = x * scaleX;
                const my = y * scaleY;

                // バブルとの接触判定
                for (const b of bubbles) {
                  if (!b.isPopped) {
                    const dist = Math.hypot(mx - b.x, my - b.y);
                    if (dist < b.radius + 12) {
                      popBubble(b);
                    }
                  }
                }
              }
            }
          }
        }
        prevFrameData = new Uint8ClampedArray(data);
      }
    }

    // 3. バブル生成＆上昇
    if (!isGameOver()) {
      spawnCooldown++;
      const maxCool = isFever() ? 15 : 28;
      if (spawnCooldown > maxCool) {
        spawnBubble(width, height);
        spawnCooldown = 0;
      }
    }

    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      b.y -= b.vy;
      b.wobblePhase += b.wobbleSpeed;
      b.x = b.baseX + Math.sin(b.wobblePhase) * 14;

      if (b.y < -40 || b.popProgress >= 1) {
        bubbles.splice(i, 1);
        continue;
      }

      if (b.isPopped) {
        b.popProgress += 0.1;
      }

      // バブルの描画（美しい虹色・半透明の石鹸膜）
      ctx.save();
      const alpha = b.isPopped ? Math.max(0, 1 - b.popProgress * 2) : 0.85;
      ctx.globalAlpha = alpha;

      // シャボン膜のグラデーション
      const grad = ctx.createRadialGradient(
        b.x - b.radius * 0.35,
        b.y - b.radius * 0.35,
        b.radius * 0.1,
        b.x,
        b.y,
        b.radius
      );
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      grad.addColorStop(0.3, b.color + '44');
      grad.addColorStop(0.8, 'rgba(255, 255, 255, 0.25)');
      grad.addColorStop(1, b.color + 'aa');

      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // 虹色リム発光
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // シャボンのハイライト光彩
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(
        b.x - b.radius * 0.35,
        b.y - b.radius * 0.35,
        b.radius * 0.3,
        b.radius * 0.14,
        -0.4,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // 内包アイテムアイコン
      if (!b.isPopped) {
        ctx.font = '14px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const icon =
          b.type === 'blossom' ? '🌸' : b.type === 'star' ? '⭐' : b.type === 'gold' ? '🪙' : b.type === 'fever' ? '✨' : '';
        if (icon) {
          ctx.fillText(icon, b.x, b.y);
        }
      }
      ctx.restore();
    }

    // 4. 水滴パーティクルの更新＆描画
    for (let i = droplets.length - 1; i >= 0; i--) {
      const d = droplets[i];
      d.x += d.vx;
      d.y += d.vy;
      d.vy += 0.12;
      d.alpha -= 0.035;

      if (d.alpha <= 0) {
        droplets.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = d.alpha;
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    animId = requestAnimationFrame(loop);
  };

  onSettled(() => {
    restart();
    if (canvasRef) {
      const cleanupResize = setupCanvasAutoResize(canvasRef);
      onCleanup(cleanupResize);
    }
    animId = requestAnimationFrame(loop);

    onCleanup(() => {
      if (animId) cancelAnimationFrame(animId);
      if (timerId) clearInterval(timerId);
      if (feverTimeoutId) clearTimeout(feverTimeoutId);
      stopCamera();
    });
  });

  // タップ・マウスクリック割り
  const handlePointerDown = (e: PointerEvent) => {
    if (!canvasRef) return;
    const rect = canvasRef.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * canvasRef.width;
    const py = ((e.clientY - rect.top) / rect.height) * canvasRef.height;

    for (const b of bubbles) {
      if (!b.isPopped) {
        const dist = Math.hypot(px - b.x, py - b.y);
        if (dist < b.radius + 10) {
          popBubble(b);
          break;
        }
      }
    }
  };

  return (
    <GameShell
      id="ar-bubble"
      title="AR Bubble Pop"
      score={score()}
      isGameOver={isGameOver()}
      onRestart={restart}
      instructions={instructions}
      extraControls={
        <div class="flex items-center justify-between gap-3 w-full max-w-4xl px-2 text-xs">
          <div class="flex items-center gap-1.5">
            <button
              onClick={() => {
                sound.playPop(520);
                if (cameraActive()) {
                  stopCamera();
                } else {
                  startCamera();
                }
              }}
              class={`px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1 transition-all active:scale-95 shadow-2xs ${
                cameraActive()
                  ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-600'
                  : 'bg-sky-600 hover:bg-sky-500 text-white border-sky-700'
              }`}
            >
              <span>📷</span>
              <span>{cameraActive() ? '停止' : 'カメラ (AR)'}</span>
            </button>

            <Show when={cameraActive()}>
              <button
                onClick={toggleCameraFacing}
                title="前後カメラ切り替え"
                class="px-2 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700 transition-all"
              >
                🔄 {facingMode() === 'environment' ? 'アウト' : 'イン'}
              </button>
            </Show>
          </div>

          <div class="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 font-mono text-xs">
            <span>割った数: <strong class="text-sky-500 font-bold">{poppedTotal()}</strong>個</span>
            <span>残り: <strong class="text-rose-500 text-sm font-bold">{timeLeft()}</strong>s</span>
          </div>
        </div>
      }
    >
      <div class="w-full max-w-4xl h-full flex flex-col items-center justify-center relative min-h-0 select-none p-1 sm:p-2">
        <video ref={videoRef} playsinline muted class="hidden" />

        <div
          class="w-full h-full max-h-[calc(100dvh-125px)] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border-2 sm:border-4 border-slate-800 relative bg-slate-950 cursor-pointer touch-none"
          onPointerDown={handlePointerDown}
        >
          <canvas
            ref={canvasRef}
            class="w-full h-full block"
          />

          {/* フィーバー中エフェクト */}
          <Show when={isFever()}>
            <div class="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-pink-500 text-white font-black text-xs tracking-wider shadow-xl animate-bounce">
              🔥 FEVER TIME! スコア2倍！
            </div>
          </Show>

          <Show when={!cameraActive()}>
            <div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700 text-center text-xs text-slate-200 shadow-xl flex items-center gap-3">
              <span>手で触れてシャボン玉を割ろう！</span>
              <button
                onClick={startCamera}
                class="px-3 py-1 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition-all active:scale-95"
              >
                カメラを起動
              </button>
            </div>
          </Show>
        </div>
      </div>
    </GameShell>
  );
};
