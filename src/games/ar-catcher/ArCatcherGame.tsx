import { Component, createSignal, onSettled, onCleanup, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import { drawVideoCover } from '../../utils/camera.ts';
import confetti from 'canvas-confetti';

interface FallingItem {
  id: number;
  x: number;
  y: number;
  vy: number;
  radius: number;
  type: 'candy' | 'cake' | 'donut' | 'star' | 'poison';
  name: string;
  points: number;
  color: string;
}

export const ArCatcherGame: Component = () => {
  const [score, setScore] = createSignal(0);
  const [timeLeft, setTimeLeft] = createSignal(60);
  const [isGameOver, setIsGameOver] = createSignal(false);
  const [cameraActive, setCameraActive] = createSignal(false);
  const [comboCount, setComboCount] = createSignal(0);
  const [facingMode, setFacingMode] = createSignal<'environment' | 'user'>('environment');

  let videoRef: HTMLVideoElement | undefined;
  let canvasRef: HTMLCanvasElement | undefined;
  let diffCanvas: HTMLCanvasElement | undefined;
  let diffCtx: CanvasRenderingContext2D | null = null;
  let animId: number | null = null;
  let timerId: number | null = null;
  let stream: MediaStream | null = null;

  let currentBasketX = 320;
  let targetBasketX = 320;
  const basketWidth = 90;
  const basketHeight = 28;

  let items: FallingItem[] = [];
  let nextItemId = 1;
  let spawnCooldown = 0;

  const instructions = [
    '【顔の動きで遊ぶ】インカメラに顔を映し、頭や体を左右に傾けると、カゴが滑らかに追従して移動します！',
    '【タッチ操作でも遊ぶ】画面を左右にスワイプ・ドラッグすることでもカゴを自在に動かせます。',
    '上から降ってくるスイーツやお星様をキャッチしてスコア獲得！',
    'ドクロマークの付いた「毒キノコ・泥玉」に触れると減点＆コンボリセットになるので避けましょう。',
    '【プライバシー保護】カメラ映像は端末内のみで処理され、外部への送信・保存は一切行われません。',
  ];

  const ITEM_TYPES = [
    { type: 'candy' as const, name: 'キャンディ', points: 100, color: '#f472b6', radius: 16 },
    { type: 'cake' as const, name: 'ケーキ', points: 150, color: '#fbbf24', radius: 18 },
    { type: 'donut' as const, name: 'ドーナツ', points: 200, color: '#fb923c', radius: 20 },
    { type: 'star' as const, name: 'スター', points: 300, color: '#38bdf8', radius: 22 },
    { type: 'poison' as const, name: '毒キノコ', points: -200, color: '#475569', radius: 20 },
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
    items = [];
    currentBasketX = 320;
    targetBasketX = 320;
    setScore(0);
    setTimeLeft(60);
    setComboCount(0);
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

  const spawnItem = (width: number) => {
    const isPoison = Math.random() < 0.22;
    const def = isPoison
      ? ITEM_TYPES[ITEM_TYPES.length - 1]
      : ITEM_TYPES[Math.floor(Math.random() * (ITEM_TYPES.length - 1))];

    items.push({
      id: nextItemId++,
      x: Math.random() * (width - 60) + 30,
      y: -25,
      vy: Math.random() * 2.5 + 3.2,
      radius: def.radius,
      type: def.type,
      name: def.name,
      points: def.points,
      color: def.color,
    });
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
      ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      // 背景の星
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for (let i = 0; i < 20; i++) {
        ctx.fillRect((i * 47) % width, (i * 31) % height, 2, 2);
      }
    }

    // 2. カメラ顔・頭部追従アルゴリズム (重心トラッキング)
    if (cameraActive() && videoRef && videoRef.readyState >= 2) {
      if (!diffCanvas) {
        diffCanvas = document.createElement('canvas');
        diffCanvas.width = 80;
        diffCanvas.height = 60;
        diffCtx = diffCanvas.getContext('2d', { willReadFrequently: true });
      }

      if (diffCtx) {
        drawVideoCover(diffCtx, videoRef, diffCanvas.width, diffCanvas.height, facingMode() === 'user');

        const curFrame = diffCtx.getImageData(0, 0, diffCanvas.width, diffCanvas.height);
        const data = curFrame.data;

        // 画面上半分の肌色・輝度重心を計算
        let totalX = 0;
        let count = 0;

        for (let y = 5; y < diffCanvas.height * 0.7; y += 2) {
          for (let x = 0; x < diffCanvas.width; x += 2) {
            const i = (y * diffCanvas.width + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // 簡易スキントーン / 頭部検出
            if (r > 60 && g > 40 && b > 20 && r > b) {
              totalX += x;
              count++;
            }
          }
        }

        if (count > 50) {
          const avgX = totalX / count;
          // カゴの目標座標にスムージング適用
          targetBasketX = (avgX / diffCanvas.width) * width;
        }
      }
    }

    // カゴ位置の補間（ラープによるなめらかな移動）
    currentBasketX += (targetBasketX - currentBasketX) * 0.22;
    currentBasketX = Math.max(basketWidth / 2, Math.min(width - basketWidth / 2, currentBasketX));

    // 3. アイテムの生成＆落下
    if (!isGameOver()) {
      spawnCooldown++;
      if (spawnCooldown > 35) {
        spawnItem(width);
        spawnCooldown = 0;
      }
    }

    const basketY = height - 45;

    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.y += it.vy;

      // カゴとの当たり判定
      if (
        it.y + it.radius >= basketY &&
        it.y - it.radius <= basketY + basketHeight &&
        Math.abs(it.x - currentBasketX) <= basketWidth / 2 + it.radius * 0.5
      ) {
        // キャッチ成功！
        if (it.type === 'poison') {
          sound.playGameOver();
          setScore((s) => Math.max(0, s + it.points));
          setComboCount(0);
        } else {
          sound.playPop(520);
          const nextCombo = comboCount() + 1;
          setComboCount(nextCombo);
          const bonus = nextCombo >= 3 ? nextCombo * 30 : 0;
          setScore((s) => s + it.points + bonus);

          if (nextCombo >= 5) {
            sound.playMatch(Math.min(nextCombo, 8));
            confetti({
              particleCount: 20,
              spread: 50,
              origin: { x: currentBasketX / width, y: basketY / height },
            });
          }
        }
        items.splice(i, 1);
        continue;
      }

      // 画面外へ落下
      if (it.y > height + 30) {
        items.splice(i, 1);
        continue;
      }

      // アイテム描画
      ctx.save();
      ctx.shadowColor = it.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = it.color;
      ctx.beginPath();
      ctx.arc(it.x, it.y, it.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const icon = it.type === 'candy' ? '🍬' : it.type === 'cake' ? '🍰' : it.type === 'donut' ? '🍩' : it.type === 'star' ? '⭐' : '☠️';
      ctx.fillText(icon, it.x, it.y);
      ctx.restore();
    }

    // 4. カゴ（バスケット）の描画
    ctx.save();
    const bx = currentBasketX - basketWidth / 2;
    const by = basketY;

    // バスケット発光シャドウ
    ctx.shadowColor = '#f43f5e';
    ctx.shadowBlur = 14;

    // ボウル本体グラデーション
    const bGrad = ctx.createLinearGradient(bx, by, bx, by + basketHeight);
    bGrad.addColorStop(0, '#fb7185');
    bGrad.addColorStop(1, '#e11d48');
    ctx.fillStyle = bGrad;

    ctx.beginPath();
    ctx.roundRect(bx, by, basketWidth, basketHeight, [6, 6, 16, 16]);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // カゴのフリル模様
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    for (let x = bx + 8; x <= bx + basketWidth - 8; x += 12) {
      ctx.arc(x, by + 4, 3, 0, Math.PI * 2);
    }
    ctx.fill();

    ctx.restore();

    animId = requestAnimationFrame(loop);
  };

  onSettled(() => {
    restart();
    animId = requestAnimationFrame(loop);

    onCleanup(() => {
      if (animId) cancelAnimationFrame(animId);
      if (timerId) clearInterval(timerId);
      stopCamera();
    });
  });

  // タッチ/マウス操作（画面ドラッグでカゴ移動）
  const handlePointerMove = (e: PointerEvent) => {
    if (!canvasRef) return;
    const rect = canvasRef.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvasRef.width;
    targetBasketX = x;
  };

  return (
    <GameShell
      id="ar-catcher"
      title="AR Face Catcher"
      score={score()}
      isGameOver={isGameOver()}
      onRestart={restart}
      instructions={instructions}
      extraControls={
        <div class="flex items-center justify-between gap-3 w-full max-w-sm px-2 text-xs">
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
              class={`px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs ${
                cameraActive()
                  ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-600'
                  : 'bg-pink-600 hover:bg-pink-500 text-white border-pink-700'
              }`}
            >
              <span>📷</span>
              <span>{cameraActive() ? '停止' : 'カメラ開始 (AR)'}</span>
            </button>

            <Show when={cameraActive()}>
              <button
                onClick={toggleCameraFacing}
                title="イン・アウトカメラ切り替え"
                class="px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700 transition-all flex items-center gap-1 shadow-2xs"
              >
                <span>🔄</span>
                <span>{facingMode() === 'environment' ? 'アウト' : 'イン'}</span>
              </button>
            </Show>
          </div>

          <div class="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 font-mono text-xs">
            <span>残り: <strong class="text-rose-500 text-sm font-bold">{timeLeft()}</strong>s</span>
            <Show when={comboCount() > 1}>
              <span class="text-amber-500 font-bold">✨ {comboCount()} COMBO</span>
            </Show>
          </div>
        </div>
      }
    >
      <div class="w-full max-w-xl h-full flex flex-col items-center justify-center relative min-h-0 select-none">
        <video ref={videoRef} playsinline muted class="hidden" />

        <div
          class="w-full aspect-[4/3] max-h-[calc(100dvh-130px)] rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800 relative bg-slate-950 cursor-pointer touch-none"
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerMove}
        >
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            class="w-full h-full block"
          />

          <Show when={!cameraActive()}>
            <div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700 text-center text-xs text-slate-200 shadow-xl flex items-center gap-3">
              <span>カメラで顔の傾きを検知！</span>
              <button
                onClick={startCamera}
                class="px-3 py-1 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold transition-all active:scale-95"
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
