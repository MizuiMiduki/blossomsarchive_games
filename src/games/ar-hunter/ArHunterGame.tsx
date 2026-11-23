import { Component, createSignal, onSettled, onCleanup, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import { drawVideoCover, setupCanvasAutoResize } from '../../utils/camera.ts';
import confetti from 'canvas-confetti';

interface Spirit3D {
  id: number;
  yaw: number; // 0 ~ 360 度
  pitch: number; // -50 ~ +50 度
  distance: number;
  color: string;
  name: string;
  points: number;
  phase: number;
  speed: number;
  isCaptured: boolean;
  capturedScale: number;
}

export const ArHunterGame: Component = () => {
  const [score, setScore] = createSignal(0);
  const [timeLeft, setTimeLeft] = createSignal(60);
  const [isGameOver, setIsGameOver] = createSignal(false);
  const [cameraActive, setCameraActive] = createSignal(false);
  const [lockOnTarget, setLockOnTarget] = createSignal<string | null>(null);
  const [capturedTotal, setCapturedTotal] = createSignal(0);
  const [facingMode, setFacingMode] = createSignal<'environment' | 'user'>('environment');

  let videoRef: HTMLVideoElement | undefined;
  let canvasRef: HTMLCanvasElement | undefined;
  let animId: number | null = null;
  let timerId: number | null = null;
  let stream: MediaStream | null = null;

  // プレイヤーの視線角（度数法）
  let playerYaw = 0;
  let playerPitch = 0;

  // ドラッグ操作（PC/ジャイロ非対応端末用）
  let isDragging = false;
  let lastTouchX = 0;
  let lastTouchY = 0;

  let spirits: Spirit3D[] = [];
  let nextSpiritId = 1;

  const instructions = [
    '【360°探索】スマホを部屋の中で見回す（または画面をスワイプ）と、現実空間の周囲360°に隠れた精霊・ゴーストが出現！',
    '画面中央の「レティクル（照準）」に精霊を捉えるとロックオン完了！',
    '画面をタップするか「CAPTURE」ボタンを押して捕獲ビームを発射！',
    '画面上のレーダーと矢印が、近くにいる精霊の方向をナビゲートしてくれます。',
    '【プライバシー保護】カメラ映像は端末内のみで処理され、外部への送信・保存は一切行われません。',
  ];

  const SPIRIT_TYPES = [
    { name: '桜の精霊', color: '#f43f5e', points: 150 },
    { name: '森の木霊', color: '#10b981', points: 200 },
    { name: '月の妖精', color: '#38bdf8', points: 250 },
    { name: '星の幻獣', color: '#fbbf24', points: 300 },
    { name: '虹の霊光', color: '#c084fc', points: 400 },
  ];

  const spawnSpirits = (count: number = 8) => {
    spirits = [];
    for (let i = 0; i < count; i++) {
      const type = SPIRIT_TYPES[i % SPIRIT_TYPES.length];
      spirits.push({
        id: nextSpiritId++,
        yaw: Math.random() * 360,
        pitch: (Math.random() - 0.5) * 80,
        distance: Math.random() * 8 + 12,
        color: type.color,
        name: type.name,
        points: type.points,
        phase: Math.random() * Math.PI * 2,
        speed: (Math.random() - 0.5) * 0.4,
        isCaptured: false,
        capturedScale: 1,
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

  // ジャイロセンサー対応
  const setupGyro = async () => {
    if (typeof window === 'undefined') return;

    if (
      typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> })
        .requestPermission === 'function'
    ) {
      try {
        const perm = await (
          DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }
        ).requestPermission();
        if (perm !== 'granted') return;
      } catch {
        return;
      }
    }

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const compass = (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading;
      if (typeof compass === 'number' && !isNaN(compass)) {
        playerYaw = compass;
      } else if (e.alpha !== null) {
        playerYaw = (360 - e.alpha) % 360;
      }

      if (e.beta !== null) {
        playerPitch = Math.max(-60, Math.min(60, (e.beta - 80) * 0.9));
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  };

  const restart = () => {
    spawnSpirits(9);
    setScore(0);
    setTimeLeft(60);
    setCapturedTotal(0);
    setLockOnTarget(null);
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

  // 捕獲ビーム発射
  const handleFire = () => {
    if (isGameOver()) return;
    sound.playLaser();

    // 照準中央にいる精霊を判定
    let captured = false;
    for (const s of spirits) {
      if (s.isCaptured) continue;

      let dYaw = s.yaw - playerYaw;
      while (dYaw > 180) dYaw -= 360;
      while (dYaw < -180) dYaw += 360;

      const dPitch = s.pitch - playerPitch;
      const angDist = Math.hypot(dYaw, dPitch);

      if (angDist < 12) {
        // ロックオン範囲内！
        s.isCaptured = true;
        captured = true;
        sound.playMatch(5);
        setScore((sc) => sc + s.points);
        setCapturedTotal((c) => c + 1);

        confetti({
          particleCount: 25,
          spread: 50,
          origin: { x: 0.5, y: 0.5 },
        });

        // 空いたスロットに新たな精霊を補充
        setTimeout(() => {
          const type = SPIRIT_TYPES[Math.floor(Math.random() * SPIRIT_TYPES.length)];
          spirits.push({
            id: nextSpiritId++,
            yaw: (playerYaw + 90 + Math.random() * 180) % 360,
            pitch: (Math.random() - 0.5) * 80,
            distance: Math.random() * 8 + 12,
            color: type.color,
            name: type.name,
            points: type.points,
            phase: Math.random() * Math.PI * 2,
            speed: (Math.random() - 0.5) * 0.4,
            isCaptured: false,
            capturedScale: 1,
          });
        }, 1200);
        break;
      }
    }

    if (!captured) {
      sound.playPop(300);
    }
  };

  const loop = () => {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;
    const width = canvasRef.width;
    const height = canvasRef.height;
    const cx = width / 2;
    const cy = height / 2;

    ctx.clearRect(0, 0, width, height);

    // 1. カメラ映像（インカメラのみミラー反転、背面カメラは等倍）
    if (cameraActive() && videoRef && videoRef.readyState >= 2) {
      drawVideoCover(ctx, videoRef, width, height, facingMode() === 'user');
      // 暗視モード風フィルター
      ctx.fillStyle = 'rgba(2, 6, 23, 0.25)';
      ctx.fillRect(0, 0, width, height);
    } else {
      // カメラ無しの場合は360度サイバースペース
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);

      // パノラマ星空背景
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 40; i++) {
        const starYaw = (i * 27) % 360;
        let dYaw = starYaw - playerYaw;
        while (dYaw > 180) dYaw -= 360;
        while (dYaw < -180) dYaw += 360;

        const sx = cx + (dYaw / 60) * width;
        const sy = cy - ((i * 13 % 60 - 30 - playerPitch) / 45) * height;

        if (sx >= 0 && sx <= width && sy >= 0 && sy <= height) {
          ctx.beginPath();
          ctx.arc(sx, sy, (i % 2) + 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 2. 3D精霊の計算＆投影
    let locked: Spirit3D | null = null;
    let nearestSpirit: { dYaw: number; dPitch: number; name: string } | null = null;
    let minAngDist = Infinity;

    for (const s of spirits) {
      s.phase += 0.04;
      s.yaw = (s.yaw + s.speed + 360) % 360;

      let dYaw = s.yaw - playerYaw;
      while (dYaw > 180) dYaw -= 360;
      while (dYaw < -180) dYaw += 360;

      const dPitch = s.pitch - playerPitch;
      const angDist = Math.hypot(dYaw, dPitch);

      if (!s.isCaptured && angDist < minAngDist) {
        minAngDist = angDist;
        nearestSpirit = { dYaw, dPitch, name: s.name };
      }

      // 視野内（FOV 70度）にある場合投影
      if (Math.abs(dYaw) < 45 && Math.abs(dPitch) < 35) {
        const sx = cx + (dYaw / 40) * cx;
        const sy = cy - (dPitch / 30) * cy + Math.sin(s.phase) * 6;
        const baseRadius = (220 / s.distance) * (s.isCaptured ? s.capturedScale : 1);

        if (s.isCaptured) {
          s.capturedScale *= 0.85;
        }

        // ロックオン判定
        if (!s.isCaptured && angDist < 12) {
          locked = s;
        }

        // 精霊の描画
        ctx.save();
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 18;

        // オーラ
        ctx.fillStyle = s.color;
        ctx.globalAlpha = 0.35 + Math.sin(s.phase) * 0.15;
        ctx.beginPath();
        ctx.arc(sx, sy, baseRadius * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // 核
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(sx, sy, baseRadius * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // 輪郭
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // 名前ラベル
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 6;
        ctx.fillText(s.name, sx, sy - baseRadius - 6);
        ctx.restore();
      }
    }

    setLockOnTarget(locked ? (locked as Spirit3D).name : null);

    // 3. ナビゲーション矢印（画面外の最寄り精霊を指し示す）
    if (nearestSpirit && minAngDist > 18) {
      const angle = Math.atan2(-nearestSpirit.dPitch, nearestSpirit.dYaw);
      const arrowDist = Math.min(width, height) * 0.38;
      const ax = cx + Math.cos(angle) * arrowDist;
      const ay = cy + Math.sin(angle) * arrowDist;

      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(angle);
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#d97706';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-8, -7);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-8, 7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 4. サイバーARレティクル（照準器）の描画
    ctx.save();
    ctx.strokeStyle = locked ? '#ef4444' : '#38bdf8';
    ctx.lineWidth = locked ? 3 : 2;
    ctx.shadowColor = locked ? '#ef4444' : '#0284c7';
    ctx.shadowBlur = locked ? 14 : 8;

    // 外枠リング
    ctx.beginPath();
    ctx.arc(cx, cy, 38, 0, Math.PI * 2);
    ctx.stroke();

    // 十字線
    ctx.beginPath();
    ctx.moveTo(cx - 50, cy);
    ctx.lineTo(cx - 42, cy);
    ctx.moveTo(cx + 42, cy);
    ctx.lineTo(cx + 50, cy);
    ctx.moveTo(cx, cy - 50);
    ctx.lineTo(cx, cy - 42);
    ctx.moveTo(cx, cy + 42);
    ctx.lineTo(cx, cy + 50);
    ctx.stroke();

    // 中央ドット
    ctx.fillStyle = locked ? '#ef4444' : '#38bdf8';
    ctx.beginPath();
    ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // ロックオン時アラート枠
    if (locked) {
      ctx.strokeRect(cx - 46, cy - 46, 92, 92);
    }
    ctx.restore();

    // 5. 右上ミニレーダー（360度周囲マップ）
    const rx = width - 45;
    const ry = 45;
    const rr = 34;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.beginPath();
    ctx.arc(rx, ry, rr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // レーダー視線扇形
    ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.arc(rx, ry, rr, -Math.PI / 2 - 0.4, -Math.PI / 2 + 0.4);
    ctx.closePath();
    ctx.fill();

    // 精霊ブリップ
    for (const s of spirits) {
      if (s.isCaptured) continue;
      let dYaw = s.yaw - playerYaw;
      const rad = ((dYaw - 90) * Math.PI) / 180;
      const bx = rx + Math.cos(rad) * (rr * 0.75);
      const by = ry + Math.sin(rad) * (rr * 0.75);

      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    animId = requestAnimationFrame(loop);
  };

  onSettled(() => {
    restart();
    if (canvasRef) {
      const cleanupResize = setupCanvasAutoResize(canvasRef);
      onCleanup(cleanupResize);
    }
    let cleanupGyro: (() => void) | undefined;
    setupGyro().then((c) => (cleanupGyro = c));
    animId = requestAnimationFrame(loop);

    onCleanup(() => {
      if (animId) cancelAnimationFrame(animId);
      if (timerId) clearInterval(timerId);
      if (cleanupGyro) cleanupGyro();
      stopCamera();
    });
  });

  // スワイプによる視点回転（PC / 非ジャイロ時）
  const handlePointerDown = (e: PointerEvent) => {
    isDragging = true;
    lastTouchX = e.clientX;
    lastTouchY = e.clientY;
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastTouchX;
    const dy = e.clientY - lastTouchY;
    playerYaw = (playerYaw - dx * 0.35 + 360) % 360;
    playerPitch = Math.max(-60, Math.min(60, playerPitch - dy * 0.35));
    lastTouchX = e.clientX;
    lastTouchY = e.clientY;
  };

  const handlePointerUp = () => {
    isDragging = false;
  };

  return (
    <GameShell
      id="ar-hunter"
      title="AR 360 Spirit Hunter"
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

          <div class="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 font-mono text-xs">
            <span>捕獲: <strong class="text-emerald-500 font-bold">{capturedTotal()}</strong>匹</span>
            <span>残り: <strong class="text-rose-500 text-sm font-bold">{timeLeft()}</strong>s</span>
          </div>
        </div>
      }
    >
      <div class="w-full max-w-4xl h-full flex flex-col items-center justify-center relative min-h-0 select-none p-1 sm:p-2">
        <video ref={videoRef} playsinline muted class="hidden" />

        <div
          class="w-full h-full max-h-[calc(100dvh-125px)] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border-2 sm:border-4 border-slate-800 relative bg-slate-950 cursor-crosshair touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={handleFire}
        >
          <canvas
            ref={canvasRef}
            class="w-full h-full block"
          />

          {/* ロックオン状態表示 */}
          <Show when={lockOnTarget()}>
            <div class="absolute top-4 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-red-600 text-white font-mono font-bold text-xs shadow-lg animate-pulse">
              🎯 LOCK ON: {lockOnTarget()}！タップで捕獲
            </div>
          </Show>

          {/* 捕獲ボタン */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleFire();
            }}
            class="absolute bottom-5 left-1/2 -translate-x-1/2 px-7 py-2.5 rounded-2xl bg-red-500 hover:bg-red-400 active:scale-95 text-white font-black text-sm tracking-wider shadow-2xl border-2 border-red-300 transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>⚡ CAPTURE</span>
          </button>
        </div>
      </div>
    </GameShell>
  );
};
