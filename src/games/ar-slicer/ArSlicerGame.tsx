import { Component, createSignal, onSettled, onCleanup, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import { drawVideoCover } from '../../utils/camera.ts';
import confetti from 'canvas-confetti';

interface TargetItem {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  type: 'blossom' | 'fruit' | 'crystal' | 'star' | 'bomb';
  color: string;
  name: string;
  score: number;
  isSliced: boolean;
  sliceProgress: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
}

export const ArSlicerGame: Component = () => {
  const [score, setScore] = createSignal(0);
  const [timeLeft, setTimeLeft] = createSignal(60);
  const [isGameOver, setIsGameOver] = createSignal(false);
  const [cameraActive, setCameraActive] = createSignal(false);
  const [cameraDenied, setCameraDenied] = createSignal(false);
  const [facingMode, setFacingMode] = createSignal<'environment' | 'user'>('environment');
  const [comboCount, setComboCount] = createSignal(0);
  const [comboMessage, setComboMessage] = createSignal<string | null>(null);

  let videoRef: HTMLVideoElement | undefined;
  let canvasRef: HTMLCanvasElement | undefined;
  let diffCanvas: HTMLCanvasElement | undefined;
  let diffCtx: CanvasRenderingContext2D | null = null;
  let prevFrameData: Uint8ClampedArray | null = null;
  let animId: number | null = null;
  let timerId: number | null = null;
  let stream: MediaStream | null = null;

  let targets: TargetItem[] = [];
  let particles: Particle[] = [];
  let nextTargetId = 1;
  let spawnCooldown = 0;
  let lastSliceTime = 0;

  // タッチ/マウススライス用
  let isPointerDown = false;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let pointerTrail: { x: number; y: number; age: number }[] = [];

  const instructions = [
    '【カメラで遊ぶ】画面の前で実際に手や腕を振ると、動きを検知して空間内の的を真っ二つに両断（スラッシュ）します！',
    '【マウス・タッチで遊ぶ】カメラなしでも、画面上を素早くスワイプ・ドラッグすることで刀のように斬撃を放てます。',
    '花・宝石・スターを斬るとスコア獲得！連続で複数切るとコンボボーナスが発生します。',
    '【注意】ドクロの付いた黒い「爆弾」を斬ると大爆発＆スコア減点！見極めて回避しましょう。',
    '【プライバシー保護】カメラ映像は端末内ブラウザのみでリアルタイム処理され、外部への送信・保存は一切行われません。',
  ];

  // カメラ初期化（アウトカメラ優先）
  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode() }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      stream = media;
      if (videoRef) {
        videoRef.srcObject = media;
        await videoRef.play();
        setCameraActive(true);
        setCameraDenied(false);
      }
    } catch {
      setCameraDenied(true);
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
    targets = [];
    particles = [];
    pointerTrail = [];
    setScore(0);
    setTimeLeft(60);
    setComboCount(0);
    setComboMessage(null);
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

  // ターゲットスポーン
  const spawnTargets = (width: number, height: number) => {
    const types: ('blossom' | 'fruit' | 'crystal' | 'star' | 'bomb')[] = [
      'blossom', 'fruit', 'crystal', 'star', 'bomb'
    ];
    const isBomb = Math.random() < 0.22;
    const type = isBomb ? 'bomb' : types[Math.floor(Math.random() * (types.length - 1))];

    const x = width * 0.15 + Math.random() * (width * 0.7);
    const y = height + 30;
    const vx = (width * 0.5 - x) * 0.015 + (Math.random() - 0.5) * 3;
    const vy = -(height * 0.02 + Math.random() * 4 + 7);

    let color = '#f43f5e';
    let name = '桜花';
    let pts = 100;
    let radius = 28;

    if (type === 'fruit') {
      color = '#f97316';
      name = 'オレンジ';
      pts = 150;
      radius = 26;
    } else if (type === 'crystal') {
      color = '#06b6d4';
      name = '水晶';
      pts = 200;
      radius = 24;
    } else if (type === 'star') {
      color = '#eab308';
      name = 'スター';
      pts = 300;
      radius = 25;
    } else if (type === 'bomb') {
      color = '#1e293b';
      name = '爆弾';
      pts = -300;
      radius = 30;
    }

    targets.push({
      id: nextTargetId++,
      x,
      y,
      vx,
      vy,
      radius,
      type,
      color,
      name,
      score: pts,
      isSliced: false,
      sliceProgress: 0,
    });
  };

  // スライス発生処理
  const sliceTarget = (t: TargetItem, hitX: number, hitY: number) => {
    if (t.isSliced) return;
    t.isSliced = true;

    if (t.type === 'bomb') {
      sound.playGameOver();
      setScore((s) => Math.max(0, s + t.score));
      setComboCount(0);
      setComboMessage('爆弾爆破！ -300pt');
      setTimeout(() => setComboMessage(null), 1200);

      // 黒煙爆発パーティクル
      for (let i = 0; i < 25; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = Math.random() * 7 + 2;
        particles.push({
          x: hitX,
          y: hitY,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          color: '#334155',
          alpha: 1,
          size: Math.random() * 8 + 4,
        });
      }
      return;
    }

    sound.playSlash();
    const now = performance.now();
    let currentCombo = comboCount();

    if (now - lastSliceTime < 450) {
      currentCombo++;
    } else {
      currentCombo = 1;
    }
    lastSliceTime = now;
    setComboCount(currentCombo);

    const bonus = currentCombo >= 2 ? currentCombo * 50 : 0;
    const gained = t.score + bonus;
    setScore((s) => s + gained);

    if (currentCombo >= 3) {
      sound.playMatch(currentCombo);
      setComboMessage(`${currentCombo} COMBO!! +${bonus}`);
      setTimeout(() => setComboMessage(null), 1000);
      if (currentCombo >= 5) {
        confetti({ particleCount: 30, spread: 60, origin: { x: hitX / (canvasRef?.width || 1), y: hitY / (canvasRef?.height || 1) } });
      }
    }

    // 華やかな飛散パーティクル
    for (let i = 0; i < 18; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = Math.random() * 6 + 2;
      particles.push({
        x: hitX,
        y: hitY,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        color: t.color,
        alpha: 1,
        size: Math.random() * 6 + 3,
      });
    }
  };

  // メインループ
  const loop = () => {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;
    const width = canvasRef.width;
    const height = canvasRef.height;

    ctx.clearRect(0, 0, width, height);

    // 1. カメラ映像の描画（アスペクト比維持 cover 描画）
    if (cameraActive() && videoRef && videoRef.readyState >= 2) {
      const isMirrored = facingMode() === 'user';
      drawVideoCover(ctx, videoRef, width, height, isMirrored);

      // 半透明ダークオーバーレイで的を見やすく演出
      ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.fillRect(0, 0, width, height);
    } else {
      // カメラ無しの場合は近未来バーチャル道場背景
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, width, height);

      // 背景グリッド
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.12)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    // 2. カメラモーション検知 (オプティカルフレーム差分)
    const motionPoints: { x: number; y: number }[] = [];

    if (cameraActive() && videoRef && videoRef.readyState >= 2) {
      if (!diffCanvas) {
        diffCanvas = document.createElement('canvas');
        diffCanvas.width = 120;
        diffCanvas.height = 90;
        diffCtx = diffCanvas.getContext('2d', { willReadFrequently: true });
      }

      if (diffCtx) {
        diffCtx.clearRect(0, 0, diffCanvas.width, diffCanvas.height);
        const isMirrored = facingMode() === 'user';
        drawVideoCover(diffCtx, videoRef, diffCanvas.width, diffCanvas.height, isMirrored);

        const curFrame = diffCtx.getImageData(0, 0, diffCanvas.width, diffCanvas.height);
        const data = curFrame.data;

        if (prevFrameData) {
          const scaleX = width / diffCanvas.width;
          const scaleY = height / diffCanvas.height;
          const threshold = 35;

          for (let y = 0; y < diffCanvas.height; y += 3) {
            for (let x = 0; x < diffCanvas.width; x += 3) {
              const i = (y * diffCanvas.width + x) * 4;
              const diff =
                Math.abs(data[i] - prevFrameData[i]) +
                Math.abs(data[i + 1] - prevFrameData[i + 1]) +
                Math.abs(data[i + 2] - prevFrameData[i + 2]);

              if (diff > threshold * 3) {
                motionPoints.push({ x: x * scaleX, y: y * scaleY });
              }
            }
          }
        }
        prevFrameData = new Uint8ClampedArray(data);
      }
    }

    // モーション検知ポイントの可視化＆当たり判定
    if (motionPoints.length > 0) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
      for (const pt of motionPoints) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // 的との当たり判定
        for (const t of targets) {
          if (!t.isSliced) {
            const dist = Math.hypot(pt.x - t.x, pt.y - t.y);
            if (dist < t.radius + 15) {
              sliceTarget(t, pt.x, pt.y);
            }
          }
        }
      }
    }

    // 3. マウス・タッチスライス判定
    for (let i = 0; i < pointerTrail.length - 1; i++) {
      const p2 = pointerTrail[i + 1];

      for (const t of targets) {
        if (!t.isSliced) {
          const dist = Math.hypot(p2.x - t.x, p2.y - t.y);
          if (dist < t.radius + 12) {
            sliceTarget(t, p2.x, p2.y);
          }
        }
      }
    }

    // 斬撃軌跡（ブレードトレイル）の描画
    if (pointerTrail.length > 1) {
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 14;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 0; i < pointerTrail.length - 1; i++) {
        const p1 = pointerTrail[i];
        const p2 = pointerTrail[i + 1];
        ctx.lineWidth = Math.max(1, p1.age * 6);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // トレイルのフェード
    pointerTrail.forEach((p) => (p.age *= 0.8));
    pointerTrail = pointerTrail.filter((p) => p.age > 0.1);

    // 4. ターゲットのスポーン＆物理更新
    if (!isGameOver()) {
      spawnCooldown++;
      if (spawnCooldown > 55) {
        spawnTargets(width, height);
        if (Math.random() < 0.35) {
          setTimeout(() => spawnTargets(width, height), 250);
        }
        spawnCooldown = 0;
      }
    }

    for (const t of targets) {
      t.x += t.vx;
      t.y += t.vy;
      t.vy += 0.22; // 重力

      if (t.isSliced) {
        t.sliceProgress += 0.05;
      }

      // 描画
      ctx.save();
      if (!t.isSliced) {
        // 未切断の的
        ctx.shadowColor = t.color;
        ctx.shadowBlur = 12;

        const grad = ctx.createRadialGradient(
          t.x - t.radius * 0.3,
          t.y - t.radius * 0.3,
          t.radius * 0.1,
          t.x,
          t.y,
          t.radius
        );
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, t.color);
        grad.addColorStop(1, '#090d16');

        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // アイコン文字
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(t.type === 'bomb' ? '💣' : t.name[0], t.x, t.y);
      } else {
        // 切断されて2つに割れて落下
        const shift = t.sliceProgress * 40;
        ctx.globalAlpha = Math.max(0, 1 - t.sliceProgress * 1.5);

        // 左半分
        ctx.beginPath();
        ctx.arc(t.x - shift, t.y + shift * 0.5, t.radius, Math.PI * 0.5, Math.PI * 1.5);
        ctx.fillStyle = t.color;
        ctx.fill();

        // 右半分
        ctx.beginPath();
        ctx.arc(t.x + shift, t.y - shift * 0.5, t.radius, Math.PI * 1.5, Math.PI * 0.5);
        ctx.fillStyle = t.color;
        ctx.fill();
      }
      ctx.restore();
    }

    // 画面外の的を除去
    targets = targets.filter((t) => t.y < height + 60 && t.sliceProgress < 1);

    // 5. パーティクルの更新＆描画
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      p.alpha -= 0.025;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    particles = particles.filter((p) => p.alpha > 0);

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

  // マウス・タッチ操作ハンドラ
  const handlePointerDown = (e: PointerEvent) => {
    isPointerDown = true;
    if (canvasRef) {
      const rect = canvasRef.getBoundingClientRect();
      lastPointerX = ((e.clientX - rect.left) / rect.width) * canvasRef.width;
      lastPointerY = ((e.clientY - rect.top) / rect.height) * canvasRef.height;
      pointerTrail.push({ x: lastPointerX, y: lastPointerY, age: 1 });
    }
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isPointerDown || !canvasRef) return;
    const rect = canvasRef.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvasRef.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvasRef.height;
    pointerTrail.push({ x, y, age: 1 });
    lastPointerX = x;
    lastPointerY = y;
  };

  const handlePointerUp = () => {
    isPointerDown = false;
  };

  return (
    <GameShell
      id="ar-slicer"
      title="AR Blade Slicer"
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
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-700'
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
            <span>
              残り: <strong class="text-rose-500 text-sm font-bold">{timeLeft()}</strong>s
            </span>
            <Show when={comboCount() > 1}>
              <span class="text-amber-500 font-bold animate-bounce">
                🔥 {comboCount()} COMBO
              </span>
            </Show>
          </div>
        </div>
      }
    >
      <div class="w-full max-w-xl h-full flex flex-col items-center justify-center relative min-h-0 select-none">
        {/* 隠しビデオ要素 */}
        <video
          ref={videoRef}
          playsinline
          muted
          class="hidden"
        />

        {/* メインゲームキャンバス */}
        <div
          class="w-full aspect-[4/3] max-h-[calc(100dvh-130px)] rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800 relative bg-slate-950 cursor-crosshair touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            class="w-full h-full block"
          />

          {/* コンボメッセージ通知 */}
          <Show when={comboMessage()}>
            <div class="absolute top-8 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-2xl bg-amber-500 text-slate-950 font-black text-sm shadow-xl animate-in zoom-in-75 duration-150">
              {comboMessage()}
            </div>
          </Show>

          {/* カメラ開始プロンプト（未開始時） */}
          <Show when={!cameraActive() && !cameraDenied()}>
            <div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700 text-center text-xs text-slate-200 shadow-xl flex items-center gap-3">
              <span>カメラで手を振ってスライス！</span>
              <button
                onClick={startCamera}
                class="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all active:scale-95"
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
