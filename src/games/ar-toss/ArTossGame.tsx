import { Component, createSignal, onSettled, onCleanup, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import { drawVideoCover, setupCanvasAutoResize } from '../../utils/camera.ts';
import confetti from 'canvas-confetti';

interface TargetCup {
  id: number;
  x: number;
  y: number;
  z: number;
  radius: number;
  color: string;
  points: number;
  name: string;
  isHit: boolean;
  vx: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
}

export const ArTossGame: Component = () => {
  const [score, setScore] = createSignal(0);
  const [ballsLeft, setBallsLeft] = createSignal(15);
  const [streak, setStreak] = createSignal(0);
  const [isGameOver, setIsGameOver] = createSignal(false);
  const [cameraActive, setCameraActive] = createSignal(false);
  const [facingMode, setFacingMode] = createSignal<'environment' | 'user'>('environment');

  let videoRef: HTMLVideoElement | undefined;
  let canvasRef: HTMLCanvasElement | undefined;
  let stream: MediaStream | null = null;
  let animId: number | null = null;

  // ボール物理状態
  let ball = {
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    radius: 22,
    active: false,
    inAir: false,
    color: '#f97316',
  };

  // ドラッグ操作
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartTime = 0;
  let isDragging = false;
  let currentDragX = 0;
  let currentDragY = 0;

  let cups: TargetCup[] = [];
  let particles: Particle[] = [];

  const instructions = [
    '【ARスワイプトス】カメラで部屋の床や机を映し、画面下のボールを上に向かってスワイプして投げましょう！',
    'スワイプの「速さ」と「向き」で、ボールの飛距離と角度が決まります。',
    '奥にあるカップやカゴほど高得点！連続で入れるとコンボボーナスが加算されます。',
    '残りボール（15球）を投げ終えた時点のハイスコアを競います。',
    '【プライバシー保護】カメラ映像は端末内のみで処理され、外部への送信・保存は一切行われません。',
  ];

  const CUP_DEFS = [
    { z: 180, x: -70, radius: 34, points: 100, color: '#f43f5e', name: '赤カップ' },
    { z: 230, x: 0, radius: 30, points: 200, color: '#eab308', name: '金カップ' },
    { z: 180, x: 70, radius: 34, points: 100, color: '#06b6d4', name: '青カップ' },
    { z: 300, x: -50, radius: 26, points: 300, color: '#a855f7', name: '紫ターゲット' },
    { z: 300, x: 50, radius: 26, points: 300, color: '#10b981', name: '緑ターゲット' },
    { z: 380, x: 0, radius: 22, points: 500, color: '#ec4899', name: '特大スターカップ' },
  ];

  const resetCups = () => {
    cups = CUP_DEFS.map((def, idx) => ({
      id: idx + 1,
      x: def.x,
      y: 30, // 机の高さ基準
      z: def.z,
      radius: def.radius,
      color: def.color,
      points: def.points,
      name: def.name,
      isHit: false,
      vx: idx >= 3 ? (Math.random() > 0.5 ? 0.6 : -0.6) : 0,
    }));
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
    setBallsLeft(15);
    setStreak(0);
    setIsGameOver(false);
    particles = [];
    resetCups();
    resetBall();
  };

  const resetBall = () => {
    if (!canvasRef) return;
    ball = {
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      radius: 22,
      active: true,
      inAir: false,
      color: '#f97316',
    };
  };

  const spawnParticles = (x: number, y: number, color: string, count = 20) => {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = Math.random() * 4 + 1.5;
      particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 2,
        color,
        size: Math.random() * 4 + 2,
        alpha: 1,
      });
    }
  };

  const handlePointerDown = (e: PointerEvent) => {
    if (isGameOver() || ball.inAir || ballsLeft() <= 0) return;
    if (!canvasRef) return;
    const rect = canvasRef.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * canvasRef.width;
    const py = ((e.clientY - rect.top) / rect.height) * canvasRef.height;

    const ballScreenX = canvasRef.width / 2;
    const ballScreenY = canvasRef.height - 70;

    if (Math.hypot(px - ballScreenX, py - ballScreenY) < 60) {
      isDragging = true;
      dragStartX = px;
      dragStartY = py;
      dragStartTime = performance.now();
      currentDragX = px;
      currentDragY = py;
    }
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDragging || !canvasRef) return;
    const rect = canvasRef.getBoundingClientRect();
    currentDragX = ((e.clientX - rect.left) / rect.width) * canvasRef.width;
    currentDragY = ((e.clientY - rect.top) / rect.height) * canvasRef.height;
  };

  const handlePointerUp = () => {
    if (!isDragging || !canvasRef) return;
    isDragging = false;
    const dt = Math.max(25, performance.now() - dragStartTime);
    const dx = currentDragX - dragStartX;
    const dy = currentDragY - dragStartY;

    // 上方向へのスワイプのみ投げる
    if (dy < -25) {
      sound.playPop(440);
      const speed = Math.min(24, Math.hypot(dx, dy) / (dt * 0.05));
      const forwardPower = Math.min(18, -dy * 0.075);

      ball.inAir = true;
      ball.vx = dx * 0.035;
      ball.vy = -Math.max(6, Math.min(14, speed * 0.6));
      ball.vz = Math.max(4.5, forwardPower);

      setBallsLeft((b) => b - 1);
    }
  };

  const loop = () => {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;
    const width = canvasRef.width;
    const height = canvasRef.height;
    const cx = width / 2;
    const cy = height * 0.58;
    const focalLength = 320;

    ctx.clearRect(0, 0, width, height);

    // 1. カメラ映像
    if (cameraActive() && videoRef && videoRef.readyState >= 2) {
      drawVideoCover(ctx, videoRef, width, height, facingMode() === 'user');
      ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      // グリッド線（仮想机面）
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.lineWidth = 1.5;
      for (let z = 50; z <= 450; z += 50) {
        const s = focalLength / (focalLength + z);
        const y = cy + 40 * s;
        ctx.beginPath();
        ctx.moveTo(cx - 240 * s, y);
        ctx.lineTo(cx + 240 * s, y);
        ctx.stroke();
      }
    }

    // 2. 移動ターゲット更新
    for (const c of cups) {
      if (c.vx !== 0) {
        c.x += c.vx;
        if (c.x > 110 || c.x < -110) c.vx *= -1;
      }
    }

    // 3. カップの3Dソート＆描画（奥から手前へ）
    const sortedCups = [...cups].sort((a, b) => b.z - a.z);

    for (const c of sortedCups) {
      const scale = focalLength / (focalLength + c.z);
      const sx = cx + c.x * scale;
      const sy = cy + c.y * scale;
      const sRadius = c.radius * scale;

      // 影
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(sx, sy + sRadius * 0.9, sRadius, sRadius * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      // カップ本体（3D台形）
      const grad = ctx.createLinearGradient(sx - sRadius, sy, sx + sRadius, sy);
      grad.addColorStop(0, c.color);
      grad.addColorStop(0.5, '#ffffff');
      grad.addColorStop(1, c.color);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(sx - sRadius, sy);
      ctx.lineTo(sx - sRadius * 0.7, sy + sRadius * 1.4);
      ctx.lineTo(sx + sRadius * 0.7, sy + sRadius * 1.4);
      ctx.lineTo(sx + sRadius, sy);
      ctx.closePath();
      ctx.fill();

      // カップ開口部（楕円）
      ctx.fillStyle = c.isHit ? '#22c55e' : '#1e1b4b';
      ctx.beginPath();
      ctx.ellipse(sx, sy, sRadius, sRadius * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.5, 2.5 * scale);
      ctx.stroke();

      // 点数バッジ
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(9, Math.round(14 * scale))}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(`${c.points}`, sx, sy + sRadius * 0.85);
    }

    // 4. ボールの物理シミュレーション
    if (ball.inAir) {
      ball.x += ball.vx;
      ball.y += ball.vy;
      ball.z += ball.vz;
      ball.vy += 0.42; // 重力

      // カップとの当たり判定
      for (const c of cups) {
        if (!c.isHit && Math.abs(ball.z - c.z) < 18) {
          const dist2D = Math.hypot(ball.x - c.x, ball.y - c.y);
          if (dist2D < c.radius * 0.85) {
            // スコア！
            c.isHit = true;
            sound.playVictory();
            const nextStreak = streak() + 1;
            setStreak(nextStreak);
            const bonus = nextStreak > 1 ? nextStreak * 50 : 0;
            const pts = c.points + bonus;
            setScore((s) => s + pts);

            const scale = focalLength / (focalLength + c.z);
            const sx = cx + c.x * scale;
            const sy = cy + c.y * scale;

            spawnParticles(sx, sy, c.color, 30);
            confetti({
              particleCount: 25,
              spread: 55,
              origin: { x: sx / width, y: sy / height },
            });

            // バウンド減速
            ball.vy = -3;
            ball.vz = 0.5;
            break;
          }
        }
      }

      // 地面バウンドまたは奥へ消失
      if (ball.y > 60) {
        if (ball.z > 60 && Math.abs(ball.vy) > 2) {
          ball.vy *= -0.45;
          ball.vx *= 0.7;
          ball.vz *= 0.7;
          ball.y = 60;
          sound.playPop(280);
        } else {
          // 静止 -> 次のボールへ
          setTimeout(() => {
            if (ballsLeft() <= 0) {
              setIsGameOver(true);
              sound.playGameOver();
            } else {
              resetBall();
            }
          }, 350);
          ball.inAir = false;
        }
      }

      if (ball.z > 450) {
        // 奥へ抜けた
        setTimeout(() => {
          if (ballsLeft() <= 0) {
            setIsGameOver(true);
            sound.playGameOver();
          } else {
            resetBall();
          }
        }, 300);
        ball.inAir = false;
      }
    }

    // 5. ボール描画
    if (ball.active) {
      let bx = cx;
      let by = height - 70;
      let br = ball.radius;

      if (ball.inAir) {
        const scale = focalLength / (focalLength + ball.z);
        bx = cx + ball.x * scale;
        by = cy + ball.y * scale;
        br = ball.radius * scale;
      } else if (isDragging) {
        bx = currentDragX;
        by = currentDragY;

        // ガイド予測線
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.4)';
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(currentDragX, currentDragY);
        ctx.lineTo(
          currentDragX + (dragStartX - currentDragX) * 1.5,
          currentDragY + (dragStartY - currentDragY) * 1.5
        );
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // ボールの影
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(bx, by + br * 0.9, br * 0.9, br * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      // ボール球体
      const bGrad = ctx.createRadialGradient(bx - br * 0.3, by - br * 0.3, br * 0.15, bx, by, br);
      bGrad.addColorStop(0, '#fed7aa');
      bGrad.addColorStop(0.4, '#f97316');
      bGrad.addColorStop(1, '#c2410c');

      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 6. パーティクル
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.025;
      if (p.alpha <= 0) {
        particles.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
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
      stopCamera();
    });
  });

  return (
    <GameShell
      id="ar-toss"
      title="AR Ball Toss"
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
              class={`px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs ${
                cameraActive()
                  ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-600'
                  : 'bg-orange-600 hover:bg-orange-500 text-white border-orange-700'
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
            <span>残球: <strong class="text-orange-500 text-sm font-bold">{ballsLeft()}</strong>球</span>
            <Show when={streak() > 1}>
              <span class="text-amber-500 font-bold animate-bounce">🔥 {streak()} 連続!</span>
            </Show>
          </div>
        </div>
      }
    >
      <div class="w-full max-w-4xl h-full flex flex-col items-center justify-center relative min-h-0 select-none p-1 sm:p-2">
        <video ref={videoRef} playsinline muted class="hidden" />

        <div
          class="w-full h-full max-h-[calc(100dvh-125px)] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border-2 sm:border-4 border-slate-800 relative bg-slate-950 cursor-grab active:cursor-grabbing touch-none flex items-center justify-center"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <canvas ref={canvasRef} class="w-full h-full block" />

          <Show when={!ball.inAir && !isGameOver() && ballsLeft() > 0}>
            <div class="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700 text-white text-[11px] font-bold pointer-events-none shadow-lg animate-pulse">
              ↑ ボールを上にスワイプしてトス！
            </div>
          </Show>
        </div>
      </div>
    </GameShell>
  );
};
