import { Component, createSignal, onSettled, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';

interface GroundItem {
  x: number;
  type: 'spring' | 'boost' | 'obstacle';
}

export const SkyLauncherGame: Component = () => {
  const [phase, setPhase] = createSignal<'aim_angle' | 'aim_power' | 'flying' | 'result'>('aim_angle');
  const [distance, setDistance] = createSignal(0);
  const [altitude, setAltitude] = createSignal(0);
  const [boostsLeft, setBoostsLeft] = createSignal(3);
  const [isGameOver, setIsGameOver] = createSignal(false);

  let canvasRef: HTMLCanvasElement | undefined;
  let animId: number | null = null;

  // 照準メーター
  let angleMeter = 45;
  let angleDir = 1;
  let powerMeter = 50;
  let powerDir = 1;

  // 物理状態
  let posX = 0;
  let posY = 0;
  let velX = 0;
  let velY = 0;
  let bounceCount = 0;
  let groundItems: GroundItem[] = [];

  const GRAVITY = 0.28;
  const AIR_DRAG = 0.994;

  const initFlight = () => {
    angleMeter = 45;
    angleDir = 1;
    powerMeter = 50;
    powerDir = 1;
    posX = 0;
    posY = 0;
    velX = 0;
    velY = 0;
    bounceCount = 0;
    setBoostsLeft(3);
    setDistance(0);
    setAltitude(0);
    setIsGameOver(false);
    setPhase('aim_angle');

    // 地上アイテム配置 (スプリング・ブースト)
    groundItems = [];
    for (let x = 300; x < 6000; x += 180 + Math.random() * 220) {
      const type = Math.random() < 0.5 ? 'spring' : Math.random() < 0.8 ? 'boost' : 'obstacle';
      groundItems.push({ x, type });
    }
  };

  const handleActionClick = () => {
    if (phase() === 'aim_angle') {
      sound.playPop(520);
      setPhase('aim_power');
    } else if (phase() === 'aim_power') {
      sound.playMatch(5);
      // 発射
      const rad = (angleMeter * Math.PI) / 180;
      const speed = (powerMeter / 100) * 22 + 4;
      velX = Math.cos(rad) * speed;
      velY = Math.sin(rad) * speed;
      setPhase('flying');
    } else if (phase() === 'flying' && boostsLeft() > 0) {
      // 空中ブースト
      sound.playPop(750);
      setBoostsLeft((b) => b - 1);
      velX += 6;
      velY = Math.max(velY + 5, 8);
    }
  };

  const loop = () => {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;

    const w = canvasRef.width;
    const h = canvasRef.height;

    // 1. 照準メーターのアニメーション
    if (phase() === 'aim_angle') {
      angleMeter += angleDir * 1.5;
      if (angleMeter > 80) angleDir = -1;
      if (angleMeter < 15) angleDir = 1;
    } else if (phase() === 'aim_power') {
      powerMeter += powerDir * 2.2;
      if (powerMeter > 100) powerDir = -1;
      if (powerMeter < 10) powerDir = 1;
    }

    // 2. 飛行中の物理演算
    if (phase() === 'flying') {
      velY -= GRAVITY;
      velX *= AIR_DRAG;
      velY *= AIR_DRAG;

      posX += velX;
      posY += velY;

      setDistance(Math.floor(posX));
      setAltitude(Math.max(0, Math.floor(posY)));

      // 地面着地
      if (posY <= 0) {
        posY = 0;
        bounceCount++;

        // 地上アイテムとの判定
        let hitItem = false;
        for (const item of groundItems) {
          if (Math.abs(posX - item.x) < 35) {
            hitItem = true;
            if (item.type === 'spring') {
              sound.playPop(650);
              velY = 14 + Math.random() * 4;
              velX = Math.max(velX, 10);
            } else if (item.type === 'boost') {
              sound.playMatch(4);
              velX += 8;
              velY = 6;
            } else {
              // 減速
              velX *= 0.4;
            }
            break;
          }
        }

        if (!hitItem) {
          velY = -velY * 0.55; // 地面バウンド
          velX *= 0.82;
          sound.playPop(350);
        }

        // 停止判定
        if (Math.abs(velX) < 0.25 && Math.abs(velY) < 1.0) {
          setPhase('result');
          setIsGameOver(true);
          sound.playVictory();
        }
      }
    }

    // 3. 背景描画 (空・地上スクロール)
    const groundScreenY = h - 60;
    const cameraX = posX;
    const cameraY = Math.max(0, posY - 80);

    // 空のグラデーション
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#0f172a');
    skyGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // 雲
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let i = 0; i < 6; i++) {
      const cx = ((i * 350 - cameraX * 0.2) % (w + 400)) - 100;
      const cy = 40 + (i % 3) * 50 - cameraY * 0.1;
      ctx.beginPath();
      ctx.arc(cx, cy, 30, 0, Math.PI * 2);
      ctx.arc(cx + 25, cy - 10, 35, 0, Math.PI * 2);
      ctx.arc(cx + 50, cy, 28, 0, Math.PI * 2);
      ctx.fill();
    }

    // 地面
    const groundDrawY = groundScreenY + cameraY;
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, groundDrawY, w, h - groundDrawY + 80);
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, groundDrawY, w, 6);

    // 地上アイテムの描画
    for (const item of groundItems) {
      const screenX = item.x - cameraX + 120;
      if (screenX < -50 || screenX > w + 50) continue;

      if (item.type === 'spring') {
        // トランポリン
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(screenX - 15, groundDrawY - 12, 30, 12);
        ctx.strokeStyle = '#fef3c7';
        ctx.strokeRect(screenX - 15, groundDrawY - 12, 30, 12);
      } else if (item.type === 'boost') {
        // 加速パネル
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(screenX - 12, groundDrawY);
        ctx.lineTo(screenX + 16, groundDrawY - 8);
        ctx.lineTo(screenX - 12, groundDrawY - 16);
        ctx.closePath();
        ctx.fill();
      }
    }

    // 弾 / キャラクターの描画
    const charScreenX = 120;
    const charScreenY = groundScreenY - (posY - cameraY);

    if (phase() === 'flying' || phase() === 'result') {
      ctx.save();
      ctx.translate(charScreenX, charScreenY);
      ctx.rotate(Math.atan2(-velY, velX));

      // 弾体
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(3, -3, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // 照準画面での砲台 & ゲージ描画
    if (phase() === 'aim_angle' || phase() === 'aim_power') {
      const canonX = 120;
      const canonY = groundScreenY;

      // 砲台ベース
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(canonX, canonY, 18, Math.PI, 0);
      ctx.fill();

      // 砲身
      const rad = (angleMeter * Math.PI) / 180;
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(canonX, canonY);
      ctx.lineTo(canonX + Math.cos(rad) * 40, canonY - Math.sin(rad) * 40);
      ctx.stroke();

      // 照準ガイド線
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(canonX, canonY);
      ctx.lineTo(canonX + Math.cos(rad) * 120, canonY - Math.sin(rad) * 120);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    animId = requestAnimationFrame(loop);
  };

  const restart = () => {
    sound.playPop(500);
    initFlight();
  };

  onSettled(() => {
    initFlight();
    animId = requestAnimationFrame(loop);
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  });

  const instructions = [
    '【ぶっ飛ばし】Flash時代を代表する大人気フライト＆ジャンプゲームです。',
    '1. タップして【発射角度】を決定！',
    '2. もう一度タップして【パワー】を決定して発射！',
    '3. 飛行中にボタンを押すと【ロケットブースト】で追加加速（3回まで）！',
    '地上のトランポリンやブーストを駆使して最長飛距離（m）を目指そう！',
  ];

  return (
    <GameShell
      id="sky-catapult"
      title="Sky Launcher (ぶっ飛ばし)"
      score={distance()}
      isGameOver={isGameOver()}
      onRestart={restart}
      instructions={instructions}
      extraControls={
        <div class="flex items-center justify-between w-full max-w-md px-3 py-1 bg-white/90 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs shadow-2xs">
          <div class="flex items-center gap-3">
            <div>
              <span class="text-slate-400">距離:</span>{' '}
              <span class="font-mono font-bold text-rose-500 text-sm">{distance()} m</span>
            </div>
            <div>
              <span class="text-slate-400">高度:</span>{' '}
              <span class="font-mono font-bold text-sky-400 text-sm">{altitude()} m</span>
            </div>
          </div>
          <div>
            <span class="text-slate-400">ブースト残:</span>{' '}
            <span class="font-bold text-amber-500">{boostsLeft()} 回</span>
          </div>
        </div>
      }
    >
      <div
        class="w-full max-w-[480px] aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800 relative select-none touch-none bg-slate-950 cursor-pointer"
        onClick={handleActionClick}
      >
        <canvas
          ref={canvasRef}
          width={480}
          height={360}
          class="w-full h-full block"
        />

        {/* 照準ゲージ UI */}
        <Show when={phase() === 'aim_angle' || phase() === 'aim_power'}>
          <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 bg-slate-900/85 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/10 shadow-xl pointer-events-none text-center">
            <span class="text-xs font-bold text-white">
              {phase() === 'aim_angle' ? 'タップして【角度】を決定' : 'タップして【パワー】を発射！'}
            </span>
            <div class="w-44 h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div
                class={`h-full transition-all ${
                  phase() === 'aim_angle' ? 'bg-sky-500' : 'bg-rose-500'
                }`}
                style={{
                  width: `${phase() === 'aim_angle' ? (angleMeter / 90) * 100 : powerMeter}%`,
                }}
              />
            </div>
          </div>
        </Show>

        {/* 飛行中ブーストボタン */}
        <Show when={phase() === 'flying' && boostsLeft() > 0}>
          <div class="absolute bottom-4 right-4 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow-lg border border-white/20 active:scale-95 animate-bounce">
            タップでBOOST! ({boostsLeft()})
          </div>
        </Show>
      </div>
    </GameShell>
  );
};
