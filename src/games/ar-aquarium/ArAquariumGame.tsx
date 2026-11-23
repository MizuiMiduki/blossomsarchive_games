import { Component, createSignal, onSettled, onCleanup, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import { drawVideoCover, setupCanvasAutoResize } from '../../utils/camera.ts';
import confetti from 'canvas-confetti';

interface KoiFish {
  id: number;
  x: number;
  y: number;
  angle: number;
  speed: number;
  targetSpeed: number;
  turnSpeed: number;
  length: number;
  bodyColor: string;
  patternColor: string;
  name: string;
  finPhase: number;
  fedCount: number;
}

interface FoodPellet {
  id: number;
  x: number;
  y: number;
  radius: number;
  eaten: boolean;
}

interface WaterRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

export const ArAquariumGame: Component = () => {
  const [score, setScore] = createSignal(0);
  const [harmonyLevel, setHarmonyLevel] = createSignal(1);
  const [fedTotal, setFedTotal] = createSignal(0);
  const [cameraActive, setCameraActive] = createSignal(false);
  const [facingMode, setFacingMode] = createSignal<'environment' | 'user'>('environment');

  let videoRef: HTMLVideoElement | undefined;
  let canvasRef: HTMLCanvasElement | undefined;
  let stream: MediaStream | null = null;
  let animId: number | null = null;

  let fishList: KoiFish[] = [];
  let foods: FoodPellet[] = [];
  let ripples: WaterRipple[] = [];
  let nextFoodId = 1;

  const instructions = [
    '【AR机上アクアリウム】カメラで机の上や部屋の床を映すと、美しい錦鯉や桜の花びらが優雅に泳ぎ回ります。',
    '画面をタップすると、波紋とともにエサ（ペレット）を撒くことができます。',
    '鯉たちがエサを見つけて集まり、食べると成長ポイントを獲得！',
    'すべての鯉にまんべんなくエサを届けて「調和レベル（Harmony）」を高めましょう。',
    '【プライバシー保護】カメラ映像は端末内のみで描画処理され、外部への送信・保存は一切行われません。',
  ];

  const KOI_TYPES = [
    { name: '紅白錦鯉', bodyColor: '#ffffff', patternColor: '#ef4444' },
    { name: '黄金錦鯉', bodyColor: '#fef08a', patternColor: '#eab308' },
    { name: '浅黄錦鯉', bodyColor: '#bae6fd', patternColor: '#0284c7' },
    { name: '桜錦鯉', bodyColor: '#ffe4e6', patternColor: '#f43f5e' },
    { name: '昭和三色', bodyColor: '#1e293b', patternColor: '#f97316' },
  ];

  const initFish = (width: number, height: number) => {
    fishList = [];
    const count = 5;
    for (let i = 0; i < count; i++) {
      const type = KOI_TYPES[i % KOI_TYPES.length];
      fishList.push({
        id: i + 1,
        x: Math.random() * (width - 120) + 60,
        y: Math.random() * (height - 120) + 60,
        angle: Math.random() * Math.PI * 2,
        speed: 1.2,
        targetSpeed: 1.2,
        turnSpeed: 0.04,
        length: Math.random() * 12 + 42,
        bodyColor: type.bodyColor,
        patternColor: type.patternColor,
        name: type.name,
        finPhase: Math.random() * Math.PI * 2,
        fedCount: 0,
      });
    }
  };

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
    setScore(0);
    setHarmonyLevel(1);
    setFedTotal(0);
    foods = [];
    ripples = [];
    if (canvasRef) {
      initFish(canvasRef.width, canvasRef.height);
    }
  };

  const dropFood = (x: number, y: number) => {
    sound.playPop(580);
    foods.push({
      id: nextFoodId++,
      x,
      y,
      radius: 4,
      eaten: false,
    });

    ripples.push({
      x,
      y,
      radius: 4,
      maxRadius: 40,
      alpha: 0.8,
    });
  };

  const handlePointerDown = (e: PointerEvent) => {
    if (!canvasRef) return;
    const rect = canvasRef.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvasRef.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvasRef.height;
    dropFood(x, y);
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
      // 水面エフェクト・淡い青緑のフィルター
      ctx.fillStyle = 'rgba(12, 74, 96, 0.22)';
      ctx.fillRect(0, 0, width, height);
    } else {
      // 仮想和風池背景
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#0c4a6e');
      grad.addColorStop(1, '#082f49');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    // 2. 波紋エフェクト更新＆描画
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.radius += 0.8;
      r.alpha -= 0.015;
      if (r.alpha <= 0) {
        ripples.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.strokeStyle = `rgba(255, 255, 255, ${r.alpha * 0.7})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 3. エサ描画＆管理
    for (const f of foods) {
      if (f.eaten) continue;
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fef3c7';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 4. 錦鯉の遊泳AI & 描画
    const now = performance.now();

    for (const fish of fishList) {
      fish.finPhase += 0.08;

      // エサ探索
      let nearestFood: FoodPellet | null = null;
      let minDist = 220;

      for (const f of foods) {
        if (f.eaten) continue;
        const d = Math.hypot(f.x - fish.x, f.y - fish.y);
        if (d < minDist) {
          minDist = d;
          nearestFood = f;
        }
      }

      if (nearestFood) {
        // エサに向かって泳ぐ
        const targetAng = Math.atan2(nearestFood.y - fish.y, nearestFood.x - fish.x);
        let diff = targetAng - fish.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        fish.angle += diff * 0.06;
        fish.targetSpeed = 2.4;

        // エサ捕食判定
        if (minDist < fish.length * 0.35) {
          nearestFood.eaten = true;
          sound.playPop(720);
          fish.fedCount++;
          setFedTotal((t) => t + 1);
          setScore((s) => s + 50);

          if (fish.fedCount % 3 === 0) {
            setHarmonyLevel((h) => h + 1);
            sound.playMatch(Math.min(harmonyLevel(), 8));
            confetti({
              particleCount: 15,
              spread: 45,
              origin: { x: fish.x / width, y: fish.y / height },
            });
          }

          ripples.push({
            x: fish.x,
            y: fish.y,
            radius: 8,
            maxRadius: 35,
            alpha: 0.9,
          });
        }
      } else {
        // 自由遊泳（ゆったり旋回）
        fish.targetSpeed = 1.1;
        fish.angle += (Math.sin(now * 0.001 + fish.id) * 0.02);

        // 壁際回避
        const margin = 50;
        if (fish.x < margin) fish.angle += 0.04;
        if (fish.x > width - margin) fish.angle += 0.04;
        if (fish.y < margin) fish.angle += 0.04;
        if (fish.y > height - margin) fish.angle += 0.04;
      }

      fish.speed += (fish.targetSpeed - fish.speed) * 0.05;
      fish.x += Math.cos(fish.angle) * fish.speed;
      fish.y += Math.sin(fish.angle) * fish.speed;

      // 鯉の描画（滑らかな関節・波打つ尾びれ）
      ctx.save();
      ctx.translate(fish.x, fish.y);
      ctx.rotate(fish.angle);

      const len = fish.length;
      const w = len * 0.32;
      const tailWiggle = Math.sin(fish.finPhase) * 6;

      // 影
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.beginPath();
      ctx.ellipse(8, 12, len * 0.45, w * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();

      // 胸びれ（左右）
      const finAngle = Math.sin(fish.finPhase * 0.7) * 0.3;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      // 左ひれ
      ctx.beginPath();
      ctx.ellipse(len * 0.1, -w * 0.9, len * 0.22, w * 0.35, -0.6 + finAngle, 0, Math.PI * 2);
      ctx.fill();
      // 右ひれ
      ctx.beginPath();
      ctx.ellipse(len * 0.1, w * 0.9, len * 0.22, w * 0.35, 0.6 - finAngle, 0, Math.PI * 2);
      ctx.fill();

      // 胴体ベース
      ctx.fillStyle = fish.bodyColor;
      ctx.beginPath();
      ctx.moveTo(len * 0.45, 0); // 口
      ctx.quadraticCurveTo(len * 0.15, -w, -len * 0.2, -w * 0.65);
      ctx.quadraticCurveTo(-len * 0.45, tailWiggle * 0.5, -len * 0.5, tailWiggle);
      ctx.quadraticCurveTo(-len * 0.45, tailWiggle * 0.5, -len * 0.2, w * 0.65);
      ctx.quadraticCurveTo(len * 0.15, w, len * 0.45, 0);
      ctx.closePath();
      ctx.fill();

      // 錦鯉の模様（紅・金・墨）
      ctx.fillStyle = fish.patternColor;
      ctx.beginPath();
      ctx.ellipse(len * 0.1, -w * 0.1, len * 0.18, w * 0.55, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-len * 0.18, w * 0.05, len * 0.14, w * 0.45, -0.3, 0, Math.PI * 2);
      ctx.fill();

      // 尾びれ
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.moveTo(-len * 0.48, tailWiggle);
      ctx.quadraticCurveTo(-len * 0.7, tailWiggle - 10, -len * 0.8, tailWiggle - 14);
      ctx.quadraticCurveTo(-len * 0.65, tailWiggle, -len * 0.8, tailWiggle + 14);
      ctx.quadraticCurveTo(-len * 0.7, tailWiggle + 10, -len * 0.48, tailWiggle);
      ctx.closePath();
      ctx.fill();

      // 目
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(len * 0.32, -w * 0.4, 1.8, 0, Math.PI * 2);
      ctx.arc(len * 0.32, w * 0.4, 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // 食べたエサのクリーンアップ
    foods = foods.filter((f) => !f.eaten);

    animId = requestAnimationFrame(loop);
  };

  onSettled(() => {
    restart();
    if (canvasRef) {
      const cleanupResize = setupCanvasAutoResize(canvasRef, (w, h) => {
        if (fishList.length === 0) initFish(w, h);
      });
      onCleanup(cleanupResize);
    }
    animId = requestAnimationFrame(loop);

    onCleanup(() => {
      if (animId) cancelAnimationFrame(animId);
      stopCamera();
    });
  });

  return (
    <GameShell
      id="ar-aquarium"
      title="AR Desktop Aquarium"
      score={score()}
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
              class={`px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs ${
                cameraActive()
                  ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-600'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-700'
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

          <div class="flex items-center gap-3 text-slate-600 dark:text-slate-300 font-mono text-xs">
            <span>エサやり: <strong class="text-cyan-500 font-bold">{fedTotal()}</strong>回</span>
            <span class="text-amber-500 font-bold">✨ 調和Lv.{harmonyLevel()}</span>
          </div>
        </div>
      }
    >
      <div class="w-full max-w-4xl h-full flex flex-col items-center justify-center relative min-h-0 select-none p-1 sm:p-2">
        <video ref={videoRef} playsinline muted class="hidden" />

        <div
          class="w-full h-full max-h-[calc(100dvh-125px)] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border-2 sm:border-4 border-slate-800 relative bg-slate-950 cursor-pointer touch-none flex items-center justify-center"
          onPointerDown={handlePointerDown}
        >
          <canvas ref={canvasRef} class="w-full h-full block" />

          <div class="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700 text-white text-[11px] font-bold pointer-events-none shadow-lg">
            💧 画面をタップしてエサをあげよう
          </div>
        </div>
      </div>
    </GameShell>
  );
};
