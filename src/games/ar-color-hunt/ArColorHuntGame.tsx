import { Component, createSignal, onSettled, onCleanup, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import { drawVideoCover, setupCanvasAutoResize } from '../../utils/camera.ts';
import confetti from 'canvas-confetti';

interface ColorMission {
  name: string;
  jpName: string;
  emoji: string;
  targetHue: number; // 0 ~ 360
  minSat: number;    // 0 ~ 1
  minLight?: number; // 0 ~ 1
  maxLight?: number; // 0 ~ 1
  isSpecial?: 'white' | 'black';
  badgeColor: string;
}

const MISSIONS: ColorMission[] = [
  { name: 'Red', jpName: '鮮やかな赤色', emoji: '🔴', targetHue: 0, minSat: 0.45, maxLight: 0.85, badgeColor: 'bg-rose-500' },
  { name: 'Green', jpName: 'みずみずしい緑色', emoji: '🟢', targetHue: 120, minSat: 0.4, maxLight: 0.85, badgeColor: 'bg-emerald-500' },
  { name: 'Blue', jpName: '澄んだ青色', emoji: '🔵', targetHue: 215, minSat: 0.4, maxLight: 0.85, badgeColor: 'bg-sky-500' },
  { name: 'Yellow', jpName: '明るい黄色', emoji: '🟡', targetHue: 55, minSat: 0.5, minLight: 0.35, maxLight: 0.9, badgeColor: 'bg-amber-400 text-slate-900' },
  { name: 'Orange', jpName: '温かいオレンジ色', emoji: '🟠', targetHue: 28, minSat: 0.55, maxLight: 0.85, badgeColor: 'bg-orange-500' },
  { name: 'Purple', jpName: '妖艶な紫色', emoji: '🟣', targetHue: 280, minSat: 0.35, maxLight: 0.85, badgeColor: 'bg-purple-500' },
  { name: 'Black', jpName: '暗闇・黒色', emoji: '⬛', targetHue: 0, minSat: 0, maxLight: 0.18, isSpecial: 'black', badgeColor: 'bg-slate-800' },
  { name: 'White', jpName: '明るい白色', emoji: '⚪', targetHue: 0, minSat: 0, minLight: 0.82, isSpecial: 'white', badgeColor: 'bg-slate-200 text-slate-900' },
];

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        h = ((b - r) / d + 2) * 60;
        break;
      case b:
        h = ((r - g) / d + 4) * 60;
        break;
    }
  }
  return [h, s, l];
}

export const ArColorHuntGame: Component = () => {
  const [score, setScore] = createSignal(0);
  const [timeLeft, setTimeLeft] = createSignal(60);
  const [streak, setStreak] = createSignal(0);
  const [isTimeUp, setIsTimeUp] = createSignal(false);
  const [isVictory, setIsVictory] = createSignal(false);
  const [cameraActive, setCameraActive] = createSignal(false);
  const [facingMode, setFacingMode] = createSignal<'environment' | 'user'>('environment');

  const [currentMission, setCurrentMission] = createSignal<ColorMission>(MISSIONS[0]);
  const [lockProgress, setLockProgress] = createSignal(0);
  const [currentColorSample, setCurrentColorSample] = createSignal('rgba(128,128,128,0.5)');

  let videoRef: HTMLVideoElement | undefined;
  let canvasRef: HTMLCanvasElement | undefined;
  let sampleCanvas: HTMLCanvasElement | undefined;
  let sampleCtx: CanvasRenderingContext2D | null = null;
  let stream: MediaStream | null = null;
  let animId: number | null = null;
  let timerId: number | null = null;

  let missionIdx = 0;
  let currentLock = 0;

  const instructions = [
    '【部屋の中のお宝カラーを探せ！】画面上部に表示される「指定の色」をカメラで探しましょう！',
    '画面中央の「スキャナ照準」を現実の物体（本・服・ペン・壁など）に合わせます。',
    '色が一致すると照準がチャージ開始！100%になるとロックオン成功＆スコア獲得！',
    '制限時間60秒間に部屋中を探検して、いくつの色を発見できるかチャレンジしましょう。',
    '【プライバシー保護】カメラ映像は端末内のみで解析され、外部への送信・保存は一切行われません。',
  ];

  const pickNextMission = () => {
    let next: number;
    do {
      next = Math.floor(Math.random() * MISSIONS.length);
    } while (next === missionIdx && MISSIONS.length > 1);
    missionIdx = next;
    setCurrentMission(MISSIONS[next]);
    currentLock = 0;
    setLockProgress(0);
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
    setTimeLeft(60);
    setStreak(0);
    setIsTimeUp(false);
    setIsVictory(false);
    currentLock = 0;
    setLockProgress(0);
    pickNextMission();

    if (timerId) clearInterval(timerId);
    timerId = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerId!);
          stopCamera();
          if (score() > 0) {
            setIsVictory(true);
            sound.playVictory();
            confetti({ particleCount: 70, spread: 80 });
          } else {
            setIsTimeUp(true);
            sound.playGameOver();
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const loop = () => {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;
    const width = canvasRef.width;
    const height = canvasRef.height;
    const cx = width / 2;
    const cy = height / 2;
    const scanRadius = Math.min(width, height) * 0.18;

    ctx.clearRect(0, 0, width, height);

    // 1. カメラ映像
    if (cameraActive() && videoRef && videoRef.readyState >= 2) {
      drawVideoCover(ctx, videoRef, width, height, facingMode() === 'user');
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('カメラを起動して現実世界の色を探そう！', cx, cy - 40);
    }

    // 2. ピクセル色解析
    if (cameraActive() && videoRef && videoRef.readyState >= 2 && !isTimeUp() && !isVictory()) {
      if (!sampleCanvas) {
        sampleCanvas = document.createElement('canvas');
        sampleCanvas.width = 30;
        sampleCanvas.height = 30;
        sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
      }

      if (sampleCtx) {
        // 画面中央の領域をサンプリング
        const sampleSize = Math.round(scanRadius * 1.2);
        sampleCtx.drawImage(
          canvasRef,
          Math.max(0, cx - sampleSize / 2),
          Math.max(0, cy - sampleSize / 2),
          sampleSize,
          sampleSize,
          0,
          0,
          sampleCanvas.width,
          sampleCanvas.height
        );

        const imgData = sampleCtx.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height);
        const data = imgData.data;
        const totalPixels = sampleCanvas.width * sampleCanvas.height;
        let matchCount = 0;
        let avgR = 0, avgG = 0, avgB = 0;

        const m = currentMission();

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          avgR += r;
          avgG += g;
          avgB += b;

          const [h, s, l] = rgbToHsl(r, g, b);

          let isMatch = false;
          if (m.isSpecial === 'black') {
            isMatch = l <= (m.maxLight ?? 0.2);
          } else if (m.isSpecial === 'white') {
            isMatch = l >= (m.minLight ?? 0.8) && s < 0.25;
          } else {
            let hueDiff = Math.abs(h - m.targetHue);
            if (hueDiff > 180) hueDiff = 360 - hueDiff;
            const hueTolerance = m.name === 'Red' ? 24 : 32;
            const satOk = s >= m.minSat;
            const lightOk = (!m.minLight || l >= m.minLight) && (!m.maxLight || l <= m.maxLight);
            isMatch = hueDiff < hueTolerance && satOk && lightOk;
          }

          if (isMatch) matchCount++;
        }

        avgR = Math.round(avgR / totalPixels);
        avgG = Math.round(avgG / totalPixels);
        avgB = Math.round(avgB / totalPixels);
        setCurrentColorSample(`rgb(${avgR}, ${avgG}, ${avgB})`);

        const matchRatio = matchCount / totalPixels;

        if (matchRatio >= 0.35) {
          // ロックオン蓄積
          currentLock = Math.min(1, currentLock + 0.038);
          setLockProgress(currentLock);

          if (currentLock >= 1) {
            // ミッション完了！
            sound.playVictory();
            const nextStreak = streak() + 1;
            setStreak(nextStreak);
            const bonus = nextStreak > 1 ? nextStreak * 100 : 0;
            setScore((s) => s + 300 + bonus);

            confetti({
              particleCount: 30,
              spread: 60,
              origin: { x: cx / width, y: cy / height },
            });

            pickNextMission();
          }
        } else {
          // ロック減衰
          currentLock = Math.max(0, currentLock - 0.02);
          setLockProgress(currentLock);
        }
      }
    }

    // 3. AR照準スキャナUI描画
    ctx.save();
    // 照準外周円
    ctx.strokeStyle = currentLock > 0 ? '#22c55e' : 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, scanRadius, 0, Math.PI * 2);
    ctx.stroke();

    // チャージ円弧
    if (currentLock > 0) {
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, scanRadius + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * currentLock);
      ctx.stroke();
    }

    // 十字レティクル
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - scanRadius - 12, cy);
    ctx.lineTo(cx - scanRadius + 8, cy);
    ctx.moveTo(cx + scanRadius - 8, cy);
    ctx.lineTo(cx + scanRadius + 12, cy);
    ctx.moveTo(cx, cy - scanRadius - 12);
    ctx.lineTo(cx, cy - scanRadius + 8);
    ctx.moveTo(cx, cy + scanRadius - 8);
    ctx.lineTo(cx, cy + scanRadius + 12);
    ctx.stroke();

    // 中央ターゲットサンプリング点
    ctx.fillStyle = currentColorSample();
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();

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
      stopCamera();
    });
  });

  return (
    <GameShell
      id="ar-color-hunt"
      title="AR Color Hunter"
      score={score()}
      isGameOver={isTimeUp()}
      isVictory={isVictory()}
      gameOverTitle="タイムアップ！探索終了"
      gameOverMessage="60秒が経過しました！次回はもっとたくさんのお宝カラーを探してみましょう！"
      victoryTitle="タイムアップ！探索完了"
      victoryMessage={`60秒間お疲れ様でした！見事 ${Math.floor(score() / 100)} 個のお宝カラーを発見しました！`}
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
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-700'
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
            <span>残り: <strong class="text-rose-500 text-sm font-bold">{timeLeft()}</strong>s</span>
            <Show when={streak() > 1}>
              <span class="text-amber-500 font-bold animate-bounce">🔥 {streak()} 連続!</span>
            </Show>
          </div>
        </div>
      }
    >
      <div class="w-full max-w-4xl h-full flex flex-col items-center justify-center relative min-h-0 select-none p-1 sm:p-2">
        <video ref={videoRef} playsinline muted class="hidden" />

        <div class="w-full h-full max-h-[calc(100dvh-125px)] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border-2 sm:border-4 border-slate-800 relative bg-slate-950 flex items-center justify-center">
          <canvas ref={canvasRef} class="w-full h-full block" />

          {/* 現在の探す色ミッションバナー */}
          <div class="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-700 shadow-2xl">
            <span class="text-base">{currentMission().emoji}</span>
            <div class="flex flex-col">
              <span class="text-[10px] text-slate-400 font-bold">探すお宝カラー</span>
              <span class="text-xs font-black text-white">{currentMission().jpName}</span>
            </div>
            <div
              class="w-5 h-5 rounded-full border border-white/50 shadow-inner"
              style={{ 'background-color': currentColorSample() }}
              title="現在認識中の色"
            />
          </div>

          {/* ロックオン進捗バー */}
          <Show when={lockProgress() > 0}>
            <div class="absolute bottom-6 left-1/2 -translate-x-1/2 w-48 bg-slate-900/90 backdrop-blur-md border border-slate-700 px-3 py-2 rounded-2xl flex flex-col gap-1 items-center shadow-xl">
              <div class="flex items-center justify-between w-full text-[10px] font-bold text-emerald-400">
                <span>🎯 LOCKING ON...</span>
                <span>{Math.round(lockProgress() * 100)}%</span>
              </div>
              <div class="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  class="h-full bg-emerald-500 rounded-full transition-all duration-75"
                  style={{ width: `${lockProgress() * 100}%` }}
                />
              </div>
            </div>
          </Show>
        </div>
      </div>
    </GameShell>
  );
};
